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
 * @file shortcutSettingsInteractions.test.ts
 * @description 快捷键组件真实表单与设置 Hook 联动、录入焦点、清除分支和服务失败回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShortcutSettingsSection } from '../ShortcutSettingsSection';
import { useSettingsShortcuts } from '../../../hooks/useSettingsShortcuts';
import { renderWithHooks, resetLifecycle } from '../../../hooks/test/settingsCoverageHarness';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));
const bindings = [{
  handler: 'handleHotkeyKeyDown',
  page: 'window',
  value: 'hideHotkey',
  setValue: 'setHideHotkey',
  recording: 'hotkeyRecording',
  error: 'hotkeyError',
  ref: 'hotkeyInputRef',
  setRecording: 'setHotkeyRecording',
  setError: 'setHotkeyError',
  api: 'hotkeySet'
}, {
  handler: 'handleQuitHotkeyKeyDown',
  page: 'window',
  value: 'quitHotkey',
  setValue: 'setQuitHotkey',
  recording: 'quitHotkeyRecording',
  error: 'quitHotkeyError',
  ref: 'quitHotkeyInputRef',
  setRecording: 'setQuitHotkeyRecording',
  setError: 'setQuitHotkeyError',
  api: 'quitHotkeySet'
}, {
  handler: 'handleScreenshotHotkeyKeyDown',
  page: 'capture',
  value: 'screenshotHotkey',
  setValue: 'setScreenshotHotkey',
  recording: 'screenshotHotkeyRecording',
  error: 'screenshotHotkeyError',
  ref: 'screenshotHotkeyInputRef',
  setRecording: 'setScreenshotHotkeyRecording',
  setError: 'setScreenshotHotkeyError',
  api: 'screenshotHotkeySet'
}, {
  handler: 'handleNextSongHotkeyKeyDown',
  page: 'media',
  value: 'nextSongHotkey',
  setValue: 'setNextSongHotkey',
  recording: 'nextSongHotkeyRecording',
  error: 'nextSongHotkeyError',
  ref: 'nextSongHotkeyInputRef',
  setRecording: 'setNextSongHotkeyRecording',
  setError: 'setNextSongHotkeyError',
  api: 'nextSongHotkeySet'
}, {
  handler: 'handlePlayPauseSongHotkeyKeyDown',
  page: 'media',
  value: 'playPauseSongHotkey',
  setValue: 'setPlayPauseSongHotkey',
  recording: 'playPauseSongHotkeyRecording',
  error: 'playPauseSongHotkeyError',
  ref: 'playPauseSongHotkeyInputRef',
  setRecording: 'setPlayPauseSongHotkeyRecording',
  setError: 'setPlayPauseSongHotkeyError',
  api: 'playPauseSongHotkeySet'
}, {
  handler: 'handleResetPositionHotkeyKeyDown',
  page: 'window',
  value: 'resetPositionHotkey',
  setValue: 'setResetPositionHotkey',
  recording: 'resetPositionHotkeyRecording',
  error: 'resetPositionHotkeyError',
  ref: 'resetPositionHotkeyInputRef',
  setRecording: 'setResetPositionHotkeyRecording',
  setError: 'setResetPositionHotkeyError',
  api: 'resetPositionHotkeySet'
}, {
  handler: 'handleToggleTrayHotkeyKeyDown',
  page: 'display',
  value: 'toggleTrayHotkey',
  setValue: 'setToggleTrayHotkey',
  recording: 'toggleTrayHotkeyRecording',
  error: 'toggleTrayHotkeyError',
  ref: 'toggleTrayHotkeyInputRef',
  setRecording: 'setToggleTrayHotkeyRecording',
  setError: 'setToggleTrayHotkeyError',
  api: 'toggleTrayHotkeySet'
}, {
  handler: 'handleShowSettingsWindowHotkeyKeyDown',
  page: 'window',
  value: 'showSettingsWindowHotkey',
  setValue: 'setShowSettingsWindowHotkey',
  recording: 'showSettingsWindowHotkeyRecording',
  error: 'showSettingsWindowHotkeyError',
  ref: 'showSettingsWindowHotkeyInputRef',
  setRecording: 'setShowSettingsWindowHotkeyRecording',
  setError: 'setShowSettingsWindowHotkeyError',
  api: 'showSettingsWindowHotkeySet'
}, {
  handler: 'handleOpenClipboardHistoryHotkeyKeyDown',
  page: 'clipboard',
  value: 'openClipboardHistoryHotkey',
  setValue: 'setOpenClipboardHistoryHotkey',
  recording: 'openClipboardHistoryHotkeyRecording',
  error: 'openClipboardHistoryHotkeyError',
  ref: 'openClipboardHistoryHotkeyInputRef',
  setRecording: 'setOpenClipboardHistoryHotkeyRecording',
  setError: 'setOpenClipboardHistoryHotkeyError',
  api: 'openClipboardHistoryHotkeySet'
}, {
  handler: 'handleTogglePassthroughHotkeyKeyDown',
  page: 'display',
  value: 'togglePassthroughHotkey',
  setValue: 'setTogglePassthroughHotkey',
  recording: 'togglePassthroughHotkeyRecording',
  error: 'togglePassthroughHotkeyError',
  ref: 'togglePassthroughHotkeyInputRef',
  setRecording: 'setTogglePassthroughHotkeyRecording',
  setError: 'setTogglePassthroughHotkeyError',
  api: 'togglePassthroughHotkeySet'
}, {
  handler: 'handleToggleUiLockHotkeyKeyDown',
  page: 'display',
  value: 'toggleUiLockHotkey',
  setValue: 'setToggleUiLockHotkey',
  recording: 'toggleUiLockHotkeyRecording',
  error: 'toggleUiLockHotkeyError',
  ref: 'toggleUiLockHotkeyInputRef',
  setRecording: 'setToggleUiLockHotkeyRecording',
  setError: 'setToggleUiLockHotkeyError',
  api: 'toggleUiLockHotkeySet'
}, {
  handler: 'handleAgentVoiceInputHotkeyKeyDown',
  page: 'agent',
  value: 'agentVoiceInputHotkey',
  setValue: 'setAgentVoiceInputHotkey',
  recording: 'agentVoiceInputHotkeyRecording',
  error: 'agentVoiceInputHotkeyError',
  ref: 'agentVoiceInputHotkeyInputRef',
  setRecording: 'setAgentVoiceInputHotkeyRecording',
  setError: 'setAgentVoiceInputHotkeyError',
  api: 'agentVoiceInputHotkeySet'
}, {
  handler: 'handleToggleShapeModeHotkeyKeyDown',
  page: 'display',
  value: 'toggleShapeModeHotkey',
  setValue: 'setToggleShapeModeHotkey',
  recording: 'toggleShapeModeHotkeyRecording',
  error: 'toggleShapeModeHotkeyError',
  ref: 'toggleShapeModeHotkeyInputRef',
  setRecording: 'setToggleShapeModeHotkeyRecording',
  setError: 'setToggleShapeModeHotkeyError',
  api: 'toggleShapeModeHotkeySet'
}] as const;
const register = vi.fn<(key: string) => Promise<boolean>>();
const suspend = vi.fn<() => Promise<void>>();
const resume = vi.fn<() => Promise<void>>();
const t = ((key: string) => key) as Parameters<typeof useSettingsShortcuts>[0]['t'];
/**
 * 同时执行真实配置 Hook 和组件，保留两者状态及 ref。
 * @returns 目标组件元素树和实际配置状态。
 */
