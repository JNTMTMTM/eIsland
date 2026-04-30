/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file localToolIpc.ts
 * @description Agent 本地工具 IPC handler 注册，将渲染进程的本地工具执行请求桥接到主进程。
 * @author 鸡哥
 */

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

/** 注册 Agent 本地工具执行的 IPC handler（agent:local-tool:execute）。 */
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
