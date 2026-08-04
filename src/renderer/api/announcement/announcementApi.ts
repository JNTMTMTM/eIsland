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
 * @file announcementApi.ts
 * @description 公告接口访问模块
 * @author 鸡哥
 */

import { getLanguage } from '../../i18n';
import type { AnnouncementShowMode } from './types/AnnouncementShowMode';
import type { AnnouncementData } from './types/AnnouncementData';
import type { AnnouncementSocialConfig } from './types/AnnouncementSocialConfig';

export type { AnnouncementShowMode, AnnouncementData, AnnouncementSocialConfig };

const IS_DEV_RENDERER = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const ANNOUNCEMENT_API_BASE = IS_DEV_RENDERER
  ? 'https://test.server.pyisland.com/api'
  : 'https://server.pyisland.com/api';

export const ANNOUNCEMENT_SHOW_MODE_STORE_KEY = 'announcement-show-mode';
export const ANNOUNCEMENT_LAST_SHOWN_APP_VERSION_STORE_KEY = 'announcement-last-shown-app-version';

export async function readAnnouncementShowMode(): Promise<AnnouncementShowMode> {
  try {
    const value = await window.api.storeRead(ANNOUNCEMENT_SHOW_MODE_STORE_KEY);
    return value === 'always' || value === 'version-update-only' ? value : 'version-update-only';
  } catch {
    return 'version-update-only';
  }
}

export async function writeAnnouncementShowMode(mode: AnnouncementShowMode): Promise<void> {
  try {
    await window.api.storeWrite(ANNOUNCEMENT_SHOW_MODE_STORE_KEY, mode);
  } catch {
    // ignore
  }
}

export async function readAnnouncementLastShownAppVersion(): Promise<string> {
  try {
    const value = await window.api.storeRead(ANNOUNCEMENT_LAST_SHOWN_APP_VERSION_STORE_KEY);
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

export async function writeAnnouncementLastShownAppVersion(version: string): Promise<void> {
  if (!version) return;
  try {
    await window.api.storeWrite(ANNOUNCEMENT_LAST_SHOWN_APP_VERSION_STORE_KEY, version);
  } catch {
    // ignore
  }
}

const DEFAULT_BVID = 'BV1QEE36eEWJ';

/**
 * 将服务端公告字段收敛为客户端可渲染的数据。
 * @param value - 服务端返回的未知公告值。
 * @returns 有效公告，内容为空时返回 null。
 */
function normalizeAnnouncement(value: unknown, useLegacyDefaultVideo = false): AnnouncementData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const title = typeof data.title === 'string' ? data.title : '';
  const content = typeof data.content === 'string' ? data.content : '';
  const contentHtml = typeof data.contentHtml === 'string' ? data.contentHtml : undefined;
  if (!title && !content && !contentHtml) return null;

  return {
    id: typeof data.id === 'number' ? data.id : undefined,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : undefined,
    title,
    content,
    contentHtml,
    contentFormat: typeof data.contentFormat === 'string' ? data.contentFormat : undefined,
    startAt: typeof data.startAt === 'string' ? data.startAt : undefined,
    endAt: typeof data.endAt === 'string' ? data.endAt : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    bvid: typeof data.bvid === 'string' && data.bvid
      ? data.bvid
      : useLegacyDefaultVideo ? DEFAULT_BVID : undefined,
  };
}

/**
 * 获取当前生效的单条 v1 公告。
 * @returns 当前公告；请求失败或没有有效公告时返回 null。
 */
export async function fetchCurrentAnnouncement(): Promise<AnnouncementData | null> {
  try {
    const language = getLanguage();
    const response = await window.api.netFetch(
      `${ANNOUNCEMENT_API_BASE}/v1/announcement/current?lang=${encodeURIComponent(language)}`,
      {
        method: 'GET',
        timeoutMs: 8000,
      },
    );
    if (!response?.ok) return null;

    const payload = JSON.parse(response.body) as { code?: number; data?: unknown };
    if (payload?.code !== 200) return null;
    return normalizeAnnouncement(payload.data, true);
  } catch {
    return null;
  }
}

/**
 * 获取当前生效的 v2 公告列表。
 * @returns 已规范化的公告数组；请求失败或响应无效时返回空数组。
 */
export async function fetchAnnouncements(): Promise<AnnouncementData[]> {
  try {
    const language = getLanguage();
    const response = await window.api.netFetch(
      `${ANNOUNCEMENT_API_BASE}/v2/announcements/current?lang=${encodeURIComponent(language)}`,
      {
        method: 'GET',
        timeoutMs: 8000,
      },
    );
    if (!response?.ok) return [];

    const payload = JSON.parse(response.body) as { code?: number; data?: unknown };
    if (payload?.code !== 200 || !Array.isArray(payload.data)) return [];
    return payload.data
      .map(normalizeAnnouncement)
      .filter((announcement): announcement is AnnouncementData => announcement !== null);
  } catch {
    return [];
  }
}

/**
 * 获取公告状态机外链配置。
 * @returns 服务端下发的外链配置；请求失败或响应无效时返回空配置。
 */
export async function fetchAnnouncementSocialConfig(): Promise<AnnouncementSocialConfig> {
  const emptyConfig: AnnouncementSocialConfig = {
    githubUrl: '',
    bilibiliUrl: '',
    qqInviteUrl: '',
    qqQrImageUrl: '',
  };
  try {
    const response = await window.api.netFetch(
      `${ANNOUNCEMENT_API_BASE}/v1/announcement/social-config`,
      {
        method: 'GET',
        timeoutMs: 8000,
      },
    );
    if (!response?.ok) return emptyConfig;

    const payload = JSON.parse(response.body) as { code?: number; data?: unknown };
    if (payload?.code !== 200 || !payload.data || typeof payload.data !== 'object') return emptyConfig;
    const data = payload.data as Record<string, unknown>;
    return {
      githubUrl: typeof data.githubUrl === 'string' ? data.githubUrl : '',
      bilibiliUrl: typeof data.bilibiliUrl === 'string' ? data.bilibiliUrl : '',
      qqInviteUrl: typeof data.qqInviteUrl === 'string' ? data.qqInviteUrl : '',
      qqQrImageUrl: typeof data.qqQrImageUrl === 'string' ? data.qqQrImageUrl : '',
    };
  } catch {
    return emptyConfig;
  }
}

/** 广告轮播图数据 */
export interface AdSlideData {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
}

/**
 * 获取当前生效的广告轮播图列表。
 * @returns 已规范化的广告数组；请求失败或响应无效时返回空数组。
 */
export async function fetchAdSlides(): Promise<AdSlideData[]> {
  try {
    const response = await window.api.netFetch(
      `${ANNOUNCEMENT_API_BASE}/v1/ad-slides/current`,
      {
        method: 'GET',
        timeoutMs: 8000,
      },
    );
    if (!response?.ok) return [];

    const payload = JSON.parse(response.body) as { code?: number; data?: unknown };
    if (payload?.code !== 200 || !Array.isArray(payload.data)) return [];
    return payload.data
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .filter((item) => typeof item.imageUrl === 'string' && item.imageUrl.length > 0)
      .map((item) => ({
        id: typeof item.id === 'number' ? item.id : 0,
        title: typeof item.title === 'string' ? item.title : '',
        imageUrl: item.imageUrl as string,
        linkUrl: typeof item.linkUrl === 'string' ? item.linkUrl : '',
        sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
      }))
      .sort((a, b) => b.sortOrder - a.sortOrder || a.id - b.id);
  } catch {
    return [];
  }
}
