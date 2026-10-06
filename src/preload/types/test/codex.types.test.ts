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
 * @file codex.types.test.ts
 * @description codex 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { CodexStatusSnapshot, CodexMonitorMutationResult } from '../codex';
import type { ClaudeCodeHookMutationResult, ClaudeCodeStatusSnapshot } from '../claudeCode';
describe('codex contracts', () => {
  it('fixes CodexStatusSnapshot fields and accepts its explicit legal fixture', () => {
    expectTypeOf<CodexStatusSnapshot>().toEqualTypeOf<ClaudeCodeStatusSnapshot>();
    const fixture: CodexStatusSnapshot = { enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'sample', hookScriptPath: 'sample', sessions: [], events: [], heatmap: {}, updatedAt: 0 };
    expect(fixture).toBeDefined();
    // @ts-expect-error Codex 会话状态只允许声明中的四个阶段。
    const invalidPhase: CodexStatusSnapshot['sessions'][number]['phase'] = 'busy';
    expect(invalidPhase).toBe('busy');
  });
  it('fixes CodexMonitorMutationResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<CodexMonitorMutationResult>().toEqualTypeOf<ClaudeCodeHookMutationResult>();
    const fixture: CodexMonitorMutationResult = { ok: false, message: 'sample', snapshot: { enabled: false, receiverRunning: false, receiverUrl: null, settingsPath: 'sample', hookScriptPath: 'sample', sessions: [], events: [], heatmap: {}, updatedAt: 0 } };
    expect(fixture).toBeDefined();
    // @ts-expect-error 变更结果必须使用布尔成功标识。
    const invalidOk: CodexMonitorMutationResult['ok'] = 'yes';
    expect(invalidOk).toBe('yes');
  });
});
