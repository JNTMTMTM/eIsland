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
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { exec } from 'child_process';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import { autoUpdater } from 'electron-updater';
import { createTray, destroyTray } from './tray';
import { createSessionMainLogger } from './log/mainLog';
import {
  normalizeClipboardUrlDetectMode,
  sanitizeClipboardUrlBlacklist,
} from './utils/clipboardUrl';
import { startClipboardUrlWatcher, stopClipboardUrlWatcher } from './clipboard/urlWatcher';
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
import { registerAppLifecycleHandlers } from './services/appLifecycle';
import { applyChromiumPerformanceFlags } from './services/chromiumFlags';
import { createHotkeyService } from './services/hotkeyService';
import { initUpdaterService } from './services/updaterService';
import { createCaptureWindowService } from './window/captureWindow';
import { createMainWindowService } from './window/mainWindow';
import { createSmtcService } from './music/smtcService';
import {
  hasAnyRunningProcess,
  normalizeProcessName,
  queryRunningNonSystemProcessNames,
  queryRunningNonSystemProcessesWithIcons,
  sanitizeProcessNameList,
} from './system/runningProcesses';

/** 防止 Electron 创建多个实例 */
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

/**
 * 读取切歌快捷键配置
 * @returns 存储的快捷键字符串，不存在时返回默认值
 */
function readNextSongHotkeyConfig(): string {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${NEXT_SONG_HOTKEY_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_NEXT_SONG_HOTKEY;
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'string' ? data : DEFAULT_NEXT_SONG_HOTKEY;
  } catch {
    return DEFAULT_NEXT_SONG_HOTKEY;
  }
}

function readClipboardUrlBlacklistConfig(): string[] {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${CLIPBOARD_URL_BLACKLIST_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_CLIPBOARD_URL_BLACKLIST;
    const raw = readFileSync(filePath, 'utf-8');
    return sanitizeClipboardUrlBlacklist(JSON.parse(raw));
  } catch {
    return DEFAULT_CLIPBOARD_URL_BLACKLIST;
  }
}

/**
 * 读取暂停/播放快捷键配置
 * @returns 存储的快捷键字符串，不存在时返回默认值
 */
function readPlayPauseSongHotkeyConfig(): string {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${PLAY_PAUSE_SONG_HOTKEY_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_PLAY_PAUSE_SONG_HOTKEY;
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'string' ? data : DEFAULT_PLAY_PAUSE_SONG_HOTKEY;
  } catch {
    return DEFAULT_PLAY_PAUSE_SONG_HOTKEY;
  }
}

function readClipboardUrlMonitorEnabledConfig(): boolean {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${CLIPBOARD_URL_MONITOR_ENABLED_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED;
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'boolean' ? data : DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED;
  } catch {
    return DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED;
  }
}

function readClipboardUrlDetectModeConfig(): ClipboardUrlDetectMode {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${CLIPBOARD_URL_DETECT_MODE_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_CLIPBOARD_URL_DETECT_MODE;
    const raw = readFileSync(filePath, 'utf-8');
    const normalized = normalizeClipboardUrlDetectMode(JSON.parse(raw));
    return normalized || DEFAULT_CLIPBOARD_URL_DETECT_MODE;
  } catch {
    return DEFAULT_CLIPBOARD_URL_DETECT_MODE;
  }
}

/**
 * 读取还原位置快捷键配置
 * @returns 存储的快捷键字符串，不存在时返回默认值
 */
function readResetPositionHotkeyConfig(): string {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${RESET_POSITION_HOTKEY_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_RESET_POSITION_HOTKEY;
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'string' ? data : DEFAULT_RESET_POSITION_HOTKEY;
  } catch {
    return DEFAULT_RESET_POSITION_HOTKEY;
  }
}

interface IslandPositionOffset {
  x: number;
  y: number;
}

async function checkAutoHideProcessList(): Promise<void> {
  if (autoHideCheckInFlight) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  autoHideCheckInFlight = true;
  try {
    if (!autoHideProcessList.length) {
      if (hiddenByAutoHideProcess && !mainWindow.isVisible()) {
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
      hiddenByAutoHideProcess = false;
      return;
    }

    const shouldHide = await hasAnyRunningProcess(autoHideProcessList);

    if (shouldHide) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      }
      hiddenByAutoHideProcess = true;
      return;
    }

    if (hiddenByAutoHideProcess) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
      hiddenByAutoHideProcess = false;
    }
  } finally {
    autoHideCheckInFlight = false;
  }
}

