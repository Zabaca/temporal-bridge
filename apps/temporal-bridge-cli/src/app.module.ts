import { Module } from '@nestjs/common';
import { SearchCommand } from './commands/search.command';
import { ShareKnowledgeCommand } from './commands/share-knowledge.command';
import { StoreConversationCommand } from './commands/store-conversation.command';
import { MemoryToolsService, ProjectEntitiesService, SessionManager, ZepService } from './lib';

@Module({
  providers: [
    SearchCommand,
    StoreConversationCommand,
    ShareKnowledgeCommand,
    SessionManager,
    ZepService,
    MemoryToolsService,
    ProjectEntitiesService,
  ],
})
export class AppModule {}
