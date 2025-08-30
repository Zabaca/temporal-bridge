import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { MemoryToolsService } from '../lib/memory-tools';
import type { UnifiedMemoryQuery } from '../lib/types';

interface SearchOptions {
  query?: string;
  thread?: string;
  user?: string;
  limit?: number;
  scope?: 'edges' | 'nodes' | 'episodes';
  minRating?: number;
  reranker?: 'cross_encoder' | 'none';
  debugListProjects?: boolean;
  debugPortfolio?: boolean;
}

@Injectable()
@Command({
  name: 'search',
  description: 'Search and retrieve memories from Zep temporal knowledge graphs',
})
export class SearchCommand extends CommandRunner {
  constructor(private readonly memoryTools: MemoryToolsService) {
    super();
  }
  async run(_passedParams: string[], options?: SearchOptions): Promise<void> {
    const searchOptions: UnifiedMemoryQuery = {};

    if (options?.query) {
      searchOptions.query = options.query;
    }
    if (options?.thread) {
      searchOptions.threadId = options.thread;
    }
    if (options?.user) {
      searchOptions.userId = options.user;
    }
    if (options?.limit) {
      searchOptions.limit = options.limit;
    }
    if (options?.scope) {
      searchOptions.searchScope = options.scope;
    }
    if (options?.minRating) {
      searchOptions.minRating = options.minRating;
    }
    if (options?.reranker) {
      searchOptions.reranker = options.reranker;
    }
    if (options?.debugListProjects) {
      searchOptions.debugListProjects = true;
    }
    if (options?.debugPortfolio) {
      searchOptions.debugPortfolio = true;
    }

    try {
      const results = await this.memoryTools.retrieveMemory(searchOptions);
      console.log(JSON.stringify(results, null, 2));
    } catch (error) {
      console.error('❌ Search failed:', error);
      process.exit(1);
    }
  }

  @Option({
    flags: '-q, --query <query>',
    description: 'Search query string',
  })
  parseQuery(value: string): string {
    return value;
  }

  @Option({
    flags: '-t, --thread <thread>',
    description: 'Thread ID to search within',
  })
  parseThread(value: string): string {
    return value;
  }

  @Option({
    flags: '-u, --user <user>',
    description: 'User ID for search',
  })
  parseUser(value: string): string {
    return value;
  }

  @Option({
    flags: '-l, --limit <limit>',
    description: 'Maximum number of results',
  })
  parseLimit(value: string): number {
    return Number.parseInt(value, 10);
  }

  @Option({
    flags: '-s, --scope <scope>',
    description: 'Search scope: edges, nodes, or episodes',
    choices: ['edges', 'nodes', 'episodes'],
  })
  parseScope(value: string): 'edges' | 'nodes' | 'episodes' {
    return value as 'edges' | 'nodes' | 'episodes';
  }

  @Option({
    flags: '-r, --min-rating <rating>',
    description: 'Minimum relevance rating',
  })
  parseMinRating(value: string): number {
    return Number.parseFloat(value);
  }

  @Option({
    flags: '--reranker <reranker>',
    description: 'Reranker type: cross_encoder or none',
    choices: ['cross_encoder', 'none'],
  })
  parseReranker(value: string): 'cross_encoder' | 'none' {
    return value as 'cross_encoder' | 'none';
  }

  @Option({
    flags: '--debug-list-projects',
    description: 'Debug: List all projects',
  })
  parseDebugListProjects(): boolean {
    return true;
  }

  @Option({
    flags: '--debug-portfolio',
    description: 'Debug: Show portfolio analytics',
  })
  parseDebugPortfolio(): boolean {
    return true;
  }
}
