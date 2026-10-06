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
 * @file hotkeyServiceSupplement.test.ts
 * @description 全部快捷键真实服务的注册替换、叶依赖失败、窗口动作、挂起恢复和语音防抖测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHotkeyService } from '../hotkeyService';
import type { BrowserWindow } from 'electron';

const mocks = vi.hoisted(() => ({
  register: vi.fn<(accelerator: string, callback: () => void) => boolean>(),
  unregister: vi.fn<(accelerator: string) => void>(),
  quit: vi.fn<() => void>(),
  show: vi.fn<() => void>(),
  hide: vi.fn<() => void>(),
  destroyed: vi.fn<() => boolean>(),
  visible: vi.fn<() => boolean>(),
  alwaysOnTop: vi.fn<(enabled: boolean, level: string) => void>(),
}));
vi.mock('electron', () => ({ app: { quit: mocks.quit }, globalShortcut: { register: mocks.register, unregister: mocks.unregister } }));
const names = ["Hide","Quit","Screenshot","NextSong","PlayPauseSong","ResetPosition","ToggleTray","ShowSettingsWindow","OpenClipboardHistory","TogglePassthrough","ToggleUiLock","AgentVoiceInput","ToggleShapeMode"] as const;
const rows = [["Hide","registerHideHotkey","getCurrentHideHotkey",0],["Quit","registerQuitHotkey","getCurrentQuitHotkey",1],["Screenshot","registerScreenshotHotkey","getCurrentScreenshotHotkey",2],["NextSong","registerNextSongHotkey","getCurrentNextSongHotkey",3],["PlayPauseSong","registerPlayPauseSongHotkey","getCurrentPlayPauseSongHotkey",4],["ResetPosition","registerResetPositionHotkey","getCurrentResetPositionHotkey",5],["ToggleTray","registerToggleTrayHotkey","getCurrentToggleTrayHotkey",6],["ShowSettingsWindow","registerShowSettingsWindowHotkey","getCurrentShowSettingsWindowHotkey",7],["OpenClipboardHistory","registerOpenClipboardHistoryHotkey","getCurrentOpenClipboardHistoryHotkey",8],["TogglePassthrough","registerTogglePassthroughHotkey","getCurrentTogglePassthroughHotkey",9],["ToggleUiLock","registerToggleUiLockHotkey","getCurrentToggleUiLockHotkey",10],["AgentVoiceInput","registerAgentVoiceInputHotkey","getCurrentAgentVoiceInputHotkey",11],["ToggleShapeMode","registerToggleShapeModeHotkey","getCurrentToggleShapeModeHotkey",12]] as const;
const callbacks = new Map<string, () => void>();
const readers = {
  Hide: vi.fn(() => ''),
  Quit: vi.fn(() => ''),
  Screenshot: vi.fn(() => ''),
  NextSong: vi.fn(() => ''),
  PlayPauseSong: vi.fn(() => ''),
  ResetPosition: vi.fn(() => ''),
  ToggleTray: vi.fn(() => ''),
  ShowSettingsWindow: vi.fn(() => ''),
  OpenClipboardHistory: vi.fn(() => ''),
  TogglePassthrough: vi.fn(() => ''),
  ToggleUiLock: vi.fn(() => ''),
  AgentVoiceInput: vi.fn(() => ''),
  ToggleShapeMode: vi.fn(() => ''),
};
const options = {
  getMainWindow: vi.fn<() => BrowserWindow | null>(),
  setHiddenByAutoHideProcess: vi.fn<(hidden: boolean) => void>(),
  readHideHotkeyConfig: readers.Hide,
  readQuitHotkeyConfig: readers.Quit,
  readScreenshotHotkeyConfig: readers.Screenshot,
  readNextSongHotkeyConfig: readers.NextSong,
  readPlayPauseSongHotkeyConfig: readers.PlayPauseSong,
  readResetPositionHotkeyConfig: readers.ResetPosition,
  readToggleTrayHotkeyConfig: readers.ToggleTray,
  readShowSettingsWindowHotkeyConfig: readers.ShowSettingsWindow,
  readOpenClipboardHistoryHotkeyConfig: readers.OpenClipboardHistory,
  readTogglePassthroughHotkeyConfig: readers.TogglePassthrough,
  readToggleUiLockHotkeyConfig: readers.ToggleUiLock,
  readAgentVoiceInputHotkeyConfig: readers.AgentVoiceInput,
  readToggleShapeModeHotkeyConfig: readers.ToggleShapeMode,
  onScreenshotHotkey: vi.fn<() => void>(),
  onNextSongHotkey: vi.fn<() => void>(),
  onPlayPauseSongHotkey: vi.fn<() => void>(),
  onResetPositionHotkey: vi.fn<() => void>(),
  onToggleTrayHotkey: vi.fn<() => void>(),
  onShowSettingsWindowHotkey: vi.fn<() => void>(),
  onOpenClipboardHistoryHotkey: vi.fn<() => void>(),
  onTogglePassthroughHotkey: vi.fn<() => void>(),
  onToggleUiLockHotkey: vi.fn<() => void>(),
  onToggleShapeModeHotkey: vi.fn<() => void>(),
  onAgentVoiceInputHotkeyHold: vi.fn<() => void>(),
  onAgentVoiceInputHotkeyRelease: vi.fn<() => void>(),
} satisfies Parameters<typeof createHotkeyService>[0];
const actions = [mocks.show, mocks.quit, options.onScreenshotHotkey, options.onNextSongHotkey, options.onPlayPauseSongHotkey, options.onResetPositionHotkey, options.onToggleTrayHotkey, options.onShowSettingsWindowHotkey, options.onOpenClipboardHistoryHotkey, options.onTogglePassthroughHotkey, options.onToggleUiLockHotkey, options.onAgentVoiceInputHotkeyHold, options.onToggleShapeModeHotkey];
const windowFixture = { isDestroyed: mocks.destroyed, isVisible: mocks.visible, show: mocks.show, hide: mocks.hide, setAlwaysOnTop: mocks.alwaysOnTop };

