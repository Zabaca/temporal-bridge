import { assertEquals } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { updateSessionInfo, readSessionInfo } from "../src/lib/session-manager.ts";
import { ClaudeSessionInfo } from "../src/lib/types.ts";

Deno.test("Session Preservation - Project Entity Data", async (t) => {
  const testDir = "/tmp/temporal-bridge-session-preservation-test";
  
  // Clean up any existing test directory
  try {
    await Deno.remove(testDir, { recursive: true });
  } catch {
    // Directory doesn't exist, that's fine
  }
  
  // Create test directory
  await Deno.mkdir(testDir, { recursive: true });
  
  await t.step("should preserve project entity data when starting new session", async () => {
    // First, create a session with full project entity data
    const initialSessionInfo: ClaudeSessionInfo = {
      sessionId: "old-session-123",
      lastUpdated: new Date().toISOString(),
      projectEntityCache: {
        lastProcessed: "2025-08-30T10:00:00.000Z",
        success: true,
        technologiesDetected: 5,
        projectEntity: {
          projectId: "temporal-bridge",
          projectName: "TemporalBridge",
          displayName: "TemporalBridge",
          organization: "zabaca",
          projectPath: "/home/user/Projects/zabaca/temporal-bridge",
          projectType: "git",
          repository: "https://github.com/zabaca/temporal-bridge.git"
        },
        technologies: [
          { name: "Deno", confidence: 0.95, version: "1.45.0", source: "package" as const },
          { name: "TypeScript", confidence: 0.92, version: "5.5.0", source: "package" as const }
        ],
        relationships: [
          {
            subject: "developer",
            predicate: "WORKS_ON" as const,
            object: "temporal-bridge",
            confidence: 0.9
          }
        ],
        rawResponses: {
          entityCreation: { name: "temporal-bridge" },
          relationshipCreation: { count: 1 }
        },
        performance: {
          detectionTimeMs: 150,
          creationTimeMs: 200,
          totalTimeMs: 350
        },
        errors: []
      },
      metadata: {
        source: "claude-code-hook",
        projectId: "temporal-bridge",
        organization: "zabaca"
      }
    };
    
    // Write the initial session with project entity data
    await updateSessionInfo(testDir, initialSessionInfo);
    
    // Verify it was written correctly
    const written = await readSessionInfo(testDir);
    assertEquals(written?.projectEntityCache?.success, true);
    assertEquals(written?.projectEntityCache?.technologiesDetected, 5);
    assertEquals(written?.projectEntityCache?.technologies?.length, 2);
    
    // Now simulate a new session starting (like what happens in store_conversation.ts)
    // This should NOT clear the project entity data
    await updateSessionInfo(testDir, {
      sessionId: "new-session-456",
      metadata: {
        source: "claude-code-hook",
        projectId: "temporal-bridge"
      }
    });
    
    // Read back and verify project entity data is preserved
    const afterNewSession = await readSessionInfo(testDir);
    
    // Session ID should be updated
    assertEquals(afterNewSession?.sessionId, "new-session-456");
    assertEquals(afterNewSession?.metadata?.source, "claude-code-hook");
    
    // But project entity cache should be preserved
    console.log("DEBUG: afterNewSession projectEntityCache:", JSON.stringify(afterNewSession?.projectEntityCache, null, 2));
    
    assertEquals(afterNewSession?.projectEntityCache?.success, true, "success should be preserved");
    assertEquals(afterNewSession?.projectEntityCache?.lastProcessed, "2025-08-30T10:00:00.000Z", "lastProcessed should be preserved"); 
    assertEquals(afterNewSession?.projectEntityCache?.technologiesDetected, 5);
    assertEquals(afterNewSession?.projectEntityCache?.technologies?.length, 2);
    assertEquals(afterNewSession?.projectEntityCache?.projectEntity?.projectId, "temporal-bridge");
    assertEquals(afterNewSession?.projectEntityCache?.relationships?.length, 1);
    assertEquals(afterNewSession?.projectEntityCache?.performance?.totalTimeMs, 350);
  });

  await t.step("should handle new session when no existing project entity data", async () => {
    // Clean slate - new directory
    const cleanTestDir = "/tmp/temporal-bridge-clean-session-test";
    await Deno.mkdir(cleanTestDir, { recursive: true });
    
    // Start new session with no existing data
    await updateSessionInfo(cleanTestDir, {
      sessionId: "brand-new-session-789",
      metadata: {
        source: "claude-code-hook",
        projectId: "new-project"
      }
    });
    
    const result = await readSessionInfo(cleanTestDir);
    assertEquals(result?.sessionId, "brand-new-session-789");
    assertEquals(result?.projectEntityCache, undefined); // No project entity data yet
    
    // Clean up
    await Deno.remove(cleanTestDir, { recursive: true });
  });

  // Clean up
  await Deno.remove(testDir, { recursive: true });
});