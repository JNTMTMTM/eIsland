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
 * @file hotkeySupplement.test.ts
 * @description 全部快捷键 IPC 的当前值与存储回退、逐项冲突、注册及持久化失败测试。
 * @author 鸡哥
 */

import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerHotkeyIpcHandlers } from '../hotkey';
type Handler = (...args: unknown[]) => unknown;
const mocks = vi.hoisted(() => ({
  handle: vi.fn<(channel: string, handler: Handler) => void>(),
  write: vi.fn<(path: string, data: string, encoding: string) => void>(),
}));
vi.mock('electron', () => ({ ipcMain: { handle: mocks.handle } }));
vi.mock('fs', () => ({ writeFileSync: mocks.write }));
const handlers = new Map<string, Handler>();
const names = ["Hide","Quit","Screenshot","NextSong","PlayPauseSong","ResetPosition","ToggleTray","ShowSettingsWindow","OpenClipboardHistory","TogglePassthrough","ToggleUiLock","AgentVoiceInput","ToggleShapeMode"] as const;
const rows = [["Hide","hotkey",["Quit","Screenshot","NextSong","PlayPauseSong","ResetPosition","ToggleTray","ShowSettingsWindow","OpenClipboardHistory","ToggleUiLock"]],["OpenClipboardHistory","open-clipboard-history-hotkey",["Hide","Quit","Screenshot","NextSong","PlayPauseSong","ResetPosition","ToggleTray","ShowSettingsWindow"]],["ShowSettingsWindow","show-settings-window-hotkey",["Hide","Quit","Screenshot","NextSong","PlayPauseSong","ResetPosition","ToggleTray","OpenClipboardHistory"]],["NextSong","next-song-hotkey",["Hide","Quit","Screenshot","ResetPosition","PlayPauseSong","ToggleTray","ShowSettingsWindow","OpenClipboardHistory"]],["PlayPauseSong","play-pause-song-hotkey",["Hide","Quit","Screenshot","ResetPosition","NextSong","ToggleTray","ShowSettingsWindow","OpenClipboardHistory"]],["ResetPosition","reset-position-hotkey",["Hide","Quit","Screenshot","NextSong","PlayPauseSong","ToggleTray","ShowSettingsWindow","OpenClipboardHistory"]],["Quit","quit-hotkey",["Hide","Screenshot","NextSong","PlayPauseSong","ResetPosition","ToggleTray","ShowSettingsWindow"]],["ToggleTray","toggle-tray-hotkey",["Hide","Quit","Screenshot","NextSong","PlayPauseSong","ResetPosition","ShowSettingsWindow","OpenClipboardHistory"]],["TogglePassthrough","toggle-passthrough-hotkey",["Hide","Quit","Screenshot","NextSong","PlayPauseSong","ResetPosition","ToggleTray","ShowSettingsWindow","OpenClipboardHistory"]],["ToggleUiLock","toggle-ui-lock-hotkey",["Hide","Quit","Screenshot","NextSong","PlayPauseSong","ResetPosition","ToggleTray","ShowSettingsWindow","OpenClipboardHistory","TogglePassthrough"]],["AgentVoiceInput","agent-voice-input-hotkey",["Hide","Quit","Screenshot","NextSong","PlayPauseSong","ResetPosition","ToggleTray","ShowSettingsWindow","OpenClipboardHistory","TogglePassthrough","ToggleUiLock","ToggleShapeMode"]],["ToggleShapeMode","toggle-shape-mode-hotkey",["Hide","Quit","Screenshot","NextSong","PlayPauseSong","ResetPosition","ToggleTray","ShowSettingsWindow","OpenClipboardHistory","TogglePassthrough","ToggleUiLock","AgentVoiceInput"]]] as const;
const current = {
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
const stored = {
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
const registrations = {
  Hide: vi.fn(() => true),
  OpenClipboardHistory: vi.fn(() => true),
  ShowSettingsWindow: vi.fn(() => true),
  NextSong: vi.fn(() => true),
  PlayPauseSong: vi.fn(() => true),
  ResetPosition: vi.fn(() => true),
  Quit: vi.fn(() => true),
  ToggleTray: vi.fn(() => true),
  TogglePassthrough: vi.fn(() => true),
  ToggleUiLock: vi.fn(() => true),
  AgentVoiceInput: vi.fn(() => true),
  ToggleShapeMode: vi.fn(() => true),
};

const options = {
  storeDir: 'C:\\fixture-hotkey-store',
  getCurrentHideHotkey: current.Hide,
  readHideHotkeyConfig: stored.Hide,
  getCurrentQuitHotkey: current.Quit,
  readQuitHotkeyConfig: stored.Quit,
  getCurrentScreenshotHotkey: current.Screenshot,
  readScreenshotHotkeyConfig: stored.Screenshot,
  getCurrentNextSongHotkey: current.NextSong,
  readNextSongHotkeyConfig: stored.NextSong,
  getCurrentPlayPauseSongHotkey: current.PlayPauseSong,
  readPlayPauseSongHotkeyConfig: stored.PlayPauseSong,
  getCurrentResetPositionHotkey: current.ResetPosition,
  readResetPositionHotkeyConfig: stored.ResetPosition,
  getCurrentToggleTrayHotkey: current.ToggleTray,
  readToggleTrayHotkeyConfig: stored.ToggleTray,
  getCurrentShowSettingsWindowHotkey: current.ShowSettingsWindow,
  readShowSettingsWindowHotkeyConfig: stored.ShowSettingsWindow,
  getCurrentOpenClipboardHistoryHotkey: current.OpenClipboardHistory,
  readOpenClipboardHistoryHotkeyConfig: stored.OpenClipboardHistory,
  getCurrentTogglePassthroughHotkey: current.TogglePassthrough,
  readTogglePassthroughHotkeyConfig: stored.TogglePassthrough,
  getCurrentToggleUiLockHotkey: current.ToggleUiLock,
  readToggleUiLockHotkeyConfig: stored.ToggleUiLock,
  getCurrentAgentVoiceInputHotkey: current.AgentVoiceInput,
  readAgentVoiceInputHotkeyConfig: stored.AgentVoiceInput,
  getCurrentToggleShapeModeHotkey: current.ToggleShapeMode,
  readToggleShapeModeHotkeyConfig: stored.ToggleShapeMode,
  hideHotkeyStoreKey: 'Hide',
  registerHideHotkey: registrations.Hide,
  openClipboardHistoryHotkeyStoreKey: 'OpenClipboardHistory',
  registerOpenClipboardHistoryHotkey: registrations.OpenClipboardHistory,
  showSettingsWindowHotkeyStoreKey: 'ShowSettingsWindow',
  registerShowSettingsWindowHotkey: registrations.ShowSettingsWindow,
  nextSongHotkeyStoreKey: 'NextSong',
  registerNextSongHotkey: registrations.NextSong,
  playPauseSongHotkeyStoreKey: 'PlayPauseSong',
  registerPlayPauseSongHotkey: registrations.PlayPauseSong,
  resetPositionHotkeyStoreKey: 'ResetPosition',
  registerResetPositionHotkey: registrations.ResetPosition,
  quitHotkeyStoreKey: 'Quit',
  registerQuitHotkey: registrations.Quit,
  toggleTrayHotkeyStoreKey: 'ToggleTray',
  registerToggleTrayHotkey: registrations.ToggleTray,
  togglePassthroughHotkeyStoreKey: 'TogglePassthrough',
  registerTogglePassthroughHotkey: registrations.TogglePassthrough,
  toggleUiLockHotkeyStoreKey: 'ToggleUiLock',
  registerToggleUiLockHotkey: registrations.ToggleUiLock,
  agentVoiceInputHotkeyStoreKey: 'AgentVoiceInput',
  registerAgentVoiceInputHotkey: registrations.AgentVoiceInput,
  toggleShapeModeHotkeyStoreKey: 'ToggleShapeMode',
  registerToggleShapeModeHotkey: registrations.ToggleShapeMode,
  suspendIslandHotkeys: vi.fn<() => void>(),
  resumeIslandHotkeys: vi.fn<() => void>(),
} satisfies Parameters<typeof registerHotkeyIpcHandlers>[0];
/**
 * 调用已注册处理器。
 * @param channel - 真实频道。
 * @param accelerator - 可选快捷键。
 * @returns 处理器响应。
 */
function invoke(channel: string, accelerator?: string): unknown {
  const handler = handlers.get(channel);
  if (!handler) throw new Error(`unregistered channel: ${  channel}`);
  return handler({}, accelerator);
}
beforeEach(() => {
  vi.resetAllMocks();
  names.forEach((name) => { current[name].mockReturnValue(''); stored[name].mockReturnValue(''); });
  rows.forEach(([name]) => { registrations[name].mockReturnValue(true); });
  handlers.clear();
  mocks.handle.mockImplementation((channel, handler) => { handlers.set(channel, handler); });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  registerHotkeyIpcHandlers(options);
});
afterEach(() => { vi.restoreAllMocks(); });

describe('hotkey IPC getter and persistence contracts', () => {
  it.each(rows)('%s reads current state before the persisted fallback', (name, channel) => {
    stored[name].mockReturnValue('Stored');
    current[name].mockReturnValue('Current');
    expect(invoke(`${channel  }:get`)).toBe('Current');
    expect(stored[name]).not.toHaveBeenCalled();
    current[name].mockReturnValue('');
    expect(invoke(`${channel  }:get`)).toBe('Stored');
    expect(stored[name]).toHaveBeenCalledOnce();
  });
  it.each(rows)('%s persists successful registrations, clearing and rejects registration failures', (name, channel) => {
    expect(invoke(`${channel  }:set`, 'Fixture')).toBe(true);
    expect(registrations[name]).toHaveBeenCalledWith('Fixture');
    expect(mocks.write).toHaveBeenCalledWith(join(options.storeDir, `${name  }.json`), '"Fixture"', 'utf-8');
    mocks.write.mockClear();
    expect(invoke(`${channel  }:set`, '')).toBe(true);
    expect(mocks.write).toHaveBeenCalledWith(join(options.storeDir, `${name  }.json`), '""', 'utf-8');
    mocks.write.mockClear();
    registrations[name].mockReturnValue(false);
    expect(invoke(`${channel  }:set`, 'Rejected')).toBe(false);
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it.each(rows)('%s preserves successful registration when persistence fails', (name, channel) => {
    mocks.write.mockImplementation(() => { throw new Error('disk denied'); });
    expect(invoke(`${channel  }:set`, 'Fixture')).toBe(true);
    expect(registrations[name]).toHaveBeenCalledWith('Fixture');
    expect(console.error).toHaveBeenCalled();
  });
  it.each(rows)('%s permits an unused shortcut when all other shortcuts are nonempty', (name, channel) => {
    names.forEach((other) => { current[other].mockReturnValue(`Other-${  other}`); });
    expect(invoke(`${channel  }:set`, 'Unused')).toBe(true);
    expect(registrations[name]).toHaveBeenCalledWith('Unused');
    expect(mocks.write).toHaveBeenCalledOnce();
  });
  it('forwards suspend and resume exactly once', () => {
    expect(invoke('hotkey:suspend')).toBe(true);
    expect(invoke('hotkey:resume')).toBe(true);
    expect(options.suspendIslandHotkeys).toHaveBeenCalledOnce();
    expect(options.resumeIslandHotkeys).toHaveBeenCalledOnce();
  });
});
describe('hotkey conflict rejection before registration and persistence', () => {
  rows.forEach(([name, channel, conflicts]) => {
    it.each(conflicts)(`${name  } rejects a current %s collision`, (other) => {
      current[other].mockReturnValue('Collision');
      expect(invoke(`${channel  }:set`, 'Collision')).toBe(false);
      expect(registrations[name]).not.toHaveBeenCalled();
      expect(mocks.write).not.toHaveBeenCalled();
    });
  });
  it.each(rows)('%s also rejects a collision from stored state', (name, channel, conflicts) => {
    const [other] = conflicts;
    stored[other].mockReturnValue('StoredCollision');
    expect(invoke(`${channel  }:set`, 'StoredCollision')).toBe(false);
    expect(registrations[name]).not.toHaveBeenCalled();
    expect(mocks.write).not.toHaveBeenCalled();
  });
});