function startAutoHideProcessWatcher(): void {
  if (autoHideProcessWatcher) {
    clearInterval(autoHideProcessWatcher);
    autoHideProcessWatcher = null;
  }

  checkAutoHideProcessList().catch(() => { });
  autoHideProcessWatcher = setInterval(() => {
    checkAutoHideProcessList().catch(() => { });
  }, 2500);
}

function stopAutoHideProcessWatcher(): void {
  if (autoHideProcessWatcher) {
    clearInterval(autoHideProcessWatcher);
    autoHideProcessWatcher = null;
  }
}

function readHideProcessListConfig(): string[] {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${HIDE_PROCESS_LIST_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_HIDE_PROCESS_LIST;
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? sanitizeProcessNameList(data.filter((x) => typeof x === 'string')) : DEFAULT_HIDE_PROCESS_LIST;
  } catch {
    return DEFAULT_HIDE_PROCESS_LIST;
  }
}

let mainWindow: BrowserWindow | null = null;
const captureWindowService = createCaptureWindowService({
  getMainWindow: () => mainWindow,
});

/** 灵动岛尺寸常量 */
const ISLAND_WIDTH = 260;
const ISLAND_HEIGHT = 42;
const EXPANDED_WIDTH = 500;
const EXPANDED_HEIGHT = 60;
const NOTIFICATION_WIDTH = 500;
const NOTIFICATION_HEIGHT = 88;
const LYRICS_WIDTH = 500;
const LYRICS_HEIGHT = 42;
/** 单击展开后的完整面板尺寸 */
const EXPANDED_FULL_WIDTH = 860;
const EXPANDED_FULL_HEIGHT = 150;
/** 设置面板尺寸 */
const SETTINGS_WIDTH = 860;
const SETTINGS_HEIGHT = 400;

/** SMTC 取消订阅设为永不取消时的值 */
const SMTC_UNSUBSCRIBE_NEVER = 0;

/** SMTC 取消订阅默认时间（毫秒） */
const DEFAULT_SMTC_UNSUBSCRIBE_MS = SMTC_UNSUBSCRIBE_NEVER;

/** SMTC 取消订阅最小可配置值（毫秒） */
const MIN_SMTC_UNSUBSCRIBE_MS = 1000;

/** SMTC 取消订阅最大可配置值（毫秒） */
const MAX_SMTC_UNSUBSCRIBE_MS = 30 * 60 * 1000;

/** SMTC 缓存清理最小间隔 */
const SMTC_RUNTIME_CLEANUP_INTERVAL_MS = 30 * 1000;

/** 播放程序白名单默认值 */
const DEFAULT_WHITELIST = ['QQMusic.exe', 'cloudmusic.exe', '汽水音乐', 'kugou'];

/** 白名单存储键名 */
const WHITELIST_STORE_KEY = 'music-whitelist';

/** 歌词源存储键名 */
const LYRICS_SOURCE_STORE_KEY = 'lyrics-source';

/** 逐字扫光开关存储键名 */
const LYRICS_KARAOKE_STORE_KEY = 'lyrics-karaoke';

/** 歌词界面时钟开关存储键名 */
const LYRICS_CLOCK_STORE_KEY = 'lyrics-clock';

/** SMTC 取消订阅时间存储键名 */
const SMTC_UNSUBSCRIBE_MS_STORE_KEY = 'music-smtc-unsubscribe-ms';

/** 隐藏进程名单存储键名 */
const HIDE_PROCESS_LIST_STORE_KEY = 'hide-process-list';

/** 主题模式存储键名 */
const THEME_MODE_STORE_KEY = 'theme-mode';

/** 灵动岛透明度存储键名 */
const ISLAND_OPACITY_STORE_KEY = 'island-opacity';

/** expand 鼠标移开回 idle 开关存储键名 */
const EXPAND_MOUSELEAVE_IDLE_STORE_KEY = 'expand-mouseleave-idle';

