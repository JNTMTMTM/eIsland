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
 * @file index.ts
 * @description Agent IPC 注册入口，统一暴露 Agent 相关 IPC handler 的注册方法。
 * @author 鸡哥
 */

import { registerAgentLocalToolIpcHandlers } from './localToolIpc';
import type { AgentLocalToolRequest, AgentLocalToolResult } from './localToolIpc';

export type { AgentLocalToolRequest, AgentLocalToolResult } from './localToolIpc';

interface RegisterAgentIpcHandlersOptions {
  executeAgentLocalTool: (request: AgentLocalToolRequest) => Promise<AgentLocalToolResult>;
}

/** 注册所有 Agent 相关的 IPC handler。 */
export function registerAgentIpcHandlers(options: RegisterAgentIpcHandlersOptions): void {
  registerAgentLocalToolIpcHandlers({
    executeAgentLocalTool: options.executeAgentLocalTool,
  });
}
