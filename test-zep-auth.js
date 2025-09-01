#!/usr/bin/env node

/**
 * Simple test to verify Zep API authentication
 */

const { ZepClient } = require('@getzep/zep-cloud');

console.log('🧪 Testing Zep API Authentication');

// Check if API key is available
const apiKey = process.env.ZEP_API_KEY;
if (!apiKey) {
  console.error('❌ ZEP_API_KEY environment variable not set');
  process.exit(1);
}

console.log(`🔑 API Key found: ${apiKey.substring(0, 20)}...`);

// Test the connection
async function testConnection() {
  try {
    const client = new ZepClient({ apiKey });
    
    console.log('📡 Testing connection to Zep API...');
    
    // Try to create/get a test user
    const testUserId = 'test-doc-ingestion';
    
    try {
      await client.user.get(testUserId);
      console.log('✅ User already exists');
    } catch (error) {
      if (error.statusCode === 404) {
        console.log('👤 Creating test user...');
        await client.user.add({
          userId: testUserId,
          firstName: 'Test',
          metadata: { test: true }
        });
        console.log('✅ Test user created successfully');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 Zep API authentication successful!');
    
  } catch (error) {
    console.error('❌ Zep API test failed:', error.message);
    if (error.statusCode) {
      console.error(`   Status: ${error.statusCode}`);
      console.error(`   Body: ${error.body}`);
    }
    process.exit(1);
  }
}

testConnection();