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
 * @file storeConfig.ts
 * @description 应用配置存储模块
 * @description 定义常量、类型和读写配置的辅助函数
 * @author 鸡哥
 */

import { app } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import {
  normalizeClipboardUrlDetectMode,
  sanitizeClipboardUrlBlacklist,
} from '../utils/clipboardUrl';
import { sanitizeProcessNameList } from '../system/runningProcesses';

// ===== Types =====

export type ClipboardUrlDetectMode = 'https-only' | 'http-https' | 'domain-only';

export interface IslandPositionOffset {
  x: number;
  y: number;
}

/**
 * 规范化灵动岛显示器选择配置
 * @param raw - 原始配置数据
 * @returns primary 或显示器 id 字符串
 */
export function sanitizeIslandDisplaySelection(raw: unknown): string {
  if (raw === 'primary') return 'primary';
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(Math.trunc(raw));
  if (typeof raw === 'string' && /^-?\d+$/.test(raw.trim())) return raw.trim();
  return DEFAULT_ISLAND_DISPLAY_SELECTION;
}

// ===== 灵动岛尺寸常量 =====

export const ISLAND_WIDTH = 260;
export const ISLAND_HEIGHT = 42;
export const EXPANDED_WIDTH = 500;
export const EXPANDED_HEIGHT = 60;
export const NOTIFICATION_WIDTH = 500;
export const NOTIFICATION_HEIGHT = 88;
export const LYRICS_WIDTH = 500;
export const LYRICS_HEIGHT = 42;
/** 单击展开后的完整面板尺寸 */
export const EXPANDED_FULL_WIDTH = 860;
export const EXPANDED_FULL_HEIGHT = 150;
/** 设置面板尺寸 */
export const SETTINGS_WIDTH = 860;
export const SETTINGS_HEIGHT = 400;

// ===== SMTC 常量 =====

/** SMTC 取消订阅设为永不取消时的值 */
export const SMTC_UNSUBSCRIBE_NEVER = 0;

/** SMTC 取消订阅默认时间（毫秒） */
export const DEFAULT_SMTC_UNSUBSCRIBE_MS = SMTC_UNSUBSCRIBE_NEVER;

/** SMTC 取消订阅最小可配置值（毫秒） */
export const MIN_SMTC_UNSUBSCRIBE_MS = 1000;

/** SMTC 取消订阅最大可配置值（毫秒） */
export const MAX_SMTC_UNSUBSCRIBE_MS = 30 * 60 * 1000;

/** SMTC 缓存清理最小间隔 */
export const SMTC_RUNTIME_CLEANUP_INTERVAL_MS = 30 * 1000;

// ===== 默认值 =====

/** 播放程序白名单默认值 */
export const DEFAULT_WHITELIST = ['QQMusic.exe', 'cloudmusic.exe', '汽水音乐', 'kugou'];

/** 隐藏窗口名单默认值 */
export const DEFAULT_HIDE_PROCESS_LIST: string[] = [];

/** 剪贴板 URL 监听开关默认值 */
export const DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED = true;

/** 剪贴板 URL 识别模式默认值 */
export const DEFAULT_CLIPBOARD_URL_DETECT_MODE: ClipboardUrlDetectMode = 'http-https';

/** 剪贴板 URL 黑名单默认值 */
export const DEFAULT_CLIPBOARD_URL_BLACKLIST: string[] = [];

/** 灵动岛位置偏移默认值（相对主屏工作区顶部居中） */
export const DEFAULT_ISLAND_POSITION_OFFSET: IslandPositionOffset = { x: 0, y: 0 };

/** 灵动岛显示器选择默认值（primary 表示主显示器） */
export const DEFAULT_ISLAND_DISPLAY_SELECTION = 'primary';

/** 默认隐藏快捷键 */
export const DEFAULT_HIDE_HOTKEY = 'Alt+X';

/** 默认关闭快捷键（空表示默认不设置） */
export const DEFAULT_QUIT_HOTKEY = 'Alt+C';

/** 默认截图快捷键 */
export const DEFAULT_SCREENSHOT_HOTKEY = 'Alt+A';

/** 默认切歌快捷键（空表示默认不设置） */
export const DEFAULT_NEXT_SONG_HOTKEY = '';

