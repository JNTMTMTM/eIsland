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
 * @file index.ts
 * @description Electron 主进程入口，负责任务栏窗口创建、透明窗口配置及系统级交互
 * @author 鸡哥
 */

import { app, BrowserWindow, globalShortcut } from 'electron';
import { join } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import { autoUpdater } from 'electron-updater';
import { createTray, destroyTray, toggleTray } from './tray';
import { createSessionMainLogger } from './log/mainLog';
import { startClipboardUrlWatcher, stopClipboardUrlWatcher } from './clipboard/urlWatcher';
import { createClipboardUrlState } from './clipboard/clipboardUrlState';
import { registerClipboardIpcHandlers } from './ipc/clipboard';
import { registerCaptureIpcHandlers } from './ipc/capture';
import { registerScreenshotHotkeyIpcHandlers } from './ipc/screenshotHotkey';
import { registerAppIpcHandlers } from './ipc/app';
import { registerSystemIpcHandlers } from './ipc/system';
import { registerUpdaterIpcHandlers } from './ipc/updater';
import { registerWallpaperIpcHandlers } from './ipc/wallpaper';
import { registerNetIpcHandlers } from './ipc/net';
import { registerStoreIpcHandlers } from './ipc/store';
import { registerLogIpcHandlers } from './ipc/log';
import { registerMusicIpcHandlers } from './ipc/music';
import { registerHotkeyIpcHandlers } from './ipc/hotkey';
import { registerIslandIpcHandlers } from './ipc/island';
import { registerHideProcessIpcHandlers } from './ipc/hideProcess';
import { registerThemeIpcHandlers } from './ipc/theme';
import { registerWindowIpcHandlers } from './ipc/window';
import { registerMediaIpcHandlers } from './ipc/media';
import { broadcastSettingChange, registerSettingsPreviewHandler } from './utils/broadcast';
import { registerAppLifecycleHandlers } from './services/appLifecycle';
import { applyChromiumPerformanceFlags } from './services/chromiumFlags';
import { createHotkeyService } from './services/hotkeyService';
import { initUpdaterService } from './services/updaterService';
import { createCaptureWindowService } from './window/captureWindow';
import { createMainWindowService } from './window/mainWindow';
import { openStandaloneWindow } from './window/standaloneWindow';
import { createSmtcService } from './music/smtcService';
import { createAutoHideWatcher } from './system/autoHideWatcher';
import { sendMediaVirtualKey } from './system/mediaKey';
import {
  queryFocusedWindow,
  queryOpenWindowsWithIcons,
  queryRunningNonSystemProcessNames,
  queryRunningNonSystemProcessesWithIcons,
  sanitizeProcessNameList,
} from './system/runningProcesses';
import {
  ISLAND_WIDTH, ISLAND_HEIGHT,
  EXPANDED_WIDTH, EXPANDED_HEIGHT,
  NOTIFICATION_WIDTH, NOTIFICATION_HEIGHT,
  LYRICS_WIDTH, LYRICS_HEIGHT,
  EXPANDED_FULL_WIDTH, EXPANDED_FULL_HEIGHT,
  SETTINGS_WIDTH, SETTINGS_HEIGHT,
  SMTC_UNSUBSCRIBE_NEVER, DEFAULT_SMTC_UNSUBSCRIBE_MS,
  SMTC_RUNTIME_CLEANUP_INTERVAL_MS,
  DEFAULT_WHITELIST, DEFAULT_HIDE_PROCESS_LIST,
  DEFAULT_CLIPBOARD_URL_DETECT_MODE,
  DEFAULT_ISLAND_POSITION_OFFSET,
  WHITELIST_STORE_KEY, LYRICS_SOURCE_STORE_KEY,
  LYRICS_KARAOKE_STORE_KEY, LYRICS_CLOCK_STORE_KEY,
  SMTC_UNSUBSCRIBE_MS_STORE_KEY, HIDE_PROCESS_LIST_STORE_KEY,
  THEME_MODE_STORE_KEY, ISLAND_OPACITY_STORE_KEY,
  EXPAND_MOUSELEAVE_IDLE_STORE_KEY, MAXEXPAND_MOUSELEAVE_IDLE_STORE_KEY,
  CLIPBOARD_URL_MONITOR_ENABLED_STORE_KEY,
  CLIPBOARD_URL_DETECT_MODE_STORE_KEY, CLIPBOARD_URL_BLACKLIST_STORE_KEY,
  AUTOSTART_MODE_STORE_KEY, NAV_ORDER_STORE_KEY,
  HOTKEY_STORE_KEY, QUIT_HOTKEY_STORE_KEY,
  SCREENSHOT_HOTKEY_STORE_KEY, NEXT_SONG_HOTKEY_STORE_KEY,
  PLAY_PAUSE_SONG_HOTKEY_STORE_KEY, RESET_POSITION_HOTKEY_STORE_KEY,
  TOGGLE_TRAY_HOTKEY_STORE_KEY, SHOW_SETTINGS_WINDOW_HOTKEY_STORE_KEY,
  sanitizeIslandPositionOffset, sanitizeSmtcUnsubscribeMs,
  readHotkeyConfig, readQuitHotkeyConfig, readScreenshotHotkeyConfig,
  readNextSongHotkeyConfig, readPlayPauseSongHotkeyConfig, readResetPositionHotkeyConfig,
  readToggleTrayHotkeyConfig, readShowSettingsWindowHotkeyConfig,
  readWhitelistConfig, readLyricsSourceConfig, readSmtcUnsubscribeMsConfig,
  readHideProcessListConfig, readIslandPositionOffsetConfig, writeIslandPositionOffsetConfig,
  readClipboardUrlMonitorEnabledConfig, readClipboardUrlDetectModeConfig, readClipboardUrlBlacklistConfig,
} from './config/storeConfig';
import type { IslandPositionOffset } from './config/storeConfig';

