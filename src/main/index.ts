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

import { app, BrowserWindow, globalShortcut, protocol, net } from 'electron';
import { join, resolve as resolvePath } from 'path';
import { pathToFileURL } from 'url';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import { autoUpdater } from 'electron-updater';
import { createTray, destroyTray, toggleTray } from './tray';
import { createSessionMainLogger } from './log/mainLog';
import { startClipboardUrlWatcher, stopClipboardUrlWatcher } from './clipboard/urlWatcher';
import { createClipboardUrlState } from './clipboard/clipboardUrlState';
import { registerClipboardIpcHandlers } from './ipc/settings/clipboard';
import { registerCaptureIpcHandlers } from './ipc/window/capture';
import { registerScreenshotHotkeyIpcHandlers } from './ipc/system/screenshotHotkey';
import { registerAppIpcHandlers } from './ipc/app/app';
import { registerSystemIpcHandlers } from './ipc/system/system';
import { registerUpdaterIpcHandlers } from './ipc/app/updater';
import { registerWallpaperIpcHandlers } from './ipc/window/wallpaper';
import { registerWallpaperVideoIpcHandlers } from './ipc/media/wallpaperVideo';
import { registerNetIpcHandlers } from './ipc/app/net';
import { registerMailIpcHandlers } from './ipc/app/mail';
import { registerStoreIpcHandlers } from './ipc/app/store';
import { registerLogIpcHandlers } from './ipc/app/log';
import { registerMusicIpcHandlers } from './ipc/media/music';
import { registerHotkeyIpcHandlers } from './ipc/system/hotkey';
import { registerIslandIpcHandlers } from './ipc/settings/island';
import { registerHideProcessIpcHandlers } from './ipc/system/hideProcess';
import { registerThemeIpcHandlers } from './ipc/settings/theme';
import { registerWindowIpcHandlers, toggleMousePassthroughLock } from './ipc/window/window';
import { registerMediaIpcHandlers } from './ipc/media/media';
import { broadcastSettingChange, registerSettingsPreviewHandler } from './utils/broadcast';
import { registerAppLifecycleHandlers } from './services/appLifecycle';
import { applyChromiumPerformanceFlags } from './services/chromiumFlags';
import { createHotkeyService } from './services/hotkeyService';
import { initUpdaterService } from './services/updaterService';
import { createCaptureWindowService } from './window/captureWindow';
import { createMainWindowService } from './window/mainWindow';
import { openStandaloneWindow } from './window/standaloneWindow';
import { createSmtcService } from './music/smtcService';
import { setSmtcAccessor } from './music/smtcAccessor';
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
  DEFAULT_ISLAND_DISPLAY_SELECTION,
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
  OPEN_CLIPBOARD_HISTORY_HOTKEY_STORE_KEY,
  TOGGLE_PASSTHROUGH_HOTKEY_STORE_KEY,
  TOGGLE_UI_LOCK_HOTKEY_STORE_KEY,
  AGENT_VOICE_INPUT_HOTKEY_STORE_KEY,
  sanitizeIslandPositionOffset, sanitizeIslandDisplaySelection, sanitizeSmtcUnsubscribeMs,
  readHotkeyConfig, readQuitHotkeyConfig, readScreenshotHotkeyConfig,
  readNextSongHotkeyConfig, readPlayPauseSongHotkeyConfig, readResetPositionHotkeyConfig,
  readToggleTrayHotkeyConfig, readShowSettingsWindowHotkeyConfig, readOpenClipboardHistoryHotkeyConfig, readTogglePassthroughHotkeyConfig, readToggleUiLockHotkeyConfig,
  readAgentVoiceInputHotkeyConfig,
  readWhitelistConfig, readLyricsSourceConfig, readSmtcUnsubscribeMsConfig,
  readHideProcessListConfig, readIslandPositionOffsetConfig, readIslandDisplaySelectionConfig,
  writeIslandPositionOffsetConfig, writeIslandDisplaySelectionConfig,
  readClipboardUrlMonitorEnabledConfig, readClipboardUrlDetectModeConfig, readClipboardUrlBlacklistConfig,
  readUpdateAutoPromptConfig,
} from './config/storeConfig';
import type { IslandPositionOffset } from './config/storeConfig';

/** 防止 Electron 创建多个实例 */
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let agentVoiceInputWindow: BrowserWindow | null = null;

/**
 * 创建全屏透明 Agent 语音输入窗口
 * @description 加载 AIbackground.html，显示 Agent 语音输入背景光效
 */