/** 默认暂停/播放快捷键（空表示默认不设置） */
export const DEFAULT_PLAY_PAUSE_SONG_HOTKEY = '';

/** 默认还原位置快捷键（空表示默认不设置） */
export const DEFAULT_RESET_POSITION_HOTKEY = '';

/** 默认切换托盘图标快捷键（空表示默认不设置） */
export const DEFAULT_TOGGLE_TRAY_HOTKEY = '';

/** 默认显示配置窗口快捷键（空表示默认不设置） */
export const DEFAULT_SHOW_SETTINGS_WINDOW_HOTKEY = '';

/** 默认打开剪贴板历史快捷键（空表示默认不设置） */
export const DEFAULT_OPEN_CLIPBOARD_HISTORY_HOTKEY = '';

/** 默认切换鼠标穿透快捷键（空表示默认不设置） */
export const DEFAULT_TOGGLE_PASSTHROUGH_HOTKEY = '';

/** 默认切换 UI 状态锁定快捷键（空表示默认不设置） */
export const DEFAULT_TOGGLE_UI_LOCK_HOTKEY = '';

/** 默认 Agent 语音输入快捷键（长按触发） */
export const DEFAULT_AGENT_VOICE_INPUT_HOTKEY = 'Alt+P';

// ===== Store 键名 =====

/** 白名单存储键名 */
export const WHITELIST_STORE_KEY = 'music-whitelist';

/** 歌词源存储键名 */
export const LYRICS_SOURCE_STORE_KEY = 'lyrics-source';

/** 逐字扫光开关存储键名 */
export const LYRICS_KARAOKE_STORE_KEY = 'lyrics-karaoke';

/** 歌词界面时钟开关存储键名 */
export const LYRICS_CLOCK_STORE_KEY = 'lyrics-clock';

/** SMTC 取消订阅时间存储键名 */
export const SMTC_UNSUBSCRIBE_MS_STORE_KEY = 'music-smtc-unsubscribe-ms';

/** 隐藏进程名单存储键名 */
export const HIDE_PROCESS_LIST_STORE_KEY = 'hide-process-list';

/** 主题模式存储键名 */
export const THEME_MODE_STORE_KEY = 'theme-mode';

/** 灵动岛透明度存储键名 */
export const ISLAND_OPACITY_STORE_KEY = 'island-opacity';

/** expand 鼠标移开回 idle 开关存储键名 */
export const EXPAND_MOUSELEAVE_IDLE_STORE_KEY = 'expand-mouseleave-idle';

/** maxExpand 鼠标移开回 idle 开关存储键名 */
export const MAXEXPAND_MOUSELEAVE_IDLE_STORE_KEY = 'maxexpand-mouseleave-idle';

/** idle 状态点击展开开关存储键名 */
export const IDLE_CLICK_EXPAND_STORE_KEY = 'idle-click-expand';

/** 灵动岛弹性动画开关存储键名 */
export const SPRING_ANIMATION_STORE_KEY = 'spring-animation';

/** 灵动岛动画速度存储键名 */
export const ANIMATION_SPEED_STORE_KEY = 'animation-speed';

/** 剪贴板 URL 监听开关存储键名 */
export const CLIPBOARD_URL_MONITOR_ENABLED_STORE_KEY = 'clipboard-url-monitor-enabled';

/** 剪贴板 URL 识别模式存储键名 */
export const CLIPBOARD_URL_DETECT_MODE_STORE_KEY = 'clipboard-url-detect-mode';

/** 剪贴板 URL 黑名单存储键名（按域名） */
export const CLIPBOARD_URL_BLACKLIST_STORE_KEY = 'clipboard-url-blacklist';

/** 开机自启模式存储键名 */
export const AUTOSTART_MODE_STORE_KEY = 'autostart-mode';

/** 自动提示版本更新开关存储键名 */
export const UPDATE_AUTO_PROMPT_STORE_KEY = 'update-auto-prompt-enabled';

/** 快速导航卡片顺序存储键名 */
export const NAV_ORDER_STORE_KEY = 'nav-order';

/** 灵动岛位置偏移存储键名 */
export const ISLAND_POSITION_STORE_KEY = 'island-position-offset';

