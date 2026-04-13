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

import { app, BrowserWindow, shell, screen, ipcMain, desktopCapturer, globalShortcut, nativeImage } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { exec } from 'child_process';
import { Worker } from 'worker_threads';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
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

function normalizeProcessName(name: string): string {
  return name.trim().toLowerCase();
}

interface IslandPositionOffset {
  x: number;
  y: number;
}

function isSystemProcessName(processName: string): boolean {
  const name = normalizeProcessName(processName);
  if (!name) return true;

  if (name === 'system' || name === 'system idle process' || name === 'registry' || name === 'memory compression') {
    return true;
  }

  return [
    /^smss\.exe$/,
    /^csrss\.exe$/,
    /^wininit\.exe$/,
    /^winlogon\.exe$/,
    /^services\.exe$/,
    /^lsass\.exe$/,
    /^fontdrvhost\.exe$/,
    /^svchost\.exe$/,
    /^sihost\.exe$/,
    /^dwm\.exe$/,
    /^taskhostw\.exe$/,
    /^runtimebroker\.exe$/,
    /^startmenuexperiencehost\.exe$/,
    /^shellexperiencehost\.exe$/,
    /^searchhost\.exe$/,
  ].some((pattern) => pattern.test(name));
}

function parseTaskListProcessNames(raw: string): string[] {
  const names = new Set<string>();
  const lines = raw.split(/\r?\n/);

  lines.forEach((line) => {
    const text = line.trim();
    if (!text) return;
    const matched = text.match(/^"([^"]+)"/);
    const processName = (matched?.[1] || text.split(',')[0] || '').trim();
    if (!processName) return;
    names.add(processName);
  });

  return [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function queryRunningProcessNames(): Promise<string[]> {
  return new Promise((resolve) => {
    exec('tasklist /fo csv /nh', {
      windowsHide: true,
      timeout: PROCESS_QUERY_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    }, (err, stdout) => {
      if (err) {
        console.error('[Process] query running process failed:', err.message);
        resolve([]);
        return;
      }
      resolve(parseTaskListProcessNames(stdout));
    });
  });
}

async function queryRunningNonSystemProcessNames(): Promise<string[]> {
  const all = await queryRunningProcessNames();
  return all.filter((name) => !isSystemProcessName(name));
}

interface RunningProcessInfo {
  name: string;
  iconDataUrl: string | null;
}

function parseRunningProcessPathMap(raw: string): Map<string, string> {
  const pathMap = new Map<string, string>();
  const text = raw.replace(/^\uFEFF/, '').trim();
  if (!text || (text[0] !== '[' && text[0] !== '{')) return pathMap;

  try {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : [parsed];

    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const nameValue = (row as { Name?: unknown }).Name;
      const pathValue = (row as { ExecutablePath?: unknown }).ExecutablePath;
      const processName = typeof nameValue === 'string' ? nameValue.trim() : '';
      const executablePath = typeof pathValue === 'string' ? pathValue.trim() : '';
      if (!processName || !executablePath) return;
      pathMap.set(normalizeProcessName(processName), executablePath);
    });
  } catch {
    return pathMap;
  }

  return pathMap;
}

function queryRunningProcessExecutablePathMap(): Promise<Map<string, string>> {
  return new Promise((resolve) => {
    const cmd = 'powershell.exe -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Select-Object Name,ExecutablePath | ConvertTo-Json -Compress"';
    exec(cmd, {
      windowsHide: true,
      timeout: PROCESS_QUERY_TIMEOUT_MS,
      maxBuffer: 6 * 1024 * 1024,
    }, (err, stdout) => {
      if (err) {
        resolve(new Map<string, string>());
        return;
      }
      resolve(parseRunningProcessPathMap(stdout));
    });
  });
}

async function getProcessIconDataUrl(processName: string, pathMap: Map<string, string>): Promise<string | null> {
  const normalized = normalizeProcessName(processName);
  if (!normalized) return null;

  if (processIconCache.has(normalized)) {
    return processIconCache.get(normalized) ?? null;
  }

  const executablePath = pathMap.get(normalized);
  if (!executablePath) {
    setProcessIconCache(normalized, null);
    return null;
  }

  try {
    const iconFromApi = await app.getFileIcon(executablePath, { size: 'small' });
    if (!iconFromApi.isEmpty()) {
      const dataUrl = iconFromApi.resize({ width: 16, height: 16 }).toDataURL();
      setProcessIconCache(normalized, dataUrl);
      return dataUrl;
    }
  } catch {
    // ignore and fallback
  }

  try {
    const icon = nativeImage.createFromPath(executablePath);
    if (!icon.isEmpty()) {
      const dataUrl = icon.resize({ width: 16, height: 16 }).toDataURL();
      setProcessIconCache(normalized, dataUrl);
      return dataUrl;
    }
  } catch {
    // ignore and fallback to null
  }

  setProcessIconCache(normalized, null);
  return null;
}