function showAgentVoiceInputWindow(): void {
  if (agentVoiceInputWindow && !agentVoiceInputWindow.isDestroyed()) {
    agentVoiceInputWindow.show();
    return;
  }

  const { screen } = require('electron');
  const targetDisplay = mainWindow && !mainWindow.isDestroyed()
    ? screen.getDisplayMatching(mainWindow.getBounds())
    : screen.getPrimaryDisplay();
  const { width, height } = targetDisplay.bounds;

  agentVoiceInputWindow = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    show: false,
    title: '',
    type: 'toolbar',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  agentVoiceInputWindow.setIgnoreMouseEvents(true);
  agentVoiceInputWindow.setAlwaysOnTop(true, 'floating');
  agentVoiceInputWindow.removeMenu();

  if (app.isPackaged) {
    agentVoiceInputWindow.loadFile(join(__dirname, '../renderer/AIbackground.html'));
  } else {
    agentVoiceInputWindow.loadFile(join(__dirname, '../../src/renderer/AIbackground.html'));
  }

  agentVoiceInputWindow.once('ready-to-show', () => {
    if (agentVoiceInputWindow && !agentVoiceInputWindow.isDestroyed()) {
      agentVoiceInputWindow.show();
    }
  });

  agentVoiceInputWindow.on('closed', () => {
    agentVoiceInputWindow = null;
  });

  // 确保灵动岛始终在 Agent 语音输入窗口之上
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.webContents.send('agent-voice-input:state', true);
  }
}

/**
 * 关闭 Agent 语音输入窗口（先播放淡出动画再关闭）
 */
function hideAgentVoiceInputWindow(): void {
  if (agentVoiceInputWindow && !agentVoiceInputWindow.isDestroyed()) {
    const win = agentVoiceInputWindow;
    win.webContents.executeJavaScript('startFadeOut()').catch(() => {});
    setTimeout(() => {
      if (win && !win.isDestroyed()) {
        win.close();
      }
    }, 450);
    agentVoiceInputWindow = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('agent-voice-input:state', false);
  }
}
const captureWindowService = createCaptureWindowService({
  getMainWindow: () => mainWindow,
});

/** 运行时白名单（可被用户修改） */
let nowPlayingWhitelist: string[] = [...DEFAULT_WHITELIST];

/** 运行时灵动岛位置偏移 */
let islandPositionOffset: IslandPositionOffset = { ...DEFAULT_ISLAND_POSITION_OFFSET };

/** 运行时灵动岛显示器选择 */
let islandDisplaySelection = DEFAULT_ISLAND_DISPLAY_SELECTION;

const mainWindowService = createMainWindowService({
  getMainWindow: () => mainWindow,
  setMainWindow: (window) => {
    mainWindow = window;
  },
  getIslandPositionOffset: () => islandPositionOffset,
  getIslandDisplaySelection: () => islandDisplaySelection,
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
  readOpenClipboardHistoryHotkeyConfig,
  readTogglePassthroughHotkeyConfig,
  readToggleUiLockHotkeyConfig,
  readAgentVoiceInputHotkeyConfig,
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
  onOpenClipboardHistoryHotkey: () => {
    const target = mainWindow;
    if (!target || target.isDestroyed()) return;
    if (!target.isVisible()) {
      target.show();
      target.setAlwaysOnTop(true, 'screen-saver');
    }
    broadcastSettingChange(-1, 'shortcut:open-clipboard-history', Date.now());
  },
  onTogglePassthroughHotkey: () => {
    toggleMousePassthroughLock(() => mainWindow);
  },
  onToggleUiLockHotkey: () => {
    broadcastSettingChange(-1, 'shortcut:toggle-ui-lock', Date.now());
  },
  onAgentVoiceInputHotkeyHold: () => {
    showAgentVoiceInputWindow();
  },
  onAgentVoiceInputHotkeyRelease: () => {
    hideAgentVoiceInputWindow();
  },
});

