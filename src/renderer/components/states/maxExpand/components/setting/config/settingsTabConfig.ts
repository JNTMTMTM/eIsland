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
 * @file settingsTabConfig.ts
 * @description 设置页拆分后的配置常量、共享类型与通用工具函数
 * @author 鸡哥
 */

import type { SettingsSidebarTabKey } from '../utils/settingsConfig';

export const CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY = 'clipboard-url-suppress-in-url-favorites';
export const LOCAL_ISLAND_BG_SYNC_EVENT = 'island-bg-local-sync';
export const ISLAND_BG_MEDIA_STORE_KEY = 'island-bg-media';
export const ISLAND_BG_IMAGE_STORE_KEY = 'island-bg-image';
export const ISLAND_BG_VIDEO_FIT_STORE_KEY = 'island-bg-video-fit';
export const ISLAND_BG_VIDEO_MUTED_STORE_KEY = 'island-bg-video-muted';
export const ISLAND_BG_VIDEO_LOOP_STORE_KEY = 'island-bg-video-loop';
export const ISLAND_BG_VIDEO_VOLUME_STORE_KEY = 'island-bg-video-volume';
export const ISLAND_BG_VIDEO_RATE_STORE_KEY = 'island-bg-video-rate';
export const ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY = 'island-bg-video-hw-decode';
export const ISLAND_BG_SYNC_SYSTEM_WALLPAPER_STORE_KEY = 'island-bg-sync-system-wallpaper';
export const STANDALONE_WINDOW_MAC_CONTROLS_STORE_KEY = 'standalone-window-mac-controls';
export const ISLAND_DISPLAY_STORE_KEY = 'island-display-id';
export const UPDATE_SOURCE_STORE_KEY = 'update-source';
export const UPDATE_AUTO_PROMPT_STORE_KEY = 'update-auto-prompt-enabled';
export const WEATHER_ALERT_ENABLED_STORE_KEY = 'weather-alert-enabled';
export const MAIL_CONFIG_STORE_KEY = 'mail-account-config';
export const MAIL_ACCOUNTS_STORE_KEY = 'mail-accounts-config';
export const MAIL_FETCH_LIMIT_STORE_KEY = 'mail-fetch-limit';
export const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';
export const ISLAND_AUTO_DIM_ENABLED_STORE_KEY = 'island-auto-dim-enabled';
export const ISLAND_AUTO_DIM_DELAY_STORE_KEY = 'island-auto-dim-delay';
export const AUTO_HIDE_FULLSCREEN_WINDOWS_STORE_KEY = 'auto-hide-fullscreen-windows';
export const DEFAULT_AUTO_DIM_DELAY_SEC = 10;

export type SettingsOpenTabIntent = 'update' | 'about-feedback' | 'user-orders' | 'user-info' | 'ai' | 'mail' | 'performance-monitor' | 'expand-layout';

export type IslandBgMediaType = 'image' | 'video';

export interface IslandBgMediaConfig {
  type: IslandBgMediaType;
  source: string;
}

export interface MailAccountConfig {
  id: string;
  label: string;
  emailAddress: string;
  imapHost: string;
  imapPort: string;
  imapSecure: boolean;
  authUser: string;
  authSecret: string;
}

export interface RunningWindowItem {
  id: string;
  title: string;
  processName: string;
  processPath: string | null;
  processId: number | null;
  iconDataUrl: string | null;
}

export type PluginMarketPageKey = 'wallpaper' | 'contribution' | 'edit';
export type UpdateSourceKey = 'cloudflare-r2' | 'esa-cdn' | 'tencent-cos' | 'aliyun-oss' | 'github';
export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'latest';

export interface UpdateDownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

const PRO_UPDATE_SOURCE_SET: ReadonlySet<UpdateSourceKey> = new Set<UpdateSourceKey>(['tencent-cos', 'aliyun-oss']);

export const PLUGIN_MARKET_PAGES: PluginMarketPageKey[] = ['wallpaper', 'contribution', 'edit'];

