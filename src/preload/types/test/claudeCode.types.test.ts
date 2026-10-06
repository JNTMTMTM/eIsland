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
 * @file claudeCode.types.test.ts
 * @description claudeCode 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ClaudeCodeHookEventDetailItem, ClaudeCodeHookEvent, ClaudeCodeSessionSnapshot, ClaudeCodeStatusSnapshot, ClaudeCodeHookMutationResult } from '../claudeCode';
describe('claudeCode contracts', () => {
  it('fixes ClaudeCodeHookEventDetailItem fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ClaudeCodeHookEventDetailItem>().toEqualTypeOf<{
      label: string;
      value: string;
    }>();
    const fixture: ClaudeCodeHookEventDetailItem = { label: 'sample', value: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error ClaudeCodeHookEventDetailItem.label 禁止使用契约外字段值。
    const invalid: ClaudeCodeHookEventDetailItem['label'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes ClaudeCodeHookEvent fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ClaudeCodeHookEvent>().toEqualTypeOf<{
      id: string;
      eventName: string;
      kind: 'session' | 'message' | 'tool' | 'permission' | 'notification' | 'completed' | 'unknown';
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
    }>();
    const fixture: ClaudeCodeHookEvent = { id: 'sample', eventName: 'sample', kind: 'session', sessionId: 'sample', cwd: null, transcriptPath: null, summary: 'sample', detail: null, detailItems: [], toolName: null, toolInputPreview: null, createdAt: 0, raw: {} };
    expect(fixture).toBeDefined();
    // @ts-expect-error ClaudeCodeHookEvent.id 禁止使用契约外字段值。
    const invalid: ClaudeCodeHookEvent['id'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes ClaudeCodeSessionSnapshot fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ClaudeCodeSessionSnapshot>().toEqualTypeOf<{
      id: string;
      title: string;
      phase: 'idle' | 'running' | 'waiting_permission' | 'completed';
      cwd: string | null;
      transcriptPath: string | null;
      lastSummary: string;
      lastEventAt: number;
      pendingPermission: ClaudeCodeHookEvent | null;
      events: ClaudeCodeHookEvent[];
    }>();
    const fixture: ClaudeCodeSessionSnapshot = { id: 'sample', title: 'sample', phase: 'idle', cwd: null, transcriptPath: null, lastSummary: 'sample', lastEventAt: 0, pendingPermission: null, events: [] };
    expect(fixture).toBeDefined();
    // @ts-expect-error ClaudeCodeSessionSnapshot.id 禁止使用契约外字段值。
    const invalid: ClaudeCodeSessionSnapshot['id'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes ClaudeCodeStatusSnapshot fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ClaudeCodeStatusSnapshot>().toEqualTypeOf<{
      enabled: boolean;
      receiverRunning: boolean;
      receiverUrl: string | null;
      settingsPath: string;
      hookScriptPath: string;
      sessions: ClaudeCodeSessionSnapshot[];
      events: ClaudeCodeHookEvent[];
      heatmap: Record<string, {
        session: number;
        tool: number;
        prompt: number;
      }>;
      updatedAt: number;
    }>();
    const fixture: ClaudeCodeStatusSnapshot = { enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'sample', hookScriptPath: 'sample', sessions: [], events: [], heatmap: {}, updatedAt: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error ClaudeCodeStatusSnapshot.enabled 禁止使用契约外字段值。
    const invalid: ClaudeCodeStatusSnapshot['enabled'] = 'invalid';
    expect(invalid).toBeDefined();
  });
  it('fixes ClaudeCodeHookMutationResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<ClaudeCodeHookMutationResult>().toEqualTypeOf<{
      ok: boolean;
      message: string;
      snapshot: ClaudeCodeStatusSnapshot;
    }>();
    const fixture: ClaudeCodeHookMutationResult = { ok: false, message: 'sample', snapshot: { enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'sample', hookScriptPath: 'sample', sessions: [], events: [], heatmap: {}, updatedAt: 0 } };
    expect(fixture).toBeDefined();
    // @ts-expect-error ClaudeCodeHookMutationResult.ok 禁止使用契约外字段值。
    const invalid: ClaudeCodeHookMutationResult['ok'] = 'invalid';
    expect(invalid).toBeDefined();
  });
});