/** 注册 IPC 处理器 */
function registerIpcHandlers(): void {
  registerWindowIpcHandlers({
    getMainWindow: () => mainWindow,
    getInitialCenterX: mainWindowService.getInitialCenterX,
    setHiddenByAutoHideProcess: autoHideWatcher.setHiddenByAutoHideProcess,
    getIslandPositionOffset: () => islandPositionOffset,
    getIslandDisplaySelection: () => islandDisplaySelection,
    sanitizeIslandDisplaySelection,
    setIslandDisplaySelection: (selection) => {
      islandDisplaySelection = selection;
    },
    sanitizeIslandPositionOffset,
    applyIslandPositionOffset: mainWindowService.applyIslandPositionOffset,
    writeIslandPositionOffsetConfig,
    writeIslandDisplaySelectionConfig,
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

  registerMailIpcHandlers({
    storeDir,
    mailConfigStoreKey: 'mail-account-config',
  });

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
    openClipboardHistoryHotkeyStoreKey: OPEN_CLIPBOARD_HISTORY_HOTKEY_STORE_KEY,
    togglePassthroughHotkeyStoreKey: TOGGLE_PASSTHROUGH_HOTKEY_STORE_KEY,
    toggleUiLockHotkeyStoreKey: TOGGLE_UI_LOCK_HOTKEY_STORE_KEY,
    agentVoiceInputHotkeyStoreKey: AGENT_VOICE_INPUT_HOTKEY_STORE_KEY,
    getCurrentHideHotkey: hotkeyService.getCurrentHideHotkey,
    getCurrentQuitHotkey: hotkeyService.getCurrentQuitHotkey,
    getCurrentScreenshotHotkey: hotkeyService.getCurrentScreenshotHotkey,
    getCurrentNextSongHotkey: hotkeyService.getCurrentNextSongHotkey,
    getCurrentPlayPauseSongHotkey: hotkeyService.getCurrentPlayPauseSongHotkey,
    getCurrentResetPositionHotkey: hotkeyService.getCurrentResetPositionHotkey,
    getCurrentToggleTrayHotkey: hotkeyService.getCurrentToggleTrayHotkey,
    getCurrentShowSettingsWindowHotkey: hotkeyService.getCurrentShowSettingsWindowHotkey,
    getCurrentOpenClipboardHistoryHotkey: hotkeyService.getCurrentOpenClipboardHistoryHotkey,
    getCurrentTogglePassthroughHotkey: hotkeyService.getCurrentTogglePassthroughHotkey,
    getCurrentToggleUiLockHotkey: hotkeyService.getCurrentToggleUiLockHotkey,
    getCurrentAgentVoiceInputHotkey: hotkeyService.getCurrentAgentVoiceInputHotkey,
    readHideHotkeyConfig: readHotkeyConfig,
    readQuitHotkeyConfig,
    readScreenshotHotkeyConfig,
    readNextSongHotkeyConfig,
    readPlayPauseSongHotkeyConfig,
    readResetPositionHotkeyConfig,
    readToggleTrayHotkeyConfig,
    readShowSettingsWindowHotkeyConfig,
    readOpenClipboardHistoryHotkeyConfig,
    readTogglePassthroughHotkeyConfig,
    readToggleUiLockHotkeyConfig,
    readAgentVoiceInputHotkeyConfig,
    registerHideHotkey: hotkeyService.registerHideHotkey,
    registerQuitHotkey: hotkeyService.registerQuitHotkey,
    registerNextSongHotkey: hotkeyService.registerNextSongHotkey,
    registerPlayPauseSongHotkey: hotkeyService.registerPlayPauseSongHotkey,
    registerResetPositionHotkey: hotkeyService.registerResetPositionHotkey,
    registerToggleTrayHotkey: hotkeyService.registerToggleTrayHotkey,
    registerShowSettingsWindowHotkey: hotkeyService.registerShowSettingsWindowHotkey,
    registerOpenClipboardHistoryHotkey: hotkeyService.registerOpenClipboardHistoryHotkey,
    registerTogglePassthroughHotkey: hotkeyService.registerTogglePassthroughHotkey,
    registerToggleUiLockHotkey: hotkeyService.registerToggleUiLockHotkey,
    registerAgentVoiceInputHotkey: hotkeyService.registerAgentVoiceInputHotkey,
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
      const currentOpenClipboardHistory = hotkeyService.getCurrentOpenClipboardHistoryHotkey() || readOpenClipboardHistoryHotkeyConfig();
      const currentToggleUiLock = hotkeyService.getCurrentToggleUiLockHotkey() || readToggleUiLockHotkeyConfig();
      const currentAgentVoiceInput = hotkeyService.getCurrentAgentVoiceInputHotkey() || readAgentVoiceInputHotkeyConfig();
      return [currentHide, currentQuit, currentNextSong, currentPlayPauseSong, currentResetPos, currentToggleTray, currentShowSettings, currentOpenClipboardHistory, currentToggleUiLock, currentAgentVoiceInput];
    },
    registerScreenshotHotkey: hotkeyService.registerScreenshotHotkey,
  });

  registerCaptureIpcHandlers({
    getCaptureWindow: captureWindowService.getCaptureWindow,
    closeCaptureWindow: captureWindowService.closeCaptureWindow,
    startRegionScreenshot: captureWindowService.startRegionScreenshot,
  });

  registerWallpaperIpcHandlers();
  registerWallpaperVideoIpcHandlers();

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

