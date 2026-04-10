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
 * @file versionApi.ts
 * @description 版本信息接口模块
 * @author 鸡哥
 */

/** 版本信息接口 */
export interface VersionInfo {
  appName: string;
  version: string;
  description: string;
  downloadUrl: string;
  id: number;
  updatedAt: string;
}

/**
 * 获取远程最新版本信息
 * @returns VersionInfo，请求失败时返回 null
 */
export async function fetchVersion(): Promise<VersionInfo | null> {
  try {
    const res = await window.api.netFetch('https://server.pyisland.com/api/v1/version?appName=eisland', {
      method: 'GET',
      timeoutMs: 5000,
    });
    if (!res.ok) return null;
    const payload = JSON.parse(res.body) as { code?: number; data?: VersionInfo };
    if (payload?.code === 200 && payload.data && typeof payload.data.version === 'string') {
      return payload.data;
    }
    return null;
  } catch {
    return null;
  }
}