async function queryRunningNonSystemProcessesWithIcons(): Promise<RunningProcessInfo[]> {
  const names = await queryRunningNonSystemProcessNames();
  if (!names.length) return [];

  const pathMap = await queryRunningProcessExecutablePathMap();
  const items = await Promise.all(names.map(async (name) => ({
    name,
    iconDataUrl: await getProcessIconDataUrl(name, pathMap),
  })));
  return items;
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

    const running = await queryRunningProcessNames();

    const runningSet = new Set(running.map(normalizeProcessName));
    const shouldHide = autoHideProcessList.some((name) => runningSet.has(normalizeProcessName(name)));

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

function sanitizeProcessNameList(list: string[]): string[] {
  const normalizedSet = new Set<string>();
  const sanitized: string[] = [];

  list.forEach((item) => {
    const text = item.trim();
    if (!text) return;
    const key = normalizeProcessName(text);
    if (normalizedSet.has(key)) return;
    normalizedSet.add(key);
    sanitized.push(text);
  });

  return sanitized;
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

/** SMTC Worker 线程引用 */
let smtcWorker: Worker | null = null;

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

/** 进程查询超时，避免挂起占用内存 */
const PROCESS_QUERY_TIMEOUT_MS = 4000;

/** 运行进程图标缓存上限，避免长期增长 */
const PROCESS_ICON_CACHE_MAX = 240;

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

/** 隐藏进程名单轮询计时器 */
let autoHideProcessWatcher: NodeJS.Timeout | null = null;

/** 运行进程图标缓存（key 为 normalize 后的进程名） */
const processIconCache = new Map<string, string | null>();

/** 记录当前生效的设备ID（仅白名单内程序） */
let currentDeviceId: string = nowPlayingWhitelist[0] || '';

interface DetectedSourceEntry {
  isPlaying: boolean;
  hasTitle: boolean;
  updatedAt: number;
}

/** SMTC 原始会话缓存（不受白名单限制），用于获取播放进程按钮 */
const detectedSourceRuntime = new Map<string, DetectedSourceEntry>();

/** SMTC 白名单内会话运行时缓存（模块级，供 IPC 处理器访问） */
interface SmtcSessionRuntimeEntry {
  payload: {
    title: string;
    artist: string;
    album: string;
    duration_ms: number;
    position_ms: number;
    isPlaying: boolean;
    thumbnail: string | null;
    canFastForward: boolean;
    canSkip: boolean;
    canLike: boolean;
    canChangeVolume: boolean;
    canSetOutput: boolean;
    deviceId: string;
  };
  hasTitle: boolean;
  isPlaying: boolean;
  playStartedAt: number;
  updatedAt: number;
}
let smtcSessionRuntime: Map<string, SmtcSessionRuntimeEntry> | null = null;

/** 进程隐藏轮询防重入标记 */
let autoHideCheckInFlight = false;

/** 当前隐藏是否由“隐藏进程命中”触发 */
let hiddenByAutoHideProcess = false;

/** SMTC 缓存上次回收时间 */
let lastSmtcCleanupAt = 0;

/** SMTC 自动取消订阅时间（毫秒），0 为永不取消 */
let smtcUnsubscribeMs = DEFAULT_SMTC_UNSUBSCRIBE_MS;

/** 待确认的播放源切换请求 */
let pendingSourceSwitchId: string = '';
let pendingSourceSwitchEntry: SmtcSessionRuntimeEntry | null = null;

function setProcessIconCache(key: string, value: string | null): void {
  if (!processIconCache.has(key) && processIconCache.size >= PROCESS_ICON_CACHE_MAX) {
    const oldestKey = processIconCache.keys().next().value;
    if (typeof oldestKey === 'string') {
      processIconCache.delete(oldestKey);
    }
  }
  processIconCache.set(key, value);
}

/**
 * 检查当前设备ID是否在白名单内
 */
function isWhitelisted(): boolean {
  const id = currentDeviceId.toLowerCase();
  return nowPlayingWhitelist.some(name => id.includes(name.toLowerCase()));
}

function pickDetectedSourceAppId(): string {
  let bestPlaying = '';
  let bestPlayingAt = 0;
  let bestTitled = '';
  let bestTitledAt = 0;

  detectedSourceRuntime.forEach((entry, sourceAppId) => {
    if (entry.isPlaying && entry.updatedAt >= bestPlayingAt) {
      bestPlaying = sourceAppId;
      bestPlayingAt = entry.updatedAt;
    }
    if (entry.hasTitle && entry.updatedAt >= bestTitledAt) {
      bestTitled = sourceAppId;
      bestTitledAt = entry.updatedAt;
    }
  });

  return bestPlaying || bestTitled;
}

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

/** 当前注册的隐藏快捷键 */
let currentHideHotkey: string = '';

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

/**
 * 注册隐藏灵动岛的全局快捷键
 * @param accelerator - Electron accelerator 字符串（如 "Alt+X"）
 */
function registerHideHotkey(accelerator: string): boolean {
  // 先注销旧快捷键
  const previousHotkey = currentHideHotkey || readHotkeyConfig();
  if (previousHotkey) {
    try { globalShortcut.unregister(previousHotkey); } catch { /* ignore */ }
  }
  currentHideHotkey = '';
  if (!accelerator) return true;
  try {
    const success = globalShortcut.register(accelerator, () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) {
        hiddenByAutoHideProcess = false;
        mainWindow.hide();
      } else {
        hiddenByAutoHideProcess = false;
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    });
    if (success) {
      currentHideHotkey = accelerator;
    }
    return success;
  } catch (err) {
    console.error('[Hotkey] register error:', err);
    return false;
  }
}

/** 当前注册的关闭快捷键 */
let currentQuitHotkey: string = '';

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

/**
 * 注册关闭灵动岛的全局快捷键
 * @param accelerator - Electron accelerator 字符串（如 "Alt+Q"）
 */
function registerQuitHotkey(accelerator: string): boolean {
  // 先注销旧快捷键
  if (currentQuitHotkey) {
    try { globalShortcut.unregister(currentQuitHotkey); } catch { /* ignore */ }
    currentQuitHotkey = '';
  }
  if (!accelerator) return true;
  try {
    const success = globalShortcut.register(accelerator, () => {
      app.quit();
    });
    if (success) {
      currentQuitHotkey = accelerator;
    }
    return success;
  } catch (err) {
    console.error('[QuitHotkey] register error:', err);
    return false;
  }
}

/** 当前注册的截图快捷键 */
let currentScreenshotHotkey: string = '';

/** 截图快捷键存储键名 */
const SCREENSHOT_HOTKEY_STORE_KEY = 'screenshot-hotkey';

/** 默认截图快捷键 */
const DEFAULT_SCREENSHOT_HOTKEY = 'Alt+A';

/** 当前注册的切歌快捷键 */
let currentNextSongHotkey: string = '';

/** 切歌快捷键存储键名 */
const NEXT_SONG_HOTKEY_STORE_KEY = 'next-song-hotkey';

/** 默认切歌快捷键（空表示默认不设置） */
const DEFAULT_NEXT_SONG_HOTKEY = '';

/** 当前注册的暂停/播放快捷键 */
let currentPlayPauseSongHotkey: string = '';

/** 暂停/播放快捷键存储键名 */
const PLAY_PAUSE_SONG_HOTKEY_STORE_KEY = 'play-pause-song-hotkey';

/** 默认暂停/播放快捷键（空表示默认不设置） */
const DEFAULT_PLAY_PAUSE_SONG_HOTKEY = '';

/** 当前注册的还原位置快捷键 */
let currentResetPositionHotkey: string = '';

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

/** 截图窗口引用 */
let captureWindow: BrowserWindow | null = null;

/** 截图窗口启动中锁，防止高频热键并发创建多个窗口 */
let isStartingCaptureWindow = false;

/**
 * 获取 capture.html 的路径（兼容开发环境和打包环境）
 */
function getCaptureHtmlPath(): string {
  if (is.dev) {
    return join(__dirname, '../../resources/capture.html');
  }
  return join(process.resourcesPath, 'capture.html');
}

/**
 * 关闭截图窗口并恢复灵动岛
 */
function closeCaptureWindow(): void {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.close();
  }
}

