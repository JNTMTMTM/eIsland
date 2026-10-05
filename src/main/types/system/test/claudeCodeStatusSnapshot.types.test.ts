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
 * @file claudeCodeStatusSnapshot.types.test.ts
 * @description ClaudeCodeStatusSnapshot.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ClaudeCodeStatusSnapshot } from "../ClaudeCodeStatusSnapshot";
import type { ClaudeCodeHookEvent } from '.././ClaudeCodeHookEvent';
import type { ClaudeCodeSessionSnapshot } from '.././ClaudeCodeSessionSnapshot';
import type { ClaudeCodeHeatmapDaily } from '.././ClaudeCodeHeatmapDailyCount';

/** 固定 ClaudeCodeStatusSnapshot 的完整公开形状，独立于源类型展开。 */
interface ExpectedClaudeCodeStatusSnapshot {
  enabled: boolean;
  receiverRunning: boolean;
  receiverUrl: string | null;
  settingsPath: string;
  hookScriptPath: string;
  sessions: ClaudeCodeSessionSnapshot[];
  events: ClaudeCodeHookEvent[];
  heatmap: ClaudeCodeHeatmapDaily;
  updatedAt: number;
}

describe("ClaudeCodeStatusSnapshot.ts 完整类型契约", () => {
  it("ClaudeCodeStatusSnapshot 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ClaudeCodeStatusSnapshot>().toEqualTypeOf<ExpectedClaudeCodeStatusSnapshot>();
    const legal: ClaudeCodeStatusSnapshot = { enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 };
    expectTypeOf(legal).toMatchTypeOf<ExpectedClaudeCodeStatusSnapshot>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedClaudeCodeStatusSnapshot, "enabled">>().not.toMatchTypeOf<ClaudeCodeStatusSnapshot>();
    expectTypeOf<null>().toMatchTypeOf<ClaudeCodeStatusSnapshot["receiverUrl"]>();
    // @ts-expect-error ClaudeCodeStatusSnapshot.enabled 拒绝契约外字段类型或状态。
    const invalid: ClaudeCodeStatusSnapshot["enabled"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<ClaudeCodeStatusSnapshot>();
  });
});
