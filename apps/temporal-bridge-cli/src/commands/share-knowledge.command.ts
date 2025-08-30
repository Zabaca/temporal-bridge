import { Injectable } from '@nestjs/common';
import { MemoryToolsService } from '../lib/memory-tools';
import { Command, CommandRunner, Option } from 'nest-commander';

interface ShareKnowledgeOptions {
  project?: string;
}

@Injectable()
@Command({
  name: 'share-knowledge',
  description: 'Share a piece of knowledge to a project knowledge graph.',
  arguments: '<message>',
})
export class ShareKnowledgeCommand extends CommandRunner {
  constructor(private readonly memoryTools: MemoryToolsService) {
    super();
  }

  async run([message]: string[], options: ShareKnowledgeOptions): Promise<void> {
    if (!message) {
      console.error('❌ Error: The <message> argument is required.');
      process.exit(1);
    }
    try {
      const result = await this.memoryTools.shareToProjectGroup(message, options.project);
      console.log(result.message);
    } catch (error) {
      console.error('❌ Error sharing knowledge:', (error as Error).message);
      process.exit(1);
    }
  }

  @Option({
    flags: '-p, --project <project>',
    description: 'Specify a project to share the knowledge with.',
  })
  parseProject(val: string): string {
    return val;
  }
}
