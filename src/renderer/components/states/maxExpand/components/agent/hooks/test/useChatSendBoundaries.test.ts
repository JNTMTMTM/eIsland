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
 * @file useChatSendBoundaries.test.ts
 * @description 聊天发送真实状态集成下的附件、原生工具结果、授权和设置导航边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { installChatRuntime, roleToken } from './chatRuntimeFixture';
import type { DragEvent } from 'react';
const leaves = vi.hoisted(() => ({
  web: vi.fn<typeof import('../../../../../../../api/ai/mihtnelisAgentStream').resolveMihtnelisWebAccess>(),
  access: vi.fn<typeof import('../../../../../../../api/ai/mihtnelisAgentStream').resolveMihtnelisLocalToolAccess>(),
  result: vi.fn<typeof import('../../../../../../../api/ai/mihtnelisAgentStream').resolveMihtnelisLocalToolResult>(),
  execute: vi.fn<(request: unknown) => Promise<unknown>>()
}));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
vi.mock('../../../../../../../api/ai/mihtnelisAgentStream', () => ({
  streamMihtnelisAgent: vi.fn(),
  resolveMihtnelisWebAccess: leaves.web,
  resolveMihtnelisLocalToolAccess: leaves.access,
  resolveMihtnelisLocalToolResult: leaves.result
}));
vi.mock('../../../../../../../api/ai/ollamaLocalAgent', () => ({
  streamOllamaLocalAgent: vi.fn()
}));
vi.mock('../../../../../../../api/ai/customDirectAgent', () => ({
  streamCustomDirectAgent: vi.fn()
}));
let runtime: ReturnType<typeof installChatRuntime>;
let stateModule: typeof import('../useChatState');
let sendModule: typeof import('../useChatSend');
const readers: NativeReader[] = [];
/** 模拟浏览器文件读取器的异步结果叶边界，不代替附件业务逻辑。 */
class NativeReader {
  result: string | null = null;

  onload: (() => void) | null = null;

  /** 保留原生待完成读取。
   * @param file - 用户选择文件
   */
  readAsText(file: File): void {
    expect(file).toBeInstanceOf(File);
    readers.push(this);
  }
}
/** 同一次 React 渲染中执行两个真实 Hook。
 * @returns 真实状态与发送回调
 */
function run() {
  return renderHook(() => {
    const state = stateModule.useChatState();
    return {
      state,
      send: sendModule.useChatSend({
        state
      })
    };
  });
}
/** 完成挂载并返回状态。
 * @returns 最新状态
 */
function mount() {
  run();
  flushHookEffects();
  const value = run();
  flushHookEffects();
  return value;
}
/** 创建真实 File。
 * @param name - 文件名
 * @param content - 文件内容
 * @returns File
 */
function file(name: string, content = 'text'): File {
  return new File([content], name);
}
/** 完成原生文件读取事件。
 * @param reader - 读取器
 * @param content - 读取结果
 */
function complete(reader: NativeReader, content: string): void {
  Object.assign(reader, { result: content });
  reader.onload?.();
}
/** 建立真实网页授权状态。
 * @param policy - 域名策略
 */
function webPrompt(policy?: 'ask' | 'allow' | 'deny'): void {
  runtime.store.getState().setAiWebAccessPrompt({
    requestId: 'web',
    url: 'https://example.com/page',
    message: 'visit',
    domainPolicy: policy
  });
}
/** 建立真实本地授权状态。
 */
