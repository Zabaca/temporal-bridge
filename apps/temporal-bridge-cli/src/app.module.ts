import { Module } from '@nestjs/common';
import { MemoryToolsService, ProjectEntitiesService, SessionManager, ZepClient } from '@temporal-bridge/core';
import { SearchCommand } from './commands/search.command';
import { ShareKnowledgeCommand } from './commands/share-knowledge.command';
import { StoreConversationCommand } from './commands/store-conversation.command';

@Module({
  providers: [
    SearchCommand,
    StoreConversationCommand,
    ShareKnowledgeCommand,
    SessionManager,
    ZepClient,
    MemoryToolsService,
    ProjectEntitiesService,
  ],
})
export class AppModule {}
