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
 * @file autoHideWatcher.test.ts
 * @description autoHideWatcher 模块单元测试
 * @author 鸡哥
 */

import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';

const { hasAnyFocusedWindowTitleMock } = vi.hoisted(() => ({
  hasAnyFocusedWindowTitleMock: vi.fn<() => Promise<boolean>>(),
}));

vi.mock('electron', () => ({
  BrowserWindow: class {},
}));

vi.mock('../runningProcesses', () => ({
  hasAnyFocusedWindowTitle: hasAnyFocusedWindowTitleMock,
}));

import { createAutoHideWatcher } from '../autoHideWatcher';

function createMockWindow(overrides: Partial<{
  isDestroyed: () => boolean;
  isVisible: () => boolean;
  show: () => void;
  hide: () => void;
  setAlwaysOnTop: (flag: boolean, level: string) => void;
}> = {}) {
  return {
    isDestroyed: overrides.isDestroyed ?? (() => false),
    isVisible: overrides.isVisible ?? (() => true),
    show: overrides.show ?? vi.fn(),
    hide: overrides.hide ?? vi.fn(),
    setAlwaysOnTop: overrides.setAlwaysOnTop ?? vi.fn(),
    moveTop: vi.fn(),
  };
}

/** 通过一次命中规则的检查让监听器进入已自动隐藏状态。
 * @param watcher - 待设置状态的监听器。
 */
async function markHiddenByRule(watcher: ReturnType<typeof createAutoHideWatcher>): Promise<void> {
  hasAnyFocusedWindowTitleMock.mockResolvedValueOnce(true);
  await watcher.checkNow();
}

