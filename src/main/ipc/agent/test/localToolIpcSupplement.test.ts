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
 * @file localToolIpcSupplement.test.ts
 * @description 本地工具 IPC 对非 Error 拒绝、空值回退与参数转发的回归测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { registerAgentLocalToolIpcHandlers } from '../localToolIpc';
import type { AgentLocalToolRequest, AgentLocalToolResult } from '../localToolIpc';

const boundary = vi.hoisted(() => ({
  handle: vi.fn<(channel: string, handler: (event: unknown, request: AgentLocalToolRequest) => Promise<AgentLocalToolResult>) => void>(),
}));
vi.mock('electron', () => ({ ipcMain: { handle: boundary.handle } }));

describe('本地工具 IPC 非 Error 拒绝值', () => {
  it.each([
    ['string failure', 'string failure'],
    [null, 'local tool execute failed'],
    [undefined, 'local tool execute failed'],
    [0, '0'],
    ['', ''],
  ])('拒绝值 %s 保留非空值并使用空值回退', async (failure, message) => {
    boundary.handle.mockClear();
    const executeAgentLocalTool = vi.fn<(request: AgentLocalToolRequest) => Promise<AgentLocalToolResult>>().mockRejectedValue(failure);
    registerAgentLocalToolIpcHandlers({ executeAgentLocalTool });
    expect(boundary.handle.mock.calls[0]?.[0]).toBe('agent:local-tool:execute');
    const handler = boundary.handle.mock.calls[0]?.[1];
    await expect(handler?.({}, { tool: 'fixture' })).resolves.toEqual({
      success: false, result: {}, error: message, durationMs: 0,
    });
    expect(executeAgentLocalTool).toHaveBeenCalledWith({ tool: 'fixture' });
  });
});
