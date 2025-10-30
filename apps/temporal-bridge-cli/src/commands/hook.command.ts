import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Zep } from '@getzep/zep-cloud';
import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import * as yaml from 'yaml';
import { detectProject } from '../lib/project-detector';
import { HookData } from '../lib/types';
import { ZepService } from '../lib/zep-client';
import { StoreConversationCommand } from './store-conversation.command';

@Injectable()
@Command({
  name: 'hook',
  description: 'Claude Code hook handler for Stop, SessionStart, and UserPromptSubmit (inject-memory) events',
})
export class HookCommand extends CommandRunner {
  constructor(
    private readonly storeConversationCommand: StoreConversationCommand,
    private readonly zepService: ZepService,
  ) {
    super();
  }

  async run(
    _inputs: string[],
    options: {
      type?: 'stop' | 'session-start' | 'inject-memory';
      sessionId?: string;
      transcriptPath?: string;
      cwd?: string;
    },
  ): Promise<void> {
    const hookType = options.type;
    let hookData: HookData | null = null;

    // Read hook data from stdin if available
    if (!process.stdin.isTTY) {
      hookData = await this.readHookData();
    }

    if (hookType === 'stop') {
      await this.handleStopHook(options, hookData);
    } else if (hookType === 'session-start') {
      await this.handleSessionStartHook(options, hookData);
    } else if (hookType === 'inject-memory') {
      await this.handleInjectMemoryHook(options, hookData);
    } else {
      console.error('Hook type is required. Use --type=stop, --type=session-start, or --type=inject-memory.');
      process.exit(1);
    }
  }

  private async handleStopHook(
    options: { sessionId?: string; transcriptPath?: string; cwd?: string },
    hookData?: HookData | null,
  ): Promise<void> {
    const sessionId = options.sessionId || hookData?.session_id;
    const transcriptPath = options.transcriptPath || hookData?.transcript_path;
    const cwd = options.cwd || hookData?.cwd || process.cwd();

    if (!sessionId) {
      console.error('Missing session ID. Hook message should provide session_id.');
      process.exit(1);
    }

    if (!transcriptPath) {
      console.error('Missing transcript path. Hook message should provide transcript_path.');
      process.exit(1);
    }

    console.log(`Processing conversation for session: ${sessionId}`);
    console.log(`Reading transcript from: ${transcriptPath}`);

    await this.storeConversationCommand.run([], {
      sessionId,
      transcriptPath,
      cwd,
    });
  }

  private async readHookData(): Promise<HookData | null> {
    try {
      if (process.stdin.isTTY) {
        return null; // No stdin data available
      }

      const input = await this.readStdin();
      const data = JSON.parse(input) as HookData;

      // Validate required fields based on hook type
      if (data.session_id) {
        return data;
      }

      return null;
    } catch {
      return null;
    }
  }

  private async handleSessionStartHook(options: { sessionId?: string }, hookData?: HookData | null): Promise<void> {
    try {
      const sessionId = options.sessionId || hookData?.session_id;

      if (!sessionId) {
        console.error('No session ID provided');
        process.exit(1);
      }

      // Detect the proper project root instead of using process.cwd()
      const projectContext = await detectProject();
      const projectRoot = projectContext.projectPath;

      // Create the temporal-bridge.yaml file
      const yamlContent = {
        sessionId: sessionId,
        lastUpdated: new Date().toISOString(),
        metadata: {
          source: 'session-start-hook',
        },
      };

      const yamlPath = path.join(projectRoot, 'temporal-bridge.yaml');
      await fs.writeFile(yamlPath, yaml.stringify(yamlContent));
      console.log(`Created session metadata file: ${yamlPath}`);
    } catch (error) {
      console.error('Failed to handle session start hook:', error);
      process.exit(1);
    }
  }