export const UPDATE_SOURCES: { key: UpdateSourceKey; label: string; proOnly?: boolean }[] = [
  { key: 'cloudflare-r2', label: 'Cloudflare R2' },
  { key: 'esa-cdn', label: 'ESA CDN' },
  { key: 'tencent-cos', label: 'Tencent COS', proOnly: true },
  { key: 'aliyun-oss', label: 'Aliyun OSS', proOnly: true },
  { key: 'github', label: 'GitHub Releases' },
];

/**
 * 生成邮件账户唯一标识。
 * @returns 基于时间戳与随机片段生成的账户 ID
 */
export function generateMailAccountId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 判断是否为可直接用于预览的背景媒体地址。
 * @param source - 背景媒体源地址
 * @returns 是否为无需本地协议转换的直连地址
 */
export function isDirectBgMediaUrl(source: string): boolean {
  return source.startsWith('data:')
    || source.startsWith('http://')
    || source.startsWith('https://')
    || source.startsWith('blob:')
    || source.startsWith('file:')
    || source.startsWith('/')
    || source.startsWith('./')
    || source.startsWith('../')
    || source.startsWith('assets/');
}

function toMediaUrl(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return `eisland-media://local/${encodeURIComponent(normalized)}`;
}

/**
 * 归一化背景媒体配置，兼容历史字段。
 * @param value - 持久化读取到的原始配置值
 * @returns 统一后的背景媒体配置，若无效则返回 null
 */
export function normalizeBgMediaConfig(value: unknown): IslandBgMediaConfig | null {
  if (typeof value === 'string') {
    const source = value.trim();
    return source ? { type: 'image', source } : null;
  }
  if (!value || typeof value !== 'object') return null;

  const candidate = value as { type?: unknown; source?: unknown; image?: unknown; url?: unknown };
  const sourceRaw = typeof candidate.source === 'string'
    ? candidate.source
    : typeof candidate.image === 'string'
      ? candidate.image
      : typeof candidate.url === 'string'
        ? candidate.url
        : null;
  if (!sourceRaw) return null;

  const source = sourceRaw.trim();
  if (!source) return null;

  if (candidate.type === 'video') {
    return { type: 'video', source };
  }
  return { type: 'image', source };
}

/**
 * 解析背景媒体预览地址。
 * @param media - 背景媒体配置
 * @returns 可用于渲染层预览的 URL
 */
export async function resolveBgMediaPreviewUrl(media: IslandBgMediaConfig): Promise<string | null> {
  if (media.type === 'image') {
    if (isDirectBgMediaUrl(media.source)) return media.source;
    return window.api.loadWallpaperFile?.(media.source) ?? null;
  }
  if (isDirectBgMediaUrl(media.source)) return media.source;
  return toMediaUrl(media.source);
}

/**
 * 应用岛屿透明度到全局样式变量。
 * @param opacity - 透明度百分比
 */
export function applyIslandOpacity(opacity: number): void {
  const safe = Math.max(10, Math.min(100, Math.round(opacity)));
  document.documentElement.style.setProperty('--island-opacity', String(safe));
}

const normalizeRoleValue = (value: string): string => {
  return value.trim().toLowerCase().replace(/^role_/, '');
};

/**
 * 从 JWT Token 中解析角色字段。
 * @param token - 本地会话 Token
 * @returns 归一化后的角色名，解析失败时返回 null
 */
export const getRoleFromToken = (token: string | null | undefined): string | null => {
  if (!token) return null;
  const rawToken = token.trim().replace(/^bearer\s+/i, '');
  const parts = rawToken.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalizedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = JSON.parse(atob(normalizedPayload)) as { role?: unknown };
    return typeof decoded.role === 'string' ? normalizeRoleValue(decoded.role) : null;
  } catch {
    return null;
  }
};

/**
 * 判断更新源是否仅 PRO 可用。
 * @param source - 更新源标识
 * @returns 是否为 PRO 专属更新源
 */
export const isProOnlyUpdateSource = (source: UpdateSourceKey): boolean => {
  return PRO_UPDATE_SOURCE_SET.has(source);
};

export const HOVER_MUSIC_BG_STYLE_STORE_KEY = 'hover-music-bg-style';

export const SETTINGS_SIDEBAR_DEFAULT_TAB: SettingsSidebarTabKey = 'index';
