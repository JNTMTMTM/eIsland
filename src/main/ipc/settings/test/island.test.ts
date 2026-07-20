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
 * @file island.test.ts
 * @description 灵动岛 IPC 处理模块单元测试
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  handleMock,
  existsSyncMock,
  readFileSyncMock,
  writeFileSyncMock,
  broadcastSettingChangeMock,
  setLoginItemSettingsMock,
} = vi.hoisted(() => ({
  handleMock: vi.fn(),
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
  broadcastSettingChangeMock: vi.fn(),
  setLoginItemSettingsMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
  },
  app: {
    setLoginItemSettings: setLoginItemSettingsMock,
  },
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
  writeFileSync: writeFileSyncMock,
}));

vi.mock('../../../utils/broadcast', () => ({
  broadcastSettingChange: broadcastSettingChangeMock,
}));

import { registerIslandIpcHandlers } from '../island';

describe('registerIslandIpcHandlers', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

  const defaultOptions = {
    storeDir: 'C:/store',
    islandOpacityStoreKey: 'island-opacity',
    expandMouseleaveIdleStoreKey: 'expand-mouseleave-idle',
    maxExpandMouseleaveIdleStoreKey: 'maxexpand-mouseleave-idle',
    idleClickExpandStoreKey: 'idle-click-expand',
    autostartModeStoreKey: 'autostart-mode',
    navOrderStoreKey: 'nav-order',
  };

  beforeEach(() => {
    handlers.clear();
    handleMock.mockReset();
    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
    writeFileSyncMock.mockReset();
    broadcastSettingChangeMock.mockReset();
    setLoginItemSettingsMock.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    });

    registerIslandIpcHandlers(defaultOptions);
  });

  function getHandler(channel: string) {
    const h = handlers.get(channel);
    expect(h).toBeTypeOf('function');
    return h!;
  }

  const event = { sender: { id: 42 } };

  // ── Registration ──

  it('registers all expected IPC handlers', () => {
    const expected = [
      'island:opacity:get',
      'island:opacity:set',
      'island:expand-mouseleave-idle:get',
      'island:expand-mouseleave-idle:set',
      'island:maxexpand-mouseleave-idle:get',
      'island:maxexpand-mouseleave-idle:set',
      'island:idle-click-expand:get',
      'island:idle-click-expand:set',
      'island:spring-animation:get',
      'island:spring-animation:set',
      'island:animation-speed:get',
      'island:animation-speed:set',
      'island:shape-mode:get',
      'island:shape-mode:set',
      'island:autostart:get',
      'island:autostart:set',
      'island:nav-order:get',
      'island:nav-order:set',
    ];
    expect(handleMock).toHaveBeenCalledTimes(expected.length);
    expected.forEach((ch) => {
      expect(handlers.has(ch)).toBe(true);
    });
  });

  // ── Opacity ──

  describe('opacity', () => {
    it('get returns 100 when file is missing', () => {
      existsSyncMock.mockReturnValue(false);
      expect(getHandler('island:opacity:get')()).toBe(100);
    });

    it('get clamps value below 10 to 10', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify(5));
      expect(getHandler('island:opacity:get')()).toBe(10);
    });

    it('get clamps value above 100 to 100', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify(150));
      expect(getHandler('island:opacity:get')()).toBe(100);
    });

    it('get rounds fractional opacity', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify(75.6));
      expect(getHandler('island:opacity:get')()).toBe(76);
    });

    it('get accepts valid opacity in range', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify(50));
      expect(getHandler('island:opacity:get')()).toBe(50);
    });

    it('get returns 100 for non-number persisted value', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify('opaque'));
      expect(getHandler('island:opacity:get')()).toBe(100);
    });

    it('get returns 100 on read error', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockImplementation(() => {
        throw new Error('read failed');
      });
      expect(getHandler('island:opacity:get')()).toBe(100);
    });

    it('set clamps opacity to [10, 100] and broadcasts', () => {
      const result = getHandler('island:opacity:set')(event, 5);
      expect(result).toBe(true);
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('island-opacity.json'),
        JSON.stringify(10, null, 2),
        'utf-8',
      );
      expect(broadcastSettingChangeMock).toHaveBeenCalledWith(42, 'island:opacity', 10);
    });

    it('set clamps high values to 100', () => {
      getHandler('island:opacity:set')(event, 200);
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('island-opacity.json'),
        JSON.stringify(100, null, 2),
        'utf-8',
      );
    });

    it('set returns false when write throws', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      writeFileSyncMock.mockImplementation(() => {
        throw new Error('disk full');
      });
      expect(getHandler('island:opacity:set')(event, 50)).toBe(false);
      spy.mockRestore();
    });
  });

  // ── Boolean toggles (expand-mouseleave-idle, maxexpand, idle-click, spring-animation) ──

  describe('expand-mouseleave-idle', () => {
    it('get returns false when file is missing', () => {
      existsSyncMock.mockReturnValue(false);
      expect(getHandler('island:expand-mouseleave-idle:get')()).toBe(false);
    });

    it('get returns persisted boolean', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify(true));
      expect(getHandler('island:expand-mouseleave-idle:get')()).toBe(true);
    });

    it('get returns false for non-boolean persisted value', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify('yes'));
      expect(getHandler('island:expand-mouseleave-idle:get')()).toBe(false);
    });

    it('set persists and broadcasts', () => {
      expect(getHandler('island:expand-mouseleave-idle:set')(event, true)).toBe(true);
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('expand-mouseleave-idle.json'),
        JSON.stringify(true, null, 2),
        'utf-8',
      );
      expect(broadcastSettingChangeMock).toHaveBeenCalledWith(42, 'island:expand-mouseleave-idle', true);
    });
  });

  describe('maxexpand-mouseleave-idle', () => {
    it('get returns false when file is missing', () => {
      existsSyncMock.mockReturnValue(false);
      expect(getHandler('island:maxexpand-mouseleave-idle:get')()).toBe(false);
    });

    it('get returns persisted boolean', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify(true));
      expect(getHandler('island:maxexpand-mouseleave-idle:get')()).toBe(true);
    });

    it('set persists and broadcasts', () => {
      expect(getHandler('island:maxexpand-mouseleave-idle:set')(event, false)).toBe(true);
      expect(broadcastSettingChangeMock).toHaveBeenCalledWith(42, 'island:maxexpand-mouseleave-idle', false);
    });
  });

  describe('idle-click-expand', () => {
    it('get returns false when file is missing', () => {
      existsSyncMock.mockReturnValue(false);
      expect(getHandler('island:idle-click-expand:get')()).toBe(false);
    });

    it('get returns persisted boolean', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify(true));
      expect(getHandler('island:idle-click-expand:get')()).toBe(true);
    });

    it('set persists and broadcasts', () => {
      expect(getHandler('island:idle-click-expand:set')(event, true)).toBe(true);
      expect(broadcastSettingChangeMock).toHaveBeenCalledWith(42, 'island:idle-click-expand', true);
    });
  });

  describe('spring-animation', () => {
    it('get returns true when file is missing (default on)', () => {
      existsSyncMock.mockReturnValue(false);
      expect(getHandler('island:spring-animation:get')()).toBe(true);
    });

    it('get returns persisted boolean', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify(false));
      expect(getHandler('island:spring-animation:get')()).toBe(false);
    });

    it('get returns true for non-boolean persisted value', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify(1));
      expect(getHandler('island:spring-animation:get')()).toBe(true);
    });

    it('set persists and broadcasts', () => {
      expect(getHandler('island:spring-animation:set')(event, false)).toBe(true);
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('spring-animation.json'),
        JSON.stringify(false, null, 2),
        'utf-8',
      );
      expect(broadcastSettingChangeMock).toHaveBeenCalledWith(42, 'island:spring-animation', false);
    });
  });

  // ── Animation speed ──

  describe('animation-speed', () => {
    it('get returns medium when file is missing', () => {
      existsSyncMock.mockReturnValue(false);
      expect(getHandler('island:animation-speed:get')()).toBe('medium');
    });

    it('get returns valid persisted value', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify('slow'));
      expect(getHandler('island:animation-speed:get')()).toBe('slow');
    });

    it('get falls back to medium for invalid persisted value', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify('turbo'));
      expect(getHandler('island:animation-speed:get')()).toBe('medium');
    });

    it('get accepts fast', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify('fast'));
      expect(getHandler('island:animation-speed:get')()).toBe('fast');
    });

    it('get returns medium on read error', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockImplementation(() => {
        throw new Error('read failed');
      });
      expect(getHandler('island:animation-speed:get')()).toBe('medium');
    });

    it('set accepts valid speed and broadcasts', () => {
      expect(getHandler('island:animation-speed:set')(event, 'fast')).toBe(true);
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('animation-speed.json'),
        JSON.stringify('fast', null, 2),
        'utf-8',
      );
      expect(broadcastSettingChangeMock).toHaveBeenCalledWith(42, 'island:animation-speed', 'fast');
    });

    it('set normalizes invalid speed to medium', () => {
      getHandler('island:animation-speed:set')(event, 'turbo');
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('animation-speed.json'),
        JSON.stringify('medium', null, 2),
        'utf-8',
      );
      expect(broadcastSettingChangeMock).toHaveBeenCalledWith(42, 'island:animation-speed', 'medium');
    });

    it('set returns false when write throws', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      writeFileSyncMock.mockImplementation(() => {
        throw new Error('write failed');
      });
      expect(getHandler('island:animation-speed:set')(event, 'slow')).toBe(false);
      spy.mockRestore();
    });
  });

  // ── Autostart mode ──

  describe('autostart', () => {
    it('get returns disabled when file is missing', () => {
      existsSyncMock.mockReturnValue(false);
      expect(getHandler('island:autostart:get')()).toBe('disabled');
    });

    it('get returns valid persisted value', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify('enabled'));
      expect(getHandler('island:autostart:get')()).toBe('enabled');
    });

    it('get accepts high-priority', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify('high-priority'));
      expect(getHandler('island:autostart:get')()).toBe('high-priority');
    });

    it('get falls back to disabled for invalid persisted value', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify('always'));
      expect(getHandler('island:autostart:get')()).toBe('disabled');
    });

    it('get returns disabled on read error', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockImplementation(() => {
        throw new Error('read failed');
      });
      expect(getHandler('island:autostart:get')()).toBe('disabled');
    });

    it('set enabled configures login item without args', () => {
      expect(getHandler('island:autostart:set')(event, 'enabled')).toBe(true);
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('autostart-mode.json'),
        JSON.stringify('enabled', null, 2),
        'utf-8',
      );
      expect(setLoginItemSettingsMock).toHaveBeenCalledWith({
        openAtLogin: true,
        args: [],
      });
      expect(broadcastSettingChangeMock).toHaveBeenCalledWith(42, 'island:autostart', 'enabled');
    });

    it('set high-priority configures login item with --high-priority arg', () => {
      getHandler('island:autostart:set')(event, 'high-priority');
      expect(setLoginItemSettingsMock).toHaveBeenCalledWith({
        openAtLogin: true,
        args: ['--high-priority'],
      });
    });

    it('set disabled disables login item', () => {
      getHandler('island:autostart:set')(event, 'disabled');
      expect(setLoginItemSettingsMock).toHaveBeenCalledWith({ openAtLogin: false });
    });

    it('set normalizes invalid mode to disabled', () => {
      getHandler('island:autostart:set')(event, 'always');
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('autostart-mode.json'),
        JSON.stringify('disabled', null, 2),
        'utf-8',
      );
      expect(setLoginItemSettingsMock).toHaveBeenCalledWith({ openAtLogin: false });
    });

    it('set returns false when write throws', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      writeFileSyncMock.mockImplementation(() => {
        throw new Error('write failed');
      });
      expect(getHandler('island:autostart:set')(event, 'enabled')).toBe(false);
      spy.mockRestore();
    });
  });

  // ── Nav order ──

  describe('nav-order', () => {
    it('get returns empty orders when file is missing', () => {
      existsSyncMock.mockReturnValue(false);
      expect(getHandler('island:nav-order:get')()).toEqual({
        visibleOrder: [],
        hiddenOrder: [],
      });
    });

    it('get returns empty orders on read error', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockImplementation(() => {
        throw new Error('read failed');
      });
      expect(getHandler('island:nav-order:get')()).toEqual({
        visibleOrder: [],
        hiddenOrder: [],
      });
    });

    it('get migrates legacy array format to visibleOrder', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify(['a', 'b', 42, 'c']));
      expect(getHandler('island:nav-order:get')()).toEqual({
        visibleOrder: ['a', 'b', 'c'],
        hiddenOrder: [],
      });
    });

    it('get returns object format with filtered string arrays', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(
        JSON.stringify({
          visibleOrder: ['tab1', 'tab2', 123],
          hiddenOrder: ['tab3', true],
        }),
      );
      expect(getHandler('island:nav-order:get')()).toEqual({
        visibleOrder: ['tab1', 'tab2'],
        hiddenOrder: ['tab3'],
      });
    });

    it('get handles missing arrays in object gracefully', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify({}));
      expect(getHandler('island:nav-order:get')()).toEqual({
        visibleOrder: [],
        hiddenOrder: [],
      });
    });

    it('set writes sanitized payload and returns true', () => {
      const payload = {
        visibleOrder: ['a', 123, 'b'],
        hiddenOrder: ['c', null],
      };
      expect(getHandler('island:nav-order:set')(event, payload)).toBe(true);
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('nav-order.json'),
        JSON.stringify({ visibleOrder: ['a', 'b'], hiddenOrder: ['c'] }, null, 2),
        'utf-8',
      );
    });

    it('set handles missing arrays in payload', () => {
      expect(getHandler('island:nav-order:set')(event, {})).toBe(true);
      expect(writeFileSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('nav-order.json'),
        JSON.stringify({ visibleOrder: [], hiddenOrder: [] }, null, 2),
        'utf-8',
      );
    });

    it('set returns false when write throws', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      writeFileSyncMock.mockImplementation(() => {
        throw new Error('write failed');
      });
      expect(getHandler('island:nav-order:set')(event, { visibleOrder: ['a'] })).toBe(false);
      spy.mockRestore();
    });
  });
});