/**
 * 等待主窗口隐藏完成（短等待，避免固定延迟导致启动变慢）
 * @param timeoutMs - 兜底超时时间（毫秒）
 */
async function waitForMainWindowHidden(timeoutMs: number = 80): Promise<void> {
  const targetWindow = mainWindow;
  if (!targetWindow || targetWindow.isDestroyed() || !targetWindow.isVisible()) {
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (!targetWindow.isDestroyed()) {
        targetWindow.removeListener('hide', finish);
      }
      resolve();
    };

    targetWindow.once('hide', finish);
    targetWindow.hide();
    setTimeout(finish, timeoutMs);
  });
}

/**
 * 启动选区截图流程
 * @description 捕获全屏图像 → 创建全屏透明窗口 → 发送图像到渲染进程 → 用户选区 → 裁剪回传
 */
async function startRegionScreenshot(): Promise<void> {
  if (captureWindow || isStartingCaptureWindow) return;
  isStartingCaptureWindow = true;
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: sw, height: sh } = primaryDisplay.size;
    const sf = primaryDisplay.scaleFactor || 1;

    // 先等待主窗口隐藏（事件驱动 + 短超时），避免固定 200ms 延迟
    await waitForMainWindowHidden();

    // 并行开始截图抓取与截图页加载，减少首屏等待
    const sourcesPromise = desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: Math.round(sw * sf), height: Math.round(sh * sf) },
    });

    // 创建隐藏的截图窗口（加载完成后再显示）
    captureWindow = new BrowserWindow({
      width: sw,
      height: sh,
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
      show: false,
      fullscreen: true,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      movable: false,
      hasShadow: false,
      skipTaskbar: true,
      backgroundColor: '#00000000',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    captureWindow.setAlwaysOnTop(true, 'screen-saver');

    captureWindow.on('closed', () => {
      captureWindow = null;
      // 恢复灵动岛
      if (mainWindow) {
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    });

    // 加载截图选区页面
    const pageLoadPromise = captureWindow.loadFile(getCaptureHtmlPath());

    const sources = await sourcesPromise;
    if (sources.length === 0) {
      closeCaptureWindow();
      if (mainWindow) { mainWindow.show(); mainWindow.setAlwaysOnTop(true, 'screen-saver'); }
      return;
    }

    const screenshot = sources[0].thumbnail;
    const imageBytes = screenshot.toPNG();

    await pageLoadPromise;

    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.webContents.send('capture-image', {
        imageBytes,
        display: primaryDisplay,
        scaleFactor: sf,
      });
      captureWindow.show();
      captureWindow.focus();
    }
  } catch (err) {
    console.error('[Screenshot] start error:', err);
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.destroy();
    }
    captureWindow = null;
    if (mainWindow) { mainWindow.show(); mainWindow.setAlwaysOnTop(true, 'screen-saver'); }
  } finally {
    isStartingCaptureWindow = false;
  }
}

