import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import * as yaml from 'yaml';
import { HookData } from '../lib/types';
import { StoreConversationCommand } from './store-conversation.command';
import { detectProject } from '../lib/project-detector';

@Injectable()
@Command({
  name: 'hook',
  description: 'Claude Code hook handler for Stop and SessionStart events',
})
export class HookCommand extends CommandRunner {
  constructor(private readonly storeConversationCommand: StoreConversationCommand) {
    super();
  }

  async run(
    _inputs: string[],
    options: {
      type?: 'stop' | 'session-start';
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
    } else {
      console.error('Hook type is required. Use --type=stop or --type=session-start.');
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
    description: 'Hook type: stop or session-start',
  })
  parseType(value: string): 'stop' | 'session-start' {
    if (value !== 'stop' && value !== 'session-start') {
      throw new Error('Invalid hook type. Must be "stop" or "session-start"');
    }
    return value as 'stop' | 'session-start';
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
