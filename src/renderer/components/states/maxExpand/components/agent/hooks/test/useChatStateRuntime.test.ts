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
 * @file useChatStateRuntime.test.ts
 * @description 聊天状态真实 slice、用户会话、模型权限、选区延迟刷新和生命周期交互测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { installChatRuntime, roleToken } from './chatRuntimeFixture';
import type { AiChatMessage } from '../../../../../../../store/types';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
let runtime: Awaited<ReturnType<typeof installChatRuntime>>;
let target: typeof import('../useChatState');
/** 读取真实 Hook 当前状态。
 * @returns Hook 状态
 */
function run() {
  return renderHook(target.useChatState);
}
/** 提交挂载 Effect 并读取更新后状态。
 * @returns Hook 状态
 */
function mount() {
  run();
  flushHookEffects();
  const state = run();
  flushHookEffects();
  return state;
}
/** 设置真实存储中的角色 JWT。
 * @param role - 角色
 */
function role(role: string): void {
  runtime.storage.set('user-account-token', roleToken(role));
}
/** 设置真实消息中的 token 统计。
 * @param totalTokens - 总量
 */
function tokens(totalTokens: number): void {
  runtime.store.getState().setAiChatMessages([{
    role: 'user',
    content: 'hello'
  }, {
    role: 'assistant',
    content: 'answer',
    tokenUsage: {
      totalTokens,
      inputTokens: totalTokens - 3,
      outputTokens: 2,
      reasoningTokens: 1,
      source: 'test'
    }
  }]);
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
  runtime = installChatRuntime();
  await import('../../utils/chatHelpers');
  target = await import('../useChatState');
});
afterEach(() => {
  unmountHook();
  target?.SESSION_ABORT_CONTROLLERS.clear();
  target?.SESSION_STREAMING_IDS.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('useChatState model and user runtime', () => {
  it.each([['user', 'deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek'], ['user', 'mimo-v2.5-pro', 'deepseek-v4-flash', 'deepseek'], ['user', 'MiniMax-M2.7-highspeed', 'deepseek-v4-flash', 'deepseek'], ['user', 'MiniMax-M2.5-highspeed', 'deepseek-v4-flash', 'deepseek'], ['user', 'mimo-v2.5', 'mimo-v2.5', 'mimo'], ['user', 'MiniMax-M2.5', 'MiniMax-M2.5', 'minimax'], ['pro', 'deepseek-v4-pro', 'deepseek-v4-pro', 'deepseek'], ['admin', 'ollama', 'ollama', 'ollama'], ['pro', 'unknown', 'deepseek-v4-flash', 'deepseek']])('role %s requested %s selects %s', (accountRole, model, selectedModel, provider) => {
    role(accountRole);
    runtime.store.getState().setAiConfig({
      model,
      ollamaModel: 'local'
    });
    const result = mount();
    expect(result).toMatchObject({
      selectedModel,
      selectedProvider: provider,
      isProUser: accountRole !== 'user'
    });
    expect(result.modelToggleIcon).toBeTruthy();
    if (provider === 'ollama') expect(result.ollamaDisplayLabel).toBe('ollama (local)');
  });
  it.each([['user', true, 'deepseek-v4-flash'], ['pro', false, 'deepseek-v4-flash'], ['pro', true, 'custom-api']] as const)('custom role %s credentials %s', (accountRole, credentials, selectedModel) => {
    role(accountRole);
    runtime.store.getState().setAiConfig({
      model: 'custom-api',
      apiKey: credentials ? ' key ' : '',
      endpoint: 'https://example.invalid',
      customApiModel: credentials ? 'custom' : undefined
    });
    const result = mount();
    expect(result.selectedModel).toBe(selectedModel);
    expect(result.customApiDisplayLabel).toBe(credentials ? 'custom-api (custom)' : 'custom-api');
  });
  it('native session event refreshes login and profile avatar and its listener is cleaned', async () => {
    let result = mount();
    expect(result).toMatchObject({
      hasLoginSession: false,
      userAvatarUrl: null
    });
    role('admin');
    runtime.storage.set('user-account-profile', JSON.stringify({
      avatar: 'avatar'
    }));
    runtime.browser.dispatchEvent(new Event('user-account-session-changed'));
    result = run();
    expect(result).toMatchObject({
      hasLoginSession: true,
      userAvatarUrl: 'avatar'
    });
    const off = vi.spyOn(runtime.browser, 'removeEventListener');
    unmountHook();
    expect(off).toHaveBeenCalledWith('user-account-session-changed', expect.any(Function));
    await settleHook();
  });
  it.each([[0, 'normal'], [140000, 'warn'], [180000, 'danger'], [300000, 'danger']] as const)('usage %s has %s pressure and caps percent', (total, level) => {
    tokens(total);
    const result = mount();
    expect(result.contextUsageTokens).toBe(total);
    expect(result.contextUsageLevelClass).toBe(level);
    expect(result.contextUsagePercent).toBe(Math.min(100, total / 200000 * 100));
    expect(result.contextTokenUsage.source).toBe('test');
  });
  it('million-token limit is reduced for free users and kept for pro, unknown runtime config label falls back', () => {
    runtime.store.getState().setAiConfig({
      contextLimit: 1000000
    });
    expect(mount().selectedContextLimit).toBe(400000);
    role('pro');
    expect(run().selectedContextLimit).toBe(1000000);
    runtime.store.setState((state) => ({
      aiConfig: {
        ...state.aiConfig,
        contextLimit: 123 as typeof state.aiConfig.contextLimit
      }
    }));
    expect(run().selectedContextLabel).toBe('200K');
  });
  it('mode selection persists and dropdown geometry is sampled only when opening with an attached button', () => {
    let result = mount();
    result.toggleAgentModeDropdown();
    expect(run().showAgentModeDropdown).toBe(true);
    result.toggleAgentModeDropdown();
    expect(run().showAgentModeDropdown).toBe(false);
    const rect = vi.fn(() => ({
      left: 20,
      top: 500
    }));
    result.agentModeTriggerRef.current = {
      getBoundingClientRect: rect
    } as unknown as HTMLButtonElement;
    result.toggleAgentModeDropdown();
    expect(run().agentModeDropdownPos).toEqual({
      left: 20,
      bottom: 406
    });
    result.toggleAgentModeDropdown();
    expect(rect).toHaveBeenCalledOnce();
    result.setAgentMode('r1pxc');
    result = run();
    expect(result).toMatchObject({
      agentMode: 'r1pxc',
      showAgentModeDropdown: false,
      VISIBLE_CHAT_WINDOW_SIZE: 25
    });
    expect([...runtime.storage.values()]).toContain('r1pxc');
  });
});
describe('useChatState messages and lifecycle', () => {
  it('native textarea selection delays auto-scroll and queued update until it collapses', async () => {
    let result = run();
    const scroll = vi.fn();
    result.chatEndRef.current = {
      scrollIntoView: scroll
    } as unknown as HTMLDivElement;
    const input = {
      selectionStart: 0,
      selectionEnd: 2,
      style: {
        height: '',
        overflowY: ''
      },
      scrollHeight: 34
    };
    result.inputRef.current = input as unknown as HTMLTextAreaElement;
    runtime.documentTarget.activeElement = input;
    flushHookEffects();
    expect(scroll).not.toHaveBeenCalled();
    result.updateMessages(() => [{
      role: 'assistant',
      content: 'A'
    }]);
    result.pendingAssistantChunkRef.current = 'B';
    result.scheduleAssistantUpdateFlush();
    await vi.advanceTimersByTimeAsync(32);
    expect(runtime.store.getState().aiChatMessages[0].content).toBe('A');
    input.selectionEnd = 0;
    await vi.advanceTimersByTimeAsync(16);
    expect(runtime.store.getState().aiChatMessages[0].content).toBe('AB');
    result = run();
    flushHookEffects();
    expect(scroll).toHaveBeenLastCalledWith({
      behavior: 'auto'
    });
    result.updateMessages((prev) => [...prev, {
      role: 'user',
      content: 'next'
    }]);
    run();
    flushHookEffects();
    expect(scroll).toHaveBeenLastCalledWith({
      behavior: 'smooth'
    });
    runtime.documentTarget.activeElement = {};
    result.updateMessages((prev) => [...prev, {
      role: 'user',
      content: 'other'
    }]);
    run();
    flushHookEffects();
    expect(scroll).toHaveBeenLastCalledWith({
      behavior: 'smooth'
    });
  });
  it('native range must stay wholly inside selectable bubbles or input before it delays RAF', async () => {
    class NativeElement {
      inside = true;

      selectable = true;

      parentElement: NativeElement | null = null;

      /** 查询原生节点是否位于当前容器中。
       * @param node - 原生节点
       * @returns 是否包含
       */
      contains(node: unknown): boolean {
        return node instanceof NativeElement && node.inside;
      }

      /** 查询原生可选中气泡容器。
       * @param selector - 项目选择器
       * @returns 容器或空值
       */
      closest(selector: string): NativeElement | null {
        expect(selector).toBe('.max-expand-chat-bubble, .max-expand-chat-input');
        return this.selectable ? this : null;
      }
    }
    vi.stubGlobal('Element', NativeElement);
    const result = mount();
    result.updateMessages(() => [{
      role: 'assistant',
      content: 'A'
    }]);
    const root = new NativeElement();
    const inside = new NativeElement();
    const outside = new NativeElement();
    outside.inside = false;
    const plain = new NativeElement();
    plain.selectable = false;
    result.chatRootRef.current = root as unknown as HTMLDivElement;
    const selection = {
      isCollapsed: false,
      rangeCount: 1,
      anchorNode: inside,
      focusNode: inside,
      getRangeAt: () => ({
        startContainer: inside,
        endContainer: inside
      })
    };
    const scenarios = [{
      ...selection,
      isCollapsed: true
    }, {
      ...selection,
      rangeCount: 0
    }, {
      ...selection,
      anchorNode: null
    }, {
      ...selection,
      focusNode: outside
    }, {
      ...selection,
      anchorNode: {
        parentElement: null
      }
    }, {
      ...selection,
      focusNode: plain
    }, {
      ...selection,
      getRangeAt: () => ({
        startContainer: outside,
        endContainer: inside
      })
    }, {
      ...selection,
      getRangeAt: () => ({
        startContainer: inside,
        endContainer: outside
      })
    }];
    await scenarios.reduce(async (previous, value) => {
      await previous;
      runtime.selection.mockReturnValue(value as unknown as Selection);
      result.pendingAssistantChunkRef.current = 'x';
      result.scheduleAssistantUpdateFlush();
      await vi.advanceTimersByTimeAsync(96);
      expect(result.pendingAssistantChunkRef.current).toBe('');
    }, Promise.resolve());
    result.chatRootRef.current = null;
    runtime.selection.mockReturnValue(selection as unknown as Selection);
    result.pendingAssistantChunkRef.current = 'y';
    result.scheduleAssistantUpdateFlush();
    await vi.advanceTimersByTimeAsync(96);
    expect(result.pendingAssistantChunkRef.current).toBe('');
    result.chatRootRef.current = root as unknown as HTMLDivElement;
    runtime.selection.mockReturnValue({
      ...selection,
      anchorNode: {
        parentElement: inside
      },
      focusNode: {
        parentElement: inside
      }
    } as unknown as Selection);
    result.pendingAssistantChunkRef.current = 'waiting';
    result.scheduleAssistantUpdateFlush();
    await vi.advanceTimersByTimeAsync(32);
    expect(result.pendingAssistantChunkRef.current).toBe('waiting');
    runtime.selection.mockReturnValue(null);
    await vi.advanceTimersByTimeAsync(96);
    expect(result.pendingAssistantChunkRef.current).toBe('');
  });
  it('sorts real sessions, returns card status and changes window alignment during streaming', () => {
    const messages: AiChatMessage[] = Array.from({
      length: 8
    }, (...[, index]) => ({
      role: 'user',
      content: String(index)
    }));
    const [initial] = runtime.store.getState().aiChatSessions;
    runtime.store.setState({
      aiChatMessages: messages,
      aiChatSessions: [{
        ...initial,
        updatedAt: 2
      }, {
        ...initial,
        id: 'b',
        updatedAt: 3
      }]
    });
    let result = mount();
    expect(result.visibleWindowStart).toBe(4);
    expect(result.orderedSessions[0].id).toBe('b');
    expect(result.getSessionCardState('missing')).toBe('idle');
    result.setVisibleWindowStart(1);
    run();
    flushHookEffects();
    result = run();
    expect(result.hasLowerHiddenMessages).toBe(true);
    expect(result.hasUpperHiddenMessages).toBe(true);
    target.SESSION_STREAMING_IDS.add(result.activeAiChatSessionId);
    result.refreshActiveSessionStreaming();
    run();
    flushHookEffects();
    expect(run().visibleWindowStart).toBe(4);
  });
  it('message updates read latest store and pending assistant/thinking chunks append and clear', () => {
    const result = mount();
    result.flushPendingAssistantUpdates();
    result.updateMessages(() => []);
    result.pendingAssistantChunkRef.current = 'lost';
    result.flushPendingAssistantUpdates();
    expect(runtime.store.getState().aiChatMessages).toEqual([]);
    result.updateMessages(() => [{
      role: 'user',
      content: 'user'
    }]);
    result.pendingAssistantChunkRef.current = 'ignored';
    result.flushPendingAssistantUpdates();
    expect(runtime.store.getState().aiChatMessages[0].content).toBe('user');
    result.updateMessages(() => [{
      role: 'assistant',
      content: 'A',
      thinkBlocks: ['old']
    }]);
    result.pendingAssistantChunkRef.current = 'B';
    result.pendingThinkChunksRef.current.set(0, '+');
    result.pendingThinkChunksRef.current.set(1, 'new');
    result.pendingThinkChunksRef.current.set(2, '');
    result.flushPendingAssistantUpdates();
    expect(runtime.store.getState().aiChatMessages[0]).toMatchObject({
      content: 'AB',
      thinkBlocks: ['old+', 'new']
    });
    expect(result.pendingThinkChunksRef.current.size).toBe(0);
    expect(result.pendingAssistantChunkRef.current).toBe('');
    result.updateMessages(() => [{
      role: 'assistant',
      content: 'A'
    }]);
    result.pendingThinkChunksRef.current.set(0, 'first');
    result.flushPendingAssistantUpdates();
    expect(runtime.store.getState().aiChatMessages[0].thinkBlocks).toEqual(['first']);
  });
  it('RAF flush respects minimum interval, coalesces a pending frame and stops an active stream', async () => {
    const result = mount();
    result.updateMessages(() => [{
      role: 'assistant',
      content: 'A'
    }]);
    result.pendingAssistantChunkRef.current = 'B';
    result.lastAssistantFlushAtRef.current = Date.now();
    result.scheduleAssistantUpdateFlush();
    result.scheduleAssistantUpdateFlush();
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(32);
    expect(runtime.store.getState().aiChatMessages[0].content).toBe('A');
    await vi.advanceTimersByTimeAsync(64);
    expect(runtime.store.getState().aiChatMessages[0].content).toBe('AB');
    const controller = new AbortController();
    target.SESSION_ABORT_CONTROLLERS.set(result.activeAiChatSessionId, controller);
    target.SESSION_STREAMING_IDS.add(result.activeAiChatSessionId);
    result.pendingAssistantChunkRef.current = 'C';
    result.scheduleAssistantUpdateFlush();
    result.handleStop();
    expect(controller.signal.aborted).toBe(true);
    expect(runtime.store.getState().aiChatStreaming).toBe(false);
    expect(runtime.store.getState().aiChatMessages[0].content).toBe('ABC');
    expect(vi.getTimerCount()).toBe(0);
    result.handleStop();
  });
  it('new chat cancels stream/frame and clears quote, authorizations and stale chunks', () => {
    let result = mount();
    const controller = new AbortController();
    target.SESSION_ABORT_CONTROLLERS.set(result.activeAiChatSessionId, controller);
    target.SESSION_STREAMING_IDS.add(result.activeAiChatSessionId);
    result.pendingAssistantChunkRef.current = 'stale';
    result.pendingThinkChunksRef.current.set(0, 'stale');
    result.scheduleAssistantUpdateFlush();
    result.setPendingQuote('quote');
    result.setResolvingWebAccessDecision(true);
    result.setResolvingLocalToolAccessDecision(true);
    result.handleCreateNewChat();
    expect(controller.signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    result = run();
    expect(result).toMatchObject({
      pendingQuote: null,
      resolvingWebAccessDecision: false,
      resolvingLocalToolAccessDecision: false,
      aiLocalToolAccessPrompt: null
    });
    expect(result.pendingAssistantChunkRef.current).toBe('');
    expect(result.pendingThinkChunksRef.current.size).toBe(0);
    result.handleCreateNewChat();
  });
  it('input height clamps and cached local prompt survives widget remount; invalid timer cleans on unmount', () => {
    let result = mount();
    const style = {
      height: '',
      overflowY: ''
    };
    const input = {
      style,
      scrollHeight: 200
    };
    result.inputRef.current = input as unknown as HTMLTextAreaElement;
    result.syncInputHeight();
    expect(style).toEqual({
      height: '128px',
      overflowY: 'auto'
    });
    input.scrollHeight = 1;
    result.syncInputHeight();
    expect(style).toEqual({
      height: '34px',
      overflowY: 'hidden'
    });
    result.setAiLocalToolAccessPrompt({
      requestId: 'request',
      tool: 'local.read_file',
      argumentsPayload: {},
      purpose: 'read',
      message: 'confirm',
      riskLevel: 'local',
      sessionId: result.activeAiChatSessionId
    });
    result.setAiLocalToolAccessResolveError('cached');
    run();
    flushHookEffects();
    result.attachmentInvalidTimerRef.current = Number(setTimeout(() => undefined, 1200));
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
    resetHook();
    result = mount();
    expect(result.aiLocalToolAccessPrompt?.requestId).toBe('request');
    expect(result.aiLocalToolAccessResolveError).toBe('cached');
  });
  it('outside native mousedown closes all actual dropdowns and removes listeners', () => {
    let result = mount();
    result.setShowAgentModeDropdown(true);
    result.setShowModelDropdown(true);
    result.setShowContextDropdown(true);
    run();
    flushHookEffects();
    runtime.documentTarget.dispatchEvent(new Event('mousedown'));
    result = run();
    expect(result).toMatchObject({
      showAgentModeDropdown: false,
      showModelDropdown: false,
      showContextDropdown: false
    });
  });
});
