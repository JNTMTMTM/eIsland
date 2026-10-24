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
 * @description 托盘菜单（自绘菜单窗口与 Linux 原生菜单）、独立模式配置、窗口切换和托盘资源生命周期测试。
 * @author 鸡哥
 */
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTray as createNativeTray, destroyTray, refreshTrayMenu, toggleTray } from '../tray';
import { createAutoHideWatcher } from '../system/autoHideWatcher';
import { setIslandAlwaysOnTop } from '../window/islandAlwaysOnTop';
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';
import type { TrayMenuAction, TrayMenuState } from '../../shared/trayMenu';

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
  standalone: vi.fn(),
  showMenu: vi.fn<(state: TrayMenuState, onAction: (action: TrayMenuAction) => void) => void>(),
  hideMenu: vi.fn(),
  destroyMenu: vi.fn(),
  preloadMenu: vi.fn(),
  onTop: true
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

// 淡入淡出过渡由 islandVisibility 单测覆盖，此处直接切换以验证显示/隐藏的调用路由。
vi.mock('../window/islandVisibility', () => ({
  isIslandShown: (window: { isVisible: () => boolean }) => window.isVisible(),
  showIsland: (window: { show: () => void }) => { window.show(); },
  hideIsland: (window: { hide: () => void }) => { window.hide(); },
}));
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
vi.mock('../window/trayMenuWindow', () => ({
  showTrayMenuWindow: mocks.showMenu,
  hideTrayMenuWindow: mocks.hideMenu,
  destroyTrayMenuWindow: mocks.destroyMenu,
  scheduleTrayMenuPreload: mocks.preloadMenu
}));

const windowMock = {
  show: vi.fn(),
  hide: vi.fn(),
  focus: vi.fn(),
  restore: vi.fn(),
  isMinimized: vi.fn(() => false),
  isDestroyed: vi.fn(() => false),
  isAlwaysOnTop: vi.fn(() => mocks.onTop),
  isVisible: vi.fn(() => true),
  setAlwaysOnTop: vi.fn((flag: boolean) => { mocks.onTop = flag; }),
  moveTop: vi.fn()
};

/** 测试中的菜单名称与托盘菜单动作的对应关系 */
const LABEL_ACTIONS: Record<string, TrayMenuAction> = {
  显示灵动岛: 'show-island',
  隐藏灵动岛: 'hide-island',
  打开配置界面: 'open-settings',
  窗口置顶: 'toggle-always-on-top',
  打开日志文件夹: 'open-log-folder',
  重启灵动岛: 'restart',
  退出: 'quit'
};

/** 创建托盘并通过右键弹出自绘菜单窗口。
 * @param window - 本次托盘操作的窗口。
 * @param options - 托盘与窗口状态的联动回调。
 * @returns 托盘实例。
 */
function createTray(window: BrowserWindow | null, options?: Parameters<typeof createNativeTray>[1]): ReturnType<typeof createNativeTray> {
  const result = createNativeTray(() => window, options);
  mocks.events.get('right-click')?.();
  return result;
}

/** 读取最近一次打开菜单时下发的状态与动作处理函数。
 * @returns 菜单状态与动作处理函数。
 */
function lastMenu(): { state: TrayMenuState; run: (action: TrayMenuAction) => void } {
  const call = mocks.showMenu.mock.lastCall;
  if (!call) throw new Error('Tray menu was not opened');
  return { state: call[0], run: call[1] };
}

/** 右键打开自绘菜单。
 * @returns 本次下发的菜单状态与动作处理函数。
 */
function openMenu(): { state: TrayMenuState; run: (action: TrayMenuAction) => void } {
  mocks.events.get('right-click')?.();
  return lastMenu();
}

/**
 * 通过自绘菜单执行指定菜单项。
 * @param label - 菜单名称。
 */
function click(label: string): void {
  const action = LABEL_ACTIONS[label];
  if (!action) throw new Error(`Missing menu ${label}`);
  openMenu().run(action);
}

/**
 * 执行 Linux 原生菜单中的指定项。
 * @param label - 菜单名称。
 */
function nativeClick(label: string): void {
  const item = mocks.entries.find((entry) => entry.label === label);
  if (!item?.click) throw new Error(`Missing native menu ${label}`);
  item.click({} as unknown as Electron.MenuItem, null as unknown as Electron.BaseWindow, {});
}

/**
 * 在 Linux 平台下执行回调，结束后恢复真实平台。
 * @param run - 待执行的回调。
 */
