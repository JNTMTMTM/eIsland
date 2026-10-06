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
 * @file chatInputBar.test.tsx
 * @description ChatInputBar 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, nodes, value, trigger, text } from '../../../../test/componentHarness';
import { ChatInputBar as Component } from '../ChatInputBar';

describe('ChatInputBar', () => {
  const props = { input: '', setInput: vi.fn(), isStreaming: false, agentMode: 'mihtnelis', currentAgentModeConfig: { icon: 'agent' }, selectedModel: 'deepseek-v4-flash', isOllamaModel: false, isCustomApiModel: false, isProUser: false, hasCustomApiCredentials: false, aiConfig: { deepseekReasoningEffort: 'medium', skills: [] }, setAiConfig: vi.fn(), contextUsageTokens: 0, selectedContextLimit: 8192, contextUsagePercent: 0, contextUsagePercentText: '0%', setShowModelDropdown: vi.fn(), setShowContextDropdown: vi.fn(), setShowModelCard: vi.fn(), setShowSessionSidebar: vi.fn(), setAgentMode: vi.fn(), pendingAttachments: [], setPendingAttachments: vi.fn(), fileInputRef: { current: { click: vi.fn() } }, handleAttachFiles: vi.fn(), setSkillDragOver: vi.fn(), skillDragDepthRef: { current: 0 }, setPendingQuote: vi.fn(), handleSend: vi.fn(), handleStop: vi.fn() };
  afterEach(() => { vi.unstubAllGlobals(); });
  it('switches between send and stop and permits r1pxc input while streaming', () => {
    const initial = render(Component, props);
    expect(value(initial, 'textarea', 'readOnly')).toBe(false);
    trigger(initial, 'textarea', 'onChange', { target: { value: 'hello' } });
    (value(initial, '.max-expand-chat-send', 'onClick', 2) as () => void)();
    expect(props.setInput).toHaveBeenCalledWith('hello'); expect(props.handleSend).toHaveBeenCalledOnce();
    const streaming = render(Component, { ...props, isStreaming: true });
    expect(value(streaming, 'textarea', 'readOnly')).toBe(true);
    expect(value(streaming, '.max-expand-chat-send', 'disabled', 1)).toBe(true);
    (value(streaming, '.max-expand-chat-send', 'onClick', 2) as () => void)();
    expect(props.handleStop).toHaveBeenCalledOnce();
    const r1pxc = render(Component, { ...props, isStreaming: true, agentMode: 'r1pxc', input: 'hi', pendingQuote: 'q'.repeat(80) });
    expect(value(r1pxc, 'textarea', 'readOnly')).toBe(false);
    expect(text(nodes(r1pxc, '.max-expand-chat-quote-preview-text')[0])).toBe(`${'q'.repeat(60)  }…`);
    trigger(r1pxc, '.max-expand-chat-quote-preview-close', 'onClick'); expect(props.setPendingQuote).toHaveBeenCalledWith(null);
  });
  it('guards paid model choices and custom API credentials', () => {
    const tree = render(Component, { ...props, showModelDropdown: true });
    (value(tree, '.max-expand-chat-model-dropdown-item', 'onClick', 1) as () => void)();
    (value(tree, '.max-expand-chat-model-dropdown-item', 'onClick', 9) as () => void)();
    expect(props.setAiConfig).not.toHaveBeenCalled();
    trigger(tree, '.max-expand-chat-model-dropdown-item', 'onClick');
    expect(props.setAiConfig).toHaveBeenCalledWith({ model: 'deepseek-v4-flash' });
    const paid = render(Component, { ...props, showModelDropdown: true, isProUser: true, hasCustomApiCredentials: true });
    (value(paid, '.max-expand-chat-model-dropdown-item', 'onClick', 9) as () => void)();
    expect(props.setAiConfig).toHaveBeenLastCalledWith({ model: 'custom-api' });
    expect(props.setShowModelDropdown).toHaveBeenCalledWith(false);
  });
  it('normalizes reasoning changes, focus mode and context limits', () => {
    const tree = render(Component, { ...props, showContextDropdown: true });
    trigger(tree, 'select', 'onChange', { target: { value: 'invalid' } });
    expect(props.setAiConfig).toHaveBeenCalledWith({ deepseekReasoningEffort: 'medium' });
    (value(tree, 'select', 'onChange', 1) as (event: object) => void)({ target: { value: 'on' } });
    expect(props.setAiConfig).toHaveBeenCalledWith({ deepseekThinking: true });
    trigger(tree, '.max-expand-chat-model-dropdown-item', 'onClick');
    expect(props.setAiConfig).toHaveBeenCalledWith({ contextLimit: expect.any(Number) as unknown });
    const ollama = render(Component, { ...props, isOllamaModel: true });
    expect(value(ollama, 'select', 'disabled', 1)).toBe(true);
    expect(value(ollama, '.max-expand-chat-model-dropdown-trigger', 'disabled', 1)).toBe(true);
    (value(ollama, '.max-expand-chat-model-dropdown-trigger', 'onClick', 1) as () => void)();
    expect(props.setShowContextDropdown).not.toHaveBeenCalledWith(expect.any(Function));
  });
  it('tracks nested skill drag depth and imports only distinct markdown paths', () => {
    const getPathForFile = vi.fn((file: { name: string }) => file.name === 'empty.md' ? '' : `C:/${  file.name}`);
    vi.stubGlobal('window', { api: { getPathForFile } });
    const skill = { id: 'one', name: 'known', filePath: 'C:/known.md', enabled: true };
    const tree = render(Component, { ...props, aiConfig: { skills: [skill] } });
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn(), dataTransfer: { files: [{ name: 'KNOWN.MD' }, { name: 'new.md' }, { name: 'empty.md' }, { name: 'skip.txt' }] } };
    trigger(tree, '.max-expand-chat-skills-section', 'onDragEnter', event);
    trigger(tree, '.max-expand-chat-skills-section', 'onDragEnter', event);
    trigger(tree, '.max-expand-chat-skills-section', 'onDragLeave', event);
    expect(props.skillDragDepthRef.current).toBe(1);
    trigger(tree, '.max-expand-chat-skills-section', 'onDrop', event);
    expect(props.skillDragDepthRef.current).toBe(0);
    expect(getPathForFile).toHaveBeenCalledTimes(3);
    expect(props.setAiConfig).toHaveBeenCalledWith({ skills: [skill, expect.objectContaining({ name: 'new', filePath: 'C:/new.md', enabled: true })] });
    trigger(tree, '.max-expand-chat-skills-toggle', 'onClick');
    expect(props.setAiConfig).toHaveBeenLastCalledWith({ skills: [{ ...skill, enabled: false }] });
    trigger(tree, '.max-expand-chat-skills-remove-btn', 'onClick');
    expect(props.setAiConfig).toHaveBeenLastCalledWith({ skills: [] });
  });
  it('handles skill picker cancellation, duplicate paths and new files', async () => {
    const pickSkillFile = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce('C:/KNOWN.MD')
      .mockResolvedValueOnce('C:/fresh.md');
    vi.stubGlobal('window', { api: { pickSkillFile } });
    const skill = { id: 'known', name: 'known', filePath: 'C:/known.md', enabled: true };
    const tree = render(Component, { ...props, aiConfig: { skills: [skill] } });
    await trigger(tree, '.max-expand-chat-skills-add-btn', 'onClick');
    await trigger(tree, '.max-expand-chat-skills-add-btn', 'onClick');
    expect(props.setAiConfig).not.toHaveBeenCalled();
    await trigger(tree, '.max-expand-chat-skills-add-btn', 'onClick');
    expect(props.setAiConfig).toHaveBeenCalledWith({ skills: [skill, expect.objectContaining({ name: 'fresh' })] });
  });
  it('forwards file selections, removes only the chosen attachment and toggles history', () => {
    const a = { name: 'one.txt', size: 1, content: 'x' }; const b = { name: 'two.txt', size: 2, content: 'y' };
    const tree = render(Component, { ...props, pendingAttachments: [a, b], showAgentModeDropdown: true, agentModeDropdownPos: { left: 5, bottom: 10 } });
    trigger(tree, 'input', 'onChange', { target: { files: null } });
    expect(props.handleAttachFiles).not.toHaveBeenCalled();
    trigger(tree, 'input', 'onChange', { target: { files: [a] } });
    expect(props.handleAttachFiles).toHaveBeenCalledWith([a]);
    trigger(tree, '.max-expand-chat-attachment-tag-remove', 'onClick');
    const update = props.setPendingAttachments.mock.calls[0][0] as (previous: typeof a[]) => typeof a[];
    expect(update([a, b])).toEqual([b]);
    trigger(tree, '.max-expand-chat-session-toggle', 'onClick');
    const toggle = props.setShowSessionSidebar.mock.calls[0][0] as (previous: boolean) => boolean;
    expect(toggle(false)).toBe(true);
    trigger(tree, '.max-expand-chat-agent-mode-item', 'onClick'); expect(props.setAgentMode).toHaveBeenCalled();
    expect(value(tree, '.max-expand-chat-agent-mode-dropdown', 'style')).toEqual({ position: 'fixed', left: 5, bottom: 10 });
  });
});

vi.mock('../../utils/chatHelpers', () => ({ isMinimaxModel: (model: string) => model.startsWith('MiniMax-') }));
