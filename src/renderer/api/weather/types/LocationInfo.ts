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
 * @file LocationInfo.ts
 * @description 位置信息数据结构定义
 * @author 鸡哥
 */

/** 位置信息 */
export interface LocationInfo {
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
  /** 城市 */
  city: string;
  /** 地区名称 */
  regionName: string;
  /** 国家 */
  country: string;
  /** ISO 3166-1 国家代码；旧缓存和仅坐标的手动位置可能缺失。 */
  countryCode?: string;
  /** 定位服务的地区短码，可能是 ISO 或 FIPS，不能无条件当作 ISO 3166-2。 */
  regionCode?: string;
}
