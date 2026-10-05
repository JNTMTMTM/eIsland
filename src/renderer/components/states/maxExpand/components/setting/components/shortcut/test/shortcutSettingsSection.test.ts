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
 * @file shortcutSettingsSection.test.ts
 * @description ShortcutSettingsSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShortcutSettingsSection } from '../ShortcutSettingsSection';
import { elementProps, elements, findElement, invoke, resetState, textContent } from '../../../../../../../test/elementHarness';
import type { ComponentProps } from 'react';
const api = vi.hoisted(() => ({ hotkeySuspend: vi.fn(() => Promise.resolve()), hotkeyResume: vi.fn(() => Promise.resolve()), hotkeySet: vi.fn(() => Promise.resolve(true)) }));
/**
 * 构造隔离设置状态和可观察回调的完整配置。
 * @returns 配置状态及可观察回调。
 */
function makeProps(): ComponentProps<typeof ShortcutSettingsSection> {
  return {
    hotkeyInputRef: { current: null },
    hotkeyRecording: false,
    hotkeyError: '',
    hideHotkey: '',
    setHotkeyRecording: vi.fn(),
    setHotkeyError: vi.fn(),
    handleHotkeyKeyDown: vi.fn(),
    setHideHotkey: vi.fn(),
    quitHotkeyInputRef: { current: null },
    quitHotkeyRecording: false,
    quitHotkeyError: '',
    quitHotkey: '',
    setQuitHotkeyRecording: vi.fn(),
    setQuitHotkeyError: vi.fn(),
    handleQuitHotkeyKeyDown: vi.fn(),
    setQuitHotkey: vi.fn(),
    screenshotHotkeyInputRef: { current: null },
    screenshotHotkeyRecording: false,
    screenshotHotkeyError: '',
    screenshotHotkey: '',
    setScreenshotHotkeyRecording: vi.fn(),
    setScreenshotHotkeyError: vi.fn(),
    handleScreenshotHotkeyKeyDown: vi.fn(),
    setScreenshotHotkey: vi.fn(),
    nextSongHotkeyInputRef: { current: null },
    nextSongHotkeyRecording: false,
    nextSongHotkeyError: '',
    nextSongHotkey: '',
    setNextSongHotkeyRecording: vi.fn(),
    setNextSongHotkeyError: vi.fn(),
    handleNextSongHotkeyKeyDown: vi.fn(),
    setNextSongHotkey: vi.fn(),
    playPauseSongHotkeyInputRef: { current: null },
    playPauseSongHotkeyRecording: false,
    playPauseSongHotkeyError: '',
    playPauseSongHotkey: '',
    setPlayPauseSongHotkeyRecording: vi.fn(),
    setPlayPauseSongHotkeyError: vi.fn(),
    handlePlayPauseSongHotkeyKeyDown: vi.fn(),
    setPlayPauseSongHotkey: vi.fn(),
    resetPositionHotkeyInputRef: { current: null },
    resetPositionHotkeyRecording: false,
    resetPositionHotkeyError: '',
    resetPositionHotkey: '',
    setResetPositionHotkeyRecording: vi.fn(),
    setResetPositionHotkeyError: vi.fn(),
    handleResetPositionHotkeyKeyDown: vi.fn(),
    setResetPositionHotkey: vi.fn(),
    toggleTrayHotkeyInputRef: { current: null },
    toggleTrayHotkeyRecording: false,
    toggleTrayHotkeyError: '',
    toggleTrayHotkey: '',
    setToggleTrayHotkeyRecording: vi.fn(),
    setToggleTrayHotkeyError: vi.fn(),
    handleToggleTrayHotkeyKeyDown: vi.fn(),
    setToggleTrayHotkey: vi.fn(),
    showSettingsWindowHotkeyInputRef: { current: null },
    showSettingsWindowHotkeyRecording: false,
    showSettingsWindowHotkeyError: '',
    showSettingsWindowHotkey: '',
    setShowSettingsWindowHotkeyRecording: vi.fn(),
    setShowSettingsWindowHotkeyError: vi.fn(),
    handleShowSettingsWindowHotkeyKeyDown: vi.fn(),
    setShowSettingsWindowHotkey: vi.fn(),
    openClipboardHistoryHotkeyInputRef: { current: null },
    openClipboardHistoryHotkeyRecording: false,
    openClipboardHistoryHotkeyError: '',
    openClipboardHistoryHotkey: '',
    setOpenClipboardHistoryHotkeyRecording: vi.fn(),
    setOpenClipboardHistoryHotkeyError: vi.fn(),
    handleOpenClipboardHistoryHotkeyKeyDown: vi.fn(),
    setOpenClipboardHistoryHotkey: vi.fn(),
    togglePassthroughHotkeyInputRef: { current: null },
    togglePassthroughHotkeyRecording: false,
    togglePassthroughHotkeyError: '',
    togglePassthroughHotkey: '',
    setTogglePassthroughHotkeyRecording: vi.fn(),
    setTogglePassthroughHotkeyError: vi.fn(),
    handleTogglePassthroughHotkeyKeyDown: vi.fn(),
    setTogglePassthroughHotkey: vi.fn(),
    toggleUiLockHotkeyInputRef: { current: null },
    toggleUiLockHotkeyRecording: false,
    toggleUiLockHotkeyError: '',
    toggleUiLockHotkey: '',
    setToggleUiLockHotkeyRecording: vi.fn(),
    setToggleUiLockHotkeyError: vi.fn(),
    handleToggleUiLockHotkeyKeyDown: vi.fn(),
    setToggleUiLockHotkey: vi.fn(),
    agentVoiceInputHotkeyInputRef: { current: null },
    agentVoiceInputHotkeyRecording: false,
    agentVoiceInputHotkeyError: '',
    agentVoiceInputHotkey: '',
    setAgentVoiceInputHotkeyRecording: vi.fn(),
    setAgentVoiceInputHotkeyError: vi.fn(),
    handleAgentVoiceInputHotkeyKeyDown: vi.fn(),
    setAgentVoiceInputHotkey: vi.fn(),
    toggleShapeModeHotkeyInputRef: { current: null },
    toggleShapeModeHotkeyRecording: false,
    toggleShapeModeHotkeyError: '',
    toggleShapeModeHotkey: '',
    setToggleShapeModeHotkeyRecording: vi.fn(),
    setToggleShapeModeHotkeyError: vi.fn(),
    handleToggleShapeModeHotkeyKeyDown: vi.fn(),
    setToggleShapeModeHotkey: vi.fn(),
  };
}
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  vi.stubGlobal('window', { api });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('ShortcutSettingsSection', () => {
  it('starts and stops recording while forwarding keyboard capture', () => {
    const props = makeProps();
    const tree = ShortcutSettingsSection(props);
    const input = findElement(tree, (n) => n.type === 'input');
    expect(elementProps(input).readOnly).toBe(true);
    invoke(input, 'onFocus');
    expect(props.setHotkeyRecording).toHaveBeenCalledWith(true);
    expect(props.setHotkeyError).toHaveBeenCalledWith('');
    expect(api.hotkeySuspend).toHaveBeenCalledOnce();
    invoke(input, 'onKeyDown', { key: 'K' });
    expect(props.handleHotkeyKeyDown).toHaveBeenCalledWith({ key: 'K' });
    invoke(input, 'onBlur');
    expect(props.setHotkeyRecording).toHaveBeenLastCalledWith(false);
    expect(api.hotkeyResume).toHaveBeenCalledOnce();
  });
  it('clears an assigned hotkey only when persistence accepts it', async () => {
    const props = { ...makeProps(), hideHotkey: 'Control+K', hotkeyError: 'conflict' };
    const tree = ShortcutSettingsSection(props);
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.shortcut.common.clearBtn'), 'onClick');
    await Promise.resolve();
    expect(props.setHideHotkey).toHaveBeenCalledWith('');
    expect(props.setHotkeyRecording).toHaveBeenCalledWith(false);
    vi.mocked(props.setHideHotkey).mockClear();
    api.hotkeySet.mockResolvedValueOnce(false);
    resetState();
    invoke(findElement(ShortcutSettingsSection(props), (n) => n.type === 'button' && textContent(n) === 'settings.shortcut.common.clearBtn'), 'onClick');
    await Promise.resolve();
    expect(props.setHideHotkey).not.toHaveBeenCalled();
  });
  it.each(['window', 'display', 'agent', 'capture', 'clipboard', 'media'] as const)('renders capture controls for %s page', (page) => {
    resetState([page, false]);
    const tree = ShortcutSettingsSection(makeProps());
    expect(elements(tree).filter((n) => n.type === 'input').length).toBeGreaterThan(0);
    expect(elements(tree).filter((n) => n.type === 'input').every((n) => elementProps(n).readOnly === true)).toBe(true);
  });
});
