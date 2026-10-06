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
 * @file useSettingsShortcuts.test.ts
 * @description 设置快捷键真实录入回调、冲突检测、注册结果和失败恢复回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsShortcuts } from '../useSettingsShortcuts';
import { renderWithHooks, resetLifecycle } from './settingsCoverageHarness';
import type { KeyboardEvent } from 'react';
import type { Mock } from 'vitest';
type TestKeyboardEvent = Omit<KeyboardEvent, 'preventDefault' | 'stopPropagation'> & {
  preventDefault: Mock<() => void>;
  stopPropagation: Mock<() => void>;
};
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
const bindings = [{
  handler: 'handleHotkeyKeyDown',
  value: 'hideHotkey',
  recording: 'hotkeyRecording',
  error: 'hotkeyError',
  ref: 'hotkeyInputRef',
  setRecording: 'setHotkeyRecording',
  setError: 'setHotkeyError',
  api: 'hotkeySet'
}, {
  handler: 'handleQuitHotkeyKeyDown',
  value: 'quitHotkey',
  recording: 'quitHotkeyRecording',
  error: 'quitHotkeyError',
  ref: 'quitHotkeyInputRef',
  setRecording: 'setQuitHotkeyRecording',
  setError: 'setQuitHotkeyError',
  api: 'quitHotkeySet'
}, {
  handler: 'handleScreenshotHotkeyKeyDown',
  value: 'screenshotHotkey',
  recording: 'screenshotHotkeyRecording',
  error: 'screenshotHotkeyError',
  ref: 'screenshotHotkeyInputRef',
  setRecording: 'setScreenshotHotkeyRecording',
  setError: 'setScreenshotHotkeyError',
  api: 'screenshotHotkeySet'
}, {
  handler: 'handleNextSongHotkeyKeyDown',
  value: 'nextSongHotkey',
  recording: 'nextSongHotkeyRecording',
  error: 'nextSongHotkeyError',
  ref: 'nextSongHotkeyInputRef',
  setRecording: 'setNextSongHotkeyRecording',
  setError: 'setNextSongHotkeyError',
  api: 'nextSongHotkeySet'
}, {
  handler: 'handlePlayPauseSongHotkeyKeyDown',
  value: 'playPauseSongHotkey',
  recording: 'playPauseSongHotkeyRecording',
  error: 'playPauseSongHotkeyError',
  ref: 'playPauseSongHotkeyInputRef',
  setRecording: 'setPlayPauseSongHotkeyRecording',
  setError: 'setPlayPauseSongHotkeyError',
  api: 'playPauseSongHotkeySet'
}, {
  handler: 'handleResetPositionHotkeyKeyDown',
  value: 'resetPositionHotkey',
  recording: 'resetPositionHotkeyRecording',
  error: 'resetPositionHotkeyError',
  ref: 'resetPositionHotkeyInputRef',
  setRecording: 'setResetPositionHotkeyRecording',
  setError: 'setResetPositionHotkeyError',
  api: 'resetPositionHotkeySet'
}, {
  handler: 'handleToggleTrayHotkeyKeyDown',
  value: 'toggleTrayHotkey',
  recording: 'toggleTrayHotkeyRecording',
  error: 'toggleTrayHotkeyError',
  ref: 'toggleTrayHotkeyInputRef',
  setRecording: 'setToggleTrayHotkeyRecording',
  setError: 'setToggleTrayHotkeyError',
  api: 'toggleTrayHotkeySet'
}, {
  handler: 'handleShowSettingsWindowHotkeyKeyDown',
  value: 'showSettingsWindowHotkey',
  recording: 'showSettingsWindowHotkeyRecording',
  error: 'showSettingsWindowHotkeyError',
  ref: 'showSettingsWindowHotkeyInputRef',
  setRecording: 'setShowSettingsWindowHotkeyRecording',
  setError: 'setShowSettingsWindowHotkeyError',
  api: 'showSettingsWindowHotkeySet'
}, {
  handler: 'handleOpenClipboardHistoryHotkeyKeyDown',
  value: 'openClipboardHistoryHotkey',
  recording: 'openClipboardHistoryHotkeyRecording',
  error: 'openClipboardHistoryHotkeyError',
  ref: 'openClipboardHistoryHotkeyInputRef',
  setRecording: 'setOpenClipboardHistoryHotkeyRecording',
  setError: 'setOpenClipboardHistoryHotkeyError',
  api: 'openClipboardHistoryHotkeySet'
}, {
  handler: 'handleTogglePassthroughHotkeyKeyDown',
  value: 'togglePassthroughHotkey',
  recording: 'togglePassthroughHotkeyRecording',
  error: 'togglePassthroughHotkeyError',
  ref: 'togglePassthroughHotkeyInputRef',
  setRecording: 'setTogglePassthroughHotkeyRecording',
  setError: 'setTogglePassthroughHotkeyError',
  api: 'togglePassthroughHotkeySet'
}, {
  handler: 'handleToggleUiLockHotkeyKeyDown',
  value: 'toggleUiLockHotkey',
  recording: 'toggleUiLockHotkeyRecording',
  error: 'toggleUiLockHotkeyError',
  ref: 'toggleUiLockHotkeyInputRef',
  setRecording: 'setToggleUiLockHotkeyRecording',
  setError: 'setToggleUiLockHotkeyError',
  api: 'toggleUiLockHotkeySet'
}, {
  handler: 'handleAgentVoiceInputHotkeyKeyDown',
  value: 'agentVoiceInputHotkey',
  recording: 'agentVoiceInputHotkeyRecording',
  error: 'agentVoiceInputHotkeyError',
  ref: 'agentVoiceInputHotkeyInputRef',
  setRecording: 'setAgentVoiceInputHotkeyRecording',
  setError: 'setAgentVoiceInputHotkeyError',
  api: 'agentVoiceInputHotkeySet'
}, {
  handler: 'handleToggleShapeModeHotkeyKeyDown',
  value: 'toggleShapeModeHotkey',
  recording: 'toggleShapeModeHotkeyRecording',
  error: 'toggleShapeModeHotkeyError',
  ref: 'toggleShapeModeHotkeyInputRef',
  setRecording: 'setToggleShapeModeHotkeyRecording',
  setError: 'setToggleShapeModeHotkeyError',
  api: 'toggleShapeModeHotkeySet'
}] as const;
const register = vi.fn<(accelerator: string) => Promise<boolean>>();
const t = ((key: string) => key) as Parameters<typeof useSettingsShortcuts>[0]['t'];
/**
 * 重新执行真实 Hook，保留录入状态和输入 ref。
 * @returns Hook 实际返回的状态与动作。
 */
