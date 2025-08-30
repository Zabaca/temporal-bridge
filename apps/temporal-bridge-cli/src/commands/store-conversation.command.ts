import { promises as fs } from 'node:fs';
import os from 'node:os';
import * as path from 'node:path';
import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { detectProject, ProjectEntitiesService, SessionManager, ZepService } from '../lib';
import type { ProjectContext } from '../lib/project-detector';
import type { HookData, ParsedMessage, TranscriptMessage } from '../lib/types';

interface StoreConversationOptions {
  sessionId: string;
  transcriptPath: string;
  cwd: string;
}

interface LocalTranscriptMessage {
  type: string;
  message?: {
    content: string | { type: string; text?: string; content?: string }[];
  };
  uuid?: string;
  parentUuid?: string;
  timestamp?: string;
}

@Injectable()
@Command({
  name: 'store-conversation',
  description: 'Parse and store a conversation transcript from a Claude Code session.',
})
export class StoreConversationCommand extends CommandRunner {
  constructor(
    private readonly sessionManager: SessionManager,
    private readonly zepService: ZepService,
    private readonly projectEntitiesService: ProjectEntitiesService,
  ) {
    super();
  }

  async run(_passedParams: string[], options: StoreConversationOptions): Promise<void> {
    const { sessionId, transcriptPath, cwd } = options;
    console.log(`Received request to store conversation for session ID: ${sessionId}`);

    const hookData: HookData = {
      session_id: sessionId,
      transcript_path: transcriptPath,
      cwd: cwd,
      hook_event_name: 'manual_trigger',
    };

    try {
      await this.storeConversation(hookData);
      console.log(`
✅ Successfully processed store-conversation for session: ${sessionId}`);
    } catch (error) {
      console.error(`❌ Failed to store conversation for session ${sessionId}:`, (error as Error).message);
      process.exit(1);
    }
  }

  private async storeConversation(hookData: HookData): Promise<void> {
    const lines = await this.readTranscriptLines(hookData.transcript_path);
    const messages = this.parseTranscript(lines);

    const context = await this.setupContext(hookData);

    await this.sessionManager.updateSessionInfo(context.projectContext.projectPath, {
      sessionId: hookData.session_id,
      metadata: {
        source: 'claude-code-hook',
        projectId: context.projectContext.projectId,
      },
    });

    await this.handleProjectEntityProcessing(context.projectContext, hookData.session_id);

    const transactionMessages = this.findCurrentTransaction(
      messages,
      lines.map((line) => JSON.parse(line)),
    );
    const limitedMessages = this.limitTransactionMessages(transactionMessages);

    if (limitedMessages.length > 0) {
      await this.storeMessagesInZep(limitedMessages, context.threadId, hookData.session_id, context.userId);
    }
  }

  private async readTranscriptLines(transcriptPath: string): Promise<string[]> {
    const transcriptContent = await fs.readFile(transcriptPath, 'utf-8');
    return transcriptContent.split('\n').filter((line) => line.trim());
  }

  private async setupContext(hookData: HookData) {
    const projectContext = await detectProject(hookData.cwd);
    const userId = this.zepService.userId;
    const threadId = `claude-code-${hookData.session_id}`;

    return { projectContext, userId, threadId };
  }

  private async handleProjectEntityProcessing(projectContext: ProjectContext, sessionId: string) {
    const shouldCreateEntity = await this.sessionManager.shouldProcessProjectEntity(
      projectContext.projectPath,
      sessionId,
    );

    if (shouldCreateEntity) {
      console.log(`🔄 Creating/updating project entity for session ${sessionId}`);
      const projectEntityResult = await this.projectEntitiesService.ensureProjectEntity(projectContext.projectPath);
      if (projectEntityResult.success) {
        console.log(`✅ Project entity: ${projectEntityResult.projectEntity?.name}`);
        const sessionRelationResult = await this.projectEntitiesService.createSessionProjectRelationship(
          sessionId,
          projectContext.projectId,
        );
        if (sessionRelationResult.success) {
          console.log(`🔗 Session linked to project: ${sessionRelationResult.message}`);
        }
      }
      await this.sessionManager.markProjectEntityProcessed(projectContext.projectPath, sessionId, projectEntityResult);
    }
  }

