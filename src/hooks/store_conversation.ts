#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-net

/**
 * TemporalBridge - Conversation Storage Hook
 * Claude Code hook to automatically store conversations in Zep's knowledge graph
 */

import type { HookData, TranscriptMessage, ParsedMessage } from "../lib/types.ts";
import { createZepClient, ensureUser, ensureThread, getDefaultConfigAsync } from "../lib/zep-client.ts";
import { detectProject } from "../lib/project-detector.ts";
import { ensureProjectEntity, createSessionProjectRelationship } from "../lib/project-entities.ts";

/**
 * File-based UUID tracking to prevent duplicate message storage
 */
async function loadStoredUuids(sessionId: string): Promise<Set<string>> {
  const uuidFile = `/home/uptown/.claude/temporal-bridge-stored-uuids-${sessionId}.txt`;
  try {
    const content = await Deno.readTextFile(uuidFile);
    return new Set(content.split('\n').filter(line => line.trim()));
  } catch {
    return new Set(); // File doesn't exist yet
  }
}

async function saveStoredUuids(sessionId: string, uuids: Set<string>): Promise<void> {
  const uuidFile = `/home/uptown/.claude/temporal-bridge-stored-uuids-${sessionId}.txt`;
  const content = Array.from(uuids).join('\n');
  await Deno.writeTextFile(uuidFile, content);
}

function findCurrentTransaction(parsedMessages: ParsedMessage[], rawMessages: TranscriptMessage[]): ParsedMessage[] {
  if (parsedMessages.length === 0) return [];
  
  // Find the last assistant message (the one that just triggered the Stop hook)
  const lastAssistantMsg = parsedMessages.filter(m => m.role === 'assistant').pop();
  if (!lastAssistantMsg) return parsedMessages; // Fallback if no assistant message
  
  console.log(`🔍 DEBUG: Starting transaction detection from assistant message: ${lastAssistantMsg.uuid}`);
  
  // Walk backwards through parent chain to collect the transaction
  const transactionMessages: ParsedMessage[] = [];
  let currentUuid = lastAssistantMsg.uuid;
  
  while (currentUuid) {
    // Find current message in parsed messages
    const currentParsedMsg = parsedMessages.find(m => m.uuid === currentUuid);
    if (!currentParsedMsg) {
      // If we can't find in parsed messages, try to get parent from raw messages
      const currentRawMsg = rawMessages.find(m => m.uuid === currentUuid);
      if (currentRawMsg && currentRawMsg.parentUuid) {
        currentUuid = currentRawMsg.parentUuid;
        continue;
      } else {
        break;
      }
    }
    
    // Add to beginning of transaction
    transactionMessages.unshift(currentParsedMsg);
    
    // If we've found a user message and the transaction starts with user, we're done
    if (currentParsedMsg.role === 'user' && transactionMessages[0]?.role === 'user') {
      console.log(`🔍 DEBUG: Found complete user->assistant transaction`);
      break;
    }
    
    // Get parent UUID - prefer from parsed message, fallback to raw message
    let parentUuid = currentParsedMsg.parentUuid;
    if (!parentUuid) {
      const currentRawMsg = rawMessages.find(m => m.uuid === currentUuid);
      parentUuid = currentRawMsg?.parentUuid;
    }
    
    if (!parentUuid) break;
    currentUuid = parentUuid;
  }
  
  console.log(`🔍 DEBUG: Found transaction with ${transactionMessages.length} messages: ${transactionMessages.map(m => m.role).join(' -> ')}`);
  return transactionMessages;
}

