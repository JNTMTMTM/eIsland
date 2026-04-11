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
 * @file adcodeApi.ts
 * @description Adcode 国内外行政区域查询接口
 * @author 鸡哥
 */

import { loadNetworkConfig } from '../store/utils/storage';
import { logger } from '../utils/logger';

/** 行政区查询参数 */
export interface DistrictQueryParams {
  /** 行政区编码（可选，与 keyword 二选一或同时提供） */
  adcode?: string;
  /** 区域关键字（支持中文/英文） */
  keyword?: string;
  /** 区域关键字（兼容 SDK 字段） */
  keywords?: string;
  /** 子级深度：0-3 */
  subdistrict?: 0 | 1 | 2 | 3;
  /** 分页页码（从 1 开始） */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
}

/** 行政区条目（保留可扩展字段） */
export interface DistrictItem {
  name?: string;
  adcode?: string;
  level?: string;
  country?: string;
  province?: string;
  city?: string;
  district?: string;
  lat?: number;
  lng?: number;
  [key: string]: unknown;
}

export interface DistrictResolvedLocation {
  latitude: number;
  longitude: number;
  city: string;
  adcode?: string;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseCoordinateObject(value: unknown): { latitude: number; longitude: number } | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  const latitude = toFiniteNumber(obj.lat) ?? toFiniteNumber(obj.latitude);
  const longitude = toFiniteNumber(obj.lng) ?? toFiniteNumber(obj.lon) ?? toFiniteNumber(obj.longitude);
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

function parseCoordinateText(value: unknown): { latitude: number; longitude: number } | null {
  if (typeof value !== 'string') return null;
  const parts = value.split(',').map((part) => part.trim());
  if (parts.length < 2) return null;
  const first = toFiniteNumber(parts[0]);
  const second = toFiniteNumber(parts[1]);
  if (first == null || second == null) return null;

  if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
    return { latitude: first, longitude: second };
  }
  if (Math.abs(first) <= 180 && Math.abs(second) <= 90) {
    return { latitude: second, longitude: first };
  }
  return null;
}

function extractDistrictItems(result: DistrictQueryResult): DistrictItem[] {
  if (Array.isArray(result.results)) return result.results;
  const payload = result.data;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const objectPayload = payload as Record<string, unknown>;
    if (Array.isArray(objectPayload.list)) return objectPayload.list as DistrictItem[];
    if (Array.isArray(objectPayload.results)) return objectPayload.results as DistrictItem[];
  }
  return [];
}

function resolveDistrictCoordinates(item: DistrictItem): { latitude: number; longitude: number } | null {
  const latitude = toFiniteNumber(item.lat) ?? toFiniteNumber(item.latitude);
  const longitude = toFiniteNumber(item.lng) ?? toFiniteNumber(item.lon) ?? toFiniteNumber(item.longitude);
  if (latitude != null && longitude != null) return { latitude, longitude };

  const fromCenter = parseCoordinateText(item.center);
  if (fromCenter) return fromCenter;
  const fromCenterObject = parseCoordinateObject(item.center);
  if (fromCenterObject) return fromCenterObject;
  const fromLocation = parseCoordinateText(item.location);
  if (fromLocation) return fromLocation;
  return null;
}

/** UAPI 返回结构 */
export interface DistrictQueryResult {
  code?: number;
  msg?: string;
  message?: string;
  total?: number;
  results?: DistrictItem[];
  data?: {
    list?: DistrictItem[];
    results?: DistrictItem[];
    [key: string]: unknown;
  } | DistrictItem[];
  [key: string]: unknown;
}

/**
 * Adcode 国内外行政区域查询（UAPI）
 * @docs 文档: https://uapis.cn/docs/api-reference/get-misc-district
 */
export async function fetchDistrictByAdcode(params: DistrictQueryParams): Promise<DistrictQueryResult> {
  const { timeoutMs } = loadNetworkConfig();

  const query = new URLSearchParams();
  if (params.adcode?.trim()) query.set('adcode', params.adcode.trim());
  const keywordText = params.keyword?.trim() || params.keywords?.trim() || '';
  if (keywordText) {
    query.set('keyword', keywordText);
    query.set('keywords', keywordText);
  }
  if (typeof params.subdistrict === 'number') query.set('subdistrict', String(params.subdistrict));
  if (typeof params.page === 'number' && params.page > 0) query.set('page', String(Math.floor(params.page)));
  if (typeof params.pageSize === 'number' && params.pageSize > 0) query.set('page_size', String(Math.floor(params.pageSize)));

  if (![...query.keys()].length) {
    throw new Error('District API 缺少查询参数（adcode 或 keyword）');
  }

  const url = `https://uapis.cn/api/v1/misc/district?${query.toString()}`;
  logger.info('[AdcodeApi] request', { url, timeoutMs, query: Object.fromEntries(query.entries()) });

  const resp = await window.api.netFetch(url, { timeoutMs });
  logger.info('[AdcodeApi] response', { url, status: resp.status, ok: resp.ok, body: resp.body });

  if (!resp.ok) {
    throw new Error(`Adcode API HTTP ${resp.status}: ${resp.body.slice(0, 200)}`);
  }

  if (resp.body.trimStart().startsWith('<')) {
    throw new Error('Adcode API 返回了非 JSON 内容，请检查网络环境');
  }

  const parsed = JSON.parse(resp.body) as DistrictQueryResult;
  if (typeof parsed.code === 'number' && parsed.code !== 200) {
    throw new Error(parsed.msg || parsed.message || `Adcode API 返回错误码 ${parsed.code}`);
  }

  return parsed;
}

/**
 * 通过城市关键字查询并解析经纬度
 */
export async function resolveDistrictLocationByKeyword(keyword: string): Promise<DistrictResolvedLocation> {
  const text = keyword.trim();
  if (!text) throw new Error('请输入城市名称');

  const result = await fetchDistrictByAdcode({ keyword: text, subdistrict: 0, page: 1, pageSize: 10 });
  const list = extractDistrictItems(result);
  if (!list.length) {
    throw new Error('未查询到该城市，请尝试更完整名称');
  }

  const normalized = text.toLowerCase();
  const scored = list
    .map((item) => {
      const name = typeof item.name === 'string' ? item.name : '';
      const coords = resolveDistrictCoordinates(item);
      if (!coords) return null;
      const score = name.toLowerCase() === normalized ? 2 : (name.includes(text) ? 1 : 0);
      return { item, coords, score };
    })
    .filter((value): value is { item: DistrictItem; coords: { latitude: number; longitude: number }; score: number } => Boolean(value))
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    throw new Error('查询结果缺少经纬度信息');
  }

  const best = scored[0];
  const name = typeof best.item.name === 'string' ? best.item.name : text;
  return {
    latitude: best.coords.latitude,
    longitude: best.coords.longitude,
    city: name,
    adcode: typeof best.item.adcode === 'string' ? best.item.adcode : undefined,
  };
}
