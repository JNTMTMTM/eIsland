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
 * @file aiChatTab.test.tsx
 * @description AiChatTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { AiChatTab as Component } from '../AiChatTab';
import { ChatInputBar } from '../ChatInputBar';
import { MessageTimeline } from '../MessageTimeline';
import { AssistantMarkdown } from '../AssistantMarkdown';
import { WebAccessPanel, LocalToolAccessPanel } from '../WebAccessPanel';
interface MessageFixture { role: string; content: string; attachments?: { name: string }[]; }
interface PromptFixture { sessionId: string; url?: string; message?: string; tool?: string; }
const state = vi.hoisted(() => ({ hasLoginSession: true, agentMode: 'mihtnelis', currentAgentModeConfig: { label: 'Island' }, dominantColor: [0, 200, 0], orderedSessions: [] as { id: string; title: string; updatedAt: number }[], aiChatMessages: [] as MessageFixture[], visibleMessages: [] as MessageFixture[], aiChatStreaming: false, aiWebAccessPrompt: null as PromptFixture | null, aiLocalToolAccessPrompt: null as PromptFixture | null, emptyGreeting: 'Welcome', aiConfig: {}, activeAiChatSessionId: 'active', visibleStartIndex: 0, VISIBLE_CHAT_WINDOW_SIZE: 20, VISIBLE_CHAT_WINDOW_STEP: 10, inputRef: { current: { focus: vi.fn() } }, setLogin: vi.fn(), setRegister: vi.fn(), handleCreateNewChat: vi.fn(), getSessionCardState: () => 'idle', switchAiChatSession: vi.fn(), setAiChatStreaming: vi.fn(), setVisibleWindowStart: vi.fn(), setResolvingWebAccessDecision: vi.fn(), setResolvingLocalToolAccessDecision: vi.fn(), setPendingQuote: vi.fn(), deleteAiChatSession: vi.fn() }));
const send = vi.hoisted(() => ({ handleSend: vi.fn(), navigateToSettingsTab: vi.fn(), handleResolveWebAccess: vi.fn(), handleResolveLocalToolAccess: vi.fn() }));
vi.mock('../../hooks/useChatState', () => ({ useChatState: () => state, SESSION_STREAMING_IDS: new Set(['other']) }));
vi.mock('../../hooks/useChatSend', () => ({ useChatSend: () => send }));
vi.mock('../MessageTimeline', () => ({ MessageTimeline: () => null }));
describe('AiChatTab', () => {
  beforeEach(() => { state.hasLoginSession = true; state.agentMode = 'mihtnelis'; state.orderedSessions = []; state.aiChatMessages = []; state.visibleMessages = []; state.aiChatStreaming = false; state.aiWebAccessPrompt = null; state.aiLocalToolAccessPrompt = null; });
  afterEach(() => { vi.unstubAllGlobals(); });
  it('offers login and registration before rendering the authenticated chat', () => {
    state.hasLoginSession = false;
    const tree = render(Component);
    expect(nodes(tree, ChatInputBar)).toHaveLength(0);
    trigger(tree, '.settings-user-primary-btn', 'onClick'); trigger(tree, '.settings-user-secondary-btn', 'onClick');
    expect(state.setLogin).toHaveBeenCalledOnce(); expect(state.setRegister).toHaveBeenCalledOnce();
  });
  it('renders empty greeting, clamps color channels and sends Enter without Shift', () => {
    const tree = render(Component);
    expect(text(tree)).toContain('Welcome');
    expect(value(tree, '.max-expand-chat', 'style')).toEqual({ '--chat-dominant-r': 140, '--chat-dominant-g': 200, '--chat-dominant-b': 140 });
    const event = { key: 'Enter', shiftKey: true, preventDefault: vi.fn() };
    trigger(tree, ChatInputBar, 'handleKeyDown', event); expect(send.handleSend).not.toHaveBeenCalled();
    trigger(tree, ChatInputBar, 'handleKeyDown', { ...event, shiftKey: false });
    expect(send.handleSend).toHaveBeenCalledOnce(); expect(event.preventDefault).toHaveBeenCalledOnce();
    trigger(tree, '.max-expand-chat-clear', 'onClick'); expect(state.handleCreateNewChat).toHaveBeenCalledOnce();
  });
  it('switches session state and stops delete clicks from selecting sessions', () => {
    state.orderedSessions = [{ id: 'active', title: 'Current', updatedAt: 1 }, { id: 'other', title: '', updatedAt: 2 }];
    const tree = render(Component);
    trigger(tree, '.max-expand-chat-session-item', 'onClick'); expect(state.switchAiChatSession).not.toHaveBeenCalled();
    (value(tree, '.max-expand-chat-session-item', 'onClick', 1) as () => void)();
    expect(state.switchAiChatSession).toHaveBeenCalledWith('other'); expect(state.setAiChatStreaming).toHaveBeenCalledWith(true);
    expect(state.setPendingQuote).toHaveBeenCalledWith(null);
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    trigger(tree, '.max-expand-chat-session-delete', 'onClick', event);
    expect(state.deleteAiChatSession).toHaveBeenCalledWith('active'); expect(event.stopPropagation).toHaveBeenCalledOnce();
  });
  it('skips empty assistants and renders user attachments and real timeline boundaries', () => {
    state.visibleMessages = [{ role: 'assistant', content: '' }, { role: 'user', content: '<attachment name="note.txt">\nsecret\n</attachment>\nHello', attachments: [{ name: 'note.txt' }] }, { role: 'assistant', content: 'answer' }];
    state.aiChatMessages = state.visibleMessages;
    const tree = render(Component);
    expect(nodes(tree, MessageTimeline)).toHaveLength(1);
    expect(text(tree)).toContain('note.txtHello'); expect(text(tree)).not.toContain('secret');
    expect(value(tree, MessageTimeline, 'absoluteIndex')).toBe(2);
    trigger(tree, '.max-expand-chat-user-avatar', 'onClick'); expect(send.navigateToSettingsTab).toHaveBeenCalledWith('user-info');
  });
  it('renders r1pxc segments, quotation actions and streaming feedback', () => {
    state.agentMode = 'r1pxc'; state.aiChatStreaming = true;
    state.visibleMessages = [{ role: 'assistant', content: '> 引用: original\n\nanswer\n\nnext' }]; state.aiChatMessages = state.visibleMessages;
    const writeText = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('navigator', { clipboard: { writeText } });
    const tree = render(Component);
    expect(nodes(tree, AssistantMarkdown)).toHaveLength(2);
    expect(text(tree)).toContain('original'); expect(nodes(tree, '.max-expand-chat-generating-dots')).toHaveLength(1);
    const buttons = nodes(nodes(tree, '.max-expand-chat-bubble-actions')[0], 'button');
    (buttons[0].props.onClick as () => void)(); expect(state.setPendingQuote).toHaveBeenCalledWith('> 引用: original\nanswer');
    (buttons[1].props.onClick as () => void)(); expect(writeText).toHaveBeenCalledWith('> 引用: original\nanswer');
    trigger(tree, '.max-expand-chat-agent-avatar', 'onClick'); expect(send.navigateToSettingsTab).toHaveBeenCalledWith('ai');
  });
  it('shows authorization prompts only for the active session', () => {
    state.aiWebAccessPrompt = { sessionId: 'other', url: 'https://test', message: '' };
    state.aiLocalToolAccessPrompt = { sessionId: 'active', tool: 'run' };
    const tree = render(Component);
    expect(nodes(tree, WebAccessPanel)).toHaveLength(0); expect(nodes(tree, LocalToolAccessPanel)).toHaveLength(1);
    expect(value(tree, LocalToolAccessPanel, 'onResolve')).toBe(send.handleResolveLocalToolAccess);
    state.aiWebAccessPrompt.sessionId = 'active';
    expect(value(render(Component), WebAccessPanel, 'onResolve')).toBe(send.handleResolveWebAccess);
  });
});

vi.mock('../../utils/chatHelpers', () => ({ isMinimaxModel: (model: string) => model.startsWith('MiniMax-') }));
