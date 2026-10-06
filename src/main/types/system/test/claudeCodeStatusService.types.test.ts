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
 * @file claudeCodeStatusService.types.test.ts
 * @description ClaudeCodeStatusService.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { PermissionDecision, ClaudeSettingsMutationResult, ClaudeCodeStatusService } from "../ClaudeCodeStatusService";
import type { ClaudeCodeStatusSnapshot } from '.././ClaudeCodeStatusSnapshot';

/** 固定 PermissionDecision 的完整公开形状，独立于源类型展开。 */
type ExpectedPermissionDecision = 'allow' | 'always' | 'deny';

/** 固定 ClaudeSettingsMutationResult 的完整公开形状，独立于源类型展开。 */
interface ExpectedClaudeSettingsMutationResult {
  ok: boolean;
  message: string;
  snapshot: ClaudeCodeStatusSnapshot;
}

/** 固定 ClaudeCodeStatusService 的完整公开形状，独立于源类型展开。 */
interface ExpectedClaudeCodeStatusService {
  start: () => Promise<void>;
  stop: () => void;
  getSnapshot: () => ClaudeCodeStatusSnapshot;
  installHook: () => Promise<ExpectedClaudeSettingsMutationResult>;
  uninstallHook: () => Promise<ExpectedClaudeSettingsMutationResult>;
  clearEvents: () => ClaudeCodeStatusSnapshot;
  deleteSessions: (sessionIds: string[]) => ClaudeCodeStatusSnapshot;
  resolvePermission: (sessionId: string, decision: ExpectedPermissionDecision) => ClaudeCodeStatusSnapshot;
}

describe("ClaudeCodeStatusService.ts 完整类型契约", () => {
  it("PermissionDecision 完整字段、合法样例与非法状态", () => {
    expectTypeOf<PermissionDecision>().toEqualTypeOf<ExpectedPermissionDecision>();
    const legal: PermissionDecision = 'allow';
    expectTypeOf(legal).toMatchTypeOf<ExpectedPermissionDecision>();
    expect(legal).toBeDefined();
    // @ts-expect-error PermissionDecision 拒绝联合以外值或错误的公开结构。
    const invalid: PermissionDecision = 'invalid';
    expect(invalid).toBeDefined();
  });
  it("ClaudeSettingsMutationResult 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ClaudeSettingsMutationResult>().toEqualTypeOf<ExpectedClaudeSettingsMutationResult>();
    const legal: ClaudeSettingsMutationResult = { ok: false, message: 'fixture', snapshot: { enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 } };
    expectTypeOf(legal).toMatchTypeOf<ExpectedClaudeSettingsMutationResult>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedClaudeSettingsMutationResult, "ok">>().not.toMatchTypeOf<ClaudeSettingsMutationResult>();
    // @ts-expect-error ClaudeSettingsMutationResult.ok 拒绝契约外字段类型或状态。
    const invalid: ClaudeSettingsMutationResult["ok"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<ClaudeSettingsMutationResult>();
  });
  it("ClaudeCodeStatusService 完整字段、合法样例与非法状态", () => {
    expectTypeOf<ClaudeCodeStatusService>().toEqualTypeOf<ExpectedClaudeCodeStatusService>();
    const legal: ClaudeCodeStatusService = { start: () => (Promise.resolve(undefined)), stop: () => {}, getSnapshot: () => ({ enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 }), installHook: () => (Promise.resolve({ ok: false, message: 'fixture', snapshot: { enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 } })), uninstallHook: () => (Promise.resolve({ ok: false, message: 'fixture', snapshot: { enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 } })), clearEvents: () => ({ enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 }), deleteSessions: () => ({ enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 }), resolvePermission: () => ({ enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 }) };
    expectTypeOf(legal).toMatchTypeOf<ExpectedClaudeCodeStatusService>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedClaudeCodeStatusService, "start">>().not.toMatchTypeOf<ClaudeCodeStatusService>();
    // @ts-expect-error ClaudeCodeStatusService.start 拒绝契约外字段类型或状态。
    const invalid: ClaudeCodeStatusService["start"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<ClaudeCodeStatusService>();
  });
});