async function storeConversation(hookData: HookData): Promise<void> {
  const client = createZepClient();
  
  // Read the entire conversation transcript
  const transcriptPath = hookData.transcript_path;
  if (!transcriptPath) {
    console.error("No transcript path provided");
    return;
  }

  const transcriptContent = await Deno.readTextFile(transcriptPath);
  const lines = transcriptContent.split("\n").filter((line) => line.trim());

  // Parse all messages from the conversation
  const messages = [];
  for (const line of lines) {
    try {
      const msg: TranscriptMessage = JSON.parse(line);

      // Skip system and tool-related messages
      if (msg.type === "system" || !msg.message) {
        continue;
      }

      // Extract message content based on format
      let content = "";
      let role = "user";
      let name = "Developer";

      // Determine role and extract content properly
      if (msg.type === "assistant" && msg.message) {
        role = "assistant";
        name = "Claude Code";

        // Assistant messages have content as an array
        if (Array.isArray(msg.message.content)) {
          // Extract text from content array, ignoring tool_use entries
          const textContent = msg.message.content
            .filter((item: any) => item.type === "text")
            .map((item: any) => item.text)
            .join("\n");
          content = textContent;
        }
      } else if (msg.type === "user" && msg.message) {
        role = "user";
        name = "Developer";

        // User messages have content as a string or array
        if (typeof msg.message.content === "string") {
          content = msg.message.content;
        } else if (Array.isArray(msg.message.content)) {
          // Handle tool results - extract the actual user content
          const userContent = msg.message.content
            .filter((item: any) => item.type !== "tool_result")
            .map((item: any) => item.content || item.text || "")
            .join("\n");
          content = userContent;
        }
      }

      // Only add non-empty messages
      if (content.trim()) {
        messages.push({
          role,
          name,
          content: content.trim(),
          uuid: msg.uuid || "",
          parentUuid: msg.parentUuid,
          timestamp: msg.timestamp,
        });
      }
    } catch (e) {
      // Skip malformed lines
      continue;
    }
  }

  // Get configuration with simplified user ID and project context
  const config = await getDefaultConfigAsync();
  const projectContext = config.projectContext || await detectProject(hookData.cwd);
  const userId = config.userId || "developer"; // Simple developer ID, no project scoping
  const threadId = `claude-code-${hookData.session_id}`; // Session-based thread ID

  // Ensure user and thread exist
  await ensureUser(client, userId);
  await ensureThread(client, threadId, userId);

  // Create/update project entity and relationships (optimized - only on first message of session)
  let projectEntityResult;
  try {
    const { shouldProcessProjectEntity, markProjectEntityProcessed } = await import("../lib/session-manager.ts");
    
    const shouldCreateEntity = await shouldProcessProjectEntity(
      projectContext.projectPath, 
      hookData.session_id
    );
    
    if (shouldCreateEntity) {
      console.log(`🔄 Creating/updating project entity for session ${hookData.session_id}`);
      
      // Track performance metrics
      const startTime = performance.now();
      let detectionTime = 0;
      let creationTime = 0;
      
      const detectionStart = performance.now();
      projectEntityResult = await ensureProjectEntity(projectContext.projectPath);
      const detectionEnd = performance.now();
      detectionTime = detectionEnd - detectionStart;
      
      if (projectEntityResult.success) {
        console.log(`✅ Project entity: ${projectEntityResult.projectEntity?.name} (${projectEntityResult.technologiesDetected} technologies)`);
        
        // Create session-project relationship
        const relationStart = performance.now();
        const sessionRelationResult = await createSessionProjectRelationship(
          hookData.session_id, 
          projectContext.projectId
        );
        const relationEnd = performance.now();
        creationTime = relationEnd - relationStart;
        
        const totalTime = performance.now() - startTime;
        
        if (sessionRelationResult.success) {
          console.log(`🔗 Session linked to project: ${sessionRelationResult.message}`);
          
          // Mark as processed in session cache with full details
          await markProjectEntityProcessed(
            projectContext.projectPath,
            hookData.session_id,
            {
              success: true,
              technologiesDetected: projectEntityResult.technologiesDetected,
              projectEntity: projectEntityResult.projectEntity,
              technologies: projectEntityResult.detectedTechnologies || [],
              relationships: projectEntityResult.relationships,
              rawResponses: {
                entityCreation: projectEntityResult,
                relationshipCreation: sessionRelationResult
              },
              performance: {
                detectionTimeMs: Math.round(detectionTime),
                creationTimeMs: Math.round(creationTime),
                totalTimeMs: Math.round(totalTime)
              },
              errors: []
            }
          );
        } else {
          console.warn(`⚠️  Failed to link session to project: ${sessionRelationResult.error}`);
          await markProjectEntityProcessed(
            projectContext.projectPath,
            hookData.session_id,
            {
              success: false,
              technologiesDetected: projectEntityResult.technologiesDetected,
              projectEntity: projectEntityResult.projectEntity,
              technologies: [],
              relationships: projectEntityResult.relationships || [],
              rawResponses: {
                entityCreation: projectEntityResult,
                relationshipCreation: sessionRelationResult
              },
              performance: {
                detectionTimeMs: Math.round(detectionTime),
                creationTimeMs: Math.round(creationTime),
                totalTimeMs: Math.round(performance.now() - startTime)
              },
              errors: [sessionRelationResult.error || 'Session relationship creation failed']
            }
          );
        }
      } else {
        console.warn(`⚠️  Project entity creation failed: ${projectEntityResult.error}`);
        await markProjectEntityProcessed(
          projectContext.projectPath,
          hookData.session_id,
          {
            success: false,
            technologiesDetected: 0,
            projectEntity: undefined,
            technologies: [],
            relationships: [],
            rawResponses: {
              entityCreation: projectEntityResult
            },
            performance: {
              detectionTimeMs: Math.round(detectionTime),
              creationTimeMs: 0,
              totalTimeMs: Math.round(performance.now() - startTime)
            },
            errors: [projectEntityResult.error || 'Project entity creation failed']
          }
        );
      }
    } else {
      // Session already processed recently, just log
      console.log(`⚡ Using cached project entity for session ${hookData.session_id}`);
    }
  } catch (entityError) {
    console.error(`❌ Error during project entity creation:`, entityError);
    // Continue with conversation storage even if entity creation fails
  }

  // Find current transaction using parent-child relationships
  const transactionMessages = findCurrentTransaction(messages, lines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(msg => msg !== null));

  // Write current session info to project directory for current thread detection
  const { updateSessionInfo } = await import("../lib/session-manager.ts");
  try {
    await updateSessionInfo(projectContext.projectPath, {
      sessionId: hookData.session_id,
      metadata: {
        source: "claude-code-hook",
        projectId: projectContext.projectId
      }
    });
  } catch (sessionError) {
    console.error(`❌ Failed to write session info file:`, sessionError);
  }

  // DEBUG: Write parsed messages to debug file
  const debugFile = `/home/uptown/.claude/temporal-bridge-debug-${hookData.session_id}.json`;
  const debugData = {
    timestamp: new Date().toISOString(),
    session_id: hookData.session_id,
    hook_event: hookData.hook_event_name,
    project_context: projectContext,
    user_id: userId,
    thread_id: threadId,
    storage_architecture: "user_graph_with_project_entities",
    total_messages_parsed: messages.length,
    current_transaction_messages: transactionMessages.length,
    project_entity_result: projectEntityResult ? {
      success: projectEntityResult.success,
      project_name: projectEntityResult.projectEntity?.name,
      technologies_detected: projectEntityResult.technologiesDetected,
      relationships_created: projectEntityResult.relationships?.length || 0,
      error: projectEntityResult.error
    } : null,
    all_messages: messages,
    current_transaction: transactionMessages,
    raw_transcript_lines: lines.length,
    hook_data: hookData,
  };
  
  try {
    await Deno.writeTextFile(debugFile, JSON.stringify(debugData, null, 2));
    console.log(`📝 DEBUG: Wrote ${messages.length} messages to ${debugFile}`);
  } catch (writeError) {
    console.error(`❌ Failed to write debug file:`, writeError);
  }

  // Add messages to thread, splitting large messages
  if (transactionMessages.length > 0) {
    try {
      // Load stored UUIDs for this session
      const storedUuids = await loadStoredUuids(hookData.session_id);
      
      // Filter out messages that have already been stored
      const newMessages = transactionMessages.filter(msg => {
        if (msg.uuid && storedUuids.has(msg.uuid)) {
          console.log(`🔄 Skipping duplicate message UUID: ${msg.uuid}`);
          return false;
        }
        return true;
      });

      if (newMessages.length === 0) {
        console.log(`⚡ All messages already stored, skipping transaction`);
        return;
      }

      console.log(`📝 Processing ${newMessages.length}/${transactionMessages.length} new messages`);
      
      // Split large messages and short messages
      const shortMessages = [];
      const largeMessages = [];
      
      for (const msg of newMessages) {
        if (msg.content.length > 2400) { // Leave some buffer for 2500 char limit
          largeMessages.push(msg);
        } else {
          shortMessages.push(msg);
        }
      }
      
      // Add short messages to thread
      if (shortMessages.length > 0) {
        await client.thread.addMessages(threadId, {
          messages: shortMessages as any,
        });
        console.log(`✅ Sent ${shortMessages.length} short messages to user thread`);
        
        // Track successful storage
        shortMessages.forEach(msg => {
          if (msg.uuid) {
            storedUuids.add(msg.uuid);
          }
        });
      }
      
      // Add large messages using graph.add API with project metadata
      for (const msg of largeMessages) {
        try {
          await client.graph.add({
            userId: userId,
            type: "message",
            data: `${msg.name}: ${msg.content}`,
          });
          console.log(`✅ Sent large message (${msg.content.length} chars) to user graph`);
          
          // Track successful storage
          if (msg.uuid) {
            storedUuids.add(msg.uuid);
          }
        } catch (graphError) {
          console.error(`❌ Failed to add large message to graph:`, (graphError as any).message);
        }
      }
      
      // Save updated UUID tracking file
      await saveStoredUuids(hookData.session_id, storedUuids);
      
      console.log(`✅ TemporalBridge: ${shortMessages.length} thread + ${largeMessages.length} graph messages stored in user graph`);
      console.log(`📊 Project: ${projectContext.projectName} (${projectContext.groupId})`);
      console.log(`🔒 Tracked ${storedUuids.size} stored message UUIDs`);
      
      if (projectEntityResult?.success) {
        console.log(`🏗️  Project Entity: ${projectEntityResult.technologiesDetected} technologies, ${projectEntityResult.relationships?.length || 0} relationships`);
      }
    } catch (addMessagesError) {
      console.error(`❌ Failed to add transaction messages:`, addMessagesError);
      throw addMessagesError;
    }
  }
}

async function main() {
  try {
    // Read hook data from stdin
    const decoder = new TextDecoder();
    const input = await Deno.stdin.readable.getReader().read();
    const hookData: HookData = JSON.parse(decoder.decode(input.value));

    await storeConversation(hookData);
    
  } catch (error) {
    console.error("❌ TemporalBridge: Error storing conversation:", error);
    Deno.exit(1);
  }
}

// Run the main function
await main();