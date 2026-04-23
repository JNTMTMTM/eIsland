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

export interface AnnouncementData {
  title: string;
  content: string;
  contentHtml?: string;
  contentFormat?: string;
  startAt?: string;
  endAt?: string;
  updatedAt?: string;
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
