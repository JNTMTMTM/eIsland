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
 * @file index.test.ts
 * @description 主题管理工具单元测试
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const themeModeGetMock = vi.fn();
  const themeModeSetMock = vi.fn();
  const onSettingsChangedMock = vi.fn();
  const setAttributeMock = vi.fn();
  const animateMock = vi.fn();
  const startViewTransitionMock = vi.fn();
  const mqAddEventListenerMock = vi.fn();

  const darkMqMock = {
    matches: false,
    addEventListener: mqAddEventListenerMock,
  };
  const reducedMotionMqMock = { matches: false };

  return {
    themeModeGetMock,
    themeModeSetMock,
    onSettingsChangedMock,
    setAttributeMock,
    animateMock,
    startViewTransitionMock,
    mqAddEventListenerMock,
    darkMqMock,
    reducedMotionMqMock,
  };
});

describe('theme utils', () => {
  beforeEach(() => {
    vi.resetModules();

    mocks.darkMqMock.matches = false;
    mocks.reducedMotionMqMock.matches = false;
    mocks.animateMock.mockReset();
    mocks.startViewTransitionMock.mockReset();

    Object.defineProperty(globalThis, 'window', {
      value: {
        innerWidth: 1280,
        innerHeight: 720,
        matchMedia: vi.fn().mockImplementation((query: string) => (
          query.includes('prefers-reduced-motion') ? mocks.reducedMotionMqMock : mocks.darkMqMock
        )),
        api: {
          themeModeGet: mocks.themeModeGetMock,
          themeModeSet: mocks.themeModeSetMock,
          onSettingsChanged: mocks.onSettingsChangedMock,
        },
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(globalThis, 'document', {
      value: {
        documentElement: {
          setAttribute: mocks.setAttributeMock,
          animate: mocks.animateMock,
        },
      },
      configurable: true,
      writable: true,
    });
  });

  describe('getThemeMode', () => {
    it('returns dark by default before init', async () => {
      const { getThemeMode } = await import('../index');
      expect(getThemeMode()).toBe('dark');
    });
  });

  describe('initTheme', () => {
    it('reads stored mode and applies it', async () => {
      mocks.themeModeGetMock.mockResolvedValue('light');
      const { initTheme, getThemeMode } = await import('../index');
      await initTheme();
      expect(getThemeMode()).toBe('light');
      expect(mocks.setAttributeMock).toHaveBeenCalledWith('data-theme', 'light');
    });

    it('normalizes invalid stored value to dark', async () => {
      mocks.themeModeGetMock.mockResolvedValue('invalid');
      const { initTheme, getThemeMode } = await import('../index');
      await initTheme();
      expect(getThemeMode()).toBe('dark');
      expect(mocks.setAttributeMock).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('falls back to dark when api throws', async () => {
      mocks.themeModeGetMock.mockRejectedValue(new Error('fail'));
      const { initTheme, getThemeMode } = await import('../index');
      await initTheme();
      expect(getThemeMode()).toBe('dark');
      expect(mocks.setAttributeMock).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('resolves system mode to dark when media query matches', async () => {
      mocks.themeModeGetMock.mockResolvedValue('system');
      mocks.darkMqMock.matches = true;
      const { initTheme } = await import('../index');
      await initTheme();
      expect(mocks.setAttributeMock).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('resolves system mode to light when media query does not match', async () => {
      mocks.themeModeGetMock.mockResolvedValue('system');
      mocks.darkMqMock.matches = false;
      const { initTheme } = await import('../index');
      await initTheme();
      expect(mocks.setAttributeMock).toHaveBeenCalledWith('data-theme', 'light');
    });

    it('registers system theme change listener', async () => {
      mocks.themeModeGetMock.mockResolvedValue('dark');
      const { initTheme } = await import('../index');
      await initTheme();
      expect(mocks.mqAddEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('registers settings changed callback', async () => {
      mocks.themeModeGetMock.mockResolvedValue('dark');
      const { initTheme } = await import('../index');
      await initTheme();
      expect(mocks.onSettingsChangedMock).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('setThemeMode', () => {
    it('updates mode, applies visual theme, and persists', async () => {
      mocks.themeModeGetMock.mockResolvedValue('dark');
      const { initTheme, setThemeMode, getThemeMode } = await import('../index');
      await initTheme();
      mocks.setAttributeMock.mockClear();
      await setThemeMode('light');
      expect(getThemeMode()).toBe('light');
      expect(mocks.setAttributeMock).toHaveBeenCalledWith('data-theme', 'light');
      expect(mocks.themeModeSetMock).toHaveBeenCalledWith('light');
    });

    it('resolves system mode from media query', async () => {
      mocks.themeModeGetMock.mockResolvedValue('dark');
      mocks.darkMqMock.matches = true;
      const { initTheme, setThemeMode } = await import('../index');
      await initTheme();
      mocks.setAttributeMock.mockClear();
      await setThemeMode('system');
      expect(mocks.setAttributeMock).toHaveBeenCalledWith('data-theme', 'dark');
      expect(mocks.themeModeSetMock).toHaveBeenCalledWith('system');
    });

    it('reveals the new theme in a circle from the supplied origin', async () => {
      mocks.themeModeGetMock.mockResolvedValue('dark');
      mocks.startViewTransitionMock.mockImplementation((update: () => void) => {
        update();
        return { ready: Promise.resolve() };
      });
      Object.defineProperty(globalThis.document, 'startViewTransition', {
        value: mocks.startViewTransitionMock,
        configurable: true,
      });

      const { initTheme, setThemeMode } = await import('../index');
      await initTheme();
      await setThemeMode('light', { x: 100, y: 200 });
      await Promise.resolve();
      await Promise.resolve();

      expect(mocks.startViewTransitionMock).toHaveBeenCalledOnce();
      expect(mocks.animateMock).toHaveBeenCalledWith(
        {
          clipPath: [
            'circle(0px at 100px 200px)',
            expect.stringMatching(/^circle\(.+px at 100px 200px\)$/),
          ],
        },
        expect.objectContaining({
          duration: 520,
          pseudoElement: '::view-transition-new(root)',
        }),
      );
    });

    it('skips the animation when reduced motion is preferred', async () => {
      mocks.themeModeGetMock.mockResolvedValue('dark');
      mocks.reducedMotionMqMock.matches = true;
      Object.defineProperty(globalThis.document, 'startViewTransition', {
        value: mocks.startViewTransitionMock,
        configurable: true,
      });

      const { initTheme, setThemeMode } = await import('../index');
      await initTheme();
      await setThemeMode('light', { x: 100, y: 200 });

      expect(mocks.startViewTransitionMock).not.toHaveBeenCalled();
      expect(mocks.setAttributeMock).toHaveBeenCalledWith('data-theme', 'light');
    });
  });

  describe('system theme change callback', () => {
    it('re-applies visual theme when mode is system', async () => {
      mocks.themeModeGetMock.mockResolvedValue('system');
      mocks.darkMqMock.matches = false;
      const { initTheme } = await import('../index');
      await initTheme();

      const changeCallback = mocks.mqAddEventListenerMock.mock.calls[0][1];
      mocks.darkMqMock.matches = true;
      mocks.setAttributeMock.mockClear();
      changeCallback();
      expect(mocks.setAttributeMock).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('does nothing when mode is not system', async () => {
      mocks.themeModeGetMock.mockResolvedValue('dark');
      const { initTheme } = await import('../index');
      await initTheme();

      const changeCallback = mocks.mqAddEventListenerMock.mock.calls[0][1];
      mocks.setAttributeMock.mockClear();
      changeCallback();
      expect(mocks.setAttributeMock).not.toHaveBeenCalled();
    });
  });

  describe('settings changed callback', () => {
    it('updates mode on theme:mode channel', async () => {
      mocks.themeModeGetMock.mockResolvedValue('dark');
      const { initTheme, getThemeMode } = await import('../index');
      await initTheme();

      const settingsCallback = mocks.onSettingsChangedMock.mock.calls[0][0];
      mocks.setAttributeMock.mockClear();
      settingsCallback('theme:mode', 'light');
      expect(getThemeMode()).toBe('light');
      expect(mocks.setAttributeMock).toHaveBeenCalledWith('data-theme', 'light');
    });

    it('normalizes invalid value to dark', async () => {
      mocks.themeModeGetMock.mockResolvedValue('light');
      const { initTheme, getThemeMode } = await import('../index');
      await initTheme();

      const settingsCallback = mocks.onSettingsChangedMock.mock.calls[0][0];
      settingsCallback('theme:mode', 'garbage');
      expect(getThemeMode()).toBe('dark');
    });

    it('ignores other channels', async () => {
      mocks.themeModeGetMock.mockResolvedValue('light');
      const { initTheme, getThemeMode } = await import('../index');
      await initTheme();

      const settingsCallback = mocks.onSettingsChangedMock.mock.calls[0][0];
      mocks.setAttributeMock.mockClear();
      settingsCallback('other:setting', 'something');
      expect(getThemeMode()).toBe('light');
      expect(mocks.setAttributeMock).not.toHaveBeenCalled();
    });
  });
});
