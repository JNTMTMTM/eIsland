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
 * @file messageTimeline.test.tsx
 * @description MessageTimeline 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { MessageTimeline as Component } from '../MessageTimeline';
import { AssistantMarkdown } from '../AssistantMarkdown';
import { ThinkingReasoning } from '../../../../../../components/DynamicIslandAgentProcessComponents/thinking';
import { TodoList } from '../../../../../../components/DynamicIslandAgentProcessComponents/todo';
const persist = vi.hoisted(() => vi.fn());
vi.mock('../../../../../../../store/slices', () => ({ default: (selector: (store: { setAiChatMessageThinkDuration: typeof persist }) => unknown) => selector({ setAiChatMessageThinkDuration: persist }) }));
describe('MessageTimeline', () => {
  const props = { absoluteIndex: 0, totalMessages: 1, isStreaming: false, showThinking: true, onReportIssue: vi.fn() };
  it('sorts tools by turn, hides todo-write calls and persists reasoning durations', () => {
    const tree = render(Component, { ...props, msg: { content: 'answer', thinkBlocks: ['first', 'next', 'last'], thinkDurations: [2], toolCalls: [{ tool: 'tail', pending: true }, { tool: 'second', turn: 2, success: false }, { tool: 'agent.todo.write', turn: 1 }, { tool: 'first', turn: 1, success: true, result: { ok: true } }], todoSnapshots: [{ turn: 0, items: [] }, { turn: 1, items: [] }] } });
    expect(nodes(tree, '.max-expand-chat-tool-name').map((node) => text(node))).toEqual(['first', 'second', 'tail']);
    expect(nodes(tree, ThinkingReasoning)).toHaveLength(3);
    expect(nodes(tree, TodoList)).toHaveLength(2);
    expect(value(tree, ThinkingReasoning, 'persistedDuration')).toBe(2);
    trigger(tree, ThinkingReasoning, 'onDurationComputed', 3);
    expect(persist).toHaveBeenCalledWith(0, 0, 3);
    expect(nodes(tree, '.success')).toHaveLength(1);
    expect(nodes(tree, '.failed')).toHaveLength(1);
    expect(nodes(tree, '.max-expand-chat-tool-status-dot')).toHaveLength(1);
    expect(value(tree, AssistantMarkdown, 'content')).toBe('answer');
  });
  it('shows live indicators only for the newest streaming message', () => {
    const msg = { content: '', thinkBlocks: ['thinking'] };
    const live = render(Component, {
      msg,
      ...props,
      isStreaming: true
    });
    expect(nodes(live, '.max-expand-chat-think-live-dots')).toHaveLength(1);
    const noThinking = render(Component, {
      msg,
      ...props,
      isStreaming: true,
      showThinking: false
    });
    expect(nodes(noThinking, ThinkingReasoning)).toHaveLength(0);
    expect(nodes(noThinking, '.max-expand-chat-generating-dots')).toHaveLength(1);
    expect(nodes(render(Component, {
      msg,
      ...props,
      totalMessages: 2,
      isStreaming: true
    }), '.max-expand-chat-loading-row')).toHaveLength(0);
  });
  it.each([['ollama', '', 'aiChat.localModelGenerated'], ['custom-api', '', 'aiChat.customDirectGenerated'], ['deepseek-v4-flash', ' trace ', 'TraceID: trace']])('selects finalized metadata for %s', (model, traceId, label) => {
    const tree = render(Component, { ...props, msg: {
      model,
      traceId,
      content: 'final',
      finalized: true
    } });
    expect(text(tree)).toContain(label);
    if (traceId) { trigger(tree, '.max-expand-chat-trace-report-btn', 'onClick'); expect(props.onReportIssue).toHaveBeenCalledWith('trace', 'final'); }
    else expect(nodes(tree, '.max-expand-chat-trace-report-btn')).toHaveLength(0);
  });
});
