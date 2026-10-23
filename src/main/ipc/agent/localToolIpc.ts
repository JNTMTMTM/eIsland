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
import { toolCallSignature } from '../../../shared/agentToolCallGuard';
import type { AgentLocalToolRequest } from '../../types/agent/AgentLocalToolRequest';
import type { AgentLocalToolResult } from '../../types/agent/AgentLocalToolResult';

export type { AgentLocalToolRequest, AgentLocalToolResult };

interface RegisterAgentLocalToolIpcHandlersOptions {
  executeAgentLocalTool: (request: AgentLocalToolRequest) => Promise<AgentLocalToolResult>;
}

/** 请求标识缓存上限。 */
const MAX_CACHED_EXECUTIONS = 500;

/** 单次执行时长上限，远超服务端 120 秒的结果等待，超时后的结果已无人接收。 */
const LOCAL_TOOL_EXECUTION_TIMEOUT_MS = 10 * 60_000;

/** 注册 Agent 本地工具执行的 IPC handler（agent:local-tool:execute）。 */
export function registerAgentLocalToolIpcHandlers(options: RegisterAgentLocalToolIpcHandlersOptions): void {
  const executions = new Map<string, { signature: string; result: Promise<AgentLocalToolResult>; expiresAt: number }>();
  const execute = async (request: AgentLocalToolRequest): Promise<AgentLocalToolResult> => {
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
  };
  /**
   * 悬挂的执行按超时失败结束，使缓存项能够过期或被淘汰；底层操作不会被重做。
   * @param request - 本地工具请求。
   * @returns 执行结果或超时失败结果。
   */
  const executeWithTimeout = async (request: AgentLocalToolRequest): Promise<AgentLocalToolResult> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<AgentLocalToolResult>((resolve) => {
      timer = setTimeout(() => resolve({
        success: false, result: {}, error: 'TOOL_EXECUTION_TIMEOUT', durationMs: LOCAL_TOOL_EXECUTION_TIMEOUT_MS,
      }), LOCAL_TOOL_EXECUTION_TIMEOUT_MS);
    });
    const result = await Promise.race([execute(request), timeout]);
    clearTimeout(timer);
    return result;
  };
  ipcMain.handle('agent:local-tool:execute', async (event, request: AgentLocalToolRequest) => {
    void event;
    const requestId = typeof request?.requestId === 'string' ? request.requestId.trim() : '';
    if (!requestId) return execute(request);
    // 缓存覆盖执行中和已完成请求；提交结果失败后的重投只能复用结果，不能重做副作用。
    // requestId 由服务端为每次调用生成 UUID，跨会话和账号唯一，可直接作为缓存键。
    executions.forEach((entry, id) => { if (entry.expiresAt <= Date.now()) executions.delete(id); });
    const signature = toolCallSignature(typeof request.tool === 'string' ? request.tool : '', { arguments: request.arguments, workspaces: request.workspaces });
    const previous = executions.get(requestId);
    if (previous) {
      if (previous.signature !== signature) {
        return { success: false, result: {}, error: 'TOOL_REQUEST_ID_CONFLICT', durationMs: 0 };
      }
      return previous.result;
    }
    // 容量满时淘汰最早登记的已完成结果；执行中的请求必须保留，否则重投会重复副作用。
    executions.forEach((cached, id) => {
      if (executions.size >= MAX_CACHED_EXECUTIONS && Number.isFinite(cached.expiresAt)) executions.delete(id);
    });
    if (executions.size >= MAX_CACHED_EXECUTIONS) {
      return { success: false, result: {}, error: 'TOOL_REQUEST_CACHE_FULL', durationMs: 0 };
    }
    // 先登记再执行，防止两个窗口在同一任务中投递相同请求。
    // eslint-disable-next-line promise/prefer-await-to-then -- 先登记待执行的 Promise，合并并发请求
    const entry = { signature, result: Promise.resolve().then(() => executeWithTimeout(request)), expiresAt: Number.POSITIVE_INFINITY };
    executions.set(requestId, entry);
    const result = await entry.result;
    entry.expiresAt = Date.now() + 10 * 60_000;
    return result;
  });
}
