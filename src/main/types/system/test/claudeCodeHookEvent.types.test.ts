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
 * @file claudeCodeHookEvent.types.test.ts
 * @description ClaudeCodeHookEvent.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ClaudeCodeHookEventKind, ClaudeCodeHookEvent } from "../ClaudeCodeHookEvent";
import type { ClaudeCodeHookEventDetailItem } from '.././ClaudeCodeHookEventDetailItem';

/** 固定 ClaudeCodeHookEventKind 的完整公开形状，独立于源类型展开。 */
type ExpectedClaudeCodeHookEventKind = 'session' | 'message' | 'tool' | 'permission' | 'notification' | 'completed' | 'unknown';

/** 固定 ClaudeCodeHookEvent 的完整公开形状，独立于源类型展开。 */
interface ExpectedClaudeCodeHookEvent {
  id: string;
  eventName: string;
  kind: ExpectedClaudeCodeHookEventKind;
  sessionId: string;
  cwd: string | null;
  transcriptPath: string | null;
  summary: string;
  detail: string | null;
  detailItems: ClaudeCodeHookEventDetailItem[];
  toolName: string | null;
  toolInputPreview: string | null;
  createdAt: number;
  raw: Record<string, unknown>;
}

describe("ClaudeCodeHookEvent.ts 完整类型契约", () => {
  it("ClaudeCodeHookEventKind 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ClaudeCodeHookEventKind>().toEqualTypeOf<ExpectedClaudeCodeHookEventKind>();
    const legal: ClaudeCodeHookEventKind = 'session';
    expectTypeOf(legal).toMatchTypeOf<ExpectedClaudeCodeHookEventKind>();
    expect(legal).toBeDefined();
    // @ts-expect-error ClaudeCodeHookEventKind 拒绝联合以外值或错误的公开结构。
    const invalid: ClaudeCodeHookEventKind = 'invalid';
    expect(invalid).toBeDefined();
  });
  it("ClaudeCodeHookEvent 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ClaudeCodeHookEvent>().toEqualTypeOf<ExpectedClaudeCodeHookEvent>();
    const legal: ClaudeCodeHookEvent = { id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} };
    expectTypeOf(legal).toMatchTypeOf<ExpectedClaudeCodeHookEvent>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedClaudeCodeHookEvent, "id">>().not.toMatchTypeOf<ClaudeCodeHookEvent>();
    expectTypeOf<null>().toMatchTypeOf<ClaudeCodeHookEvent["cwd"]>();
    expectTypeOf<null>().toMatchTypeOf<ClaudeCodeHookEvent["transcriptPath"]>();
    expectTypeOf<null>().toMatchTypeOf<ClaudeCodeHookEvent["detail"]>();
    expectTypeOf<null>().toMatchTypeOf<ClaudeCodeHookEvent["toolName"]>();
    expectTypeOf<null>().toMatchTypeOf<ClaudeCodeHookEvent["toolInputPreview"]>();
    // @ts-expect-error ClaudeCodeHookEvent.kind 拒绝契约外字段类型或状态。
    const invalid: ClaudeCodeHookEvent["kind"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<ClaudeCodeHookEvent>();
  });
});