/** 灵动岛显示器选择存储键名 */
export const ISLAND_DISPLAY_STORE_KEY = 'island-display-id';

/** 隐藏快捷键存储键名 */
export const HOTKEY_STORE_KEY = 'hide-hotkey';

/** 关闭快捷键存储键名 */
export const QUIT_HOTKEY_STORE_KEY = 'quit-hotkey';

/** 截图快捷键存储键名 */
export const SCREENSHOT_HOTKEY_STORE_KEY = 'screenshot-hotkey';

/** 切歌快捷键存储键名 */
export const NEXT_SONG_HOTKEY_STORE_KEY = 'next-song-hotkey';

/** 暂停/播放快捷键存储键名 */
export const PLAY_PAUSE_SONG_HOTKEY_STORE_KEY = 'play-pause-song-hotkey';

/** 还原位置快捷键存储键名 */
export const RESET_POSITION_HOTKEY_STORE_KEY = 'reset-position-hotkey';

/** 切换托盘图标快捷键存储键名 */
export const TOGGLE_TRAY_HOTKEY_STORE_KEY = 'toggle-tray-hotkey';

/** 显示配置窗口快捷键存储键名 */
export const SHOW_SETTINGS_WINDOW_HOTKEY_STORE_KEY = 'show-settings-window-hotkey';

/** 打开剪贴板历史快捷键存储键名 */
export const OPEN_CLIPBOARD_HISTORY_HOTKEY_STORE_KEY = 'open-clipboard-history-hotkey';

/** 切换鼠标穿透快捷键存储键名 */
export const TOGGLE_PASSTHROUGH_HOTKEY_STORE_KEY = 'toggle-passthrough-hotkey';

/** 切换 UI 状态锁定快捷键存储键名 */
export const TOGGLE_UI_LOCK_HOTKEY_STORE_KEY = 'toggle-ui-lock-hotkey';

/** Agent 语音输入快捷键存储键名 */
export const AGENT_VOICE_INPUT_HOTKEY_STORE_KEY = 'agent-voice-input-hotkey';

// ===== Helper =====

function getStoreDir(): string {
  return join(app.getPath('userData'), 'eIsland_store');
}

function readJsonFile(storeKey: string): unknown | undefined {
  try {
    const filePath = join(getStoreDir(), `${storeKey}.json`);
    if (!existsSync(filePath)) return undefined;
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return undefined;
  }
}

// ===== Sanitize =====

/**
 * 规范化灵动岛位置偏移配置
 * @param raw - 原始配置数据
 * @returns 规范化后的位置偏移对象
 */
