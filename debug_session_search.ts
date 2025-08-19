#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

import { createZepClient, getDefaultConfigAsync } from './src/lib/zep-client.ts';

const client = createZepClient();
const config = await getDefaultConfigAsync();
const userId = config.userId || 'developer';

console.log('Testing exact search query from MCP tool:');
console.log('userId:', userId);
console.log('query: session OCCURS_IN zabaca-temporal-bridge');

const results = await client.graph.search({
  userId,
  query: 'session OCCURS_IN zabaca-temporal-bridge',
  scope: 'edges', 
  limit: 50
});

console.log('Search results:', JSON.stringify(results, null, 2));
console.log('Edge count:', results?.edges?.length || 0);

// Filter for session relationships only (SAME AS MCP TOOL)
const sessionEdges = results?.edges?.filter(edge => 
  (edge.name === 'OCCURS_IN' || edge.name === 'OCCURRED_IN') && 
  edge.fact.includes('session-')
) || [];

console.log('Session edges (filtered):', sessionEdges.length);
sessionEdges.forEach((edge, i) => {
  console.log(`${i + 1}. ${edge.fact} (${edge.name})`);
});

console.log('MCP tool should return sessionCount:', sessionEdges.length);