/** 防止 Electron 创建多个实例 */
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
const captureWindowService = createCaptureWindowService({
  getMainWindow: () => mainWindow,
});

/** 运行时白名单（可被用户修改） */
let nowPlayingWhitelist: string[] = [...DEFAULT_WHITELIST];

/** 运行时灵动岛位置偏移 */
let islandPositionOffset: IslandPositionOffset = { ...DEFAULT_ISLAND_POSITION_OFFSET };

const mainWindowService = createMainWindowService({
  getMainWindow: () => mainWindow,
  setMainWindow: (window) => {
    mainWindow = window;
  },
  getIslandPositionOffset: () => islandPositionOffset,
  setIslandPositionOffset: (offset) => {
    islandPositionOffset = offset;
  },
  sanitizeIslandPositionOffset,
  sizes: {
    islandWidth: ISLAND_WIDTH,
    islandHeight: ISLAND_HEIGHT,
  },
});

const autoHideWatcher = createAutoHideWatcher({
  getMainWindow: () => mainWindow,
  defaultWindowTitleList: DEFAULT_HIDE_PROCESS_LIST,
});

/** SMTC 自动取消订阅时间（毫秒），0 为永不取消 */
let smtcUnsubscribeMs = DEFAULT_SMTC_UNSUBSCRIBE_MS;

const smtcService = createSmtcService({
  getMainWindow: () => mainWindow,
  getWhitelist: () => nowPlayingWhitelist,
  getSmtcUnsubscribeMs: () => smtcUnsubscribeMs,
  unsubscribeNeverValue: SMTC_UNSUBSCRIBE_NEVER,
  cleanupIntervalMs: SMTC_RUNTIME_CLEANUP_INTERVAL_MS,
});

