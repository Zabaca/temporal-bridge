import { Module } from '@nestjs/common';
import { McpTransportType, McpModule as ReKogMcpModule } from '@rekog/mcp-nest';
import { MemoryToolsService, ProjectEntitiesService, SessionManager, ZepService } from '../lib';
import { TemporalBridgeToolsService } from './temporal-bridge-tools.service';

@Module({
  imports: [
    ReKogMcpModule.forRoot({
      name: 'temporal-bridge',
      version: '1.0.0',
      instructions:
        'AI memory system that creates searchable, temporal knowledge graphs from Claude Code conversations',
      transport: McpTransportType.STDIO,
    }),
  ],
  providers: [
    // Core services
    ZepService,
    MemoryToolsService,
    ProjectEntitiesService,
    SessionManager,

    // MCP tools
    TemporalBridgeToolsService,
  ],
})
export class McpModule {}
