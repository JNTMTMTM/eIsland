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
 * @file messageTimelineRuntime.test.tsx
 * @description 消息时间线真实格式化、分组稳定排序、思考耗时持久化和报告回调接线测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createAiSlice } from '../../../../../../../store/slices/aiSlice';
import installStorage from '../../../../../../../store/slices/test/sliceStorageFixture';
import { elements, find, invoke, text } from '../../../../../test/tree';
import { createHookReactMock, renderHook, resetHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import type { StoreApi } from 'zustand/vanilla';
import type { AiSlice, AiChatMessage, AiToolCall } from '../../../../../../../store/types';
let Component: typeof import('../MessageTimeline').MessageTimeline;
let store: StoreApi<AiSlice>;
let storage: ReturnType<typeof installStorage>;
const report = vi.fn<(traceId: string, answer: string) => void>();
/** 构造真实消息工具协议。
 * @param tool - 名称
 * @param turn - 对应轮次
 * @param patch - 真实状态
 * @returns 工具记录
 */
function call(tool: string, turn: number, patch: Partial<AiToolCall> = {}): AiToolCall {
  return {
    tool,
    turn,
    result: {
      value: tool
    },
    ...patch
  };
}
/** 将消息交给实际 store 并读取真实组件。
 * @param msg - 消息
 * @param patch - 渲染参数
 * @returns 元素树
 */
function run(msg: AiChatMessage, patch: Partial<Parameters<typeof Component>[0]> = {}) {
  return renderHook(Component, {
    msg,
    absoluteIndex: 1,
    totalMessages: 2,
    isStreaming: false,
    showThinking: true,
    onReportIssue: report,
    ...patch
  });
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  storage = installStorage();
  store = createStore<AiSlice>()(createAiSlice);
  vi.doMock('../../../../../../../store/slices', () => ({
    default: (selector: (state: AiSlice) => unknown) => selector(store.getState())
  }));
  vi.doMock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));
  ({
    MessageTimeline: Component
  } = await import('../MessageTimeline'));
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('MessageTimeline real helpers and state actions', () => {
  it('groups stable tool turns, todo snapshots and reasoning, persisting every real duration callback', () => {
    const msg: AiChatMessage = {
      role: 'assistant',
      content: 'answer ```\ncode\n```',
      thinkBlocks: ['initial', 'after first', 'after second', 'remaining'],
      thinkDurations: [1, 2, 3, 4],
      toolCalls: [call('tail.pending', 0, {
        pending: true
      }), call('second', 2, {
        success: false
      }), call('first.a', 1, {
        success: true
      }), call('first.b', 1, {
        pending: true
      }), call('agent.todo.write', 3, {
        success: true
      }), call('tail.failed', 0, {
        success: false
      }), call('tail.success', 0, {
        success: true
      })],
      todoSnapshots: [{
        turn: 0,
        items: []
      }, {
        turn: 1,
        items: []
      }, {
        turn: 2,
        items: []
      }]
    };
    store.getState().setAiChatMessages([{
      role: 'user',
      content: 'input'
    }, msg]);
    const tree = run(msg);
    expect(elements(tree).filter((node) => node.props.className === 'max-expand-chat-tool-name').map(text)).toEqual(['first.a', 'first.b', 'second', 'tail.pending', 'tail.failed', 'tail.success']);
    expect(text(tree)).not.toContain('agent.todo.write');
    expect(elements(tree).filter((node) => typeof node.props.onDurationComputed === 'function')).toHaveLength(4);
    elements(tree).filter((node) => typeof node.props.onDurationComputed === 'function').forEach((node, index) => {
      invoke(node, 'onDurationComputed', index + 10);
    });
    expect(store.getState().aiChatMessages[1].thinkDurations).toEqual([10, 11, 12, 13]);
    expect(JSON.parse(storage.values.get('eIsland_aiChatMessages') ?? '[]') as AiChatMessage[]).toMatchObject([{
      content: 'input'
    }, {
      thinkDurations: [10, 11, 12, 13]
    }]);
    expect(find(tree, (node) => node.props.content === 'answer\n```\ncode\n```').props.content).toBe('answer\n```\ncode\n```');
    const live = run(msg, {
      isStreaming: true
    });
    const liveThinking = elements(live).filter((node) => typeof node.props.onDurationComputed === 'function');
    expect(liveThinking[0].props.isThinking).toBe(true);
    expect(liveThinking[3].props.isThinking).toBe(true);
    expect(liveThinking[1].props.isThinking).toBe(false);
    const older = run(msg, {
      isStreaming: true,
      totalMessages: 3
    });
    expect(elements(older).filter((node) => typeof node.props.onDurationComputed === 'function').every((node) => node.props.isThinking === false)).toBe(true);
  });
  it('empty initial and interleaved think blocks stay absent while trailing nonempty reasoning remains callable', () => {
    const msg: AiChatMessage = {
      role: 'assistant',
      content: '',
      thinkBlocks: ['', '', 'final'],
      toolCalls: [call('ordered', 1), call('next', 2)],
      todoSnapshots: [{
        turn: 2,
        items: []
      }]
    };
    store.getState().setAiChatMessages([{
      role: 'user',
      content: 'input'
    }, msg]);
    const tree = run(msg, {
      isStreaming: true
    });
    const nodes = elements(tree).filter((node) => typeof node.props.onDurationComputed === 'function');
    expect(nodes).toHaveLength(1);
    expect(nodes[0].props).toMatchObject({
      content: 'final',
      isThinking: true
    });
    invoke(nodes[0], 'onDurationComputed', 5);
    expect(store.getState().aiChatMessages[1].thinkDurations?.[2]).toBe(5);
  });
  it.each([{
    thinking: true,
    streaming: true,
    latest: true
  }, {
    thinking: false,
    streaming: true,
    latest: true
  }, {
    thinking: true,
    streaming: true,
    latest: false
  }, {
    thinking: false,
    streaming: false,
    latest: true
  }, {
    thinking: false,
    streaming: true,
    latest: false
  }])('empty message indicators depend on actual latest/streaming/thinking state %#', (flags) => {
    const tree = run({
      role: 'assistant',
      content: ''
    }, {
      showThinking: flags.thinking,
      isStreaming: flags.streaming,
      totalMessages: flags.latest ? 2 : 3
    });
    expect(elements(tree).some((node) => node.props.className === 'max-expand-chat-think-live-dots')).toBe(flags.thinking && flags.streaming && flags.latest);
    expect(elements(tree).some((node) => node.props.className === 'max-expand-chat-generating-dots')).toBe(!flags.thinking && flags.streaming && flags.latest);
  });
  it.each([{
    model: 'ollama',
    traceId: '',
    label: 'aiChat.localModelGenerated',
    reportable: false
  }, {
    model: 'custom-api',
    traceId: '',
    label: 'aiChat.customDirectGenerated',
    reportable: false
  }, {
    model: 'custom-api',
    traceId: ' traced ',
    label: 'TraceID: traced',
    reportable: true
  }, {
    model: 'deepseek-v4-flash',
    traceId: '',
    label: 'TraceID: -',
    reportable: true
  }])('finalized metadata for $model uses correct native/provider label and public report', (info) => {
    const tree = run({
      role: 'assistant',
      content: 'final answer',
      finalized: true,
      model: info.model,
      traceId: info.traceId
    });
    expect(text(tree)).toContain(info.label);
    const buttons = elements(tree).filter((node) => node.props.className === 'max-expand-chat-trace-report-btn');
    expect(buttons).toHaveLength(info.reportable ? 1 : 0);
    if (info.reportable) {
      invoke(buttons[0], 'onClick');
      expect(report).toHaveBeenCalledWith(info.traceId.trim(), 'final answer');
    }
  });
  it('ordinary nonfinalized output has no trace footer and hidden reasoning remains absent', () => {
    const tree = run({
      role: 'assistant',
      content: 'plain',
      thinkBlocks: ['hidden']
    }, {
      showThinking: false
    });
    expect(elements(tree).some((node) => node.props.className === 'max-expand-chat-trace-id')).toBe(false);
    expect(elements(tree).some((node) => node.props.className === 'max-expand-chat-tool-list')).toBe(false);
    expect(find(tree, (node) => node.props.content === 'plain').props.content).toBe('plain');
  });
});
