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
 * @file worldClockTypes.ts
 * @description 世界时钟模块类型定义
 * @author 鸡哥
 */

/** 持久化的城市时钟条目 */
export interface WorldClockCity {
  /** IANA 时区 ID，如 "Asia/Shanghai" */
  timezone: string;
  /** 显示名称，如 "上海" */
  label: string;
  /** 排序权重，越小越靠前 */
  order: number;
}

/** 实时时钟数据（运行时，不持久化） */
export interface WorldClockTick {
  timezone: string;
  label: string;
  /** 格式化时间，如 "14:30" */
  formattedTime: string;
  /** 格式化日期，如 "9/4" 或 "9月4日" */
  formattedDate: string;
  /** UTC 偏移，如 "+08:00" */
  utcOffset: string;
  /** 是否处于夏令时 */
  isDST: boolean;
  /** 是否为本机时区 */
  isLocal: boolean;
}

/** 时区选择器条目 */
export interface TimezoneOption {
  timezone: string;
  label: string;
}

/** 持久化存储 key */
export const STORE_KEY = 'worldClockCities';
