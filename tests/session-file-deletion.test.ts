import { assertEquals } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { updateSessionInfo, readSessionInfo } from "../src/lib/session-manager.ts";
import { ClaudeSessionInfo } from "../src/lib/types.ts";

Deno.test("Session File Deletion - Data Loss Scenario", async (t) => {
  const testDir = "/tmp/temporal-bridge-deletion-test";
  
  // Clean up any existing test directory
  try {
    await Deno.remove(testDir, { recursive: true });
  } catch {
    // Directory doesn't exist, that's fine
  }
  
  // Create test directory
  await Deno.mkdir(testDir, { recursive: true });
  
  await t.step("should lose project entity data when session file is deleted", async () => {
    // Step 1: Create a session with project entity data (like after first hook run)
    await updateSessionInfo(testDir, {
      sessionId: "first-session",
      projectEntityCache: {
        lastProcessed: "2025-08-30T10:00:00.000Z",
        success: true,
        technologiesDetected: 3,
        projectEntity: {
          projectId: "temporal-bridge",
          projectName: "TemporalBridge",
          displayName: "TemporalBridge",
          organization: "zabaca",
          projectPath: "/home/user/Projects/zabaca/temporal-bridge",
          projectType: "git" as const,
          repository: "https://github.com/zabaca/temporal-bridge.git"
        },
        technologies: [
          { name: "Deno", confidence: 0.95, source: "package" as const },
          { name: "TypeScript", confidence: 0.92, source: "package" as const }
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
    
    // Verify project entity data exists
    const beforeDeletion = await readSessionInfo(testDir);
    assertEquals(beforeDeletion?.projectEntityCache?.success, true);
    assertEquals(beforeDeletion?.projectEntityCache?.technologiesDetected, 3);
    
    // Step 2: Simulate user deleting the session file (or clearing session in Claude Code)
    await Deno.remove(`${testDir}/temporal-bridge.yaml`);
    
    // Verify file is gone
    const afterDeletion = await readSessionInfo(testDir);
    assertEquals(afterDeletion, null, "Session file should be gone");
    
    // Step 3: Simulate new session starting (like what happens in store_conversation.ts hook)
    await updateSessionInfo(testDir, {
      sessionId: "new-session-after-deletion",
      metadata: {
        source: "claude-code-hook", 
        projectId: "temporal-bridge"
      }
    });
    
    // Step 4: Verify that project entity data is lost
    const afterNewSession = await readSessionInfo(testDir);
    assertEquals(afterNewSession?.sessionId, "new-session-after-deletion");
    assertEquals(afterNewSession?.projectEntityCache, undefined, "Project entity data should be lost when file was deleted");
  });

  await t.step("simulate what happens when shouldProcessProjectEntity is called", async () => {
    // This simulates the exact scenario:
    // 1. Session file deleted 
    // 2. New hook runs
    // 3. shouldProcessProjectEntity checks if processing needed
    // 4. Since no session file exists, it returns true
    // 5. But project entity processing might not run due to other logic
    
    const { shouldProcessProjectEntity } = await import("../src/lib/session-manager.ts");
    
    // After file deletion, this should return true (needs processing)
    const shouldProcess = await shouldProcessProjectEntity(testDir, "new-session-after-deletion");
    assertEquals(shouldProcess, true, "Should need to process project entity after file deletion");
  });

  // Clean up
  await Deno.remove(testDir, { recursive: true });
});