export function sanitizeIslandPositionOffset(raw: unknown): IslandPositionOffset {
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

/**
 * 规范化 SMTC 取消订阅时间配置
 * @param value - 原始配置值
 * @returns 规范化后的毫秒数
 */
export function sanitizeSmtcUnsubscribeMs(value: unknown): number {
  if (value === SMTC_UNSUBSCRIBE_NEVER) return SMTC_UNSUBSCRIBE_NEVER;
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SMTC_UNSUBSCRIBE_MS;
  const rounded = Math.round(value);
  if (rounded <= 0) return SMTC_UNSUBSCRIBE_NEVER;
  return Math.min(MAX_SMTC_UNSUBSCRIBE_MS, Math.max(MIN_SMTC_UNSUBSCRIBE_MS, rounded));
}

// ===== Read =====

/**
 * 读取隐藏快捷键配置
 * @returns 快捷键字符串
 */
export function readHotkeyConfig(): string {
  const data = readJsonFile(HOTKEY_STORE_KEY);
  return typeof data === 'string' ? data : DEFAULT_HIDE_HOTKEY;
}

/**
 * 读取退出快捷键配置
 * @returns 快捷键字符串
 */
export function readQuitHotkeyConfig(): string {
  const data = readJsonFile(QUIT_HOTKEY_STORE_KEY);
  return typeof data === 'string' ? data : DEFAULT_QUIT_HOTKEY;
}

/**
 * 读取截图快捷键配置
 * @returns 快捷键字符串
 */
export function readScreenshotHotkeyConfig(): string {
  const data = readJsonFile(SCREENSHOT_HOTKEY_STORE_KEY);
  return typeof data === 'string' ? data : DEFAULT_SCREENSHOT_HOTKEY;
}

/**
 * 读取下一首快捷键配置
 * @returns 快捷键字符串
 */
export function readNextSongHotkeyConfig(): string {
  const data = readJsonFile(NEXT_SONG_HOTKEY_STORE_KEY);
  return typeof data === 'string' ? data : DEFAULT_NEXT_SONG_HOTKEY;
}

/**
 * 读取播放/暂停快捷键配置
 * @returns 快捷键字符串
 */
export function readPlayPauseSongHotkeyConfig(): string {
  const data = readJsonFile(PLAY_PAUSE_SONG_HOTKEY_STORE_KEY);
  return typeof data === 'string' ? data : DEFAULT_PLAY_PAUSE_SONG_HOTKEY;
}

/**
 * 读取还原位置快捷键配置
 * @returns 快捷键字符串
 */
export function readResetPositionHotkeyConfig(): string {
  const data = readJsonFile(RESET_POSITION_HOTKEY_STORE_KEY);
  return typeof data === 'string' ? data : DEFAULT_RESET_POSITION_HOTKEY;
}

/**
 * 读取切换托盘图标快捷键配置
 * @returns 快捷键字符串
 */
export function readToggleTrayHotkeyConfig(): string {
  const data = readJsonFile(TOGGLE_TRAY_HOTKEY_STORE_KEY);
  return typeof data === 'string' ? data : DEFAULT_TOGGLE_TRAY_HOTKEY;
}

/**
 * 读取显示配置窗口快捷键配置
 * @returns 快捷键字符串
 */
export function readShowSettingsWindowHotkeyConfig(): string {
  const data = readJsonFile(SHOW_SETTINGS_WINDOW_HOTKEY_STORE_KEY);
  return typeof data === 'string' ? data : DEFAULT_SHOW_SETTINGS_WINDOW_HOTKEY;
}

/**
 * 读取打开剪贴板历史快捷键配置
 * @returns 快捷键字符串
 */
export function readOpenClipboardHistoryHotkeyConfig(): string {
  const data = readJsonFile(OPEN_CLIPBOARD_HISTORY_HOTKEY_STORE_KEY);
  return typeof data === 'string' ? data : DEFAULT_OPEN_CLIPBOARD_HISTORY_HOTKEY;
}

/**
 * 读取切换鼠标穿透快捷键配置
 * @returns 快捷键字符串
 */
export function readTogglePassthroughHotkeyConfig(): string {
  const data = readJsonFile(TOGGLE_PASSTHROUGH_HOTKEY_STORE_KEY);
  return typeof data === 'string' ? data : DEFAULT_TOGGLE_PASSTHROUGH_HOTKEY;
}

/**
 * 读取切换 UI 状态锁定快捷键配置
 * @returns 快捷键字符串
 */
export function readToggleUiLockHotkeyConfig(): string {
  const data = readJsonFile(TOGGLE_UI_LOCK_HOTKEY_STORE_KEY);
  return typeof data === 'string' ? data : DEFAULT_TOGGLE_UI_LOCK_HOTKEY;
}

/**
 * 读取 Agent 语音输入快捷键配置
 * @returns 快捷键字符串
 */
export function readAgentVoiceInputHotkeyConfig(): string {
  const data = readJsonFile(AGENT_VOICE_INPUT_HOTKEY_STORE_KEY);
  return typeof data === 'string' ? data : DEFAULT_AGENT_VOICE_INPUT_HOTKEY;
}

/**
 * 读取播放器白名单配置
 * @returns 播放器名称数组
 */
export function readWhitelistConfig(): string[] {
  const data = readJsonFile(WHITELIST_STORE_KEY);
  return Array.isArray(data) ? data : DEFAULT_WHITELIST;
}

/**
 * 读取歌词源配置
 * @returns 歌词源字符串
 */
export function readLyricsSourceConfig(): string {
  const data = readJsonFile(LYRICS_SOURCE_STORE_KEY);
  return typeof data === 'string' ? data : 'auto';
}

/**
 * 读取 SMTC 取消订阅时间配置
 * @returns 毫秒数
 */
export function readSmtcUnsubscribeMsConfig(): number {
  const data = readJsonFile(SMTC_UNSUBSCRIBE_MS_STORE_KEY);
  return data !== undefined ? sanitizeSmtcUnsubscribeMs(data) : DEFAULT_SMTC_UNSUBSCRIBE_MS;
}

/**
 * 读取隐藏进程名单配置
 * @returns 进程名称数组
 */
export function readHideProcessListConfig(): string[] {
  const data = readJsonFile(HIDE_PROCESS_LIST_STORE_KEY);
  return Array.isArray(data) ? sanitizeProcessNameList(data.filter((x) => typeof x === 'string')) : DEFAULT_HIDE_PROCESS_LIST;
}

/**
 * 读取灵动岛位置偏移配置
 * @returns 位置偏移对象
 */
export function readIslandPositionOffsetConfig(): IslandPositionOffset {
  const data = readJsonFile(ISLAND_POSITION_STORE_KEY);
  return data !== undefined ? sanitizeIslandPositionOffset(data) : { ...DEFAULT_ISLAND_POSITION_OFFSET };
}

/**
 * 读取灵动岛显示器选择配置
 * @returns primary 或显示器 id 字符串
 */
export function readIslandDisplaySelectionConfig(): string {
  const data = readJsonFile(ISLAND_DISPLAY_STORE_KEY);
  return data !== undefined ? sanitizeIslandDisplaySelection(data) : DEFAULT_ISLAND_DISPLAY_SELECTION;
}

/**
 * 写入灵动岛位置偏移配置
 * @param offset - 位置偏移对象
 * @returns 是否写入成功
 */
export function writeIslandPositionOffsetConfig(offset: IslandPositionOffset): boolean {
  try {
    const storeDir = getStoreDir();
    if (!existsSync(storeDir)) mkdirSync(storeDir, { recursive: true });
    const filePath = join(storeDir, `${ISLAND_POSITION_STORE_KEY}.json`);
    writeFileSync(filePath, JSON.stringify(offset, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[IslandPosition] persist error:', err);
    return false;
  }
}

/**
 * 写入灵动岛显示器选择配置
 * @param selection - primary 或显示器 id 字符串
 * @returns 是否写入成功
 */
export function writeIslandDisplaySelectionConfig(selection: string): boolean {
  try {
    const storeDir = getStoreDir();
    if (!existsSync(storeDir)) mkdirSync(storeDir, { recursive: true });
    const filePath = join(storeDir, `${ISLAND_DISPLAY_STORE_KEY}.json`);
    writeFileSync(filePath, JSON.stringify(sanitizeIslandDisplaySelection(selection), null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[IslandDisplay] persist error:', err);
    return false;
  }
}

/**
 * 读取剪贴板 URL 监听开关配置
 * @returns 是否启用监听
 */
export function readClipboardUrlMonitorEnabledConfig(): boolean {
  const data = readJsonFile(CLIPBOARD_URL_MONITOR_ENABLED_STORE_KEY);
  return typeof data === 'boolean' ? data : DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED;
}

/**
 * 读取剪贴板 URL 检测模式配置
 * @returns 检测模式字符串
 */
export function readClipboardUrlDetectModeConfig(): ClipboardUrlDetectMode {
  const data = readJsonFile(CLIPBOARD_URL_DETECT_MODE_STORE_KEY);
  const normalized = normalizeClipboardUrlDetectMode(data);
  return normalized || DEFAULT_CLIPBOARD_URL_DETECT_MODE;
}

/**
 * 读取剪贴板 URL 黑名单配置
 * @returns 域名数组
 */
export function readClipboardUrlBlacklistConfig(): string[] {
  const data = readJsonFile(CLIPBOARD_URL_BLACKLIST_STORE_KEY);
  return data !== undefined ? sanitizeClipboardUrlBlacklist(data) : DEFAULT_CLIPBOARD_URL_BLACKLIST;
}

/**
 * 读取自动提示版本更新开关配置
 * @returns 是否启用自动提示
 */
export function readUpdateAutoPromptConfig(): boolean {
  const data = readJsonFile(UPDATE_AUTO_PROMPT_STORE_KEY);
  return typeof data === 'boolean' ? data : true;
}