/**
 * 注册截图的全局快捷键
 * @param accelerator - Electron accelerator 字符串（如 "Alt+A"）
 */
function registerScreenshotHotkey(accelerator: string): boolean {
  if (currentScreenshotHotkey) {
    try { globalShortcut.unregister(currentScreenshotHotkey); } catch { /* ignore */ }
    currentScreenshotHotkey = '';
  }
  if (!accelerator) return true;
  try {
    const success = globalShortcut.register(accelerator, () => {
      startRegionScreenshot().catch((err) => {
        console.error('[Screenshot] hotkey trigger error:', err);
      });
    });
    if (success) {
      currentScreenshotHotkey = accelerator;
    }
    return success;
  } catch (err) {
    console.error('[ScreenshotHotkey] register error:', err);
    return false;
  }
}

/**
 * 注册切歌的全局快捷键
 * @param accelerator - Electron accelerator 字符串
 */
function registerNextSongHotkey(accelerator: string): boolean {
  if (currentNextSongHotkey) {
    try { globalShortcut.unregister(currentNextSongHotkey); } catch { /* ignore */ }
    currentNextSongHotkey = '';
  }
  if (!accelerator) return true;
  try {
    const success = globalShortcut.register(accelerator, () => {
      if (!isWhitelisted()) return;
      sendMediaVirtualKey(0xB0);
    });
    if (success) {
      currentNextSongHotkey = accelerator;
    }
    return success;
  } catch (err) {
    console.error('[NextSongHotkey] register error:', err);
    return false;
  }
}

/**
 * 注册暂停/播放的全局快捷键
 * @param accelerator - Electron accelerator 字符串
 */
function registerPlayPauseSongHotkey(accelerator: string): boolean {
  if (currentPlayPauseSongHotkey) {
    try { globalShortcut.unregister(currentPlayPauseSongHotkey); } catch { /* ignore */ }
    currentPlayPauseSongHotkey = '';
  }
  if (!accelerator) return true;
  try {
    const success = globalShortcut.register(accelerator, () => {
      sendMediaVirtualKey(0xB3);
    });
    if (success) {
      currentPlayPauseSongHotkey = accelerator;
    }
    return success;
  } catch (err) {
    console.error('[PlayPauseSongHotkey] register error:', err);
    return false;
  }
}

/**
 * 注册还原灵动岛默认位置的全局快捷键
 * @param accelerator - Electron accelerator 字符串
 */
function registerResetPositionHotkey(accelerator: string): boolean {
  if (currentResetPositionHotkey) {
    try { globalShortcut.unregister(currentResetPositionHotkey); } catch { /* ignore */ }
    currentResetPositionHotkey = '';
  }
  if (!accelerator) return true;
  try {
    const success = globalShortcut.register(accelerator, () => {
      applyIslandPositionOffset(DEFAULT_ISLAND_POSITION_OFFSET);
      writeIslandPositionOffsetConfig(DEFAULT_ISLAND_POSITION_OFFSET);
    });
    if (success) {
      currentResetPositionHotkey = accelerator;
    }
    return success;
  } catch (err) {
    console.error('[ResetPositionHotkey] register error:', err);
    return false;
  }
}

/** 暂停所有灵动岛相关快捷键响应（仅解绑，不修改配置） */
function suspendIslandHotkeys(): void {
  const hideHotkey = currentHideHotkey || readHotkeyConfig();
  const quitHotkey = currentQuitHotkey || readQuitHotkeyConfig();
  const ssHotkey = currentScreenshotHotkey || readScreenshotHotkeyConfig();
  const nextSongHotkey = currentNextSongHotkey || readNextSongHotkeyConfig();
  const playPauseSongHotkey = currentPlayPauseSongHotkey || readPlayPauseSongHotkeyConfig();
  const resetPosHotkey = currentResetPositionHotkey || readResetPositionHotkeyConfig();
  if (hideHotkey) {
    try { globalShortcut.unregister(hideHotkey); } catch { /* ignore */ }
  }
  if (quitHotkey) {
    try { globalShortcut.unregister(quitHotkey); } catch { /* ignore */ }
  }
  if (ssHotkey) {
    try { globalShortcut.unregister(ssHotkey); } catch { /* ignore */ }
  }
  if (nextSongHotkey) {
    try { globalShortcut.unregister(nextSongHotkey); } catch { /* ignore */ }
  }
  if (playPauseSongHotkey) {
    try { globalShortcut.unregister(playPauseSongHotkey); } catch { /* ignore */ }
  }
  if (resetPosHotkey) {
    try { globalShortcut.unregister(resetPosHotkey); } catch { /* ignore */ }
  }
}

