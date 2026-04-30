import { ipcMain } from 'electron';

export interface AgentLocalToolRequest {
  tool?: unknown;
  arguments?: unknown;
  workspaces?: unknown;
}

export interface AgentLocalToolResult {
  success: boolean;
  result: unknown;
  error: string;
  durationMs: number;
}

interface RegisterAgentLocalToolIpcHandlersOptions {
  executeAgentLocalTool: (request: AgentLocalToolRequest) => Promise<AgentLocalToolResult>;
}

export function registerAgentLocalToolIpcHandlers(options: RegisterAgentLocalToolIpcHandlersOptions): void {
  ipcMain.handle('agent:local-tool:execute', async (_event, request: AgentLocalToolRequest) => {
    try {
      return await options.executeAgentLocalTool(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? 'local tool execute failed');
      return {
        success: false,
        result: {},
        error: message,
        durationMs: 0,
      };
    }
  });
}