const hotkeyService = createHotkeyService({
  getMainWindow: () => mainWindow,
  setHiddenByAutoHideProcess: autoHideWatcher.setHiddenByAutoHideProcess,
  readHideHotkeyConfig: readHotkeyConfig,
  readQuitHotkeyConfig,
  readScreenshotHotkeyConfig,
  readNextSongHotkeyConfig,
  readPlayPauseSongHotkeyConfig,
  readResetPositionHotkeyConfig,
  readToggleTrayHotkeyConfig,
  readShowSettingsWindowHotkeyConfig,
  onScreenshotHotkey: () => {
    captureWindowService.startRegionScreenshot().catch((err) => {
      console.error('[Screenshot] hotkey trigger error:', err);
    });
  },
  onNextSongHotkey: () => {
    if (!smtcService.isWhitelisted()) return;
    sendMediaVirtualKey(0xB0);
  },
  onPlayPauseSongHotkey: () => {
    sendMediaVirtualKey(0xB3);
  },
  onResetPositionHotkey: () => {
    mainWindowService.applyIslandPositionOffset(DEFAULT_ISLAND_POSITION_OFFSET);
    writeIslandPositionOffsetConfig(DEFAULT_ISLAND_POSITION_OFFSET);
  },
  onToggleTrayHotkey: () => {
    toggleTray();
  },
  onShowSettingsWindowHotkey: () => {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const readMode = (key: string): string | null => {
      try {
        const filePath = join(storeDir, `${key}.json`);
        if (!existsSync(filePath)) return null;
        const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
        return typeof parsed === 'string' ? parsed : null;
      } catch {
        return null;
      }
    };
    const mode = readMode('standalone-window-mode') ?? readMode('countdown-window-mode');
    if (mode !== 'standalone') return;

    if (!existsSync(storeDir)) {
      mkdirSync(storeDir, { recursive: true });
    }
    try {
      writeFileSync(join(storeDir, 'standalone-window-active-tab.json'), JSON.stringify('settings', null, 2), 'utf-8');
    } catch {
      // ignore
    }

    openStandaloneWindow();
    broadcastSettingChange(-1, 'store:standalone-window-active-tab', 'settings');
  },
});

