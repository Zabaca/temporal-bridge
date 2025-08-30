/**
 * TemporalBridge - Zep Client Service
 * Injectable NestJS service for interacting with Zep's temporal knowledge graphs
 */

import { ZepClient, ZepError } from '@getzep/zep-cloud';
import { Injectable } from '@nestjs/common';
export { ZepError };

// Re-export common Zep types
export type Reranker = 'rrf' | 'mmr' | 'node_distance' | 'episode_mentions' | 'cross_encoder';

interface ApiError extends Error {
  statusCode?: number;
}

@Injectable()
export class ZepService extends ZepClient {
  public readonly userId: string;

  constructor() {
    const apiKey = process.env.ZEP_API_KEY;

    if (!apiKey) {
      console.error('❌ ZEP_API_KEY environment variable not set');
      throw new Error('ZEP_API_KEY is required');
    }

    super({ apiKey });

    this.userId = process.env.DEVELOPER_ID || 'developer';
  }

  /**
   * Ensure user exists in Zep, create if needed
   */
  async ensureUser(userId?: string): Promise<void> {
    const userIdToUse = userId || this.userId;

    try {
      await this.user.get(userIdToUse);
    } catch (_error) {
      try {
        await this.user.add({
          userId: userIdToUse,
          firstName: 'Developer',
          metadata: {
            tool: 'temporal-bridge',
            created_by: 'claude-code',
          },
        });
      } catch (createError) {
        const apiError = createError as ApiError;
        // User might already exist, which is fine
        if (apiError.statusCode === 400 && apiError.message?.includes('user already exists')) {
          return;
        }
        console.error('❌ Failed to create user:', createError);
        throw createError;
      }
    }
  }

  /**
   * Ensure thread exists in Zep, create if needed
   */
  async ensureThread(threadId: string, userId?: string): Promise<void> {
    const userIdToUse = userId || this.userId;

    try {
      await this.thread.create({
        threadId: threadId,
        userId: userIdToUse,
      });
    } catch (createError) {
      const apiError = createError as ApiError;
      // Thread might already exist, which is fine
      if (apiError.statusCode === 409 || apiError.message?.includes('already exists')) {
        return;
      }
      console.error('❌ Failed to create thread:', createError);
      throw createError;
    }
  }
}
