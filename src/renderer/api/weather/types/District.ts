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
 * @file District.ts
 * @description 行政区域查询相关数据结构定义
 * @author 鸡哥
 */

/** 行政区查询参数 */
export interface DistrictQueryParams {
  /** 反向查询纬度，与 lng 一同使用。 */
  lat?: number;
  /** 反向查询经度，与 lat 一同使用。 */
  lng?: number;
  /** 返回结果数量上限。 */
  limit?: number;
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

/** 行政区条目 */
export interface DistrictItem {
  /** 名称 */
  name?: string;
  /** 行政区编码 */
  adcode?: string;
  /** 层级 */
  level?: string;
  /** 国家 */
  country?: string;
  /** ISO 3166-1 alpha-2 国家代码。 */
  country_code?: string;
  /** 省份 */
  province?: string;
  /** 城市 */
  city?: string;
  /** 区县 */
  district?: string;
  /** 纬度 */
  lat?: number;
  /** 经度 */
  lng?: number;
  /** 其他扩展字段 */
  [key: string]: unknown;
}

/** 行政区解析后的位置信息 */
export interface DistrictResolvedLocation {
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
  /** 城市 */
  city: string;
  /** 行政区编码 */
  adcode?: string;
}

/** 行政区查询结果 */
export interface DistrictQueryResult {
  /** 状态码 */
  code?: number;
  /** 错误消息 */
  msg?: string;
  /** 错误消息（备选字段） */
  message?: string;
  /** 总数 */
  total?: number;
  /** 结果列表 */
  results?: DistrictItem[];
  /** 数据 */
  data?: {
    /** 列表 */
    list?: DistrictItem[];
    /** 结果列表 */
    results?: DistrictItem[];
    [key: string]: unknown;
  } | DistrictItem[];
  /** 其他扩展字段 */
  [key: string]: unknown;
}
