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
 * @file codexSessionProtocolSupplement.test.ts
 * @description Codex 日志多版本协议、异构内容、时间与详情二次读取边界测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { parseCodexSessionContent, parseCodexSessionLines } from '../codexSessionParser';
const base = Date.parse('2026-10-06T00:00:00Z');
/**
 * 解析一个任务事件，固定真实元数据和时间。
 * @param payload - Codex 事件协议负载
 * @param lineType - 顶层事件类别
 * @returns 当前协议对应的非 SessionStart 事件
 */
function event(payload: Record<string, unknown>, lineType = 'event_msg'): ReturnType<typeof parseCodexSessionContent> {
  const content = [{ type: 'session_meta', timestamp: base, payload: { id: 'fixture', cwd: '/' } },
    { payload, type: lineType, created_at: base + 1 }].map((item) => JSON.stringify(item)).join('\n');
  return parseCodexSessionContent(content, 'fixture.jsonl', base, base + 2);
}
describe('Codex 多版本事件与输入形状协议', () => {
  it.each(['task_started', 'turn_started'])('任务开始事件 %s 进入 running', (type) => {
    const parsed = event({ type }); expect(parsed?.events[0]).toMatchObject({ eventName: 'TurnStart', summary: 'Codex 开始处理任务' }); expect(parsed?.session.phase).toBe('running');
  });
  it.each([
    { type: 'user_message', content: ' text ', summary: 'text' },
    { type: 'user_message', content: ['first', { input_text: 'second' }, { output_text: 'third' }, {}, null], summary: 'first second third' },
    { type: 'user_message', content: [], summary: '获取到用户提示词' },
    { type: 'user_message', content: 17, summary: '获取到用户提示词' },
    { type: 'agent_message_delta', text: 'Delta', summary: 'Delta' },
    { type: 'agent_message', last_agent_message: 'Last', summary: 'Last' }
  ])('消息 $type 解析异构 content $summary', ({ summary, ...payload }) => {
    const parsed = event(payload); expect(parsed?.events[0].summary).toBe(summary);
    expect(parsed?.events[0].detailItems.some((item) => item.label === (payload.type === 'user_message' ? 'userInput' : 'assistantOutput'))).toBe(summary !== '获取到用户提示词');
  });
  it.each(['agent_message', 'agent_message_delta'])('空 %s 被忽略', (type) => {
    expect(event({ type, content: [' ', {}] })?.events.map((item) => item.eventName)).toEqual(['SessionStart']);
  });
  it.each(['exec_approval_request', 'apply_patch_approval_request', 'request_permissions'])('授权事件 %s 没有输入时仍可等待确认', (type) => {
    const parsed = event({ type }); expect(parsed?.session.phase).toBe('waiting_permission');
    expect(parsed?.events[0].summary).toBe(`${type === 'apply_patch_approval_request' ? 'apply_patch' : 'shell'  } 请求授权`);
    expect(parsed?.events[0].toolInputPreview).toBeNull();
  });
  it.each(['task_complete', 'turn_complete', 'turn_completed'])('完成事件 %s 缺少最后消息时采用默认文案', (type) => {
    expect(event({ type })?.events[0]).toMatchObject({ eventName: 'Stop', summary: '本轮完成' });
  });
  it.each([{ type: 'error', error: { code: 'EIO' } }, { type: 'turn_aborted', message: 'aborted' }])('失败事件 $type 保留错误详情', (payload) => {
    const parsed = event(payload); expect(parsed?.session.phase).toBe('idle'); expect(parsed?.events[0].eventName).toBe('StopFailure');
    expect(parsed?.events[0].detailItems).toContainEqual({ label: 'error', value: 'error' in payload ? JSON.stringify(payload.error, null, 2) : 'aborted' });
  });
  it.each([
    { type: 'function_call', arguments: 'not JSON', preview: 'not JSON', tool: 'tool' },
    { type: 'custom_tool_call', input: { file_path: 'a.ts' }, preview: 'a.ts', tool: 'tool' },
    { type: 'local_shell_call', command: { query: 'question' }, preview: 'question', tool: 'shell' },
    { type: 'function_call', args: { prompt: 'answer' }, preview: 'answer', tool: 'tool' },
    { type: 'function_call', arguments: { other: 1 }, preview: '{ "other": 1 }', tool: 'tool' },
    { type: 'function_call', arguments: '""', preview: '""', tool: 'tool' },
    { type: 'function_call', input: '', preview: null, tool: 'tool' },
    { type: 'function_call', name: 'named', id: 'tool-id', preview: null, tool: 'named' }
  ])('工具 $type 输入 $preview 从真实 JSON 协议生成预览', ({ preview, tool, ...payload }) => {
    const parsed = event(payload, 'response_item'); expect(parsed?.events[0]).toMatchObject({ eventName: 'PreToolUse', toolName: tool, toolInputPreview: preview });
    expect(parsed?.events[0].summary).toBe(preview ? `正在使用 ${  tool  }：${  preview}` : `正在使用 ${  tool}`);
  });
  it.each(['function_call_output', 'custom_tool_call_output', 'local_shell_call_output'])('工具输出 %s 支持缺省、字符串和对象结果', (type) => {
    expect(event({ type }, 'response_item')?.events[0].summary).toBe('工具调用已完成');
    expect(event({ type, output: '' }, 'response_item')?.events[0].summary).toBe('工具调用已完成');
    expect(event({ type, content: { ok: true }, id: 'result' }, 'response_item')?.events[0].summary).toBe('{ "ok": true }');
  });
  it.each(['user', 'assistant', 'system', null])('response message 角色 %s 仅导出用户或助手内容', (role) => {
    const parsed = event({ role, type: 'message', content: null, text: 'fallback' }, 'response_item');
    const names = new Map([['user', 'UserPromptSubmit'], ['assistant', 'AssistantOutput']]);
    expect(parsed?.events[0].eventName).toBe(role === null ? 'SessionStart' : names.get(role) ?? 'SessionStart');
    expect(event({ role, type: 'message', content: ' ' }, 'response_item')?.events).toHaveLength(1);
  });
  it('长文本截断至220字符，转义空白只影响摘要并保留原始详情', () => {
    const text = `${'x'.repeat(225)  }\n tail`; const parsed = event({ type: 'agent_message', content: text });
    expect(parsed?.events[0].summary).toBe(`${'x'.repeat(219)  }…`); expect(parsed?.events[0].detailItems).toContainEqual({ label: 'assistantOutput', value: text });
  });
  it.each(['session_id', 'thread_id'])('元数据 ID 别名 %s 和 item 负载被保留', (key) => {
    const parsed = parseCodexSessionContent(JSON.stringify({ type: 'session_meta', createdAt: 1700000000, item: { [key]: 'alias' } }), 'fixture', base);
    expect(parsed?.session.id).toBe('alias'); expect(parsed?.session.title).toBe('alias'); expect(parsed?.events[0].createdAt).toBe(1700000000000);
  });
  it('时间无效时用文件时间，未知或非对象行忽略，cwd 根路径保留', () => {
    const content = `${[JSON.stringify({ type: 'session_meta', timestamp: 'invalid', payload: { id: 'fixture', cwd: '/' } }), 'null', '[]',
      JSON.stringify({ type: 'turn_context', payload: {} }), JSON.stringify({ type: 'event_msg', payload: {} }), JSON.stringify({ type: 'response_item', payload: {} })].join('\n')  }\n`;
    const parsed = parseCodexSessionContent(content, 'fixture', base, base);
    expect(parsed?.session.title).toBe('/'); expect(parsed?.events[0].createdAt).toBe(base); expect(parsed?.events).toHaveLength(1);
  });
  it('跨读取轮次被截断的日志无法再水合事件时保留先前摘要', () => {
    let reads = 0;
    const metadata = JSON.stringify({ type: 'session_meta', payload: { id: 'fixture' }, timestamp: base });
    const message = JSON.stringify({ type: 'event_msg', payload: { type: 'user_message', message: 'original' }, timestamp: base + 1 });
    const changed = JSON.stringify({ type: 'event_msg', payload: { type: 'agent_message' }, timestamp: base + 1 });
    const parsed = parseCodexSessionLines(() => { reads += 1; return reads === 3 ? [metadata, changed] : [metadata, message]; }, 'fixture', base, base + 2);
    expect(parsed?.events[0]).toMatchObject({ summary: 'original', raw: {}, detailItems: [] });
  });
});

it('搜索元数据跳过前导未知行，并支持授权请求中的实际工具预览', () => {
  const parsed = parseCodexSessionContent([JSON.stringify({ type: 'unknown' }), JSON.stringify({ type: 'session_meta', payload: { id: 'fixture' } }), JSON.stringify({ type: 'event_msg', payload: { type: 'apply_patch_approval_request', arguments: { file_path: 'a.ts' } } })].join('\n'), 'fixture', base);
  expect(parsed?.events[0]).toMatchObject({ summary: 'apply_patch 请求授权：a.ts', toolInputPreview: 'a.ts' });
});