/**
 * 注册自定义媒体协议
 * @description 必须在 app.whenReady() 之前调用，用于在渲染进程中安全加载
 *   userData/wallpapers 下的本地媒体文件（例如自定义背景视频），
 *   避免 <video> 直连 file:// 被 webSecurity 阻断
 */
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'eisland-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
      bypassCSP: true,
    },
  },
]);

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

  /**
   * eisland-media:// 协议处理器
   * @description 将形如 eisland-media://local/<encoded-abs-path> 的请求代理到本地文件，
   *   限制只能读取 userData/wallpapers 目录，保证渲染进程无法越权访问磁盘。
   *   使用纯字符串切片解析以避免 Node URL 解析对非内置 scheme 的差异。
   */
  const wallpaperCacheDir = resolvePath(join(app.getPath('userData'), 'wallpapers'));
  protocol.handle('eisland-media', (request) => {
    try {
      const raw = request.url;
      const schemePrefix = 'eisland-media://';
      if (!raw.startsWith(schemePrefix)) {
        return new Response('Bad Request', { status: 400 });
      }
      let rest = raw.slice(schemePrefix.length);
      if (rest.startsWith('/')) {
        // eisland-media:///<encoded>
        rest = rest.slice(1);
      } else {
        // eisland-media://<host>/<encoded>
        const firstSlash = rest.indexOf('/');
        if (firstSlash < 0) {
          return new Response('Bad Request', { status: 400 });
        }
        rest = rest.slice(firstSlash + 1);
      }
      // 忽略可能的查询串/片段
      const qIdx = rest.search(/[?#]/);
      if (qIdx >= 0) rest = rest.slice(0, qIdx);
      const rawPath = decodeURIComponent(rest);
      const absPath = resolvePath(rawPath);
      const allowedPrefix = wallpaperCacheDir.endsWith('\\') || wallpaperCacheDir.endsWith('/')
        ? wallpaperCacheDir
        : `${wallpaperCacheDir}${process.platform === 'win32' ? '\\' : '/'}`;
      const normalizedAbs = process.platform === 'win32' ? absPath.toLowerCase() : absPath;
      const normalizedPrefix = process.platform === 'win32' ? allowedPrefix.toLowerCase() : allowedPrefix;
      if (!normalizedAbs.startsWith(normalizedPrefix)) {
        console.warn('[eisland-media] forbidden path:', absPath);
        return new Response('Forbidden', { status: 403 });
      }
      if (!existsSync(absPath)) {
        console.warn('[eisland-media] not found:', absPath);
        return new Response('Not Found', { status: 404 });
      }
      return net.fetch(pathToFileURL(absPath).toString());
    } catch (err) {
      console.error('[eisland-media] handler error:', err);
      return new Response('Bad Request', { status: 400 });
    }
  });

  islandPositionOffset = readIslandPositionOffsetConfig();
  islandDisplaySelection = readIslandDisplaySelectionConfig();
  clipboardUrlState.setMonitorEnabled(readClipboardUrlMonitorEnabledConfig());
  clipboardUrlState.setDetectMode(readClipboardUrlDetectModeConfig());
  clipboardUrlState.setBlacklist(readClipboardUrlBlacklistConfig());

  mainWindowService.createWindow();
  createTray(mainWindow);

  smtcService.initWorker();
  setSmtcAccessor(smtcService.getSmtcSessionRuntime, smtcService.getCurrentDeviceId);
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

  // 读取持久化打开剪贴板历史快捷键并注册
  const savedOpenClipboardHistoryHotkey = readOpenClipboardHistoryHotkeyConfig();
  if (savedOpenClipboardHistoryHotkey) hotkeyService.registerOpenClipboardHistoryHotkey(savedOpenClipboardHistoryHotkey);

  // 读取持久化切换鼠标穿透快捷键并注册
  const savedTogglePassthroughHotkey = readTogglePassthroughHotkeyConfig();
  if (savedTogglePassthroughHotkey) hotkeyService.registerTogglePassthroughHotkey(savedTogglePassthroughHotkey);

  // 读取持久化切换 UI 状态锁定快捷键并注册
  const savedToggleUiLockHotkey = readToggleUiLockHotkeyConfig();
  if (savedToggleUiLockHotkey) hotkeyService.registerToggleUiLockHotkey(savedToggleUiLockHotkey);

  // 读取持久化 Agent 语音输入快捷键并注册
  const savedAgentVoiceInputHotkey = readAgentVoiceInputHotkeyConfig();
  if (savedAgentVoiceInputHotkey) hotkeyService.registerAgentVoiceInputHotkey(savedAgentVoiceInputHotkey);

  initUpdaterService({
    updater: autoUpdater,
    getMainWindow: () => mainWindow,
    getAppPath: () => app.getAppPath(),
    isPackaged: () => app.isPackaged,
    shouldAutoPromptUpdate: () => readUpdateAutoPromptConfig(),
    autoCheckDelayMs: 5000,
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) mainWindowService.createWindow();
  });
});