/** maxExpand 鼠标移开回 idle 开关存储键名 */
const MAXEXPAND_MOUSELEAVE_IDLE_STORE_KEY = 'maxexpand-mouseleave-idle';

/** 剪贴板 URL 监听开关存储键名 */
const CLIPBOARD_URL_MONITOR_ENABLED_STORE_KEY = 'clipboard-url-monitor-enabled';

type ClipboardUrlDetectMode = 'https-only' | 'http-https' | 'domain-only';

/** 剪贴板 URL 识别模式存储键名 */
const CLIPBOARD_URL_DETECT_MODE_STORE_KEY = 'clipboard-url-detect-mode';

/** 剪贴板 URL 黑名单存储键名（按域名） */
const CLIPBOARD_URL_BLACKLIST_STORE_KEY = 'clipboard-url-blacklist';

/** 开机自启模式存储键名 */
const AUTOSTART_MODE_STORE_KEY = 'autostart-mode';

/** 快速导航卡片顺序存储键名 */
const NAV_ORDER_STORE_KEY = 'nav-order';

/** 灵动岛位置偏移存储键名 */
const ISLAND_POSITION_STORE_KEY = 'island-position-offset';

/** 隐藏进程名单默认值 */
const DEFAULT_HIDE_PROCESS_LIST: string[] = [];

/** 剪贴板 URL 监听开关默认值 */
const DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED = true;

/** 剪贴板 URL 识别模式默认值 */
const DEFAULT_CLIPBOARD_URL_DETECT_MODE: ClipboardUrlDetectMode = 'http-https';

/** 剪贴板 URL 黑名单默认值 */
const DEFAULT_CLIPBOARD_URL_BLACKLIST: string[] = [];

/** 灵动岛位置偏移默认值（相对主屏工作区顶部居中） */
const DEFAULT_ISLAND_POSITION_OFFSET: IslandPositionOffset = { x: 0, y: 0 };

function sanitizeIslandPositionOffset(raw: unknown): IslandPositionOffset {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ISLAND_POSITION_OFFSET };
  }

  const value = raw as { x?: unknown; y?: unknown };
  const xNum = typeof value.x === 'number' && Number.isFinite(value.x) ? value.x : DEFAULT_ISLAND_POSITION_OFFSET.x;
  const yNum = typeof value.y === 'number' && Number.isFinite(value.y) ? value.y : DEFAULT_ISLAND_POSITION_OFFSET.y;

  return {
    x: Math.max(-2000, Math.min(2000, Math.round(xNum))),
    y: Math.max(-1200, Math.min(1200, Math.round(yNum))),
  };
}

function readIslandPositionOffsetConfig(): IslandPositionOffset {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${ISLAND_POSITION_STORE_KEY}.json`);
    if (!existsSync(filePath)) return { ...DEFAULT_ISLAND_POSITION_OFFSET };
    const raw = readFileSync(filePath, 'utf-8');
    return sanitizeIslandPositionOffset(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_ISLAND_POSITION_OFFSET };
  }
}

function writeIslandPositionOffsetConfig(offset: IslandPositionOffset): boolean {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    if (!existsSync(storeDir)) mkdirSync(storeDir, { recursive: true });
    const filePath = join(storeDir, `${ISLAND_POSITION_STORE_KEY}.json`);
    writeFileSync(filePath, JSON.stringify(offset, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[IslandPosition] persist error:', err);
    return false;
  }
}

/** 运行时白名单（可被用户修改） */
let nowPlayingWhitelist: string[] = [...DEFAULT_WHITELIST];

/** 运行时隐藏进程名单（命中后立即隐藏灵动岛） */
let autoHideProcessList: string[] = [...DEFAULT_HIDE_PROCESS_LIST];

/** 设置界面配置的隐藏进程名单（下次重启生效） */
let configuredHideProcessList: string[] = [...DEFAULT_HIDE_PROCESS_LIST];

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

/** 隐藏进程名单轮询计时器 */
let autoHideProcessWatcher: NodeJS.Timeout | null = null;

/** 进程隐藏轮询防重入标记 */
let autoHideCheckInFlight = false;

/** 当前隐藏是否由“隐藏进程命中”触发 */
let hiddenByAutoHideProcess = false;

/** SMTC 自动取消订阅时间（毫秒），0 为永不取消 */
let smtcUnsubscribeMs = DEFAULT_SMTC_UNSUBSCRIBE_MS;

const smtcService = createSmtcService({
  getMainWindow: () => mainWindow,
  getWhitelist: () => nowPlayingWhitelist,
  getSmtcUnsubscribeMs: () => smtcUnsubscribeMs,
  unsubscribeNeverValue: SMTC_UNSUBSCRIBE_NEVER,
  cleanupIntervalMs: SMTC_RUNTIME_CLEANUP_INTERVAL_MS,
});

/**
 * 读取持久化的白名单配置
 * @returns 白名单数组
 */
function readWhitelistConfig(): string[] {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${WHITELIST_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_WHITELIST;
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : DEFAULT_WHITELIST;
  } catch {
    return DEFAULT_WHITELIST;
  }
}

/**
 * 读取持久化的歌词源配置
 * @returns 歌词源标识字符串
 */
function readLyricsSourceConfig(): string {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${LYRICS_SOURCE_STORE_KEY}.json`);
    if (!existsSync(filePath)) return 'auto';
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'string' ? data : 'auto';
  } catch {
    return 'auto';
  }
}

