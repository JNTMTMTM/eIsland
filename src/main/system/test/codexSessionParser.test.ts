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
import { parseCodexSessionContent, parseCodexSessionLines } from '../codexSessionParser';

const jsonl = (...items: Record<string, unknown>[]): string => items.map((item) => JSON.stringify(item)).join('\n');

describe('parseCodexSessionContent', () => {
  it('hydrates recent details after sorting and deduplicating out-of-order events', () => {
    const base = Date.parse('2026-07-28T10:00:00.000Z');
    const lines = [
      { timestamp: new Date(base).toISOString(), type: 'session_meta', payload: { id: 'ordered', cwd: '/original', model: 'first-model' } },
      { type: 'turn_context', payload: { cwd: '/updated', model: 'second-model' } },
      ...Array.from(Array.from({ length: 70 }).keys(), (index) => ({
        timestamp: new Date(base + (70 - index) * 1000).toISOString(),
        type: 'event_msg',
        payload: { type: 'user_message', message: `Prompt ${70 - index}` },
      })),
      { timestamp: new Date(base + 70050).toISOString(), type: 'event_msg', payload: { type: 'user_message', message: 'Prompt 70' } },
    ].map((line) => JSON.stringify(line));
    lines.splice(5, 0, 'invalid json', '');
    let closedReaders = 0;
    const parsed = parseCodexSessionLines(function* () {
      try { yield* lines; } finally { closedReaders += 1; }
    }, 'rollout.jsonl', base, base + 71000);
    expect(parsed?.events).toHaveLength(40);
    expect(parsed?.events[0]).toMatchObject({ summary: 'Prompt 70', raw: { message: 'Prompt 70' }, cwd: '/updated' });
    expect(parsed?.events[0].detailItems).toContainEqual({ label: 'model', value: 'second-model' });
    expect(parsed?.events.at(-1)?.summary).toBe('Prompt 31');
    expect(parsed?.heatmap['2026-7-28']).toEqual({ session: 1, tool: 0, prompt: 70 });
    expect(closedReaders).toBe(3);
  });

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

  it('retains only visible events while preserving full historical heatmap counts', () => {
    const base = Date.parse('2026-07-28T10:00:00.000Z');
    const history = Array.from(Array.from({ length: 1000 }).keys(), (index) => ({
      timestamp: new Date(base + (index + 1) * 1000).toISOString(),
      type: 'event_msg',
      payload: { type: 'user_message', message: `Prompt ${index}` },
    }));
    const content = jsonl(
      { timestamp: new Date(base).toISOString(), type: 'session_meta', payload: { id: 'long-session', cwd: '/workspace' } },
      ...history,
    );
    const parsed = parseCodexSessionContent(content, 'rollout.jsonl', base, base + 1_001_000);
    expect(parsed?.events).toHaveLength(40);
    expect(parsed?.session.events).toBe(parsed?.events);
    expect(parsed?.events[0].raw).toMatchObject({ message: 'Prompt 999' });
    expect(parsed?.heatmap['2026-7-28']).toEqual({ session: 1, tool: 0, prompt: 1000 });
  });
});