/** 注册 IPC 处理器 */
function registerIpcHandlers(): void {
  registerWindowIpcHandlers({
    getMainWindow: () => mainWindow,
    getInitialCenterX: mainWindowService.getInitialCenterX,
    setHiddenByAutoHideProcess: autoHideWatcher.setHiddenByAutoHideProcess,
    getIslandPositionOffset: () => islandPositionOffset,
    sanitizeIslandPositionOffset,
    applyIslandPositionOffset: mainWindowService.applyIslandPositionOffset,
    writeIslandPositionOffsetConfig,
    sizes: {
      expandedWidth: EXPANDED_WIDTH,
      expandedHeight: EXPANDED_HEIGHT,
      notificationWidth: NOTIFICATION_WIDTH,
      notificationHeight: NOTIFICATION_HEIGHT,
      lyricsWidth: LYRICS_WIDTH,
      lyricsHeight: LYRICS_HEIGHT,
      expandedFullWidth: EXPANDED_FULL_WIDTH,
      expandedFullHeight: EXPANDED_FULL_HEIGHT,
      settingsWidth: SETTINGS_WIDTH,
      settingsHeight: SETTINGS_HEIGHT,
      islandWidth: ISLAND_WIDTH,
      islandHeight: ISLAND_HEIGHT,
    },
  });

  registerMediaIpcHandlers({
    getMainWindow: () => mainWindow,
    sendMediaVirtualKey,
    isWhitelisted: smtcService.isWhitelisted,
    getPendingSourceSwitchId: smtcService.getPendingSourceSwitchId,
    setPendingSourceSwitchId: smtcService.setPendingSourceSwitchId,
    getPendingSourceSwitchEntry: smtcService.getPendingSourceSwitchEntry,
    clearPendingSourceSwitchEntry: smtcService.clearPendingSourceSwitchEntry,
    getCurrentDeviceId: smtcService.getCurrentDeviceId,
    setCurrentDeviceId: smtcService.setCurrentDeviceId,
    getSmtcSessionRuntime: smtcService.getSmtcSessionRuntime,
  });

  const writeMainLog = createSessionMainLogger();

  registerNetIpcHandlers({ writeMainLog });

  // ===== 文件存储 IPC =====
  const storeDir = join(app.getPath('userData'), 'eIsland_store');
  if (!existsSync(storeDir)) {
    mkdirSync(storeDir, { recursive: true });
  }

  registerClipboardIpcHandlers({
    storeDir,
    monitorEnabledStoreKey: CLIPBOARD_URL_MONITOR_ENABLED_STORE_KEY,
    detectModeStoreKey: CLIPBOARD_URL_DETECT_MODE_STORE_KEY,
    blacklistStoreKey: CLIPBOARD_URL_BLACKLIST_STORE_KEY,
    defaultDetectMode: DEFAULT_CLIPBOARD_URL_DETECT_MODE,
    getMonitorEnabled: clipboardUrlState.getMonitorEnabled,
    setMonitorEnabled: clipboardUrlState.setMonitorEnabled,
    getDetectMode: clipboardUrlState.getDetectMode,
    setDetectMode: clipboardUrlState.setDetectMode,
    getBlacklist: clipboardUrlState.getBlacklist,
    setBlacklist: clipboardUrlState.setBlacklist,
    startWatcher: () => {
      startClipboardUrlWatcher({
        getWindow: () => mainWindow,
        getEnabled: clipboardUrlState.getMonitorEnabled,
        getDetectMode: clipboardUrlState.getDetectMode,
        getBlacklist: clipboardUrlState.getBlacklist,
      });
    },
    stopWatcher: () => {
      stopClipboardUrlWatcher();
    },
  });

  registerStoreIpcHandlers({ storeDir });
  registerSettingsPreviewHandler();

  registerLogIpcHandlers({ writeMainLog });

  registerMusicIpcHandlers({
    storeDir,
    whitelistStoreKey: WHITELIST_STORE_KEY,
    lyricsSourceStoreKey: LYRICS_SOURCE_STORE_KEY,
    lyricsKaraokeStoreKey: LYRICS_KARAOKE_STORE_KEY,
    lyricsClockStoreKey: LYRICS_CLOCK_STORE_KEY,
    smtcUnsubscribeStoreKey: SMTC_UNSUBSCRIBE_MS_STORE_KEY,
    defaultLyricsKaraoke: false,
    defaultLyricsClock: true,
    getWhitelist: () => nowPlayingWhitelist,
    setWhitelist: (list) => {
      nowPlayingWhitelist = list;
    },
    readLyricsSourceConfig,
    getSmtcUnsubscribeMs: () => smtcUnsubscribeMs,
    setSmtcUnsubscribeMs: (value) => {
      smtcUnsubscribeMs = value;
    },
    sanitizeSmtcUnsubscribeMs,
    detectAllSources: smtcService.detectAllSources,
  });

  // ===== 歌曲设置 IPC =====

  registerThemeIpcHandlers({
    storeDir,
    themeModeStoreKey: THEME_MODE_STORE_KEY,
  });

  registerIslandIpcHandlers({
    storeDir,
    islandOpacityStoreKey: ISLAND_OPACITY_STORE_KEY,
    expandMouseleaveIdleStoreKey: EXPAND_MOUSELEAVE_IDLE_STORE_KEY,
    maxExpandMouseleaveIdleStoreKey: MAXEXPAND_MOUSELEAVE_IDLE_STORE_KEY,
    autostartModeStoreKey: AUTOSTART_MODE_STORE_KEY,
    navOrderStoreKey: NAV_ORDER_STORE_KEY,
  });

  registerHideProcessIpcHandlers({
    storeDir,
    hideProcessListStoreKey: HIDE_PROCESS_LIST_STORE_KEY,
    getConfiguredHideProcessList: autoHideWatcher.getConfiguredHideWindowTitleList,
    setConfiguredHideProcessList: autoHideWatcher.setConfiguredHideWindowTitleList,
    setAutoHideProcessList: autoHideWatcher.setAutoHideWindowTitleList,
    sanitizeProcessNameList,
    checkAutoHideProcessList: autoHideWatcher.checkNow,
  });

  registerHotkeyIpcHandlers({
    storeDir,
    hideHotkeyStoreKey: HOTKEY_STORE_KEY,
    quitHotkeyStoreKey: QUIT_HOTKEY_STORE_KEY,
    nextSongHotkeyStoreKey: NEXT_SONG_HOTKEY_STORE_KEY,
    playPauseSongHotkeyStoreKey: PLAY_PAUSE_SONG_HOTKEY_STORE_KEY,
    resetPositionHotkeyStoreKey: RESET_POSITION_HOTKEY_STORE_KEY,
    toggleTrayHotkeyStoreKey: TOGGLE_TRAY_HOTKEY_STORE_KEY,
    showSettingsWindowHotkeyStoreKey: SHOW_SETTINGS_WINDOW_HOTKEY_STORE_KEY,
    getCurrentHideHotkey: hotkeyService.getCurrentHideHotkey,
    getCurrentQuitHotkey: hotkeyService.getCurrentQuitHotkey,
    getCurrentScreenshotHotkey: hotkeyService.getCurrentScreenshotHotkey,
    getCurrentNextSongHotkey: hotkeyService.getCurrentNextSongHotkey,
    getCurrentPlayPauseSongHotkey: hotkeyService.getCurrentPlayPauseSongHotkey,
    getCurrentResetPositionHotkey: hotkeyService.getCurrentResetPositionHotkey,
    getCurrentToggleTrayHotkey: hotkeyService.getCurrentToggleTrayHotkey,
    getCurrentShowSettingsWindowHotkey: hotkeyService.getCurrentShowSettingsWindowHotkey,
    readHideHotkeyConfig: readHotkeyConfig,
    readQuitHotkeyConfig,
    readScreenshotHotkeyConfig,
    readNextSongHotkeyConfig,
    readPlayPauseSongHotkeyConfig,
    readResetPositionHotkeyConfig,
    readToggleTrayHotkeyConfig,
    readShowSettingsWindowHotkeyConfig,
    registerHideHotkey: hotkeyService.registerHideHotkey,
    registerQuitHotkey: hotkeyService.registerQuitHotkey,
    registerNextSongHotkey: hotkeyService.registerNextSongHotkey,
    registerPlayPauseSongHotkey: hotkeyService.registerPlayPauseSongHotkey,
    registerResetPositionHotkey: hotkeyService.registerResetPositionHotkey,
    registerToggleTrayHotkey: hotkeyService.registerToggleTrayHotkey,
    registerShowSettingsWindowHotkey: hotkeyService.registerShowSettingsWindowHotkey,
    suspendIslandHotkeys: hotkeyService.suspendIslandHotkeys,
    resumeIslandHotkeys: hotkeyService.resumeIslandHotkeys,
  });

  registerScreenshotHotkeyIpcHandlers({
    storeDir,
    screenshotHotkeyStoreKey: SCREENSHOT_HOTKEY_STORE_KEY,
    getCurrentScreenshotHotkey: hotkeyService.getCurrentScreenshotHotkey,
    readScreenshotHotkeyConfig,
    getReservedHotkeys: () => {
      const currentHide = hotkeyService.getCurrentHideHotkey() || readHotkeyConfig();
      const currentQuit = hotkeyService.getCurrentQuitHotkey() || readQuitHotkeyConfig();
      const currentNextSong = hotkeyService.getCurrentNextSongHotkey() || readNextSongHotkeyConfig();
      const currentPlayPauseSong =
        hotkeyService.getCurrentPlayPauseSongHotkey() || readPlayPauseSongHotkeyConfig();
      const currentResetPos = hotkeyService.getCurrentResetPositionHotkey() || readResetPositionHotkeyConfig();
      const currentToggleTray = hotkeyService.getCurrentToggleTrayHotkey() || readToggleTrayHotkeyConfig();
      const currentShowSettings = hotkeyService.getCurrentShowSettingsWindowHotkey() || readShowSettingsWindowHotkeyConfig();
      return [currentHide, currentQuit, currentNextSong, currentPlayPauseSong, currentResetPos, currentToggleTray, currentShowSettings];
    },
    registerScreenshotHotkey: hotkeyService.registerScreenshotHotkey,
  });

  registerCaptureIpcHandlers({
    getCaptureWindow: captureWindowService.getCaptureWindow,
    closeCaptureWindow: captureWindowService.closeCaptureWindow,
  });

  registerWallpaperIpcHandlers();

  registerAppIpcHandlers();

  registerSystemIpcHandlers({
    queryRunningNonSystemProcessNames,
    queryRunningNonSystemProcessesWithIcons,
    queryOpenWindowsWithIcons,
    queryFocusedWindow,
  });

  registerUpdaterIpcHandlers({
    updater: autoUpdater,
    getVersion: () => app.getVersion(),
    isPackaged: () => app.isPackaged,
  });
}

