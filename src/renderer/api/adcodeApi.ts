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

/** UAPI 返回结构 */
export interface DistrictQueryResult {
  code?: number;
  msg?: string;
  message?: string;
  data?: {
    list?: DistrictItem[];
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
  if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
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
