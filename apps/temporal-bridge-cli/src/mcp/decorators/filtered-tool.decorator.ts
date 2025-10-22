import { Tool, ToolOptions } from '@rekog/mcp-nest';

/**
 * Filtered Tool Decorator
 *
 * Conditionally applies the @Tool() decorator based on the ENABLED_TOOLS environment variable.
 * If ENABLED_TOOLS is not set or empty, all tools are enabled.
 * If ENABLED_TOOLS is set, only tools whose names are in the comma-separated list are enabled.
 *
 * @param options - Tool configuration options (same as @Tool())
 * @returns Method decorator that conditionally registers the tool
 *
 * @example
 * // In .mcp.json:
 * // "env": { "ENABLED_TOOLS": "search_personal,get_recent_episodes" }
 *
 * @FilteredTool({
 *   name: 'search_personal',
 *   description: 'Search personal memories',
 *   parameters: z.object({ query: z.string() })
 * })
 * async searchPersonal(input: { query: string }) {
 *   // Implementation
 * }
 */
export function FilteredTool(options: ToolOptions) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const enabledToolsEnv = process.env.ENABLED_TOOLS;

    // If ENABLED_TOOLS is not set or empty, enable all tools
    if (!enabledToolsEnv || enabledToolsEnv.trim() === '') {
      return Tool(options)(target, propertyKey, descriptor);
    }

    // Parse the comma-separated list of enabled tools
    const enabledTools = enabledToolsEnv.split(',').map(t => t.trim());

    // Check if this tool is in the enabled list
    const toolName = options.name || propertyKey;
    if (enabledTools.includes(toolName)) {
      // Tool is enabled: apply the real @Tool() decorator
      return Tool(options)(target, propertyKey, descriptor);
    }

    // Tool is disabled: return descriptor without metadata
    // This prevents the McpRegistryService from discovering the tool
    return descriptor;
  };
}