// ===== 剪贴板 URL 监听 =====

const clipboardUrlState = createClipboardUrlState();

/**
 * Chromium 性能优化：禁用不需要的内核功能以降低内存和 CPU 占用
 * @description 必须在 app.whenReady() 之前调用
 */
applyChromiumPerformanceFlags(app);

registerAppLifecycleHandlers({
  getMainWindow: () => mainWindow,
  onWillQuit: () => {
    autoHideWatcher.stop();
    stopClipboardUrlWatcher();
    globalShortcut.unregisterAll();
  },
  onWindowAllClosed: () => {
    autoHideWatcher.stop();
    smtcService.cleanupWorker();
    destroyTray();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  },
});

/**
 * 应用就绪入口，初始化窗口、注册 IPC 处理器并响应 macOS dock 点击重建窗口
 */
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.eisland.app');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  islandPositionOffset = readIslandPositionOffsetConfig();
  clipboardUrlState.setMonitorEnabled(readClipboardUrlMonitorEnabledConfig());
  clipboardUrlState.setDetectMode(readClipboardUrlDetectModeConfig());
  clipboardUrlState.setBlacklist(readClipboardUrlBlacklistConfig());

  mainWindowService.createWindow();
  createTray(mainWindow);

  smtcService.initWorker();
  startClipboardUrlWatcher({
    getWindow: () => mainWindow,
    getEnabled: clipboardUrlState.getMonitorEnabled,
    getDetectMode: clipboardUrlState.getDetectMode,
    getBlacklist: clipboardUrlState.getBlacklist,
  });

  registerIpcHandlers();

  // 读取持久化白名单
  nowPlayingWhitelist = readWhitelistConfig();

  // 读取 SMTC 取消订阅时间配置
  smtcUnsubscribeMs = readSmtcUnsubscribeMsConfig();

  // 读取持久化隐藏窗口名单并启动轮询（仅 Windows）
  const savedHideProcessList = readHideProcessListConfig();
  autoHideWatcher.setAutoHideWindowTitleList(savedHideProcessList);
  autoHideWatcher.setConfiguredHideWindowTitleList([...savedHideProcessList]);
  if (process.platform === 'win32') {
    autoHideWatcher.start();
  }

  // 读取持久化快捷键并注册
  const savedHotkey = readHotkeyConfig();
  hotkeyService.registerHideHotkey(savedHotkey);

  // 读取持久化关闭快捷键并注册
  const savedQuitHotkey = readQuitHotkeyConfig();
  if (savedQuitHotkey) hotkeyService.registerQuitHotkey(savedQuitHotkey);

  // 读取持久化截图快捷键并注册
  const savedScreenshotHotkey = readScreenshotHotkeyConfig();
  if (savedScreenshotHotkey) hotkeyService.registerScreenshotHotkey(savedScreenshotHotkey);

  // 读取持久化切歌快捷键并注册
  const savedNextSongHotkey = readNextSongHotkeyConfig();
  if (savedNextSongHotkey) hotkeyService.registerNextSongHotkey(savedNextSongHotkey);

  // 读取持久化暂停/播放快捷键并注册
  const savedPlayPauseSongHotkey = readPlayPauseSongHotkeyConfig();
  if (savedPlayPauseSongHotkey) hotkeyService.registerPlayPauseSongHotkey(savedPlayPauseSongHotkey);

  // 读取持久化还原位置快捷键并注册
  const savedResetPositionHotkey = readResetPositionHotkeyConfig();
  if (savedResetPositionHotkey) hotkeyService.registerResetPositionHotkey(savedResetPositionHotkey);

  // 读取持久化切换托盘图标快捷键并注册
  const savedToggleTrayHotkey = readToggleTrayHotkeyConfig();
  if (savedToggleTrayHotkey) hotkeyService.registerToggleTrayHotkey(savedToggleTrayHotkey);

  // 读取持久化显示配置窗口快捷键并注册（仅独立窗口模式下会生效）
  const savedShowSettingsWindowHotkey = readShowSettingsWindowHotkeyConfig();
  if (savedShowSettingsWindowHotkey) hotkeyService.registerShowSettingsWindowHotkey(savedShowSettingsWindowHotkey);

  initUpdaterService({
    updater: autoUpdater,
    getMainWindow: () => mainWindow,
    getAppPath: () => app.getAppPath(),
    isPackaged: () => app.isPackaged,
    autoCheckDelayMs: 5000,
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) mainWindowService.createWindow();
  });
});