  private async handleInjectMemoryHook(
    options: { sessionId?: string; cwd?: string },
    hookData?: HookData | null,
  ): Promise<void> {
    try {
      // Detect project context
      const projectContext = await detectProject(options.cwd || process.cwd());
      const projectRoot = projectContext.projectPath;

      // Get session ID from temporal-bridge.yaml
      const sessionId = await this.getSessionId(projectRoot);

      if (!sessionId) {
        // No session yet, output empty context
        this.outputHookJson('');
        return;
      }

      // Construct thread ID
      const threadId = `claude-code-${sessionId}`;

      // Ensure user and thread exist in Zep
      await this.zepService.ensureUser();
      await this.zepService.ensureThread(threadId);

      // Get baseline session context from Zep's getUserContext
      const zepContext = await this.zepService.thread.getUserContext(threadId, {
        mode: 'basic', // Get structured FACTS/ENTITIES format
      });

      let contextBlock = zepContext?.context || '';

      // Check if prompt starts with "question:" for query-specific context
      const userPrompt = hookData?.prompt?.trim() || '';

      if (userPrompt.toLowerCase().startsWith('question:')) {
        try {
          // Extract the actual query (remove "question:" prefix)
          const query = userPrompt.slice(9).trim();

          if (query) {
            // Perform parallel graph searches for query-specific context
            const [edgeResults, nodeResults] = await Promise.all([
              this.zepService.graph.search({
                userId: this.zepService.userId,
                query,
                scope: Zep.GraphSearchScope.Edges,
                limit: 5,
                reranker: Zep.Reranker.CrossEncoder,
                minFactRating: 0.8, // Filter to high-confidence facts only
              }),
              this.zepService.graph.search({
                userId: this.zepService.userId,
                query,
                scope: Zep.GraphSearchScope.Nodes,
                limit: 3,
                reranker: Zep.Reranker.CrossEncoder,
              }),
            ]);

            // Format and combine query-specific results with baseline context
            const queryContext = this.buildQueryContext(edgeResults.edges || [], nodeResults.nodes || []);
            contextBlock = this.combineContexts(contextBlock, queryContext);
          }
        } catch (_graphSearchError) {
          // If graph search fails, continue with baseline context only
        }
      }

      // Output in UserPromptSubmit format
      this.outputHookJson(contextBlock);
    } catch (_error) {
      this.outputHookJson(''); // Output empty on error
    }
  }

  private async getSessionId(projectPath: string): Promise<string | null> {
    try {
      const yamlPath = path.join(projectPath, 'temporal-bridge.yaml');
      const content = await fs.readFile(yamlPath, 'utf-8');
      const sessionData = yaml.parse(content) as { sessionId?: string };
      return sessionData?.sessionId || null;
    } catch {
      return null;
    }
  }

  private outputHookJson(contextBlock: string): void {
    const output = {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: contextBlock,
      },
    };
    console.log(JSON.stringify(output, null, 2));
  }

  private buildQueryContext(edges: Zep.EntityEdge[], nodes: Zep.EntityNode[]): string {
    const formatFact = (edge: Zep.EntityEdge): string => {
      const validAt = edge.validAt ?? 'date unknown';
      const invalidAt = edge.invalidAt ?? 'present';
      return `  - ${edge.fact} (${validAt} - ${invalidAt})`;
    };

    const formatEntity = (node: Zep.EntityNode): string => {
      const name = node.name || 'Unknown Entity';
      const summary = node.summary || 'No summary available';
      return `  - Name: ${name}\n    Summary: ${summary}`;
    };

    const facts = edges.map(formatFact).join('\n');
    const entities = nodes.map(formatEntity).join('\n');

    return `
# Query-Specific Context (from graph search)
<FACTS>
${facts || '  - No facts found'}
</FACTS>

<ENTITIES>
${entities || '  - No entities found'}
</ENTITIES>
`;
  }

  private combineContexts(baselineContext: string, queryContext: string): string {
    if (!queryContext.trim()) {
      return baselineContext;
    }

    return `
# General Session Context
${baselineContext}

${queryContext}
`.trim();
  }

  private readStdin(): Promise<string> {
    return new Promise((resolve) => {
      let data = '';
      process.stdin.on('data', (chunk) => {
        data += chunk;
      });
      process.stdin.on('end', () => {
        resolve(data);
      });
    });
  }

  @Option({
    flags: '-t, --type <type>',
    description: 'Hook type: stop, session-start, or inject-memory',
  })
  parseType(value: string): 'stop' | 'session-start' | 'inject-memory' {
    if (value !== 'stop' && value !== 'session-start' && value !== 'inject-memory') {
      throw new Error('Invalid hook type. Must be "stop", "session-start", or "inject-memory"');
    }
    return value as 'stop' | 'session-start' | 'inject-memory';
  }

  @Option({
    flags: '-s, --session-id <sessionId>',
    description: 'Session ID (auto-detected if not provided)',
  })
  parseSessionId(value: string): string {
    return value;
  }

  @Option({
    flags: '-p, --transcript-path <path>',
    description: 'Path to transcript file (for stop hook)',
  })
  parseTranscriptPath(value: string): string {
    return value;
  }

  @Option({
    flags: '-c, --cwd <directory>',
    description: 'Current working directory',
  })
  parseCwd(value: string): string {
    return value;
  }
}
