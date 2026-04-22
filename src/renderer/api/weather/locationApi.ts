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
 * @file locationApi.ts
 * @description 地理位置接口模块
 * @author 鸡哥
 */

import { loadNetworkConfig } from '../../store/utils/storage';
import { logger } from '../../utils/logger';

/** 位置信息接口 */
export interface LocationInfo {
  latitude: number;
  longitude: number;
  city: string;
  regionName: string;
  country: string;
}

/**
 * 获取当前设备位置（精确坐标）
 * @returns 包含经纬度及城市/地区/国家信息的 LocationInfo
 */
export async function fetchLocation(): Promise<LocationInfo> {
  const { timeoutMs } = loadNetworkConfig();
  const url = 'http://ip-api.com/json/?fields=lat,lon,city,regionName,country&lang=zh-CN';
  const headers: Record<string, string> = {};
  const body = '';
  logger.info('[LocationApi] request', { url, headers, body, timeoutMs });
  const resp = await window.api.netFetch(url, { timeoutMs });
  logger.info('[LocationApi] response', { url, status: resp.status, ok: resp.ok, body: resp.body });
  if (!resp.ok) {
    throw new Error(`Location API HTTP ${resp.status}: ${resp.body.slice(0, 200)}`);
  }
  const data = JSON.parse(resp.body) as {
    lat: number;
    lon: number;
    city: string;
    regionName: string;
    country: string;
  };

  return {
    latitude: data.lat,
    longitude: data.lon,
    city: data.city,
    regionName: data.regionName,
    country: data.country
  };
}
