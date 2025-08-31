import { Module } from '@nestjs/common';
import { HookCommand } from './commands/hook.command';
import { StoreConversationCommand } from './commands/store-conversation.command';
import { MemoryToolsService, ProjectEntitiesService, SessionManager, ZepService } from './lib';

@Module({
  providers: [
    HookCommand,
    StoreConversationCommand,
    SessionManager,
    ZepService,
    MemoryToolsService,
    ProjectEntitiesService,
  ],
})
export class AppModule {}