function sanitizeSmtcUnsubscribeMs(value: unknown): number {
  if (value === SMTC_UNSUBSCRIBE_NEVER) return SMTC_UNSUBSCRIBE_NEVER;
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SMTC_UNSUBSCRIBE_MS;
  const rounded = Math.round(value);
  if (rounded <= 0) return SMTC_UNSUBSCRIBE_NEVER;
  return Math.min(MAX_SMTC_UNSUBSCRIBE_MS, Math.max(MIN_SMTC_UNSUBSCRIBE_MS, rounded));
}

function readSmtcUnsubscribeMsConfig(): number {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${SMTC_UNSUBSCRIBE_MS_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_SMTC_UNSUBSCRIBE_MS;
    const raw = readFileSync(filePath, 'utf-8');
    return sanitizeSmtcUnsubscribeMs(JSON.parse(raw));
  } catch {
    return DEFAULT_SMTC_UNSUBSCRIBE_MS;
  }
}

/** 隐藏快捷键存储键名 */
const HOTKEY_STORE_KEY = 'hide-hotkey';

/** 默认隐藏快捷键 */
const DEFAULT_HIDE_HOTKEY = 'Alt+X';

/**
 * 读取快捷键配置
 * @returns 存储的快捷键字符串，不存在时返回默认值
 */
function readHotkeyConfig(): string {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${HOTKEY_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_HIDE_HOTKEY;
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'string' ? data : DEFAULT_HIDE_HOTKEY;
  } catch {
    return DEFAULT_HIDE_HOTKEY;
  }
}

/** 关闭快捷键存储键名 */
const QUIT_HOTKEY_STORE_KEY = 'quit-hotkey';

/** 默认关闭快捷键（空表示默认不设置） */
const DEFAULT_QUIT_HOTKEY = 'Alt+C';

/**
 * 读取关闭快捷键配置
 * @returns 存储的快捷键字符串，不存在时返回默认值
 */
function readQuitHotkeyConfig(): string {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${QUIT_HOTKEY_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_QUIT_HOTKEY;
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'string' ? data : DEFAULT_QUIT_HOTKEY;
  } catch {
    return DEFAULT_QUIT_HOTKEY;
  }
}

/** 截图快捷键存储键名 */
const SCREENSHOT_HOTKEY_STORE_KEY = 'screenshot-hotkey';

/** 默认截图快捷键 */
const DEFAULT_SCREENSHOT_HOTKEY = 'Alt+A';

/** 切歌快捷键存储键名 */
const NEXT_SONG_HOTKEY_STORE_KEY = 'next-song-hotkey';

/** 默认切歌快捷键（空表示默认不设置） */
const DEFAULT_NEXT_SONG_HOTKEY = '';

/** 暂停/播放快捷键存储键名 */
const PLAY_PAUSE_SONG_HOTKEY_STORE_KEY = 'play-pause-song-hotkey';

/** 默认暂停/播放快捷键（空表示默认不设置） */
const DEFAULT_PLAY_PAUSE_SONG_HOTKEY = '';

/** 还原位置快捷键存储键名 */
const RESET_POSITION_HOTKEY_STORE_KEY = 'reset-position-hotkey';

