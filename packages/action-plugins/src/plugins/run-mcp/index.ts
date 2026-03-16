import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { z } from 'zod';
import type { PluginContext, PluginResult, PluginManifest } from '@automesh/shared-types';

export const manifest: PluginManifest = {
  name: 'run_mcp_tool',
  version: '1.0.0',
  description: 'Connects to a local MCP server over stdio and executes a tool on it. Supports returning large context payloads into the workflow_blobs sandbox.',
  inputs: ['serverCommand', 'serverArgs', 'toolName', 'toolArgs'],
  outputs: ['result'],
};

export const mcpSchema = z.object({
  serverCommand: z.string().describe('The command to run the MCP server (e.g., npx, python, node)'),
  serverArgs: z.array(z.string()).describe('Arguments to pass to the server command'),
  toolName: z.string().describe('The name of the MCP tool to execute'),
  toolArgs: z.record(z.unknown()).optional().describe('Arguments for the tool'),
  serverEnv: z.record(z.string()).optional().describe('Optional environment variables to pass to the server'),
});

export type McpInput = z.infer<typeof mcpSchema>;

export async function run(context: PluginContext, params: Record<string, unknown>): Promise<PluginResult> {
  const input = params as McpInput;
  const { logger } = context;

  logger.info(`Starting MCP server: ${input.serverCommand} ${input.serverArgs.join(' ')}`);

  const transport = new StdioClientTransport({
    command: input.serverCommand,
    args: input.serverArgs,
    env: { ...process.env, ...(input.serverEnv || {}) } as Record<string, string>,
  });

  const client = new Client(
    { name: 'automesh-mcp-client', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    // Connect to the MCP server
    logger.info('Connecting to MCP server via stdio...');
    await client.connect(transport);

    // Verify the tool exists
    logger.info(`Fetching available tools from server...`);
    const toolsResult = await client.listTools();
    const toolExists = toolsResult.tools.some((t) => t.name === input.toolName);
    
    if (!toolExists) {
      throw new Error(`Tool '${input.toolName}' not found on the MCP server. Available tools: ${toolsResult.tools.map(t => t.name).join(', ')}`);
    }

    // Execute the tool
    logger.info(`Calling tool '${input.toolName}'...`);
    const response = await client.callTool({
      name: input.toolName,
      arguments: input.toolArgs,
    });

    // TypeScript definitions check
    const content = (response.content ?? []) as Array<{ type: string; text?: string }>;

    // Check if the server reported an error
    if (response.isError) {
      const errorText = content
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('\\n');
        
      throw new Error(`MCP tool execution failed: ${errorText}`);
    }

    // Extract the content
    const resultText = content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('\\n');

    logger.info('Tool execution completed successfully');

    // CONTEXT SANDBOXING
    // If the text is massive (> 10KB), we signal the worker to store it in the workflow_blobs
    // table instead of polluting the workflow_runs.context.
    // The worker checks for the `__mcpPayload` key.
    
    const isMassive = Buffer.byteLength(resultText, 'utf8') > 10240; // 10KB
    
    if (isMassive) {
      logger.info('MCP payload is large. Sandboxing into workflow_blobs table.');
      return {
        success: true,
        data: {
          __mcpPayload: resultText
        }
      };
    } else {
      return {
        success: true,
        data: {
          result: resultText
        }
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('MCP plugin error', { message });
    return {
      success: false,
      data: {},
      error: message,
    };
  } finally {
    // Ensure we close the transport so the child process terminates
    logger.info('Closing MCP transport connection');
    await transport.close();
  }
}
