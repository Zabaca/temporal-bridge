// Vitest global setup for tests
import { setupTestEnvironment } from './test-helpers';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Load test.env file if it exists (for E2E tests)
try {
  const testEnvPath = join(process.cwd(), 'test.env');
  const envContent = readFileSync(testEnvPath, 'utf8');
  
  // Parse .env file format
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  }
  console.log('📁 Loaded test.env for E2E testing');
} catch {
  // test.env doesn't exist, that's fine
}

// Set up test environment
setupTestEnvironment();