/** 恢复所有灵动岛相关快捷键响应（按当前配置重新注册） */
function resumeIslandHotkeys(): void {
  const hideHotkey = currentHideHotkey || readHotkeyConfig();
  const quitHotkey = currentQuitHotkey || readQuitHotkeyConfig();
  const ssHotkey = currentScreenshotHotkey || readScreenshotHotkeyConfig();
  const nextSongHotkey = currentNextSongHotkey || readNextSongHotkeyConfig();
  const playPauseSongHotkey = currentPlayPauseSongHotkey || readPlayPauseSongHotkeyConfig();
  const resetPosHotkey = currentResetPositionHotkey || readResetPositionHotkeyConfig();
  if (hideHotkey) registerHideHotkey(hideHotkey);
  if (quitHotkey) registerQuitHotkey(quitHotkey);
  if (ssHotkey) registerScreenshotHotkey(ssHotkey);
  if (nextSongHotkey) registerNextSongHotkey(nextSongHotkey);
  if (playPauseSongHotkey) registerPlayPauseSongHotkey(playPauseSongHotkey);
  if (resetPosHotkey) registerResetPositionHotkey(resetPosHotkey);
}

/** 记录窗口初始中心 X 坐标 */
let initialCenterX = 0;

/** 计算灵动岛默认窗口边界（主屏工作区顶部居中） */
function getInitialIslandBounds(): Electron.Rectangle {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x: workX, y: workY, width: workWidth, height: workHeight } = primaryDisplay.workArea;
  const centeredX = Math.round(workX + (workWidth - ISLAND_WIDTH) / 2);
  const minX = workX;
  const maxX = workX + Math.max(0, workWidth - ISLAND_WIDTH);
  const minY = workY;
  const maxY = workY + Math.max(0, workHeight - ISLAND_HEIGHT);
  const x = Math.max(minX, Math.min(maxX, centeredX + islandPositionOffset.x));
  const y = Math.max(minY, Math.min(maxY, Math.round(workY + islandPositionOffset.y)));
  return {
    x,
    y,
    width: ISLAND_WIDTH,
    height: ISLAND_HEIGHT,
  };
}

function applyIslandPositionOffset(offset: IslandPositionOffset): void {
  islandPositionOffset = sanitizeIslandPositionOffset(offset);
  const nextBaseBounds = getInitialIslandBounds();
  initialCenterX = nextBaseBounds.x + ISLAND_WIDTH / 2;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('window:island-position:changed', { ...islandPositionOffset });
  }

  if (!mainWindow || mainWindow.isDestroyed()) return;
  const bounds = mainWindow.getBounds();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x: workX, y: workY, width: workWidth, height: workHeight } = primaryDisplay.workArea;
  const targetX = Math.round(initialCenterX - bounds.width / 2);
  const minX = workX;
  const maxX = workX + Math.max(0, workWidth - bounds.width);
  const minY = workY;
  const maxY = workY + Math.max(0, workHeight - bounds.height);
  mainWindow.setBounds({
    x: Math.max(minX, Math.min(maxX, targetX)),
    y: Math.max(minY, Math.min(maxY, nextBaseBounds.y)),
    width: bounds.width,
    height: bounds.height,
  });
}

/**
 * 创建 Electron BrowserWindow 实例，配置透明无边框灵动岛窗口
 * @description 窗口固定尺寸、始终置顶、跳过任务栏，并初始化鼠标穿透行为
 */