function render() {
  return renderWithHooks(() => useSettingsShortcuts({
    t
  }));
}
/**
 * 构造不依赖 DOM 的 React 键盘事件边界。
 * @param key - 实际键名。
 * @param altKey - 是否包含 Alt 修饰键。
 * @returns 可观察阻止传播行为的键盘事件。
 */
function event(key: string, altKey = true): TestKeyboardEvent {
  return {
    key,
    altKey,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  } as unknown as TestKeyboardEvent;
}
/**
 * 等待注册服务 Promise 与真实错误恢复回调。
 * @returns Promise 队列处理完毕。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  register.mockReset().mockResolvedValue(true);
  vi.stubGlobal('window', {
    api: Object.fromEntries(bindings.map(({
      api
    }) => [api, register]))
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe.each(bindings)('$api 快捷键', (binding) => {
  it.each(['Shift', 'b'])('忽略无完整组合的%s并清除旧错误', (key) => {
    const state = render();
    state[binding.setError]('previous error');
    const input = event(key, false);
    render()[binding.handler](input);
    expect(input.preventDefault).toHaveBeenCalledOnce();
    expect(input.stopPropagation).toHaveBeenCalledOnce();
    expect(register).not.toHaveBeenCalled();
    expect(render()[binding.error]).toBe('');
  });
  it.each([true, false])('冲突组合拒绝注册，输入ref存在=%s', async (hasInput) => {
    const state = render();
    const blur = vi.fn();
    state[binding.ref].current = hasInput ? {
      blur
    } as unknown as HTMLInputElement : null;
    state[binding.setRecording](true);
    render()[binding.handler](event(binding.value === 'quitHotkey' ? 'x' : 'c'));
    await settle();
    expect(register).not.toHaveBeenCalled();
    expect(render()[binding.error]).toBe('settings.hotkey.duplicateHotkey');
    expect(render()[binding.recording]).toBe(false);
    expect(blur).toHaveBeenCalledTimes(hasInput ? 1 : 0);
  });
  it.each([true, false])('注册成功结束录入并保存组合，输入ref存在=%s', async (hasInput) => {
    const state = render();
    const blur = vi.fn();
    state[binding.ref].current = hasInput ? {
      blur
    } as unknown as HTMLInputElement : null;
    state[binding.setRecording](true);
    render()[binding.handler](event('b'));
    await settle();
    expect(register).toHaveBeenCalledWith('Alt+B');
    expect(render()[binding.value]).toBe('Alt+B');
    expect(render()[binding.recording]).toBe(false);
    expect(blur).toHaveBeenCalledTimes(hasInput ? 1 : 0);
  });
  it.each(['denied', 'rejected'])('注册%s保留录入以便重试', async (mode) => {
    register.mockResolvedValue(false);
    if (mode === 'rejected') register.mockRejectedValue(new Error('registration failed'));
    render()[binding.setRecording](true);
    render()[binding.handler](event('b'));
    await settle();
    expect(register).toHaveBeenCalledWith('Alt+B');
    expect(render()[binding.error]).toBe(mode === 'denied' ? 'settings.hotkey.registerFailedRetry' : 'settings.hotkey.registerFailed');
    expect(render()[binding.recording]).toBe(true);
    expect(render()[binding.value]).not.toBe('Alt+B');
  });
});
