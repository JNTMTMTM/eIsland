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
 */

/**
 * @file codexSessionParser.test.ts
 * @description Codex rollout JSONL 到 CLI 活动快照的转换测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { parseCodexSessionContent } from '../codexSessionParser';

const jsonl = (...items: Record<string, unknown>[]): string => items.map((item) => JSON.stringify(item)).join('\n');

describe('parseCodexSessionContent', () => {
  it('converts prompts, tool calls, outputs and completion into a unified session', () => {
    const content = jsonl(
      { timestamp: '2026-07-28T10:00:00.000Z', type: 'session_meta', payload: { id: 'session-1', cwd: 'C:\\work\\demo' } },
      { timestamp: '2026-07-28T10:00:01.000Z', type: 'turn_context', payload: { cwd: 'C:\\work\\demo', model: 'gpt-5-codex' } },
      { timestamp: '2026-07-28T10:00:02.000Z', type: 'event_msg', payload: { type: 'user_message', message: 'Fix the failing test' } },
      { timestamp: '2026-07-28T10:00:03.000Z', type: 'response_item', payload: { type: 'function_call', name: 'shell', call_id: 'call-1', arguments: '{"command":"npm test"}' } },
      { timestamp: '2026-07-28T10:00:04.000Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'call-1', output: 'Tests passed' } },
      { timestamp: '2026-07-28T10:00:05.000Z', type: 'event_msg', payload: { type: 'task_complete', last_agent_message: 'Fixed the test.' } },
    );

    const parsed = parseCodexSessionContent(content, 'C:\\Users\\test\\.codex\\sessions\\rollout.jsonl', 0, Date.parse('2026-07-28T10:00:06.000Z'));

    expect(parsed?.session).toMatchObject({ id: 'session-1', title: 'demo', phase: 'idle', cwd: 'C:\\work\\demo' });
    expect(parsed?.events.map((event) => event.eventName)).toEqual(['Stop', 'PostToolUse', 'PreToolUse', 'UserPromptSubmit', 'SessionStart']);
    expect(parsed?.events.find((event) => event.eventName === 'PreToolUse')).toMatchObject({ toolName: 'shell', toolInputPreview: 'npm test' });
    expect(parsed?.heatmap['2026-7-28']).toEqual({ session: 1, tool: 1, prompt: 1 });
  });

  it('supports response_item messages and ignores malformed JSONL lines', () => {
    const content = `${jsonl(
      { timestamp: '2026-07-28T10:00:00.000Z', type: 'session_meta', payload: { id: 'session-2', cwd: '/workspace/app' } },
      { timestamp: '2026-07-28T10:00:01.000Z', type: 'event_msg', payload: { type: 'user_message', message: 'Add Codex support' } },
      { timestamp: '2026-07-28T10:00:01.000Z', type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Add Codex support' }] } },
      { timestamp: '2026-07-28T10:00:02.000Z', type: 'event_msg', payload: { type: 'agent_message', message: 'Implemented.' } },
      { timestamp: '2026-07-28T10:00:02.000Z', type: 'response_item', payload: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Implemented.' }] } },
    )}\nnot-json`;

    const parsed = parseCodexSessionContent(content, '/home/test/.codex/sessions/rollout.jsonl', 0, Date.parse('2026-07-28T10:00:03.000Z'));

    expect(parsed?.events).toHaveLength(3);
    expect(parsed?.events[0].detailItems).toContainEqual({ label: 'assistantOutput', value: 'Implemented.' });
    expect(parsed?.session.phase).toBe('idle');
  });

  it('returns null when session metadata has no identifier', () => {
    expect(parseCodexSessionContent(jsonl({ type: 'session_meta', payload: { cwd: '/workspace' } }), 'rollout.jsonl', 0)).toBeNull();
  });
});