function createWindow(): void {
  const initialBounds = getInitialIslandBounds();

  /** 计算初始中心 X 坐标，用于展开/收缩时保持居中 */
  initialCenterX = initialBounds.x + ISLAND_WIDTH / 2;

  mainWindow = new BrowserWindow({
    width: ISLAND_WIDTH,
    height: ISLAND_HEIGHT,
    x: initialBounds.x,
    y: initialBounds.y,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    icon: is.dev
      ? join(__dirname, '../../resources/icon/eisland_256x256.ico')
      : join(process.resourcesPath, 'icon/eisland_256x256.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      enableWebSQL: false,
      v8CacheOptions: 'bypassHeatCheck'
    }
  });

  /**
   * 初始化：透明像素区域设为可穿透，使鼠标事件传递到下层窗口
   * forward: true 仍转发鼠标事件，但不会阻塞（实际由渲染进程按需控制）
   */
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  /** 使用最高级别置顶，确保不被全屏应用或其他置顶窗口覆盖 */
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // 某些 Windows 版本/打包环境下，首次显示前可能回退到系统默认居中，显式重置一次边界
  mainWindow.setBounds(initialBounds, false);

  mainWindow.on('ready-to-show', () => {
    // 再次确保首次展示位置稳定在主屏顶部居中
    mainWindow?.setBounds(initialBounds, false);
    mainWindow?.show();
    mainWindow?.setAlwaysOnTop(true, 'screen-saver');
  });

  /**
   * 窗口失焦时强制背景重绘，防止 Windows DWM 缓存白色回退背景
   */
  mainWindow.on('blur', () => {
    if (mainWindow) {
      mainWindow.setBackgroundColor('#00000000');
      mainWindow.webContents.executeJavaScript(`
        document.body.style.background = 'transparent';
        document.documentElement.style.background = 'transparent';
      `);
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
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

/** 注册 IPC 处理器，供渲染进程动态切换鼠标穿透状态及调整窗口大小 */
function registerIpcHandlers(): void {
  registerWindowIpcHandlers({
    getMainWindow: () => mainWindow,
    getInitialCenterX: () => initialCenterX,
    setHiddenByAutoHideProcess: (hidden) => {
      hiddenByAutoHideProcess = hidden;
    },
    getIslandPositionOffset: () => islandPositionOffset,
    sanitizeIslandPositionOffset,
    applyIslandPositionOffset,
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

  // ===== 音乐媒体控制 IPC 处理器 =====
  ipcMain.handle('media:play-pause', () => {
    sendMediaVirtualKey(0xB3);
  });

  ipcMain.handle('media:next', () => {
    if (!isWhitelisted()) return;
    sendMediaVirtualKey(0xB0);
  });

  ipcMain.handle('media:prev', () => {
    if (!isWhitelisted()) return;
    sendMediaVirtualKey(0xB1);
  });

  /** 接受切换播放源 */
  ipcMain.handle('media:accept-source-switch', () => {
    if (pendingSourceSwitchId && pendingSourceSwitchEntry) {
      currentDeviceId = pendingSourceSwitchId;
      pendingSourceSwitchId = '';
      pendingSourceSwitchEntry = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        const entry = smtcSessionRuntime?.get(currentDeviceId);
        if (entry?.hasTitle) {
          mainWindow.webContents.send('nowplaying:info', entry.payload);
        }
      }
    }
  });

  /** 拒绝切换播放源 */
  ipcMain.handle('media:reject-source-switch', () => {
    pendingSourceSwitchId = '';
    pendingSourceSwitchEntry = null;
  });

  /**
   * 跳转到指定播放位置（SMTC 不支持，保留接口兼容性）
   * @param _event - IPC 事件
   * @param _positionMs - 目标位置（毫秒，暂未实现）
   */
  ipcMain.handle('media:seek', (_event, _positionMs: number) => {
    // SMTCMonitor 暂不支持 seek 操作
  });

  /**
   * 获取系统音量（固定返回 0.5，SMTC 不提供音量查询接口）
   */
  ipcMain.handle('media:get-volume', () => 0.5);

  /**
   * 设置系统音量（SMTC 不支持，保留接口兼容性）
   * @param _event - IPC 事件
   * @param _volume - 目标音量（0.0 ~ 1.0，暂未实现）
   */
  ipcMain.handle('media:set-volume', (_event, _volume: number) => {
    // SMTCMonitor 暂不支持设置音量
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
    detectSourceAppId: () => pickDetectedSourceAppId(),
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
    getCurrentHideHotkey: () => currentHideHotkey,
    getCurrentQuitHotkey: () => currentQuitHotkey,
    getCurrentScreenshotHotkey: () => currentScreenshotHotkey,
    getCurrentNextSongHotkey: () => currentNextSongHotkey,
    getCurrentPlayPauseSongHotkey: () => currentPlayPauseSongHotkey,
    getCurrentResetPositionHotkey: () => currentResetPositionHotkey,
    readHideHotkeyConfig: readHotkeyConfig,
    readQuitHotkeyConfig,
    readScreenshotHotkeyConfig,
    readNextSongHotkeyConfig,
    readPlayPauseSongHotkeyConfig,
    readResetPositionHotkeyConfig,
    registerHideHotkey,
    registerQuitHotkey,
    registerNextSongHotkey,
    registerPlayPauseSongHotkey,
    registerResetPositionHotkey,
    suspendIslandHotkeys,
    resumeIslandHotkeys,
  });

  registerScreenshotHotkeyIpcHandlers({
    storeDir,
    screenshotHotkeyStoreKey: SCREENSHOT_HOTKEY_STORE_KEY,
    getCurrentScreenshotHotkey: () => currentScreenshotHotkey,
    readScreenshotHotkeyConfig,
    getReservedHotkeys: () => {
      const currentHide = currentHideHotkey || readHotkeyConfig();
      const currentQuit = currentQuitHotkey || readQuitHotkeyConfig();
      const currentNextSong = currentNextSongHotkey || readNextSongHotkeyConfig();
      const currentPlayPauseSong = currentPlayPauseSongHotkey || readPlayPauseSongHotkeyConfig();
      const currentResetPos = currentResetPositionHotkey || readResetPositionHotkeyConfig();
      return [currentHide, currentQuit, currentNextSong, currentPlayPauseSong, currentResetPos];
    },
    registerScreenshotHotkey,
  });

  registerCaptureIpcHandlers({
    getCaptureWindow: () => captureWindow,
    closeCaptureWindow,
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

/**
 * 初始化 SMTC Worker 线程，监听系统媒体信息变更并推送到渲染进程
 * @param win - 主窗口引用
 */
function initSmtcWorker(win: BrowserWindow | null): void {
  try {
    const sessionRuntime = new Map<string, SmtcSessionRuntimeEntry>();
    smtcSessionRuntime = sessionRuntime;

    const emitCurrentSession = (): void => {
      if (!win || win.isDestroyed()) return;
      const currentEntry = currentDeviceId ? sessionRuntime.get(currentDeviceId) : undefined;
      if (currentEntry?.hasTitle) {
        win.webContents.send('nowplaying:info', currentEntry.payload);
      } else {
        win.webContents.send('nowplaying:info', null);
      }
    };

    /** 向渲染进程发送播放源切换请求通知 */
    const emitSourceSwitchRequest = (sourceAppId: string, title: string, artist: string): void => {
      if (!win || win.isDestroyed()) return;
      win.webContents.send('media:source-switch-request', { sourceAppId, title, artist });
    };

    const workerPath = join(__dirname, 'smtcWorker.js');
    smtcWorker = new Worker(workerPath);

    smtcWorker.on('message', (msg: {
      type: string;
      sourceAppId?: string;
      session?: {
        media: { title: string; artist: string; albumTitle: string; thumbnail: string | null } | null;
        playback: { playbackStatus: number; playbackType: number } | null;
        timeline: { position: number; duration: number } | null;
      };
    }) => {
      if (!win || win.isDestroyed()) return;

      if (msg.type === 'session-removed') {
        if (msg.sourceAppId) {
          detectedSourceRuntime.delete(msg.sourceAppId);
          sessionRuntime.delete(msg.sourceAppId);
          if (msg.sourceAppId === pendingSourceSwitchId) {
            pendingSourceSwitchId = '';
            pendingSourceSwitchEntry = null;
          }
        }
        if (msg.sourceAppId === currentDeviceId) {
          currentDeviceId = '';
          emitCurrentSession();
        }
        return;
      }

      if (msg.type !== 'session-update') return;

      const { sourceAppId = '', session } = msg;
      const { media, playback, timeline } = session ?? {};
      const now = Date.now();

      if (now - lastSmtcCleanupAt >= SMTC_RUNTIME_CLEANUP_INTERVAL_MS) {
        cleanupStaleSmtcRuntime(sessionRuntime);
        lastSmtcCleanupAt = now;
      }

      if (sourceAppId) {
        detectedSourceRuntime.set(sourceAppId, {
          isPlaying: (playback?.playbackStatus ?? 0) === 4,
          hasTitle: Boolean(media?.title),
          updatedAt: now,
        });
      }

      const sourceAppIdLower = sourceAppId.toLowerCase();
      if (!nowPlayingWhitelist.some(name => sourceAppIdLower.includes(name.toLowerCase()))) return;

      const hasTitle = Boolean(media?.title);
      const isPlaying = (playback?.playbackStatus ?? 0) === 4;

      const payload = {
        title: media?.title ?? '',
        artist: media?.artist ?? '',
        album: media?.albumTitle ?? '',
        duration_ms: Math.round((timeline?.duration ?? 0) * 1000),
        position_ms: Math.round((timeline?.position ?? 0) * 1000),
        isPlaying,
        thumbnail: media?.thumbnail ?? null,
        canFastForward: false,
        canSkip: false,
        canLike: false,
        canChangeVolume: false,
        canSetOutput: false,
        deviceId: sourceAppId,
      };

      const prevEntry = sessionRuntime.get(sourceAppId);
      let playStartedAt = prevEntry?.playStartedAt ?? 0;
      if (isPlaying) {
        if (!prevEntry?.isPlaying || playStartedAt <= 0) {
          playStartedAt = Date.now();
        }
      } else {
        playStartedAt = 0;
      }

      sessionRuntime.set(sourceAppId, {
        payload,
        hasTitle,
        isPlaying,
        playStartedAt,
        updatedAt: now,
      });

      // ===== 播放源锁定逻辑 =====

      // 尚未锁定任何播放源：第一个在播放且有标题的白名单源自动锁定
      if (!currentDeviceId) {
        if (isPlaying && hasTitle) {
          currentDeviceId = sourceAppId;
          emitCurrentSession();
        }
        return;
      }

      // 来自当前锁定源的更新：直接推送
      if (sourceAppId === currentDeviceId) {
        emitCurrentSession();
        // 如果锁定源停止播放且无标题，解锁
        if (!isPlaying && !hasTitle) {
          currentDeviceId = '';
        }
        return;
      }

      // 来自其他源的更新：如果它正在播放且有标题
      if (isPlaying && hasTitle) {
        const lockedEntry = sessionRuntime.get(currentDeviceId);
        if (lockedEntry?.isPlaying) {
          // 锁定源正在播放 → 弹通知询问是否切换
          if (pendingSourceSwitchId === sourceAppId) {
            pendingSourceSwitchEntry = sessionRuntime.get(sourceAppId) ?? null;
            return;
          }
          pendingSourceSwitchId = sourceAppId;
          pendingSourceSwitchEntry = sessionRuntime.get(sourceAppId) ?? null;
          emitSourceSwitchRequest(sourceAppId, payload.title, payload.artist);
        } else {
          // 锁定源未在播放 → 直接切换到新源，无需通知
          currentDeviceId = sourceAppId;
          emitCurrentSession();
        }
      }
    });

    smtcWorker.on('error', (err) => {
      console.error('[SMTC] Worker error:', err);
    });

    smtcWorker.on('exit', (code) => {
      if (code !== 0) console.error('[SMTC] Worker exited with code:', code);
    });
  } catch (err) {
    console.error('[SMTC] Worker init error:', err);
  }
}

/**
 * 终止 SMTC Worker 线程并释放资源
 */
function cleanupSmtcWorker(): void {
  if (smtcWorker) {
    smtcWorker.terminate();
    smtcWorker = null;
  }
  detectedSourceRuntime.clear();
  smtcSessionRuntime?.clear();
  smtcSessionRuntime = null;
  pendingSourceSwitchId = '';
  pendingSourceSwitchEntry = null;
  currentDeviceId = '';
  lastSmtcCleanupAt = 0;
}

function cleanupStaleSmtcRuntime(sessionRuntime: Map<string, SmtcSessionRuntimeEntry>): void {
  const now = Date.now();
  const ttlMs = smtcUnsubscribeMs;
  if (ttlMs === SMTC_UNSUBSCRIBE_NEVER) return;

  detectedSourceRuntime.forEach((entry, sourceAppId) => {
    if (now - entry.updatedAt > ttlMs) {
      detectedSourceRuntime.delete(sourceAppId);
    }
  });

  sessionRuntime.forEach((entry, sourceAppId) => {
    if (now - entry.updatedAt > ttlMs) {
      sessionRuntime.delete(sourceAppId);
      if (sourceAppId === pendingSourceSwitchId) {
        pendingSourceSwitchId = '';
        pendingSourceSwitchEntry = null;
      }
      if (sourceAppId === currentDeviceId) {
        currentDeviceId = '';
      }
    }
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
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features',
  [
    'SpareRendererForSitePerProcess',
    'HardwareMediaKeyHandling',
    'MediaSessionService',
    'WebRtcHideLocalIpsWithMdns',
    'CalculateNativeWinOcclusion',
    'WinRetrieveSuggestionsOnlyOnDemand',
  ].join(',')
);
app.commandLine.appendSwitch('enable-features', 'BackForwardCache');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('disable-print-preview');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128 --lite-mode');
app.commandLine.appendSwitch('disable-dev-shm-usage');

/** 单实例锁回调 */
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
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

  createWindow();
  createTray(mainWindow);

  initSmtcWorker(mainWindow);
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
  registerHideHotkey(savedHotkey);

  // 读取持久化关闭快捷键并注册
  const savedQuitHotkey = readQuitHotkeyConfig();
  if (savedQuitHotkey) registerQuitHotkey(savedQuitHotkey);

  // 读取持久化截图快捷键并注册
  const savedScreenshotHotkey = readScreenshotHotkeyConfig();
  if (savedScreenshotHotkey) registerScreenshotHotkey(savedScreenshotHotkey);

  // 读取持久化切歌快捷键并注册
  const savedNextSongHotkey = readNextSongHotkeyConfig();
  if (savedNextSongHotkey) registerNextSongHotkey(savedNextSongHotkey);

  // 读取持久化暂停/播放快捷键并注册
  const savedPlayPauseSongHotkey = readPlayPauseSongHotkeyConfig();
  if (savedPlayPauseSongHotkey) registerPlayPauseSongHotkey(savedPlayPauseSongHotkey);

  // 读取持久化还原位置快捷键并注册
  const savedResetPositionHotkey = readResetPositionHotkeyConfig();
  if (savedResetPositionHotkey) registerResetPositionHotkey(savedResetPositionHotkey);

  // ===== 自动更新初始化 =====
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.logger = console;
  console.log('[Updater] initialized, allowPrerelease=true, forceDevUpdateConfig=true');
  console.log('[Updater] appPath:', app.getAppPath());
  console.log('[Updater] isPackaged:', app.isPackaged);

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] checking-for-update...');
  });
  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] update-available:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:update-available', {
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
      });
    }
  });
  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] update-not-available, current:', info.version);
  });
  autoUpdater.on('download-progress', (progress) => {
    console.log(`[Updater] download-progress: ${progress.percent.toFixed(1)}%  ${(progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s  ${progress.transferred}/${progress.total}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:download-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      });
    }
  });
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] update-downloaded:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:update-downloaded', { version: info.version });
    }
  });
  autoUpdater.on('error', (err) => {
    console.error('[Updater] error:', err.message);
  });

  // 启动后自动检查更新，延迟确保渲染进程就绪
  setTimeout(() => {
    console.log('[Updater] auto-checking for updates on startup...');
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[Updater] auto-check error:', err);
    });
  }, 5000);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  stopAutoHideProcessWatcher();
  stopClipboardUrlWatcher();
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  stopAutoHideProcessWatcher();
  cleanupSmtcWorker();
  destroyTray();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
