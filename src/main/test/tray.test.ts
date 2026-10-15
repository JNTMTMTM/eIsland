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
import { createTray as createNativeTray, destroyTray, refreshTrayMenu, toggleTray } from '../tray';
import { createAutoHideWatcher } from '../system/autoHideWatcher';
import { setIslandAlwaysOnTop } from '../window/islandAlwaysOnTop';
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';

const mocks = vi.hoisted(() => ({
  entries: [] as MenuItemConstructorOptions[],
  events: new Map<string, () => void>(),
  files: new Map<string, string>(),
  destroy: vi.fn(),
  create: vi.fn(),
  popup: vi.fn(),
  setContextMenu: vi.fn(),
  locale: 'zh-CN',
  focused: vi.fn(async () => false),
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
  setContextMenu: typeof mocks.setContextMenu;
  popUpContextMenu: typeof mocks.popup;
  destroy: typeof mocks.destroy;
} {
  mocks.create();
  return {
    on: (event, callback) => {
      mocks.events.set(event, callback);
    },
    setToolTip: vi.fn(),
    setContextMenu: mocks.setContextMenu,
    popUpContextMenu: mocks.popup,
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
    getLocale: () => mocks.locale,
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
vi.mock('../system/runningProcesses', () => ({ hasAnyFocusedWindowTitle: mocks.focused }));

const windowMock = {
  show: vi.fn(),
  hide: vi.fn(),
  focus: vi.fn(),
  restore: vi.fn(),
  isMinimized: vi.fn(() => false),
  isDestroyed: vi.fn(() => false),
  isAlwaysOnTop: vi.fn(() => true),
  isVisible: vi.fn(() => true),
  setAlwaysOnTop: vi.fn(),
  moveTop: vi.fn()
};

/** 创建托盘并通过右键打开真实菜单构建路径。
 * @param window - 本次托盘操作的窗口。
 * @param options - 托盘与窗口状态的联动回调。
 * @returns 托盘实例。
 */
function createTray(window: BrowserWindow | null, options?: Parameters<typeof createNativeTray>[1]): ReturnType<typeof createNativeTray> {
  const result = createNativeTray(() => window, options);
  mocks.events.get('right-click')?.();
  return result;
}
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
  windowMock.isDestroyed.mockReturnValue(false);
  setIslandAlwaysOnTop(windowMock as unknown as BrowserWindow, true);
  vi.clearAllMocks();
  mocks.files.clear();
  mocks.events.clear();
  windowMock.isDestroyed.mockReturnValue(false);
  windowMock.isVisible.mockReturnValue(true);
  windowMock.isMinimized.mockReturnValue(false);
  windowMock.isAlwaysOnTop.mockReturnValue(true);
  windowMock.show.mockReset();
  windowMock.hide.mockReset();
  mocks.focused.mockResolvedValue(false);
  mocks.locale = 'zh-CN';
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

  it('当前模式配置覆盖旧模式，坏JSON回退旧模式配置', () => {
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'standalone-window-mode.json'), '"island"');
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'countdown-window-mode.json'), '"standalone"');
    createTray(null);
    expect(mocks.entries.some((entry) => entry.label === '打开配置界面')).toBe(false);
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'standalone-window-mode.json'), '{bad');
    mocks.events.get('right-click')?.();
    expect(mocks.entries.some((entry) => entry.label === '打开配置界面')).toBe(true);
  });

  it('菜单文案跟随保存的界面语言，未保存时跟随系统语言', () => {
    mocks.locale = 'ja';
    createTray(windowMock as unknown as BrowserWindow);
    expect(mocks.entries[0].label).toBe('アイランドを表示');
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'i18n-language.json'), '"en-US"');
    mocks.events.get('right-click')?.();
    expect(mocks.entries.map((entry) => entry.label)).toContain('Always on Top');
    click('Show Island');
    expect(windowMock.show).toHaveBeenCalledOnce();
  });

  it('Linux预先设置菜单，状态变化后通过刷新同步', () => {
    const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
    Object.defineProperty(process, 'platform', { value: 'linux' });
    try {
      createNativeTray(() => windowMock as unknown as BrowserWindow);
      expect(mocks.events.has('right-click')).toBe(false);
      expect(mocks.setContextMenu).toHaveBeenCalledOnce();
      expect(mocks.entries.some((entry) => entry.label === '打开配置界面')).toBe(false);
      mocks.files.set(join('C:/test-user', 'eIsland_store', 'standalone-window-mode.json'), '"standalone"');
      refreshTrayMenu();
      expect(mocks.entries.some((entry) => entry.label === '打开配置界面')).toBe(true);
      click('窗口置顶', false);
      expect(mocks.setContextMenu).toHaveBeenCalledTimes(3);
    } finally {
      Object.defineProperty(process, 'platform', platform);
    }
  });

  it('非Linux平台刷新为空操作', () => {
    createTray(windowMock as unknown as BrowserWindow);
    refreshTrayMenu();
    expect(mocks.setContextMenu).not.toHaveBeenCalled();
  });

  it('主窗口重建后菜单操作指向新窗口', () => {
    let current: typeof windowMock | null = null;
    createNativeTray(() => current as unknown as BrowserWindow | null);
    mocks.events.get('right-click')?.();
    expect(mocks.entries[0].enabled).toBe(false);
    current = windowMock;
    mocks.events.get('right-click')?.();
    expect(mocks.entries[0].enabled).toBe(true);
    click('显示灵动岛');
    expect(windowMock.show).toHaveBeenCalledOnce();
  });

  it('托盘左键在窗口可见和隐藏之间切换，销毁窗口无动作', () => {
    createTray(windowMock as unknown as BrowserWindow);
    mocks.events.get('click')?.();
    expect(windowMock.hide).toHaveBeenCalledOnce();
    windowMock.isVisible.mockReturnValue(false);
    mocks.events.get('click')?.();
    expect(windowMock.show).toHaveBeenCalledOnce();
    windowMock.setAlwaysOnTop.mockClear();
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

  it('右键读取最新模式和置顶状态，无需重建托盘', () => {
    createTray(windowMock as unknown as BrowserWindow);
    expect(mocks.entries.some((entry) => entry.label === '打开配置界面')).toBe(false);
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'standalone-window-mode.json'), '"standalone"');
    windowMock.isAlwaysOnTop.mockReturnValue(false);
    mocks.events.get('right-click')?.();
    expect(mocks.entries.some((entry) => entry.label === '打开配置界面')).toBe(true);
    expect(mocks.entries.find((entry) => entry.label === '窗口置顶')?.checked).toBe(false);
    expect(mocks.create).toHaveBeenCalledOnce();
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'standalone-window-mode.json'), '"island"');
    mocks.events.get('right-click')?.();
    expect(mocks.entries.some((entry) => entry.label === '打开配置界面')).toBe(false);
  });

  it('显示操作恢复最小化窗口并将手动可见性同步给自动隐藏服务', () => {
    const onVisibilityChange = vi.fn();
    createTray(windowMock as unknown as BrowserWindow, { onVisibilityChange });
    windowMock.isMinimized.mockReturnValue(true);
    click('显示灵动岛');
    expect(onVisibilityChange).toHaveBeenLastCalledWith(true);
    expect(windowMock.restore).toHaveBeenCalledOnce();
    // 鼠标穿透的悬浮窗不应抢走前台应用的键盘焦点。
    expect(windowMock.focus).not.toHaveBeenCalled();
    click('隐藏灵动岛');
    expect(onVisibilityChange).toHaveBeenLastCalledWith(false);
    windowMock.isVisible.mockReturnValue(false);
    mocks.events.get('click')?.();
    expect(onVisibilityChange).toHaveBeenLastCalledWith(true);
  });

  it('窗口销毁后旧菜单动作安全，重新打开菜单禁用窗口操作', () => {
    createTray(windowMock as unknown as BrowserWindow);
    windowMock.isDestroyed.mockReturnValue(true);
    expect(() => { click('显示灵动岛'); click('隐藏灵动岛'); }).not.toThrow();
    expect(windowMock.show).not.toHaveBeenCalled();
    expect(windowMock.hide).not.toHaveBeenCalled();
    mocks.events.get('right-click')?.();
    for (const label of ['显示灵动岛', '隐藏灵动岛', '窗口置顶']) {
      expect(mocks.entries.find((entry) => entry.label === label)?.enabled).toBe(false);
    }
  });

  it('隐藏再显示托盘保留窗口回调，重复创建不泄漏图标', () => {
    const onVisibilityChange = vi.fn();
    const onOpenSettings = vi.fn();
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'standalone-window-mode.json'), '"standalone"');
    createTray(windowMock as unknown as BrowserWindow, { onVisibilityChange, onOpenSettings });
    toggleTray();
    toggleTray();
    mocks.events.get('right-click')?.();
    click('显示灵动岛');
    click('打开配置界面');
    expect(onVisibilityChange).toHaveBeenCalledWith(true);
    expect(onOpenSettings).toHaveBeenCalledOnce();
    createTray(windowMock as unknown as BrowserWindow);
    expect(mocks.destroy).toHaveBeenCalledTimes(2);
  });

  it('自动隐藏期间手动显示保持可见，手动隐藏后不会被规则恢复反向显示', async () => {
    let visible = true;
    windowMock.isVisible.mockImplementation(() => visible);
    windowMock.show.mockImplementation(() => { visible = true; });
    windowMock.hide.mockImplementation(() => { visible = false; });
    const watcher = createAutoHideWatcher({
      getMainWindow: () => windowMock as unknown as BrowserWindow,
      defaultWindowTitleList: ['game'],
    });
    createTray(windowMock as unknown as BrowserWindow, { onVisibilityChange: watcher.setManualVisibility });
    mocks.focused.mockResolvedValue(true);
    await watcher.checkNow();
    expect(visible).toBe(false);
    click('显示灵动岛');
    await watcher.checkNow();
    expect(visible).toBe(true);
    click('隐藏灵动岛');
    mocks.focused.mockResolvedValue(false);
    await watcher.checkNow();
    expect(visible).toBe(false);
  });

  it('取消置顶后，托盘显示和自动隐藏恢复均保留选择，并可重新开启', async () => {
    const onAlwaysOnTopChange = vi.fn();
    createTray(windowMock as unknown as BrowserWindow, { onAlwaysOnTopChange });
    click('窗口置顶', false);
    windowMock.setAlwaysOnTop.mockClear();
    click('显示灵动岛');
    expect(windowMock.setAlwaysOnTop).toHaveBeenLastCalledWith(false);
    windowMock.isVisible.mockReturnValue(false);
    const watcher = createAutoHideWatcher({
      getMainWindow: () => windowMock as unknown as BrowserWindow,
      defaultWindowTitleList: [],
    });
    mocks.focused.mockResolvedValueOnce(true);
    await watcher.checkNow();
    await watcher.checkNow();
    expect(windowMock.setAlwaysOnTop).toHaveBeenLastCalledWith(false);
    click('窗口置顶', true);
    expect(windowMock.setAlwaysOnTop).toHaveBeenLastCalledWith(true, 'screen-saver');
    expect(onAlwaysOnTopChange).toHaveBeenCalledTimes(2);
  });

  it('日志目录打开失败不会产生未处理拒绝，退出入口仍可使用', async () => {
    createTray(null);
    const error = new Error('shell unavailable');
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.openPath.mockRejectedValueOnce(error);
    click('打开日志文件夹');
    await Promise.resolve();
    expect(report).toHaveBeenCalledWith('[Tray] Failed to open log directory:', error);
    click('退出');
    expect(mocks.quit).toHaveBeenCalledOnce();
  });
});