function localPrompt(): void {
  const {
    state
  } = run();
  state.setAiLocalToolAccessPrompt({
    sessionId: state.activeAiChatSessionId,
    requestId: 'local',
    tool: 'file.read',
    purpose: 'read',
    riskLevel: 'local',
    argumentsPayload: {
      path: 'virtual'
    },
    message: 'confirm'
  });
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  runtime = installChatRuntime();
  runtime.storage.set('user-account-token', roleToken('pro'));
  leaves.web.mockResolvedValue(undefined);
  leaves.access.mockResolvedValue(undefined);
  leaves.result.mockResolvedValue(undefined);
  leaves.execute.mockResolvedValue({
    success: true,
    result: {
      text: 'value'
    },
    durationMs: 4,
    error: ''
  });
  Object.assign(runtime.api, {
    executeAgentLocalTool: leaves.execute
  });
  readers.length = 0;
  vi.stubGlobal('FileReader', NativeReader);
  await import('../../utils/chatHelpers');
  stateModule = await import('../useChatState');
  sendModule = await import('../useChatSend');
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('useChatSend native tool and authorization', () => {
  it('missing runtime submits explicit failed result', async () => {
    Reflect.deleteProperty(runtime.api, 'executeAgentLocalTool');
    const {
      send
    } = mount();
    await send.executeAndSubmitLocalToolResult({
      token: 'token',
      requestId: 'request',
      tool: 'file.read',
      argumentsPayload: {}
    });
    expect(leaves.result).toHaveBeenCalledWith({
      token: 'token',
      requestId: 'request',
      success: false,
      result: {},
      error: 'LOCAL_RUNTIME_UNAVAILABLE',
      durationMs: 0
    });
  });
  it.each([new Error('execute failed'), 'native failure', {
    success: true,
    result: [1],
    error: 3,
    durationMs: 'wrong'
  }, null])('native executor error/result %j is normalized', async (value) => {
    if (value instanceof Error || typeof value === 'string') leaves.execute.mockRejectedValue(value);else leaves.execute.mockResolvedValue(value);
    await mount().send.executeAndSubmitLocalToolResult({
      token: 'token',
      requestId: 'request',
      tool: 'file.read',
      argumentsPayload: {}
    });
    let expectedError = '';
    if (value instanceof Error) expectedError = value.message;
    else if (typeof value === 'string') expectedError = 'aiChat.messages.localToolExecuteFailed';
    expect(leaves.result).toHaveBeenCalledWith(expect.objectContaining({
      success: Boolean(value && typeof value === 'object' && !(value instanceof Error)),
      durationMs: 0,
      error: expectedError
    }));
  });
  it('web and local decisions require both native login token and a prompt', async () => {
    const {
      send
    } = mount();
    await send.handleResolveWebAccess(true);
    await send.handleResolveLocalToolAccess(true);
    webPrompt();
    localPrompt();
    runtime.storage.delete('user-account-token');
    await run().send.handleResolveWebAccess(true);
    await run().send.handleResolveLocalToolAccess(true);
    expect(leaves.web).not.toHaveBeenCalled();
    expect(leaves.access).not.toHaveBeenCalled();
  });
  it.each(['allow', 'deny', undefined] as const)('web domain policy %s is persisted and denial clears prompt', async (policy) => {
    mount();
    webPrompt(policy);
    await run().send.handleResolveWebAccess(false);
    expect(leaves.web).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 'web',
      allow: false
    }));
    expect(run().state.aiWebAccessPrompt).toBeNull();
  });
  it('web approval keeps pending prompt, policy change updates actual store and absent prompt is ignored', async () => {
    mount();
    run().send.handleDomainPolicyChange('deny');
    webPrompt();
    run().send.handleDomainPolicyChange('allow');
    expect(run().state.aiWebAccessPrompt?.domainPolicy).toBe('allow');
    await run().send.handleResolveWebAccess(true);
    expect(run().state.aiWebAccessPrompt?.requestId).toBe('web');
  });
  it.each([new Error('pending request not found'), new Error('web error'), 'unknown'])('web resolve rejects %j', async (error) => {
    mount();
    webPrompt();
    leaves.web.mockRejectedValue(error);
    await run().send.handleResolveWebAccess(true);
    const {
      state
    } = run();
    expect(state.resolvingWebAccessDecision).toBe(false);
    if (error instanceof Error && error.message.includes('not found')) {
      expect(state.aiWebAccessPrompt).toBeNull();
      expect(runtime.store.getState().aiChatMessages.at(-1)?.content).toContain('webAccess.expiredHint');
    } else expect(state.aiWebAccessResolveError).toBe(error instanceof Error ? error.message : 'aiChat.messages.unknownError');
  });
  it.each([false, true])('local decision allow %s clears prompt and executes only on approval', async (allow) => {
    mount();
    localPrompt();
    await run().send.handleResolveLocalToolAccess(allow);
    expect(run().state.aiLocalToolAccessPrompt).toBeNull();
    expect(leaves.execute).toHaveBeenCalledTimes(allow ? 1 : 0);
    if (allow) {expect(leaves.result).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 'local',
      success: true,
      durationMs: 4
    }));}
  });
  it.each([new Error('pending local tool request not found'), new Error('local error'), 'unknown'])('local resolve rejects %j', async (error) => {
    mount();
    localPrompt();
    leaves.access.mockRejectedValue(error);
    await run().send.handleResolveLocalToolAccess(true);
    const {
      state
    } = run();
    expect(state.resolvingLocalToolAccessDecision).toBe(false);
    if (error instanceof Error && error.message.includes('not found')) {
      expect(state.aiLocalToolAccessPrompt).toBeNull();
      expect(runtime.store.getState().aiChatMessages.at(-1)?.content).toContain('localToolAccess.expiredHint');
    } else expect(state.aiLocalToolAccessResolveError).toBe(error instanceof Error ? error.message : 'aiChat.messages.unknownError');
  });
});
describe('useChatSend attachments and navigation', () => {
  it('accepted files read asynchronously while invalid extension, size, duplicate and empty content are ignored', () => {
    let {
      state,
      send
    } = mount();
    state.fileInputRef.current = {
      value: 'file'
    } as unknown as HTMLInputElement;
    send.handleAttachFiles([file('a.txt'), file('invalid.exe'), file('large.txt', 'x'.repeat(102401)), file('empty.md')]);
    expect(readers).toHaveLength(2);
    complete(readers[0], 'A');
    complete(readers[1], '');
    expect(run().state.pendingAttachments).toEqual([{
      name: 'a.txt',
      size: 4,
      content: 'A'
    }]);
    expect(state.fileInputRef.current.value).toBe('');
    ({
      state,
      send
    } = run());
    send.handleAttachFiles([file('a.txt')]);
    expect(readers).toHaveLength(2);
  });
  it('native reads finishing concurrently enforce maximum count and duplicate checks against latest state', () => {
    const {
      send
    } = mount();
    send.handleAttachFiles([file('a.txt'), file('a.txt'), file('b.txt'), file('c.txt'), file('d.txt'), file('e.txt'), file('f.txt')]);
    readers.forEach((reader) => complete(reader, 'content'));
    expect(run().state.pendingAttachments.map((a) => a.name)).toEqual(['a.txt', 'b.txt', 'c.txt', 'd.txt', 'e.txt']);
    run().send.handleAttachFiles([file('extra.txt')]);
    expect(readers).toHaveLength(7);
  });
  it('invalid drop indicator replaces its native timer and clears after 1200ms', async () => {
    const {
      send
    } = mount();
    send.handleAttachmentDrop([file('invalid.exe'), file('valid.md')]);
    expect(run().state.attachmentDropInvalid).toBe(true);
    send.markAttachmentDropInvalid();
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1200);
    expect(run().state.attachmentDropInvalid).toBe(false);
    run().state.setPendingAttachments(Array.from({
      length: 5
    }, (...[, i]) => ({
      name: `${i  }.txt`,
      size: 1,
      content: 'x'
    })));
    run().send.handleAttachmentDrop([file('extra.txt')]);
    expect(run().state.attachmentDropInvalid).toBe(true);
    runtime.store.getState().setAiChatStreaming(true);
    run().send.handleAttachmentDrop([file('another.txt')]);
    expect(readers).toHaveLength(1);
  });
  it('nested native drag depth, over, leave and drop reset actual state and empty payload is ignored', () => {
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        files: [file('a.txt')]
      }
    } as unknown as DragEvent<HTMLDivElement>;
    const {
      send
    } = mount();
    send.handleAttachmentDragEnter(event);
    run().send.handleAttachmentDragEnter(event);
    send.handleAttachmentDragOver(event);
    send.handleAttachmentDragLeave(event);
    expect(run().state.attachmentDragOver).toBe(true);
    send.handleAttachmentDragLeave(event);
    expect(run().state.attachmentDragOver).toBe(false);
    send.handleAttachmentDragLeave(event);
    send.handleAttachmentDropEvent(event);
    expect(readers).toHaveLength(1);
    send.handleAttachmentDropEvent({
      ...event,
      dataTransfer: undefined
    } as unknown as DragEvent<HTMLDivElement>);
    send.handleAttachmentDropEvent({
      ...event,
      dataTransfer: {
        files: []
      }
    } as unknown as DragEvent<HTMLDivElement>);
    expect(readers).toHaveLength(1);
  });
  it.each(['navigate', 'feedback'] as const)('settings %s routes integrated/standalone/legacy and contains native failures', async (action) => {
    const {
      send
    } = mount();
    const trigger = () => action === 'navigate' ? send.navigateToSettingsTab('ai-config') : send.handleReportIssueFromFinalAnswer(' ', ' answer ');
    const event = vi.fn();
    runtime.browser.addEventListener('settings-open-tab-intent', event);
    runtime.api.storeRead.mockResolvedValue('integrated');
    trigger();
    await settleHook();
    expect(runtime.navigation.setMaxExpandTab).toHaveBeenCalledWith('settings');
    expect(event).toHaveBeenCalled();
    runtime.api.storeRead.mockResolvedValue('standalone');
    trigger();
    await settleHook();
    expect(runtime.api.openStandaloneWindow).toHaveBeenCalled();
    expect(runtime.api.storeWrite).toHaveBeenCalledWith('standalone-window-active-tab', 'settings');
    runtime.api.storeRead.mockImplementation((key) => Promise.resolve(key === 'standalone-window-mode' ? 'unknown' : 'integrated'));
    trigger();
    await settleHook();
    runtime.api.storeRead.mockImplementation((key) => key === 'countdown-window-mode' ? Promise.reject(new Error('legacy')) : Promise.resolve('unknown'));
    trigger();
    await settleHook();
    runtime.api.storeRead.mockRejectedValue(new Error('read'));
    trigger();
    await settleHook();
    runtime.api.storeRead.mockResolvedValue('standalone');
    runtime.api.openStandaloneWindow.mockRejectedValue(new Error('open'));
    trigger();
    await settleHook();
    runtime.api.storeWrite.mockImplementation((key) => key === 'standalone-window-active-tab' ? Promise.reject(new Error('active')) : Promise.resolve(true));
    trigger();
    await settleHook();
    runtime.api.storeWrite.mockRejectedValue(new Error('write'));
    trigger();
    await settleHook();
    if (action === 'feedback') {expect(runtime.api.storeWrite).toHaveBeenCalledWith('settings-about-feedback-prefill', {
      title: 'aiChat.feedback.issueTitle',
      content: 'answer'
    });}
  });
});
