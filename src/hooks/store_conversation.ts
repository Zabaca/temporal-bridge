#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-net

/**
 * TemporalBridge - Conversation Storage Hook
 * Claude Code hook to automatically store conversations in Zep's knowledge graph
 */

import type { HookData, TranscriptMessage, ParsedMessage } from "../lib/types.ts";
import { createZepClient, ensureUser, ensureThread } from "../lib/zep-client.ts";

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

  // Create or get thread ID based on session
  const userId = "developer";
  const threadId = `claude-code-${hookData.session_id}`;

  // Ensure user and thread exist
  await ensureUser(client, userId);
  await ensureThread(client, threadId, userId);

  // Find current transaction using parent-child relationships
  const transactionMessages = findCurrentTransaction(messages, lines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(msg => msg !== null));

  // DEBUG: Write parsed messages to debug file
  const debugFile = `/home/uptown/.claude/temporal-bridge-debug-${hookData.session_id}.json`;
  const debugData = {
    timestamp: new Date().toISOString(),
    session_id: hookData.session_id,
    hook_event: hookData.hook_event_name,
    total_messages_parsed: messages.length,
    current_transaction_messages: transactionMessages.length,
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
      // Split large messages and short messages
      const shortMessages = [];
      const largeMessages = [];
      
      for (const msg of transactionMessages) {
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
        console.log(`✅ Sent ${shortMessages.length} short messages to thread`);
      }
      
      // Add large messages using graph.add API
      for (const msg of largeMessages) {
        try {
          await client.graph.add({
            userId: userId,
            type: "message",
            data: `${msg.name}: ${msg.content}`,
          });
          console.log(`✅ Sent large message (${msg.content.length} chars) to graph`);
        } catch (graphError) {
          console.error(`❌ Failed to add large message to graph:`, (graphError as any).message);
        }
      }
      
      console.log(`✅ TemporalBridge: ${shortMessages.length} thread + ${largeMessages.length} graph messages stored`);
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