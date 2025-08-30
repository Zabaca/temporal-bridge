import { assertEquals } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { shouldProcessProjectEntity, updateSessionInfo, readSessionInfo } from "../src/lib/session-manager.ts";

Deno.test("Project Entity Recovery - After Session File Deletion", async (t) => {
  const testDir = "/tmp/temporal-bridge-recovery-test";
  
  // Clean up any existing test directory
  try {
    await Deno.remove(testDir, { recursive: true });
  } catch {
    // Directory doesn't exist, that's fine
  }
  
  // Create test directory
  await Deno.mkdir(testDir, { recursive: true });
  
  await t.step("should trigger project entity processing when session file is missing", async () => {
    // This simulates the scenario after user deletes session file
    
    // 1. No session file exists (like after deletion)
    const noSessionFile = await readSessionInfo(testDir);
    assertEquals(noSessionFile, null, "No session file should exist initially");
    
    // 2. shouldProcessProjectEntity should return true (needs processing)
    const shouldProcess = await shouldProcessProjectEntity(testDir, "new-session-123");
    assertEquals(shouldProcess, true, "Should process project entity when no session file exists");
    
    // 3. New session starts (like in store_conversation.ts hook)
    await updateSessionInfo(testDir, {
      sessionId: "new-session-123",
      metadata: {
        source: "claude-code-hook",
        projectId: "temporal-bridge"
      }
    });
    
    // 4. Now session exists but no project entity cache
    const afterSessionCreated = await readSessionInfo(testDir);
    assertEquals(afterSessionCreated?.sessionId, "new-session-123");
    assertEquals(afterSessionCreated?.projectEntityCache, undefined, "No project entity cache yet");
    
    // 5. shouldProcessProjectEntity should still return true (needs processing)
    const shouldStillProcess = await shouldProcessProjectEntity(testDir, "new-session-123");
    assertEquals(shouldStillProcess, true, "Should still process project entity - no cache exists");
  });

  await t.step("should not process project entity when it already exists for same session", async () => {
    // Simulate project entity processing completed
    await updateSessionInfo(testDir, {
      sessionId: "new-session-123",
      projectEntityCache: {
        lastProcessed: new Date().toISOString(),
        success: true,
        technologiesDetected: 2,
        projectEntity: {
          projectId: "temporal-bridge",
          projectName: "TemporalBridge",
          displayName: "TemporalBridge",
          organization: "zabaca",
          projectPath: "/home/user/Projects/zabaca/temporal-bridge",
          projectType: "git" as const
        },
        technologies: [
          { name: "Deno", confidence: 0.95, source: "package" as const }
        ],
        relationships: [],
        rawResponses: {
          entityCreation: { name: "temporal-bridge" }
        },
        performance: {
          detectionTimeMs: 100,
          creationTimeMs: 150,
          totalTimeMs: 250
        },
        errors: []
      },
      metadata: {
        source: "claude-code-hook",
        projectId: "temporal-bridge"
      }
    });
    
    // Now shouldProcessProjectEntity should return false (already processed for this session)
    const shouldNotProcess = await shouldProcessProjectEntity(testDir, "new-session-123");
    assertEquals(shouldNotProcess, false, "Should not process project entity when already done for this session");
  });

  await t.step("should process project entity for different session", async () => {
    // Different session should trigger processing again
    const shouldProcessNewSession = await shouldProcessProjectEntity(testDir, "different-session-456");
    assertEquals(shouldProcessNewSession, true, "Should process project entity for different session");
  });

  // Clean up
  await Deno.remove(testDir, { recursive: true });
});