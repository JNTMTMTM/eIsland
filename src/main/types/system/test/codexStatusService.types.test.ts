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
 * @file codexStatusService.types.test.ts
 * @description CodexStatusService.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { CodexMonitorMutationResult, CodexStatusService } from "../CodexStatusService";
import type { ClaudeCodeStatusSnapshot } from '.././ClaudeCodeStatusSnapshot';

/** 固定 CodexMonitorMutationResult 的完整公开形状，独立于源类型展开。 */
interface ExpectedCodexMonitorMutationResult {
  ok: boolean;
  message: string;
  snapshot: ClaudeCodeStatusSnapshot;
}

/** 固定 CodexStatusService 的完整公开形状，独立于源类型展开。 */
interface ExpectedCodexStatusService {
  start: () => Promise<void>;
  stop: () => void;
  getSnapshot: () => ClaudeCodeStatusSnapshot;
  enableMonitor: () => Promise<ExpectedCodexMonitorMutationResult>;
  disableMonitor: () => Promise<ExpectedCodexMonitorMutationResult>;
  clearEvents: () => ClaudeCodeStatusSnapshot;
  deleteSessions: (sessionIds: string[]) => ClaudeCodeStatusSnapshot;
}

describe("CodexStatusService.ts 完整类型契约", () => {
  it("CodexMonitorMutationResult 完整字段、合法样例与非法状态", () => {
    expectTypeOf<CodexMonitorMutationResult>().toEqualTypeOf<ExpectedCodexMonitorMutationResult>();
    const legal: CodexMonitorMutationResult = { ok: false, message: 'fixture', snapshot: { enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 } };
    expectTypeOf(legal).toMatchTypeOf<ExpectedCodexMonitorMutationResult>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedCodexMonitorMutationResult, "ok">>().not.toMatchTypeOf<CodexMonitorMutationResult>();
    // @ts-expect-error CodexMonitorMutationResult.ok 拒绝契约外字段类型或状态。
    const invalid: CodexMonitorMutationResult["ok"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<CodexMonitorMutationResult>();
  });
  it("CodexStatusService 完整字段、合法样例与非法状态", () => {
    expectTypeOf<CodexStatusService>().toEqualTypeOf<ExpectedCodexStatusService>();
    const legal: CodexStatusService = { start: () => (Promise.resolve(undefined)), stop: () => {}, getSnapshot: () => ({ enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 }), enableMonitor: () => (Promise.resolve({ ok: false, message: 'fixture', snapshot: { enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 } })), disableMonitor: () => (Promise.resolve({ ok: false, message: 'fixture', snapshot: { enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 } })), clearEvents: () => ({ enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 }), deleteSessions: () => ({ enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'fixture', hookScriptPath: 'fixture', sessions: [{ id: 'fixture', title: 'fixture', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'fixture', lastEventAt: 1, pendingPermission: null, events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }] }], events: [{ id: 'fixture', eventName: 'fixture', kind: 'session', sessionId: 'fixture', cwd: null, transcriptPath: null, summary: 'fixture', detail: null, detailItems: [{ label: 'fixture', value: 'fixture' }], toolName: null, toolInputPreview: null, createdAt: 1, raw: {} }], heatmap: {}, updatedAt: 1 }) };
    expectTypeOf(legal).toMatchTypeOf<ExpectedCodexStatusService>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedCodexStatusService, "start">>().not.toMatchTypeOf<CodexStatusService>();
    // @ts-expect-error CodexStatusService.start 拒绝契约外字段类型或状态。
    const invalid: CodexStatusService["start"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<CodexStatusService>();
  });
});
