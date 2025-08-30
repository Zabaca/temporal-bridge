import { assertEquals, assertRejects } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { updateSessionInfo, writeSessionInfo, readSessionInfo } from "../src/lib/session-manager.ts";
import { ClaudeSessionInfo } from "../src/lib/types.ts";

Deno.test("Session Manager - YAML Serialization", async (t) => {
  const testDir = "/tmp/temporal-bridge-test-session";
  
  // Clean up any existing test directory
  try {
    await Deno.remove(testDir, { recursive: true });
  } catch {
    // Directory doesn't exist, that's fine
  }
  
  // Create test directory
  await Deno.mkdir(testDir, { recursive: true });
  
  await t.step("should handle undefined values in session info (FIXED)", async () => {
    // This reproduces the YAML error from the screenshot, but should now work
    const sessionInfoWithUndefined: ClaudeSessionInfo = {
      sessionId: "test-session-123",
      lastUpdated: new Date().toISOString(),
      projectEntityCache: {
        lastProcessed: "",
        success: false,
        technologiesDetected: undefined, // These undefineds used to cause YAML error
        projectEntity: undefined, 
        technologies: undefined, 
        relationships: undefined, 
        rawResponses: undefined, 
        performance: undefined, 
        errors: undefined,
      },
      metadata: {
        source: "test",
        projectId: "test-project"
      }
    };

    // This should now succeed (no longer throws YAML errors)
    await writeSessionInfo(testDir, sessionInfoWithUndefined);
    
    // Verify it was written correctly
    const readBack = await readSessionInfo(testDir);
    assertEquals(readBack?.sessionId, "test-session-123");
  });

  await t.step("should handle updateSessionInfo with undefined cache values (FIXED)", async () => {
    // This reproduces the actual scenario from the store_conversation.ts call
    // Should now work without errors
    await updateSessionInfo(testDir, {
      sessionId: "test-session-123-updated",
      metadata: {
        source: "claude-code-hook",
        projectId: "test-project"
      }
    });
    
    // Verify it was updated correctly
    const readBack = await readSessionInfo(testDir);
    assertEquals(readBack?.sessionId, "test-session-123-updated");
    assertEquals(readBack?.metadata?.source, "claude-code-hook");
  });

  // Clean up
  await Deno.remove(testDir, { recursive: true });
});

Deno.test("Session Manager - Undefined Handling Edge Cases", async (t) => {
  const testDir = "/tmp/temporal-bridge-test-session-2";
  
  await Deno.mkdir(testDir, { recursive: true });
  
  await t.step("should reproduce exact scenario from store_conversation.ts (FIXED)", async () => {
    // This exactly mirrors the updateSessionInfo call from store_conversation.ts:204-210
    const updates = {
      sessionId: "0b38d11f-3d60-4ebb-8b29-caa3adce6930",
      metadata: {
        source: "claude-code-hook",
        projectId: "temporal-bridge"
      }
    };

    // This should now work without YAML serialization errors
    await updateSessionInfo(testDir, updates);
    
    // Verify it worked
    const readBack = await readSessionInfo(testDir);
    assertEquals(readBack?.sessionId, "0b38d11f-3d60-4ebb-8b29-caa3adce6930");
    assertEquals(readBack?.metadata?.projectId, "temporal-bridge");
  });

  // Clean up
  await Deno.remove(testDir, { recursive: true });
});