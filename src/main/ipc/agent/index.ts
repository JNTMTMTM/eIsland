import { registerAgentLocalToolIpcHandlers } from './localToolIpc';
import type { AgentLocalToolRequest, AgentLocalToolResult } from './localToolIpc';

export type { AgentLocalToolRequest, AgentLocalToolResult } from './localToolIpc';

interface RegisterAgentIpcHandlersOptions {
  executeAgentLocalTool: (request: AgentLocalToolRequest) => Promise<AgentLocalToolResult>;
}

export function registerAgentIpcHandlers(options: RegisterAgentIpcHandlersOptions): void {
  registerAgentLocalToolIpcHandlers({
    executeAgentLocalTool: options.executeAgentLocalTool,
  });
}
