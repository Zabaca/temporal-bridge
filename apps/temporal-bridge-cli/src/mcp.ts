#!/usr/bin/env node

/**
 * TemporalBridge MCP Server
 * Provides memory search and retrieval tools for Claude via MCP protocol
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { McpModule } from './mcp/mcp.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(McpModule);
    await app.init();
    
    // The MCP server runs on stdio, so we don't need to listen on a port
    console.error('TemporalBridge MCP Server started');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

bootstrap();