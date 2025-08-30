import { assertEquals } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { writeSessionInfo, readSessionInfo } from "../src/lib/session-manager.ts";
import { ClaudeSessionInfo } from "../src/lib/types.ts";

Deno.test("YAML Fix - Undefined Value Handling", async (t) => {
  const testDir = "/tmp/temporal-bridge-yaml-fix-test";
  
  // Clean up any existing test directory
  try {
    await Deno.remove(testDir, { recursive: true });
  } catch {
    // Directory doesn't exist, that's fine
  }
  
  // Create test directory
  await Deno.mkdir(testDir, { recursive: true });
  
  await t.step("should successfully write and read session info with undefined values", async () => {
    // This should now work with our undefined value filtering fix
    const sessionInfoWithUndefined: ClaudeSessionInfo = {
      sessionId: "test-session-fixed-123",
      lastUpdated: new Date().toISOString(),
      projectEntityCache: {
        lastProcessed: "",
        success: false,
        technologiesDetected: undefined, // These undefineds should be filtered out
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

    // This should now succeed without throwing YAML errors
    await writeSessionInfo(testDir, sessionInfoWithUndefined);
    
    // Verify the file was written and can be read back
    const readBack = await readSessionInfo(testDir);
    assertEquals(readBack?.sessionId, "test-session-fixed-123");
    assertEquals(readBack?.metadata?.source, "test");
    assertEquals(readBack?.metadata?.projectId, "test-project");
    
    // The projectEntityCache should exist but undefined fields should be filtered out
    assertEquals(readBack?.projectEntityCache?.lastProcessed, "");
    assertEquals(readBack?.projectEntityCache?.success, false);
    // These should be undefined (filtered out)
    assertEquals(readBack?.projectEntityCache?.technologiesDetected, undefined);
  });

  await t.step("should handle completely undefined projectEntityCache", async () => {
    const sessionInfoMinimal: ClaudeSessionInfo = {
      sessionId: "test-session-minimal",
      lastUpdated: new Date().toISOString(),
      projectEntityCache: undefined,
      metadata: {
        source: "test-minimal"
      }
    };

    // This should work and omit the undefined projectEntityCache
    await writeSessionInfo(testDir, sessionInfoMinimal);
    
    const readBack = await readSessionInfo(testDir);
    assertEquals(readBack?.sessionId, "test-session-minimal");
    assertEquals(readBack?.projectEntityCache, undefined);
  });

  // Clean up
  await Deno.remove(testDir, { recursive: true });
});