function render() {
  return renderWithHooks(() => {
    const state = useSettingsShortcuts({
      t
    });
    return {
      state,
      tree: ShortcutSettingsSection(state)
    };
  });
}
/**
 * 选择真实导航生成的页面。
 * @param page - 组件公开页面值。
 * @returns 无返回值。
 */
function navigate(page: string): void {
  invoke(findElement(render().tree, (node) => 'onSelectPage' in elementProps(node)), 'onSelectPage', page);
}
/**
 * 按实际输入 ref 定位该快捷键的真实行。
 * @param ref - 对应配置 Hook 的输入 ref。
 * @returns 真正的字段和动作行。
 */
function row(ref: unknown) {
  return findElement(render().tree, (node) => elementProps(node).className === 'settings-hotkey-row' && elements(node).some((child) => child.type === 'input' && elementProps(child).ref === ref));
}
/**
 * 等待实际服务成功、false和catch回调。
 * @returns 异步动作处理完毕。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  register.mockReset().mockResolvedValue(true);
  suspend.mockReset().mockResolvedValue(undefined);
  resume.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('window', {
    api: {
      ...Object.fromEntries(bindings.map(({
        api
      }) => [api, register])),
      hotkeySuspend: suspend,
      hotkeyResume: resume
    }
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe.each(bindings)('$api真实字段', (binding) => {
  it.each([true, false])('录入焦点、清除原错误和失焦恢复，ref存在=%s', async (hasInput) => {
    navigate(binding.page);
    const {state} = render();
    state[binding.setError]('previous error');
    const focus = vi.fn();
    const blur = vi.fn();
    state[binding.ref].current = hasInput ? {
      focus,
      blur
    } as unknown as HTMLInputElement : null;
    expect(textContent(render().tree)).toContain('previous error');
    suspend.mockRejectedValue(new Error('suspend'));
    resume.mockRejectedValue(new Error('resume'));
    invoke(findElement(row(state[binding.ref]), (node) => node.type === 'button' && textContent(node) === 'settings.shortcut.common.editBtn'), 'onClick');
    expect(focus).toHaveBeenCalledTimes(hasInput ? 1 : 0);
    expect(render().state[binding.recording]).toBe(true);
    const input = findElement(row(state[binding.ref]), (node) => node.type === 'input');
    expect(elementProps(input).value).toBe('settings.shortcut.common.recordingValue');
    invoke(input, 'onFocus');
    await settle();
    expect(render().state[binding.error]).toBe('');
    expect(suspend).toHaveBeenCalledOnce();
    invoke(findElement(row(state[binding.ref]), (node) => node.type === 'input'), 'onBlur');
    await settle();
    expect(render().state[binding.recording]).toBe(false);
    expect(resume).toHaveBeenCalledOnce();
  });
  it.each(['success', 'false', 'rejected'])('清除组合%s保留正确状态', async (mode) => {
    navigate(binding.page);
    const {state} = render();
    state[binding.setValue]('Alt+B');
    state[binding.setError]('previous error');
    const blur = vi.fn();
    state[binding.ref].current = {
      blur
    } as unknown as HTMLInputElement;
    if (mode === 'false') register.mockResolvedValue(false);
    if (mode === 'rejected') register.mockRejectedValue(new Error('clear'));
    invoke(findElement(row(state[binding.ref]), (node) => node.type === 'button' && textContent(node) === 'settings.shortcut.common.clearBtn'), 'onClick');
    await settle();
    expect(register).toHaveBeenCalledWith('');
    expect(render().state[binding.value]).toBe(mode === 'success' ? '' : 'Alt+B');
    if (mode === 'success') {
      expect(render().state[binding.error]).toBe('');
      expect(blur).toHaveBeenCalledOnce();
      expect(elementProps(findElement(row(state[binding.ref]), (node) => node.type === 'input')).value).toBe('settings.shortcut.common.notSetValue');
    } else {
      expect(render().state[binding.error]).toBe('previous error');
      expect(blur).not.toHaveBeenCalled();
    }
  });
  it('实际KeyDown接线调用当前注册器并更新组合', async () => {
    navigate(binding.page);
    const {state} = render();
    invoke(findElement(row(state[binding.ref]), (node) => node.type === 'input'), 'onKeyDown', {
      key: 'z',
      altKey: true,
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    });
    await settle();
    expect(register).toHaveBeenCalledWith('Alt+Z');
    expect(render().state[binding.value]).toBe('Alt+Z');
  });
});
describe('导航状态', () => {
  it('导航展开及收起调用真实状态回调', () => {
    const toggle = findElement(render().tree, (node) => 'onToggle' in elementProps(node));
    invoke(toggle, 'onToggle');
    expect(elementProps(findElement(render().tree, (node) => 'onToggle' in elementProps(node))).expanded).toBe(true);
    invoke(findElement(render().tree, (node) => 'onToggle' in elementProps(node)), 'onToggle');
    expect(elementProps(findElement(render().tree, (node) => 'onToggle' in elementProps(node))).expanded).toBe(false);
  });
});
