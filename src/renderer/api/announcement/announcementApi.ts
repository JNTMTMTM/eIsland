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

const IS_DEV_RENDERER = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const ANNOUNCEMENT_API_BASE = IS_DEV_RENDERER
  ? 'https://test.server.pyisland.com/api'
  : 'https://server.pyisland.com/api';

export const ANNOUNCEMENT_SHOW_MODE_STORE_KEY = 'announcement-show-mode';
export const ANNOUNCEMENT_LAST_SHOWN_APP_VERSION_STORE_KEY = 'announcement-last-shown-app-version';

export type AnnouncementShowMode = 'always' | 'version-update-only';

export interface AnnouncementData {
  title: string;
  content: string;
  contentHtml?: string;
  contentFormat?: string;
  startAt?: string;
  endAt?: string;
  updatedAt?: string;
}

export async function readAnnouncementShowMode(): Promise<AnnouncementShowMode> {
  try {
    const value = await window.api.storeRead(ANNOUNCEMENT_SHOW_MODE_STORE_KEY);
    return value === 'always' || value === 'version-update-only' ? value : 'always';
  } catch {
    return 'always';
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

export async function fetchCurrentAnnouncement(): Promise<AnnouncementData | null> {
  try {
    const response = await window.api.netFetch(`${ANNOUNCEMENT_API_BASE}/v1/announcement/current`, {
      method: 'GET',
      timeoutMs: 8000,
    });
    if (!response?.ok) return null;

    const payload = JSON.parse(response.body) as { code?: number; data?: AnnouncementData | null };
    if (payload?.code !== 200 || !payload.data) return null;

    const title = typeof payload.data.title === 'string' ? payload.data.title : '';
    const content = typeof payload.data.content === 'string' ? payload.data.content : '';
    const contentHtml = typeof payload.data.contentHtml === 'string' ? payload.data.contentHtml : undefined;
    const contentFormat = typeof payload.data.contentFormat === 'string' ? payload.data.contentFormat : undefined;
    const startAt = typeof payload.data.startAt === 'string' ? payload.data.startAt : undefined;
    const endAt = typeof payload.data.endAt === 'string' ? payload.data.endAt : undefined;
    const updatedAt = typeof payload.data.updatedAt === 'string' ? payload.data.updatedAt : undefined;

    if (!title && !content && !contentHtml) return null;

    return {
      title,
      content,
      contentHtml,
      contentFormat,
      startAt,
      endAt,
      updatedAt,
    };
  } catch {
    return null;
  }
}