/** 默认还原位置快捷键（空表示默认不设置） */
const DEFAULT_RESET_POSITION_HOTKEY = '';

/**
 * 读取截图快捷键配置
 * @returns 存储的快捷键字符串，不存在时返回默认值
 */
function readScreenshotHotkeyConfig(): string {
  try {
    const storeDir = join(app.getPath('userData'), 'eIsland_store');
    const filePath = join(storeDir, `${SCREENSHOT_HOTKEY_STORE_KEY}.json`);
    if (!existsSync(filePath)) return DEFAULT_SCREENSHOT_HOTKEY;
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'string' ? data : DEFAULT_SCREENSHOT_HOTKEY;
  } catch {
    return DEFAULT_SCREENSHOT_HOTKEY;
  }
}

/**
 * 通过 PowerShell P/Invoke 向系统发送媒体虚拟按键
 * 使用 -EncodedCommand 传递 Base64(UTF-16LE) 编码脚本，避免内联引号转义问题
 * @param vkCode - Windows 虚拟键代码（VK_MEDIA_*）
 */
function sendMediaVirtualKey(vkCode: number): void {
  const script = [
    'Add-Type -TypeDefinition @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public class MediaKey {',
    '    [DllImport("user32.dll")]',
    '    public static extern void keybd_event(byte vk, byte scan, uint flags, IntPtr extra);',
    '}',
    '"@',
    `[MediaKey]::keybd_event(${vkCode}, 0, 0, [IntPtr]::Zero)`,
    `[MediaKey]::keybd_event(${vkCode}, 0, 2, [IntPtr]::Zero)`,
  ].join('\n');
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  exec(`powershell.exe -NonInteractive -NoProfile -EncodedCommand ${encoded}`, (err) => {
    if (err) console.error('[Media] virtual key error:', err.message);
  });
}

const hotkeyService = createHotkeyService({
  getMainWindow: () => mainWindow,
  setHiddenByAutoHideProcess: (hidden) => {
    hiddenByAutoHideProcess = hidden;
  },
  readHideHotkeyConfig: readHotkeyConfig,
  readQuitHotkeyConfig,
  readScreenshotHotkeyConfig,
  readNextSongHotkeyConfig,
  readPlayPauseSongHotkeyConfig,
  readResetPositionHotkeyConfig,
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
});