  private async storeMessagesInZep(messages: ParsedMessage[], threadId: string, sessionId: string, userId: string) {
    const storedUuids = await this.loadStoredUuids(sessionId);
    const newMessages = messages.filter((msg) => !(msg.uuid && storedUuids.has(msg.uuid)));

    if (newMessages.length === 0) {
      console.log('⚡ All messages in this transaction already stored.');
      return;
    }

    const shortMessages = newMessages.filter((m) => m.content.length <= 2400);
    const largeMessages = newMessages.filter((m) => m.content.length > 2400);

    if (shortMessages.length > 0) {
      const zepMessages = shortMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        name: msg.name,
        content: msg.content,
      }));
      await this.zepService.thread.addMessages(threadId, { messages: zepMessages });
      console.log(`✅ Sent ${shortMessages.length} short messages to user thread`);
      for (const msg of shortMessages) {
        if (msg.uuid) {
          storedUuids.add(msg.uuid);
        }
      }
    }

    for (const msg of largeMessages) {
      await this.zepService.graph.add({ userId, type: 'message', data: `${msg.name}: ${msg.content}` });
      console.log(`✅ Sent large message (${msg.content.length} chars) to user graph`);
      if (msg.uuid) {
        storedUuids.add(msg.uuid);
      }
    }

    await this.saveStoredUuids(sessionId, storedUuids);
    console.log(`📊 Tracked ${storedUuids.size} stored message UUIDs`);
  }

  private parseTranscript(lines: string[]): ParsedMessage[] {
    const messages: ParsedMessage[] = [];
    for (const line of lines) {
      try {
        const msg = JSON.parse(line) as LocalTranscriptMessage;
        if (msg.type === 'system' || !msg.message) {
          continue;
        }
        const parsedMessage = this.extractMessageContent(msg);
        if (parsedMessage) {
          messages.push(parsedMessage);
        }
      } catch (_e) {
        /* ignore parsing errors for malformed lines */
      }
    }
    return messages;
  }

  private extractMessageContent(msg: LocalTranscriptMessage): ParsedMessage | null {
    let content = '';
    let role = 'user';
    let name = 'Developer';

    if (msg.type === 'assistant') {
      role = 'assistant';
      name = 'Claude Code';
      if (Array.isArray(msg.message?.content)) {
        content = msg.message.content
          .filter((c) => c.type === 'text')
          .map((c) => c.text || '')
          .join('\n');
      }
    } else if (msg.type === 'user') {
      role = 'user';
      name = 'Developer';
      if (typeof msg.message?.content === 'string') {
        content = msg.message.content;
      } else if (Array.isArray(msg.message?.content)) {
        content = msg.message.content
          .filter((c) => c.type !== 'tool_result')
          .map((c) => c.text || c.content || '')
          .join('\n');
      }
    }

    if (content.trim()) {
      return {
        role,
        name,
        content: content.trim(),
        uuid: msg.uuid || '',
        parentUuid: msg.parentUuid,
        timestamp: msg.timestamp,
      };
    }
    return null;
  }

  private findCurrentTransaction(parsedMessages: ParsedMessage[], rawMessages: TranscriptMessage[]): ParsedMessage[] {
    if (parsedMessages.length === 0) {
      return [];
    }
    const lastAssistantMsg = parsedMessages.filter((m) => m.role === 'assistant').pop();
    if (!lastAssistantMsg) {
      return parsedMessages;
    }

    const transactionMessages: ParsedMessage[] = [];
    let currentUuid: string | undefined = lastAssistantMsg.uuid;

    while (currentUuid) {
      const currentParsedMsg = parsedMessages.find((m) => m.uuid === currentUuid);
      if (!currentParsedMsg) {
        const currentRawMsg = rawMessages.find((m) => m.uuid === currentUuid);
        currentUuid = currentRawMsg?.parentUuid;
        continue;
      }
      transactionMessages.unshift(currentParsedMsg);
      if (currentParsedMsg.role === 'user' && transactionMessages[0]?.role === 'user') {
        break;
      }
      let parentUuid = currentParsedMsg.parentUuid;
      if (!parentUuid) {
        const currentRawMsg = rawMessages.find((m) => m.uuid === currentUuid);
        parentUuid = currentRawMsg?.parentUuid;
      }
      if (!parentUuid) {
        break;
      }
      currentUuid = parentUuid;
    }
    return transactionMessages;
  }

  private limitTransactionMessages(messages: ParsedMessage[]): ParsedMessage[] {
    if (messages.length <= 3) {
      return messages;
    }
    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');
    const firstUserMessage = userMessages[0];
    const lastTwoAssistantMessages = assistantMessages.slice(-2);
    const limitedMessages = [];
    if (firstUserMessage) {
      limitedMessages.push(firstUserMessage);
    }
    limitedMessages.push(...lastTwoAssistantMessages);
    return limitedMessages;
  }

  private async loadStoredUuids(sessionId: string): Promise<Set<string>> {
    const uuidFile = path.join(os.homedir(), '.claude', `temporal-bridge-stored-uuids-${sessionId}.txt`);
    try {
      const content = await fs.readFile(uuidFile, 'utf-8');
      return new Set(content.split('\n').filter(Boolean));
    } catch {
      return new Set();
    }
  }

  private async saveStoredUuids(sessionId: string, uuids: Set<string>): Promise<void> {
    const uuidFile = path.join(os.homedir(), '.claude', `temporal-bridge-stored-uuids-${sessionId}.txt`);
    await fs.writeFile(uuidFile, Array.from(uuids).join('\n'));
  }

  @Option({ flags: '-s, --session-id <sessionId>', description: 'The session ID to store.', required: true })
  parseSessionId(val: string): string {
    return val;
  }

  @Option({
    flags: '-t, --transcript-path <transcriptPath>',
    description: 'Path to the transcript file.',
    required: true,
  })
  parseTranscriptPath(val: string): string {
    return val;
  }

  @Option({ flags: '-c, --cwd <cwd>', description: 'The working directory where the command was run.', required: true })
  parseCwd(val: string): string {
    return val;
  }
}
