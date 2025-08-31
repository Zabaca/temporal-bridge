import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';

type Override = {
  provide: unknown;
  useValue: unknown;
};

export async function setupTestApp(overrides: Override[] = []): Promise<{ module: TestingModule }> {
  try {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    if (overrides.length) {
      for (const override of overrides) {
        moduleBuilder.overrideProvider(override.provide).useValue(override.useValue);
      }
    }

    const module = await moduleBuilder.compile();

    return { module };
  } catch (err) {
    console.error('Test module setup failed:', err);
    throw err;
  }
}

// Test constants
export const TEST_SESSION_ID = 'test-session-123';
export const TEST_DEVELOPER_ID = 'test-developer';
export const TEST_PROJECT_PATH = '/home/test/Projects/temporal-bridge';

// Environment setup for tests
export function setupTestEnvironment() {
  process.env.NODE_ENV = 'test';
  process.env.ZEP_API_KEY = 'test-zep-api-key';
  process.env.DEVELOPER_ID = TEST_DEVELOPER_ID;
}