/** 注册 IPC 处理器，供渲染进程动态切换鼠标穿透状态及调整窗口大小 */
function registerIpcHandlers(): void {
  registerWindowIpcHandlers({
    getMainWindow: () => mainWindow,
    getInitialCenterX: mainWindowService.getInitialCenterX,
    setHiddenByAutoHideProcess: (hidden) => {
      hiddenByAutoHideProcess = hidden;
    },
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
    getMonitorEnabled: () => clipboardUrlMonitorEnabled,
    setMonitorEnabled: (enabled) => {
      clipboardUrlMonitorEnabled = enabled;
    },
    getDetectMode: () => clipboardUrlDetectMode,
    setDetectMode: (mode) => {
      clipboardUrlDetectMode = mode;
    },
    getBlacklist: () => clipboardUrlBlacklist,
    setBlacklist: (list) => {
      clipboardUrlBlacklist = list;
    },
    startWatcher: () => {
      startClipboardUrlWatcher({
        getWindow: () => mainWindow,
        getEnabled: () => clipboardUrlMonitorEnabled,
        getDetectMode: () => clipboardUrlDetectMode,
        getBlacklist: () => clipboardUrlBlacklist,
      });
    },
    stopWatcher: () => {
      stopClipboardUrlWatcher();
    },
  });

  registerStoreIpcHandlers({ storeDir });

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
    detectSourceAppId: smtcService.pickDetectedSourceAppId,
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
    getConfiguredHideProcessList: () => configuredHideProcessList,
    setConfiguredHideProcessList: (list) => {
      configuredHideProcessList = list;
    },
    getAutoHideProcessList: () => autoHideProcessList,
    setAutoHideProcessList: (list) => {
      autoHideProcessList = list;
    },
    sanitizeProcessNameList,
    normalizeProcessName,
    checkAutoHideProcessList,
  });

  registerHotkeyIpcHandlers({
    storeDir,
    hideHotkeyStoreKey: HOTKEY_STORE_KEY,
    quitHotkeyStoreKey: QUIT_HOTKEY_STORE_KEY,
    nextSongHotkeyStoreKey: NEXT_SONG_HOTKEY_STORE_KEY,
    playPauseSongHotkeyStoreKey: PLAY_PAUSE_SONG_HOTKEY_STORE_KEY,
    resetPositionHotkeyStoreKey: RESET_POSITION_HOTKEY_STORE_KEY,
    getCurrentHideHotkey: hotkeyService.getCurrentHideHotkey,
    getCurrentQuitHotkey: hotkeyService.getCurrentQuitHotkey,
    getCurrentScreenshotHotkey: hotkeyService.getCurrentScreenshotHotkey,
    getCurrentNextSongHotkey: hotkeyService.getCurrentNextSongHotkey,
    getCurrentPlayPauseSongHotkey: hotkeyService.getCurrentPlayPauseSongHotkey,
    getCurrentResetPositionHotkey: hotkeyService.getCurrentResetPositionHotkey,
    readHideHotkeyConfig: readHotkeyConfig,
    readQuitHotkeyConfig,
    readScreenshotHotkeyConfig,
    readNextSongHotkeyConfig,
    readPlayPauseSongHotkeyConfig,
    readResetPositionHotkeyConfig,
    registerHideHotkey: hotkeyService.registerHideHotkey,
    registerQuitHotkey: hotkeyService.registerQuitHotkey,
    registerNextSongHotkey: hotkeyService.registerNextSongHotkey,
    registerPlayPauseSongHotkey: hotkeyService.registerPlayPauseSongHotkey,
    registerResetPositionHotkey: hotkeyService.registerResetPositionHotkey,
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
      return [currentHide, currentQuit, currentNextSong, currentPlayPauseSong, currentResetPos];
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
  });

  registerUpdaterIpcHandlers({
    updater: autoUpdater,
    getVersion: () => app.getVersion(),
    isPackaged: () => app.isPackaged,
  });
}

// ===== 剪贴板 URL 监听 =====

/** 剪贴板 URL 监听是否启用 */
let clipboardUrlMonitorEnabled = DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED;

/** 剪贴板 URL 识别模式 */
let clipboardUrlDetectMode: ClipboardUrlDetectMode = DEFAULT_CLIPBOARD_URL_DETECT_MODE;

/** 剪贴板 URL 黑名单（域名） */
let clipboardUrlBlacklist: string[] = [...DEFAULT_CLIPBOARD_URL_BLACKLIST];

/**
 * Chromium 性能优化：禁用不需要的内核功能以降低内存和 CPU 占用
 * @description 必须在 app.whenReady() 之前调用
 */
applyChromiumPerformanceFlags(app);

registerAppLifecycleHandlers({
  getMainWindow: () => mainWindow,
  onWillQuit: () => {
    stopAutoHideProcessWatcher();
    stopClipboardUrlWatcher();
    globalShortcut.unregisterAll();
  },
  onWindowAllClosed: () => {
    stopAutoHideProcessWatcher();
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
  clipboardUrlMonitorEnabled = readClipboardUrlMonitorEnabledConfig();
  clipboardUrlDetectMode = readClipboardUrlDetectModeConfig();
  clipboardUrlBlacklist = readClipboardUrlBlacklistConfig();

  mainWindowService.createWindow();
  createTray(mainWindow);

  smtcService.initWorker();
  startClipboardUrlWatcher({
    getWindow: () => mainWindow,
    getEnabled: () => clipboardUrlMonitorEnabled,
    getDetectMode: () => clipboardUrlDetectMode,
    getBlacklist: () => clipboardUrlBlacklist,
  });

  registerIpcHandlers();

  // 读取持久化白名单
  nowPlayingWhitelist = readWhitelistConfig();

  // 读取 SMTC 取消订阅时间配置
  smtcUnsubscribeMs = readSmtcUnsubscribeMsConfig();

  // 读取持久化隐藏进程名单并启动轮询（仅 Windows）
  autoHideProcessList = readHideProcessListConfig();
  configuredHideProcessList = [...autoHideProcessList];
  if (process.platform === 'win32') {
    startAutoHideProcessWatcher();
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

