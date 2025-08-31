import { Module } from '@nestjs/common';
import { StoreConversationCommand } from './commands/store-conversation.command';
import { MemoryToolsService, ProjectEntitiesService, SessionManager, ZepService } from './lib';

@Module({
  providers: [
    StoreConversationCommand,
    SessionManager,
    ZepService,
    MemoryToolsService,
    ProjectEntitiesService,
  ],
})
export class AppModule {}
