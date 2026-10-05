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
 * @file tray.test.ts
 * @description 托盘菜单、独立模式配置、窗口切换和托盘资源生命周期测试。
 * @author 鸡哥
 */
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTray, destroyTray, toggleTray } from '../tray';
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';

const mocks = vi.hoisted(() => ({
  entries: [] as MenuItemConstructorOptions[],
  events: new Map<string, () => void>(),
  files: new Map<string, string>(),
  destroy: vi.fn(),
  create: vi.fn(),
  icon: vi.fn(() => ({
    icon: true
  })),
  quit: vi.fn(),
  relaunch: vi.fn(),
  openPath: vi.fn(() => Promise.resolve('')),
  standalone: vi.fn()
}));
/**
 * 模拟可被new调用的托盘构造器。
 * @returns 模拟托盘方法集合。
 */

function MockTray(): {
  on: (event: string, callback: () => void) => void;
  setToolTip: ReturnType<typeof vi.fn>;
  setContextMenu: ReturnType<typeof vi.fn>;
  destroy: typeof mocks.destroy;
} {
  mocks.create();
  return {
    on: (event, callback) => {
      mocks.events.set(event, callback);
    },
    setToolTip: vi.fn(),
    setContextMenu: vi.fn(),
    destroy: mocks.destroy
  };
}

vi.mock('electron', () => ({
  Tray: MockTray,
  Menu: {
    buildFromTemplate: (entries: MenuItemConstructorOptions[]) => {
      mocks.entries = entries;
      return entries;
    }
  },
  nativeImage: {
    createFromPath: mocks.icon
  },
  app: {
    getPath: () => 'C:/test-user',
    quit: mocks.quit,
    relaunch: mocks.relaunch
  },
  shell: {
    openPath: mocks.openPath
  }
}));

vi.mock('fs', () => ({
  existsSync: (path: string) => mocks.files.has(path),
  readFileSync: (path: string) => mocks.files.get(path)
}));

vi.mock('@electron-toolkit/utils', () => ({
  is: {
    dev: true
  }
}));

vi.mock('../window/standaloneWindow', () => ({
  openStandaloneWindow: mocks.standalone
}));

const windowMock = {
  show: vi.fn(),
  hide: vi.fn(),
  isDestroyed: vi.fn(() => false),
  isAlwaysOnTop: vi.fn(() => true),
  isVisible: vi.fn(() => true),
  setAlwaysOnTop: vi.fn()
};
/**
 * 执行指定托盘菜单动作。
 * @param label - 菜单名称。
 * @param checked - 复选框状态。
 * @returns 菜单动作返回值。
 */

function click(label: string, checked = false): unknown {
  const item = mocks.entries.find((entry) => entry.label === label);
  if (!item?.click) {
    throw new Error(`Missing menu ${label}`);
  }
  return item.click({
    checked
  } as unknown as Electron.MenuItem, null as unknown as Electron.BaseWindow, {});
}

beforeEach(() => {
  destroyTray();
  vi.clearAllMocks();
  mocks.files.clear();
  mocks.events.clear();
  windowMock.isDestroyed.mockReturnValue(false);
  windowMock.isVisible.mockReturnValue(true);
});

afterEach(() => {
  destroyTray();
});

describe('系统托盘', () => {
  it('创建图标和菜单并执行显示、隐藏、置顶、日志、重启与退出', async () => {
    createTray(windowMock as unknown as BrowserWindow);
    expect(mocks.icon).toHaveBeenCalledOnce();
    expect(mocks.entries.find((entry) => entry.label === '窗口置顶')?.checked).toBe(true);
    click('显示灵动岛');
    click('隐藏灵动岛');
    click('窗口置顶', false);
    expect(windowMock.show).toHaveBeenCalledOnce();
    expect(windowMock.hide).toHaveBeenCalledOnce();
    expect(windowMock.setAlwaysOnTop).toHaveBeenCalledWith(false);
    await Promise.resolve(click('打开日志文件夹'));
    expect(mocks.openPath).toHaveBeenCalledWith(join('C:/test-user', 'logs'));
    click('重启灵动岛');
    expect(mocks.relaunch).toHaveBeenCalledOnce();
    click('退出');
    expect(mocks.quit).toHaveBeenCalledTimes(2);
  });

  it.each(['standalone-window-mode', 'countdown-window-mode'])('%s独立模式显示配置动作', (key) => {
    mocks.files.set(join('C:/test-user', 'eIsland_store', `${key}.json`), '"standalone"');
    createTray(null);
    click('打开配置界面');
    expect(mocks.standalone).toHaveBeenCalledOnce();
  });

  it('当前模式配置覆盖旧模式，坏JSON按非独立模式处理', () => {
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'standalone-window-mode.json'), '{bad');
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'countdown-window-mode.json'), '"standalone"');
    createTray(null);
    expect(mocks.entries.some((entry) => entry.label === '打开配置界面')).toBe(false);
  });

  it('托盘左键在窗口可见和隐藏之间切换，销毁窗口无动作', () => {
    createTray(windowMock as unknown as BrowserWindow);
    mocks.events.get('click')?.();
    expect(windowMock.hide).toHaveBeenCalledOnce();
    windowMock.isVisible.mockReturnValue(false);
    mocks.events.get('click')?.();
    expect(windowMock.show).toHaveBeenCalledOnce();
    windowMock.isDestroyed.mockReturnValue(true);
    mocks.events.get('click')?.();
    click('窗口置顶', true);
    expect(windowMock.show).toHaveBeenCalledOnce();
    expect(windowMock.setAlwaysOnTop).not.toHaveBeenCalled();
  });

  it('无窗口菜单和左键安全，反复销毁幂等，toggle重建缓存窗口', () => {
    createTray(null);
    click('显示灵动岛');
    click('隐藏灵动岛');
    click('窗口置顶');
    mocks.events.get('click')?.();
    expect(mocks.entries.find((entry) => entry.label === '窗口置顶')?.checked).toBe(false);
    toggleTray();
    expect(mocks.destroy).toHaveBeenCalledOnce();
    toggleTray();
    expect(mocks.create).toHaveBeenCalledTimes(2);
    destroyTray();
    destroyTray();
    expect(mocks.destroy).toHaveBeenCalledTimes(2);
  });
});