function onLinux(run: () => void): void {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
  Object.defineProperty(process, 'platform', { value: 'linux' });
  try {
    run();
  } finally {
    Object.defineProperty(process, 'platform', platform);
  }
}

beforeEach(() => {
  destroyTray();
  windowMock.isDestroyed.mockReturnValue(false);
  setIslandAlwaysOnTop(windowMock as unknown as BrowserWindow, true);
  vi.clearAllMocks();
  mocks.files.clear();
  mocks.events.clear();
  mocks.entries = [];
  mocks.onTop = true;
  windowMock.isDestroyed.mockReturnValue(false);
  windowMock.isVisible.mockReturnValue(true);
  windowMock.isMinimized.mockReturnValue(false);
  windowMock.show.mockReset();
  windowMock.hide.mockReset();
  mocks.focused.mockResolvedValue(false);
  mocks.locale = 'zh-CN';
});

afterEach(() => {
  destroyTray();
});

describe('系统托盘', () => {
  it('右键弹出自绘菜单并执行显示、隐藏、置顶、日志、重启与退出', async () => {
    createTray(windowMock as unknown as BrowserWindow);
    expect(mocks.icon).toHaveBeenCalledOnce();
    expect(mocks.popup).not.toHaveBeenCalled();
    expect(lastMenu().state).toEqual({ windowAvailable: true, alwaysOnTop: true, standaloneMode: false, language: 'zh-CN' });
    click('显示灵动岛');
    click('隐藏灵动岛');
    click('窗口置顶');
    expect(windowMock.show).toHaveBeenCalledOnce();
    expect(windowMock.hide).toHaveBeenCalledOnce();
    expect(windowMock.setAlwaysOnTop).toHaveBeenCalledWith(false);
    expect(openMenu().state.alwaysOnTop).toBe(false);
    click('打开日志文件夹');
    await Promise.resolve();
    expect(mocks.openPath).toHaveBeenCalledWith(join('C:/test-user', 'logs'));
    click('重启灵动岛');
    expect(mocks.relaunch).toHaveBeenCalledOnce();
    click('退出');
    expect(mocks.quit).toHaveBeenCalledTimes(2);
  });

  it.each(['standalone-window-mode', 'countdown-window-mode'])('%s独立模式显示配置动作', (key) => {
    mocks.files.set(join('C:/test-user', 'eIsland_store', `${key}.json`), '"standalone"');
    createTray(null);
    expect(lastMenu().state.standaloneMode).toBe(true);
    click('打开配置界面');
    expect(mocks.standalone).toHaveBeenCalledOnce();
  });

  it('当前模式配置覆盖旧模式，坏JSON回退旧模式配置', () => {
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'standalone-window-mode.json'), '"island"');
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'countdown-window-mode.json'), '"standalone"');
    createTray(null);
    expect(lastMenu().state.standaloneMode).toBe(false);
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'standalone-window-mode.json'), '{bad');
    expect(openMenu().state.standaloneMode).toBe(true);
  });

  it('菜单语言跟随保存的界面语言，未保存时跟随系统语言', () => {
    mocks.locale = 'ja';
    createTray(windowMock as unknown as BrowserWindow);
    expect(lastMenu().state.language).toBe('ja-JP');
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'i18n-language.json'), '"en-US"');
    expect(openMenu().state.language).toBe('en-US');
  });

  it('Linux预先设置原生菜单，文案跟随语言，状态变化后通过刷新同步', () => {
    onLinux(() => {
      mocks.locale = 'ja';
      createNativeTray(() => windowMock as unknown as BrowserWindow);
      expect(mocks.events.has('right-click')).toBe(false);
      expect(mocks.showMenu).not.toHaveBeenCalled();
      expect(mocks.preloadMenu).not.toHaveBeenCalled();
      expect(mocks.setContextMenu).toHaveBeenCalledOnce();
      expect(mocks.entries[0].label).toBe('アイランドを表示');
      mocks.files.set(join('C:/test-user', 'eIsland_store', 'i18n-language.json'), '"en-US"');
      mocks.files.set(join('C:/test-user', 'eIsland_store', 'standalone-window-mode.json'), '"standalone"');
      refreshTrayMenu();
      expect(mocks.entries.map((entry) => entry.label)).toContain('Open Settings');
      expect(mocks.entries.find((entry) => entry.label === 'Always on Top')?.checked).toBe(true);
      nativeClick('Always on Top');
      expect(windowMock.setAlwaysOnTop).toHaveBeenCalledWith(false);
      expect(mocks.setContextMenu).toHaveBeenCalledTimes(3);
      expect(mocks.entries.find((entry) => entry.label === 'Always on Top')?.checked).toBe(false);
      nativeClick('Show Island');
      nativeClick('Open Settings');
      nativeClick('Quit');
      expect(windowMock.show).toHaveBeenCalledOnce();
      expect(mocks.standalone).toHaveBeenCalledOnce();
      expect(mocks.quit).toHaveBeenCalledOnce();
    });
  });

  it('非Linux平台创建托盘时安排后台预加载菜单窗口，刷新为空操作', () => {
    createTray(windowMock as unknown as BrowserWindow);
    expect(mocks.preloadMenu).toHaveBeenCalledOnce();
    refreshTrayMenu();
    expect(mocks.setContextMenu).not.toHaveBeenCalled();
  });

  it('主窗口重建后菜单操作指向新窗口', () => {
    let current: typeof windowMock | null = null;
    createNativeTray(() => current as unknown as BrowserWindow | null);
    expect(openMenu().state.windowAvailable).toBe(false);
    current = windowMock;
    expect(openMenu().state.windowAvailable).toBe(true);
    click('显示灵动岛');
    expect(windowMock.show).toHaveBeenCalledOnce();
  });

  it('托盘左键收起菜单并在窗口可见和隐藏之间切换，销毁窗口无动作', () => {
    createTray(windowMock as unknown as BrowserWindow);
    mocks.events.get('click')?.();
    expect(mocks.hideMenu).toHaveBeenCalledOnce();
    expect(windowMock.hide).toHaveBeenCalledOnce();
    windowMock.isVisible.mockReturnValue(false);
    mocks.events.get('click')?.();
    expect(windowMock.show).toHaveBeenCalledOnce();
    windowMock.setAlwaysOnTop.mockClear();
    windowMock.isDestroyed.mockReturnValue(true);
    mocks.events.get('click')?.();
    click('窗口置顶');
    expect(windowMock.show).toHaveBeenCalledOnce();
    expect(windowMock.setAlwaysOnTop).not.toHaveBeenCalled();
  });

  it('无窗口菜单和左键安全，反复销毁幂等，toggle重建缓存窗口并释放菜单窗口', () => {
    createTray(null);
    click('显示灵动岛');
    click('隐藏灵动岛');
    click('窗口置顶');
    mocks.events.get('click')?.();
    expect(openMenu().state).toMatchObject({ windowAvailable: false, alwaysOnTop: false });
    toggleTray();
    expect(mocks.destroy).toHaveBeenCalledOnce();
    expect(mocks.destroyMenu).toHaveBeenCalledOnce();
    toggleTray();
    expect(mocks.create).toHaveBeenCalledTimes(2);
    destroyTray();
    destroyTray();
    expect(mocks.destroy).toHaveBeenCalledTimes(2);
    expect(mocks.destroyMenu).toHaveBeenCalledTimes(3);
  });

  it('右键读取最新模式和置顶状态，无需重建托盘', () => {
    createTray(windowMock as unknown as BrowserWindow);
    expect(lastMenu().state.standaloneMode).toBe(false);
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'standalone-window-mode.json'), '"standalone"');
    mocks.onTop = false;
    expect(openMenu().state).toMatchObject({ standaloneMode: true, alwaysOnTop: false });
    expect(mocks.create).toHaveBeenCalledOnce();
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'standalone-window-mode.json'), '"island"');
    expect(openMenu().state.standaloneMode).toBe(false);
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
    const { run } = lastMenu();
    windowMock.isDestroyed.mockReturnValue(true);
    expect(() => {
      run('show-island');
      run('hide-island');
      run('toggle-always-on-top');
    }).not.toThrow();
    expect(windowMock.show).not.toHaveBeenCalled();
    expect(windowMock.hide).not.toHaveBeenCalled();
    expect(openMenu().state).toMatchObject({ windowAvailable: false, alwaysOnTop: false });
  });

  it('隐藏再显示托盘保留窗口回调，重复创建不泄漏图标', () => {
    const onVisibilityChange = vi.fn();
    const onOpenSettings = vi.fn();
    mocks.files.set(join('C:/test-user', 'eIsland_store', 'standalone-window-mode.json'), '"standalone"');
    createTray(windowMock as unknown as BrowserWindow, { onVisibilityChange, onOpenSettings });
    toggleTray();
    toggleTray();
    click('显示灵动岛');
    click('打开配置界面');
    expect(onVisibilityChange).toHaveBeenCalledWith(true);
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(mocks.standalone).not.toHaveBeenCalled();
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
    click('窗口置顶');
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
    click('窗口置顶');
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