describe('createAutoHideWatcher', () => {
  let mockWindow: ReturnType<typeof createMockWindow>;
  let getMainWindow: () => ReturnType<typeof createMockWindow> | null;

  beforeEach(() => {
    mockWindow = createMockWindow();
    getMainWindow = () => mockWindow;
    hasAnyFocusedWindowTitleMock.mockResolvedValue(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkNow', () => {
    it('does nothing when main window is null', async () => {
      const watcher = createAutoHideWatcher({
        getMainWindow: () => null,
        defaultWindowTitleList: ['app.exe'],
      });

      await watcher.checkNow();
      expect(hasAnyFocusedWindowTitleMock).not.toHaveBeenCalled();
    });

    it('does nothing when main window is destroyed', async () => {
      mockWindow = createMockWindow({ isDestroyed: () => true });
      getMainWindow = () => mockWindow;

      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
      });

      await watcher.checkNow();
      expect(hasAnyFocusedWindowTitleMock).not.toHaveBeenCalled();
    });

    it('hides window when focused title matches list', async () => {
      hasAnyFocusedWindowTitleMock.mockResolvedValue(true);

      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
      });

      await watcher.checkNow();

      expect(hasAnyFocusedWindowTitleMock).toHaveBeenCalledWith(['app.exe']);
      expect(mockWindow.hide).toHaveBeenCalledTimes(1);
      expect(watcher.getHiddenByAutoHideProcess()).toBe(true);
    });

    it('does not hide window again if already hidden', async () => {
      hasAnyFocusedWindowTitleMock.mockResolvedValue(true);
      mockWindow = createMockWindow({ isVisible: () => false });
      getMainWindow = () => mockWindow;

      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
      });

      await watcher.checkNow();

      expect(mockWindow.hide).not.toHaveBeenCalled();
      expect(watcher.getHiddenByAutoHideProcess()).toBe(true);
    });

    it('shows window when focused title no longer matches and was previously hidden', async () => {
      hasAnyFocusedWindowTitleMock.mockResolvedValue(false);
      mockWindow = createMockWindow({ isVisible: () => false });
      getMainWindow = () => mockWindow;

      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
      });

      await markHiddenByRule(watcher);

      await watcher.checkNow();

      expect(mockWindow.show).toHaveBeenCalledTimes(1);
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver');
      expect(watcher.getHiddenByAutoHideProcess()).toBe(false);
    });

    it('does nothing when title list does not match and was not previously hidden', async () => {
      hasAnyFocusedWindowTitleMock.mockResolvedValue(false);

      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
      });

      await watcher.checkNow();

      expect(mockWindow.show).not.toHaveBeenCalled();
      expect(mockWindow.hide).not.toHaveBeenCalled();
      expect(watcher.getHiddenByAutoHideProcess()).toBe(false);
    });

    it('shows window and resets flag when title list becomes empty while hidden', async () => {
      mockWindow = createMockWindow({ isVisible: () => false });
      getMainWindow = () => mockWindow;

      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
      });

      await markHiddenByRule(watcher);
      watcher.setAutoHideWindowTitleList([]);

      await watcher.checkNow();

      expect(mockWindow.show).toHaveBeenCalledTimes(1);
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver');
      expect(watcher.getHiddenByAutoHideProcess()).toBe(false);
      expect(hasAnyFocusedWindowTitleMock).toHaveBeenCalledOnce();
    });

    it('does not show window when title list becomes empty and window is already visible', async () => {
      mockWindow = createMockWindow({ isVisible: () => true });
      getMainWindow = () => mockWindow;

      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
      });

      await markHiddenByRule(watcher);
      watcher.setAutoHideWindowTitleList([]);

      await watcher.checkNow();

      expect(mockWindow.show).not.toHaveBeenCalled();
      expect(watcher.getHiddenByAutoHideProcess()).toBe(false);
    });

    it('does nothing when title list is empty and was not hidden', async () => {
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: [],
      });

      await watcher.checkNow();

      expect(mockWindow.show).not.toHaveBeenCalled();
      expect(mockWindow.hide).not.toHaveBeenCalled();
      expect(hasAnyFocusedWindowTitleMock).not.toHaveBeenCalled();
    });

    it('hides window when fullscreen auto hide is enabled and fullscreen exists', async () => {
      const isAnyFullscreenWindow = vi.fn(() => true);
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: [],
        defaultAutoHideFullscreenWindows: true,
        isAnyFullscreenWindow,
      });

      await watcher.checkNow();

      expect(isAnyFullscreenWindow).toHaveBeenCalledTimes(1);
      expect(hasAnyFocusedWindowTitleMock).not.toHaveBeenCalled();
      expect(mockWindow.hide).toHaveBeenCalledTimes(1);
      expect(watcher.getHiddenByAutoHideProcess()).toBe(true);
    });

    it('skips fullscreen detector when fullscreen auto hide is disabled', async () => {
      const isAnyFullscreenWindow = vi.fn(() => true);
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: [],
        defaultAutoHideFullscreenWindows: false,
        isAnyFullscreenWindow,
      });

      await watcher.checkNow();

      expect(isAnyFullscreenWindow).not.toHaveBeenCalled();
      expect(mockWindow.hide).not.toHaveBeenCalled();
    });

    it('prevents concurrent checkNow calls', async () => {
      let resolveCheck!: (value: boolean) => void;
      hasAnyFocusedWindowTitleMock.mockImplementation(
        () => new Promise<boolean>((resolve) => { resolveCheck = resolve; }),
      );

      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
      });

      const firstCall = watcher.checkNow();
      const secondCall = watcher.checkNow();

      resolveCheck(true);
      await firstCall;
      await secondCall;

      expect(hasAnyFocusedWindowTitleMock).toHaveBeenCalledTimes(1);
    });

    it('resets checkInFlight even when hasAnyFocusedWindowTitle throws', async () => {
      hasAnyFocusedWindowTitleMock.mockRejectedValueOnce(new Error('query failed'));

      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
      });

      await expect(watcher.checkNow()).rejects.toThrow('query failed');

      hasAnyFocusedWindowTitleMock.mockResolvedValue(false);
      await watcher.checkNow();

      expect(hasAnyFocusedWindowTitleMock).toHaveBeenCalledTimes(2);
    });

    it('manual show overrides only the current matching scene, then automatic hiding resumes', async () => {
      const watcher = createAutoHideWatcher({ getMainWindow, defaultWindowTitleList: ['game'] });
      watcher.setManualVisibility(true);
      hasAnyFocusedWindowTitleMock.mockResolvedValue(true);
      await watcher.checkNow();
      await watcher.checkNow();
      expect(mockWindow.hide).not.toHaveBeenCalled();
      hasAnyFocusedWindowTitleMock.mockResolvedValue(false);
      await watcher.checkNow();
      hasAnyFocusedWindowTitleMock.mockResolvedValue(true);
      await watcher.checkNow();
      expect(mockWindow.hide).toHaveBeenCalledOnce();
    });

    it.each([true, false])('ignores a pending query after manual visibility changes to %s', async (visible) => {
      let resolveCheck!: (value: boolean) => void;
      mockWindow = createMockWindow({ isVisible: () => visible });
      const watcher = createAutoHideWatcher({ getMainWindow, defaultWindowTitleList: ['game'] });
      await markHiddenByRule(watcher);
      vi.mocked(mockWindow.hide).mockClear();
      hasAnyFocusedWindowTitleMock.mockImplementationOnce(() => new Promise<boolean>((resolve) => { resolveCheck = resolve; }));
      const pending = watcher.checkNow();
      watcher.setManualVisibility(visible);
      resolveCheck(visible);
      await pending;
      expect(mockWindow.show).not.toHaveBeenCalled();
      expect(mockWindow.hide).not.toHaveBeenCalled();
      expect(watcher.getHiddenByAutoHideProcess()).toBe(false);
    });

    it('drops a manual hide once the main window is recreated', async () => {
      const watcher = createAutoHideWatcher({ getMainWindow, defaultWindowTitleList: ['game'] });
      watcher.setManualVisibility(false);
      expect(watcher.isManuallyHidden()).toBe(true);
      mockWindow = createMockWindow();
      expect(watcher.isManuallyHidden()).toBe(false);
      hasAnyFocusedWindowTitleMock.mockResolvedValue(true);
      await watcher.checkNow();
      expect(mockWindow.hide).toHaveBeenCalledOnce();
    });

    it('does not touch a window destroyed while a native query is pending', async () => {
      let resolveCheck!: (value: boolean) => void;
      let destroyed = false;
      mockWindow = createMockWindow({ isDestroyed: () => destroyed });
      hasAnyFocusedWindowTitleMock.mockImplementationOnce(() => new Promise<boolean>((resolve) => { resolveCheck = resolve; }));
      const watcher = createAutoHideWatcher({ getMainWindow, defaultWindowTitleList: ['game'] });
      const pending = watcher.checkNow();
      destroyed = true;
      resolveCheck(true);
      await pending;
      expect(mockWindow.hide).not.toHaveBeenCalled();
    });
  });

  describe('start / stop', () => {
    it('calls checkNow immediately on start', () => {
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
      });

      watcher.start();

      expect(hasAnyFocusedWindowTitleMock).toHaveBeenCalledTimes(1);
    });

    it('polls at the configured interval', async () => {
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
        pollIntervalMs: 1000,
      });

      watcher.start();
      hasAnyFocusedWindowTitleMock.mockClear();

      await vi.advanceTimersByTimeAsync(3500);

      expect(hasAnyFocusedWindowTitleMock).toHaveBeenCalledTimes(3);
    });

    it('uses default 2500ms interval when pollIntervalMs is not provided', async () => {
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
      });

      watcher.start();
      hasAnyFocusedWindowTitleMock.mockClear();

      await vi.advanceTimersByTimeAsync(2499);
      expect(hasAnyFocusedWindowTitleMock).toHaveBeenCalledTimes(0);

      await vi.advanceTimersByTimeAsync(2);
      expect(hasAnyFocusedWindowTitleMock).toHaveBeenCalledTimes(1);
    });

    it('stops polling after stop is called', async () => {
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
        pollIntervalMs: 1000,
      });

      watcher.start();
      hasAnyFocusedWindowTitleMock.mockClear();

      watcher.stop();

      await vi.advanceTimersByTimeAsync(5000);
      expect(hasAnyFocusedWindowTitleMock).toHaveBeenCalledTimes(0);
    });

    it('restarts cleanly when start is called twice', async () => {
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
        pollIntervalMs: 1000,
      });

      watcher.start();
      watcher.start();
      hasAnyFocusedWindowTitleMock.mockClear();

      await vi.advanceTimersByTimeAsync(3000);

      expect(hasAnyFocusedWindowTitleMock).toHaveBeenCalledTimes(3);
    });

    it('stop is a no-op when not started', () => {
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
      });

      expect(() => watcher.stop()).not.toThrow();
    });

    it('start swallows checkNow errors and continues polling', async () => {
      hasAnyFocusedWindowTitleMock.mockRejectedValue(new Error('fail'));

      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
        pollIntervalMs: 1000,
      });

      expect(() => watcher.start()).not.toThrow();

      hasAnyFocusedWindowTitleMock.mockResolvedValue(false);
      await vi.advanceTimersByTimeAsync(1000);

      expect(hasAnyFocusedWindowTitleMock).toHaveBeenCalled();
    });
  });

  describe('getters and setters', () => {
    it('returns default title list from options', () => {
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['chrome.exe', 'firefox.exe'],
      });

      expect(watcher.getAutoHideWindowTitleList()).toEqual(['chrome.exe', 'firefox.exe']);
      expect(watcher.getConfiguredHideWindowTitleList()).toEqual(['chrome.exe', 'firefox.exe']);
    });

    it('setAutoHideWindowTitleList updates the active list', () => {
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['old.exe'],
      });

      watcher.setAutoHideWindowTitleList(['new.exe']);
      expect(watcher.getAutoHideWindowTitleList()).toEqual(['new.exe']);
    });

    it('setConfiguredHideWindowTitleList updates the configured list', () => {
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['old.exe'],
      });

      watcher.setConfiguredHideWindowTitleList(['configured.exe']);
      expect(watcher.getConfiguredHideWindowTitleList()).toEqual(['configured.exe']);
    });

    it('setAutoHideFullscreenWindows updates the fullscreen auto hide flag', () => {
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: [],
        defaultAutoHideFullscreenWindows: false,
      });

      expect(watcher.getAutoHideFullscreenWindows()).toBe(false);
      watcher.setAutoHideFullscreenWindows(true);
      expect(watcher.getAutoHideFullscreenWindows()).toBe(true);
    });

    it('getHiddenByAutoHideProcess defaults to false', () => {
      const watcher = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['app.exe'],
      });

      expect(watcher.getHiddenByAutoHideProcess()).toBe(false);
    });

    it('does not share state between separate instances', async () => {
      const watcherA = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['a.exe'],
      });
      const watcherB = createAutoHideWatcher({
        getMainWindow,
        defaultWindowTitleList: ['b.exe'],
      });

      watcherA.setAutoHideWindowTitleList(['changed-a.exe']);
      await markHiddenByRule(watcherA);
      expect(watcherA.getHiddenByAutoHideProcess()).toBe(true);

      expect(watcherB.getAutoHideWindowTitleList()).toEqual(['b.exe']);
      expect(watcherB.getHiddenByAutoHideProcess()).toBe(false);
    });
  });
});
