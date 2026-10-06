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
 * @file aiChatTabLifecycleRuntime.test.tsx
 * @description 聊天页真实状态与发送 Hook 的会话、窗口、角色消息、授权和输入交互集成测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byClass, elements, find, invoke, text } from '../../../../../test/tree';
import { createHookReactMock, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { installChatRuntime, roleToken } from '../../hooks/test/chatRuntimeFixture';
import type { RefObject } from 'react';
import type { AiChatMessage } from '../../../../../../../store/types';
let Component: typeof import('../AiChatTab').AiChatTab;
let hooks: typeof import('../../hooks/useChatState');
let runtime: ReturnType<typeof installChatRuntime>;
const writeText = vi.fn<(value: string) => Promise<void>>();
const fetchLeaf = vi.fn<typeof fetch>();
/** 读取真实组件当前树。
 * @returns 元素树
 */
function run() {
  return renderHook(Component);
}
/** 提交实际生命周期。
 * @returns 更新后元素树
 */
function mount() {
  run();
  flushHookEffects();
  const tree = run();
  flushHookEffects();
  return tree;
}
/** 获取真实输入子组件公开回调。
 * @returns 输入栏元素
 */
function input() {
  return find(run(), (node) => typeof node.props.handleKeyDown === 'function');
}
/** 设置正常登录存储。
 */
function login(): void {
  runtime.storage.set('user-account-token', roleToken('pro'));
}
/** 写入真实会话消息。
 * @param messages - 消息
 */
function messages(messages: AiChatMessage[]): void {
  runtime.store.getState().setAiChatMessages(messages);
}
/** 切换公开 Agent 模式。
 */
function r1pxc(): void {
  login();
  runtime.storage.set('eIsland_agentMode', 'r1pxc');
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  runtime = installChatRuntime();
  Object.assign(runtime.navigation, {
    dominantColor: [34, 51, 68]
  });
  Object.assign(runtime.browser, {
    location: {
      hostname: 'electron.invalid'
    }
  });
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText
    }
  });
  writeText.mockResolvedValue();
  fetchLeaf.mockRejectedValue(new Error('native offline'));
  vi.stubGlobal('fetch', fetchLeaf);
  vi.doMock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));
  hooks = await import('../../hooks/useChatState');
  ({
    AiChatTab: Component
  } = await import('../AiChatTab'));
});
afterEach(() => {
  unmountHook();
  hooks.SESSION_ABORT_CONTROLLERS.clear();
  hooks.SESSION_STREAMING_IDS.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('AiChatTab real state and send integration', () => {
  it('guest actions navigate to login and registration', () => {
    const tree = mount();
    expect(text(tree)).toContain('aiChat.auth.entryTitle');
    invoke(byClass(tree, 'settings-user-primary-btn'), 'onClick');
    invoke(byClass(tree, 'settings-user-secondary-btn'), 'onClick');
    expect(runtime.navigation.setLogin).toHaveBeenCalledOnce();
    expect(runtime.navigation.setRegister).toHaveBeenCalledOnce();
  });
  it('empty logged page forwards actual configuration, sidebar and new conversation actions', () => {
    login();
    const tree = mount();
    expect(text(tree)).toContain('aiChat.messages.aiGeneratedDisclaimer');
    expect(byClass(tree, 'max-expand-chat').props.style).toMatchObject({
      '--chat-dominant-r': 140,
      '--chat-dominant-g': 140,
      '--chat-dominant-b': 140
    });
    expect(byClass(tree, 'max-expand-chat-session-sidebar').props['aria-hidden']).toBe(true);
    invoke(input(), 'setShowSessionSidebar', true);
    expect(byClass(run(), 'max-expand-chat-session-sidebar').props['aria-hidden']).toBe(false);
    const previous = runtime.store.getState().activeAiChatSessionId;
    invoke(byClass(run(), 'max-expand-chat-clear'), 'onClick');
    expect(runtime.store.getState().activeAiChatSessionId).not.toBe(previous);
  });
  it('session switch resets pending quote, syncs native stream marker and delete stops propagation', () => {
    login();
    runtime.store.getState().createNewAiChatSession();
    const first = runtime.store.getState().activeAiChatSessionId;
    runtime.store.getState().createNewAiChatSession();
    const second = runtime.store.getState().activeAiChatSessionId;
    hooks.SESSION_STREAMING_IDS.add(first);
    mount();
    invoke(input(), 'setPendingQuote', 'old');
    const items = elements(run()).filter((n) => String(n.props.className).split(' ').includes('max-expand-chat-session-item'));
    invoke(items.find((n) => String(n.props.className).includes('active'))!, 'onClick');
    expect(runtime.store.getState().activeAiChatSessionId).toBe(second);
    invoke(items.find((n) => !String(n.props.className).includes('active'))!, 'onClick');
    expect(runtime.store.getState().activeAiChatSessionId).toBe(first);
    expect(input().props.pendingQuote).toBeNull();
    expect(input().props.isStreaming).toBe(true);
    const count = runtime.store.getState().aiChatSessions.length;
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    };
    invoke(byClass(run(), 'max-expand-chat-session-delete'), 'onClick', event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(runtime.store.getState().aiChatSessions).toHaveLength(count - 1);
  });
  it('history buttons navigate real bounded message windows', () => {
    login();
    messages(Array.from({
      length: 350
    }, (...[, i]) => ({
      role: 'user',
      content: String(i)
    })));
    const tree = mount();
    const first = text(tree);
    invoke(byClass(tree, 'max-expand-chat-history-load-more'), 'onClick');
    const older = text(run());
    expect(older).not.toBe(first);
    const buttons = elements(run()).filter((n) => n.props.className === 'max-expand-chat-history-load-more');
    expect(buttons).toHaveLength(2);
    invoke(buttons[1], 'onClick');
    expect(text(run())).toBe(first);
  });
  it('ordinary user attachment wrappers are stripped, icons selected and actual settings navigation triggered', async () => {
    login();
    messages([{
      role: 'user',
      content: '<attachment name="a.ts">\nsecret\n</attachment>\n> 引用: old\n\nvisible',
      attachments: [{
        name: 'a.ts',
        size: 3
      }, {
        name: 'strange.unknown',
        size: 2
      }]
    }]);
    const tree = mount();
    expect(text(tree)).toContain('visible');
    expect(text(tree)).not.toContain('secret');
    expect(elements(tree).some((n) => n.props.className === 'max-expand-chat-bubble-attachment-icon-fallback')).toBe(true);
    invoke(byClass(tree, 'max-expand-chat-user-avatar'), 'onClick');
    await settleHook();
    expect(runtime.api.storeWrite).toHaveBeenCalledWith('settings-open-tab', 'user-info');
    expect(runtime.navigation.setMaxExpandTab).toHaveBeenCalledWith('settings');
  });
  it('profile avatar and assistant reasoning/todo/tools reach real timeline props while empty rows disappear', () => {
    login();
    runtime.storage.set('user-account-profile', JSON.stringify({
      avatar: 'data:image/png;base64,user'
    }));
    messages([{
      role: 'user',
      content: 'question'
    }, {
      role: 'assistant',
      content: ''
    }, {
      role: 'assistant',
      content: '',
      toolCalls: [{
        tool: 'agent.todo.write',
        turn: 1
      }]
    }, {
      role: 'assistant',
      content: '',
      thinkBlocks: ['reason']
    }, {
      role: 'assistant',
      content: '',
      todoSnapshots: [{
        turn: 1,
        items: []
      }]
    }, {
      role: 'assistant',
      content: '',
      toolCalls: [{
        tool: 'fs.read',
        turn: 1
      }]
    }, {
      role: 'assistant',
      content: 'answer'
    }]);
    const tree = mount();
    expect(elements(tree).filter((n) => typeof n.props.onReportIssue === 'function')).toHaveLength(4);
  });
  it.each([false, true])('latest empty streaming r1pxc assistant uses configured avatar %s and native handlers', async (avatar) => {
    r1pxc();
    runtime.store.getState().setAiConfig({
      r1pxcAvatar: avatar ? ' data:image/png;base64,a ' : 'https://remote.invalid/a'
    });
    messages([{
      role: 'assistant',
      content: ''
    }]);
    hooks.SESSION_STREAMING_IDS.add(runtime.store.getState().activeAiChatSessionId);
    const tree = mount();
    expect(byClass(tree, 'max-expand-chat-generating-dots')).toBeDefined();
    const img = byClass(tree, 'max-expand-chat-agent-avatar');
    if (avatar) {
      const target = {
        style: {
          display: ''
        }
      };
      invoke(img, 'onError', {
        target
      });
      expect(target.style.display).toBe('none');
    }
    invoke(img, 'onClick');
    await settleHook();
    expect(runtime.api.storeWrite).toHaveBeenCalledWith('settings-open-tab', 'ai');
  });
  it.each([false, true])('segmented r1pxc content joins quoted paragraph and wires quote/copy with avatar %s', async (avatar) => {
    r1pxc();
    runtime.store.getState().setAiConfig({
      r1pxcAvatar: avatar ? 'data:image/png;base64,a' : ''
    });
    messages([{
      role: 'assistant',
      content: `> 引用: ${  'q'.repeat(81)  }\n\nbody\n\nplain\n\n> 引用: short\n\nlast`
    }]);
    hooks.SESSION_STREAMING_IDS.add(runtime.store.getState().activeAiChatSessionId);
    const tree = mount();
    expect(text(tree)).toContain(`${'q'.repeat(80)  }…`);
    expect(text(tree)).toContain('short');
    const focus = vi.fn();
    (input().props.inputRef as RefObject<unknown>).current = {
      focus
    };
    const actions = byClass(tree, 'max-expand-chat-bubble-actions');
    invoke(elements(actions).find((n) => n.type === 'button')!, 'onClick');
    expect(input().props.pendingQuote).toContain('body');
    expect(focus).toHaveBeenCalledOnce();
    const buttons = elements(actions).filter((n) => n.type === 'button');
    writeText.mockRejectedValueOnce(new Error('clipboard denied'));
    invoke(buttons[1], 'onClick');
    await settleHook();
    expect(writeText).toHaveBeenCalledWith(`> 引用: ${  'q'.repeat(81)  }\nbody`);
    const img = byClass(tree, 'max-expand-chat-agent-avatar');
    if (avatar) {
      const target = {
        style: {
          display: ''
        }
      };
      invoke(img, 'onError', {
        target
      });
      expect(target.style.display).toBe('none');
    }
    invoke(img, 'onClick');
    await settleHook();
    expect(runtime.api.storeWrite).toHaveBeenCalledWith('settings-open-tab', 'ai');
  });
  it.each(['short', 'x'.repeat(81)])('r1pxc user quote %s is rendered and ordinary body is preserved', (quote) => {
    r1pxc();
    messages([{
      quote,
      role: 'user',
      content: 'body'
    }]);
    const tree = mount();
    expect(text(tree)).toContain(quote.length > 80 ? `${quote.slice(0, 80)  }…` : quote);
    expect(text(tree)).toContain('body');
  });
  it('quote-only segment has no body and empty nonstream assistant remains hidden', () => {
    r1pxc();
    messages([{
      role: 'assistant',
      content: '> 引用: only'
    }, {
      role: 'assistant',
      content: ''
    }]);
    const tree = mount();
    expect(elements(tree).filter((n) => String(n.props.className).includes('max-expand-chat-agent-row'))).toHaveLength(1);
    expect(elements(tree).some((n) => typeof n.props.content === 'string')).toBe(false);
  });
  it('Enter invokes actual send validation while shift Enter and another key preserve default behavior', async () => {
    login();
    mount();
    const event = {
      key: 'Enter',
      shiftKey: false,
      preventDefault: vi.fn()
    };
    invoke(input(), 'handleKeyDown', event);
    await settleHook();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(fetchLeaf).not.toHaveBeenCalled();
    invoke(input(), 'handleKeyDown', {
      ...event,
      shiftKey: true
    });
    invoke(input(), 'handleKeyDown', {
      ...event,
      key: 'Escape'
    });
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });
  it('native profile avatar has actual settings callback and optional avatar clearing remains safe', async () => {
    r1pxc();
    runtime.storage.set('user-account-profile', JSON.stringify({
      avatar: 'data:image/png;base64,user'
    }));
    runtime.store.getState().setAiConfig({
      r1pxcAvatar: undefined
    });
    messages([{
      role: 'user',
      content: 'body'
    }, {
      role: 'assistant',
      content: 'answer'
    }]);
    const tree = mount();
    invoke(byClass(tree, 'max-expand-chat-user-avatar'), 'onClick');
    await settleHook();
    expect(runtime.api.storeWrite).toHaveBeenCalledWith('settings-open-tab', 'user-info');
    expect(byClass(tree, 'max-expand-chat-agent-avatar').props.src).toBeTruthy();
  });
  it('real streamed leaf events connect both authorization panels and retain session isolation', async () => {
    login();
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const body = new ReadableStream<Uint8Array>({
      start(value) {
        controller = value;
      }
    });
    fetchLeaf.mockResolvedValueOnce(new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream'
      }
    }));
    Object.assign(runtime.api, {
      netFetch: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        data: '<title>Native website</title>'
      })
    });
    mount();
    invoke(input(), 'setInput', 'request');
    const event = {
      key: 'Enter',
      shiftKey: false,
      preventDefault: vi.fn()
    };
    invoke(input(), 'handleKeyDown', event);
    await settleHook();
    expect(fetchLeaf).toHaveBeenCalledOnce();
    controller!.enqueue(new TextEncoder().encode(`event: web_access_request\ndata: ${  JSON.stringify({
      requestId: 'web',
      url: 'https://native.invalid/page',
      message: 'web ask'
    })  }\n\nevent: tool_call_request\ndata: ${  JSON.stringify({
      requestId: 'local',
      tool: 'file.delete',
      purpose: 'remove',
      authorizationRequired: true,
      riskLevel: 'high',
      message: 'local ask',
      arguments: {
        path: 'virtual'
      }
    })  }\n\n`));
    await settleHook();
    const tree = run();
    const web = find(tree, (n) => typeof n.props.onPolicyChange === 'function');
    const local = find(tree, (n) => typeof n.props.prompt === 'object' && typeof n.props.onResolve === 'function');
    expect(web.props.hostname).toBe('native.invalid');
    expect(local.props.prompt).toMatchObject({
      sessionId: runtime.store.getState().activeAiChatSessionId,
      requestId: 'local',
      tool: 'file.delete'
    });
    runtime.store.getState().createNewAiChatSession();
    expect(elements(run()).some((n) => typeof n.props.onPolicyChange === 'function')).toBe(false);
    expect(elements(run()).some((n) => typeof n.props.prompt === 'object' && typeof n.props.onResolve === 'function')).toBe(false);
    controller!.close();
    await settleHook();
  });
});
