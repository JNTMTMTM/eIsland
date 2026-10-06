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
 * @file claudeCodeSessionSnapshot.types.test.ts
 * @description ClaudeCodeSessionSnapshot.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ClaudeCodeSessionPhase, ClaudeCodeSessionSnapshot } from "../ClaudeCodeSessionSnapshot";
import type { ClaudeCodeHookEvent } from '.././ClaudeCodeHookEvent';

/** 固定 ClaudeCodeSessionPhase 的完整公开形状，独立于源类型展开。 */
type ExpectedClaudeCodeSessionPhase = 'idle' | 'running' | 'waiting_permission' | 'completed';

/** 固定 ClaudeCodeSessionSnapshot 的完整公开形状，独立于源类型展开。 */
interface ExpectedClaudeCodeSessionSnapshot {
  id: string;
  title: string;
  phase: ExpectedClaudeCodeSessionPhase;
  cwd: string | null;
  transcriptPath: string | null;
  lastSummary: string;
  lastEventAt: number;
  pendingPermission: ClaudeCodeHookEvent | null;
  events: ClaudeCodeHookEvent[];
}

describe("ClaudeCodeSessionSnapshot.ts 完整类型契约", () => {
  it("ClaudeCodeSessionPhase 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ClaudeCodeSessionPhase>().toEqualTypeOf<ExpectedClaudeCodeSessionPhase>();
    const legal: ClaudeCodeSessionPhase = 'idle';
    expectTypeOf(legal).toMatchTypeOf<ExpectedClaudeCodeSessionPhase>();
    expect(legal).toBeDefined();
    // @ts-expect-error ClaudeCodeSessionPhase 拒绝联合以外值或错误的公开结构。
    const invalid: ClaudeCodeSessionPhase = 'invalid';
    expect(invalid).toBeDefined();
  });
  it("ClaudeCodeSessionSnapshot 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ClaudeCodeSessionSnapshot>().toEqualTypeOf<ExpectedClaudeCodeSessionSnapshot>();
    const legal: ClaudeCodeSessionSnapshot = { id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] };
    expectTypeOf(legal).toMatchTypeOf<ExpectedClaudeCodeSessionSnapshot>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedClaudeCodeSessionSnapshot, "id">>().not.toMatchTypeOf<ClaudeCodeSessionSnapshot>();
    expectTypeOf<null>().toMatchTypeOf<ClaudeCodeSessionSnapshot["cwd"]>();
    expectTypeOf<null>().toMatchTypeOf<ClaudeCodeSessionSnapshot["transcriptPath"]>();
    expectTypeOf<null>().toMatchTypeOf<ClaudeCodeSessionSnapshot["pendingPermission"]>();
    // @ts-expect-error ClaudeCodeSessionSnapshot.phase 拒绝契约外字段类型或状态。
    const invalid: ClaudeCodeSessionSnapshot["phase"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<ClaudeCodeSessionSnapshot>();
  });
});