/**
 * 触发注册在 Electron 叶边界的真实回调。
 * @param accelerator - 注册时的快捷键。
 */
function press(accelerator: string): void {
  const callback = callbacks.get(accelerator);
  if (!callback) throw new Error(`unregistered accelerator: ${  accelerator}`);
  callback();
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  callbacks.clear();
  names.forEach((name) => { readers[name].mockReturnValue(''); });
  mocks.register.mockImplementation((accelerator, callback) => { callbacks.set(accelerator, callback); return true; });
  mocks.destroyed.mockReturnValue(false);
  mocks.visible.mockReturnValue(false);
  options.getMainWindow.mockReturnValue(windowFixture as unknown as BrowserWindow);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('every service shortcut registration and callback', () => {
  it.each(rows)('%s tracks successful registration, replacement and removal despite unregister failure', (name, register, getter, action) => {
    const service = createHotkeyService(options);
    expect(service[getter]()).toBe('');
    expect(service[register]('')).toBe(true);
    expect(mocks.register).not.toHaveBeenCalled();
    expect(service[register]('First')).toBe(true);
    expect(service[getter]()).toBe('First');
    press('First');
    expect(actions[action]).toHaveBeenCalledOnce();
    expect(service[register]('Second')).toBe(true);
    expect(mocks.unregister).toHaveBeenCalledWith('First');
    expect(service[getter]()).toBe('Second');
    mocks.unregister.mockImplementation(() => { throw new Error('unregister denied'); });
    expect(service[register]('')).toBe(true);
    expect(mocks.unregister).toHaveBeenCalledWith('Second');
    expect(service[getter]()).toBe('');
    mocks.register.mockReturnValue(false);
    expect(service[register]('Unavailable')).toBe(false);
    expect(service[getter]()).toBe('');
    mocks.register.mockImplementation(() => { throw new Error('register denied'); });
    expect(service[register]('Invalid')).toBe(false);
    expect(service[getter]()).toBe('');
    expect(console.error).toHaveBeenCalled();
    expect(readers[name]).toBeDefined();
  });
});

describe('hide-window callback and persisted binding boundaries', () => {
  it('unregisters a persisted hide shortcut on the first registration', () => {
    readers.Hide.mockReturnValue('Stored');
    const service = createHotkeyService(options);
    expect(service.registerHideHotkey('New')).toBe(true);
    expect(mocks.unregister).toHaveBeenCalledWith('Stored');
    expect(service.getCurrentHideHotkey()).toBe('New');
  });
  it('hides a visible window and clears the automatic-hide marker', () => {
    mocks.visible.mockReturnValue(true);
    const service = createHotkeyService(options);
    service.registerHideHotkey('Hide');
    press('Hide');
    expect(options.setHiddenByAutoHideProcess).toHaveBeenCalledWith(false);
    expect(mocks.hide).toHaveBeenCalledOnce();
    expect(mocks.show).not.toHaveBeenCalled();
    expect(mocks.alwaysOnTop).not.toHaveBeenCalled();
  });
  it('shows a hidden window at the screen-saver level', () => {
    const service = createHotkeyService(options);
    service.registerHideHotkey('Show');
    press('Show');
    expect(options.setHiddenByAutoHideProcess).toHaveBeenCalledWith(false);
    expect(mocks.show).toHaveBeenCalledOnce();
    expect(mocks.alwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver');
  });
  it.each(['absent', 'destroyed'])('ignores the hide callback for an %s window', (state) => {
    if (state === 'absent') options.getMainWindow.mockReturnValue(null);
    else mocks.destroyed.mockReturnValue(true);
    const service = createHotkeyService(options);
    service.registerHideHotkey('Hide');
    press('Hide');
    expect(options.setHiddenByAutoHideProcess).not.toHaveBeenCalled();
    expect(mocks.show).not.toHaveBeenCalled();
    expect(mocks.hide).not.toHaveBeenCalled();
  });
});

describe('shortcut suspend and resume', () => {
  it('does nothing when current and stored shortcuts are all empty', () => {
    const service = createHotkeyService(options);
    service.suspendIslandHotkeys();
    service.resumeIslandHotkeys();
    expect(mocks.unregister).not.toHaveBeenCalled();
    expect(mocks.register).not.toHaveBeenCalled();
  });
  it('suspends and restores all stored shortcuts even when one unregister throws', () => {
    names.forEach((name) => { readers[name].mockReturnValue(`Stored-${  name}`); });
    mocks.unregister.mockImplementationOnce(() => { throw new Error('unregister denied'); });
    const service = createHotkeyService(options);
    service.suspendIslandHotkeys();
    expect(mocks.unregister.mock.calls.map(([accelerator]) => accelerator)).toEqual(names.map((name) => `Stored-${  name}`));
    service.resumeIslandHotkeys();
    expect(mocks.register.mock.calls.map(([accelerator]) => accelerator)).toEqual(names.map((name) => `Stored-${  name}`));
    rows.forEach(([name, register, getter]) => { void register; expect(service[getter]()).toBe(`Stored-${  name}`); });
  });
  it('uses all current bindings instead of reading stored values during suspend and resume', () => {
    const service = createHotkeyService(options);
    rows.forEach(([name, register]) => { expect(service[register](`Current-${  name}`)).toBe(true); });
    names.forEach((name) => { readers[name].mockClear(); });
    mocks.unregister.mockClear();
    mocks.register.mockClear();
    service.suspendIslandHotkeys();
    expect(mocks.unregister.mock.calls.map(([accelerator]) => accelerator)).toEqual(names.map((name) => `Current-${  name}`));
    service.resumeIslandHotkeys();
    expect(mocks.register.mock.calls.map(([accelerator]) => accelerator)).toEqual(names.map((name) => `Current-${  name}`));
    names.forEach((name) => { expect(readers[name]).not.toHaveBeenCalled(); });
  });
});

describe('agent voice shortcut debounce and release lifecycle', () => {
  it('ignores held repeats until the exact three-hundred-millisecond boundary', () => {
    const service = createHotkeyService(options);
    service.registerAgentVoiceInputHotkey('Voice');
    press('Voice');
    expect(options.onAgentVoiceInputHotkeyHold).toHaveBeenCalledOnce();
    press('Voice');
    vi.advanceTimersByTime(299);
    press('Voice');
    expect(options.onAgentVoiceInputHotkeyRelease).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    press('Voice');
    expect(options.onAgentVoiceInputHotkeyRelease).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(300);
    press('Voice');
    expect(options.onAgentVoiceInputHotkeyHold).toHaveBeenCalledTimes(2);
  });
  it('releases an active voice session before clearing or replacing the shortcut', () => {
    const service = createHotkeyService(options);
    service.registerAgentVoiceInputHotkey('Voice');
    press('Voice');
    expect(service.registerAgentVoiceInputHotkey('')).toBe(true);
    expect(options.onAgentVoiceInputHotkeyRelease).toHaveBeenCalledOnce();
    expect(service.getCurrentAgentVoiceInputHotkey()).toBe('');
    vi.advanceTimersByTime(300);
    service.registerAgentVoiceInputHotkey('NewVoice');
    press('NewVoice');
    expect(options.onAgentVoiceInputHotkeyHold).toHaveBeenCalledTimes(2);
  });
});
