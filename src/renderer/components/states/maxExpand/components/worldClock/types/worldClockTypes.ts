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

import type { Dispatch, SetStateAction } from 'react';

/** 持久化的城市时钟条目 */
export interface WorldClockCity {
  /** IANA 时区 ID，如 "Asia/Shanghai" */
  timezone: string;
  /** 显示名称，如 "上海" */
  label: string;
  /** 城市翻译键；旧存档可通过时区推导 */
  labelKey?: string;
  /** 排序权重，越小越靠前 */
  order: number;
}

/** 实时时钟数据（运行时，不持久化） */
export interface WorldClockTick {
  timezone: string;
  label: string;
  labelKey?: string;
  countryCode?: string;
  /** 时钟库的完整日期时间，包含秒与上午/下午 */
  formattedTime: string;
  /** 格式化日期，如 "9/4" 或 "9月4日" */
  formattedDate: string;
  /** 模拟时钟指针角度，以十二点方向为零度 */
  handAngles: { hour: number; minute: number; second: number };
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
  /** 回退显示名（英文/时区 ID） */
  label: string;
  /** i18n 翻译键 */
  labelKey: string;
  /** ISO 3166-1 alpha-2 国家代码；UTC 等无归属时为空 */
  countryCode?: string;
}

/** 持久化存储 key */
export const STORE_KEY = 'worldClockCities';

// ── 组件 Props ──

/** WorldClockCard 组件 Props */
export interface WorldClockCardProps {
  tick: WorldClockTick;
  onRemove: (timezone: string) => void;
  /** 城市选择器中的删除操作正在指向此卡片 */
  removeHighlighted?: boolean;
}

/** WorldClockCityPicker 组件 Props */
export interface WorldClockCityPickerProps {
  /** 面板是否可见 */
  visible: boolean;
  /** 已存在的时区（用于匹配删除目标） */
  existingTimezones: string[];
  /** 选择回调 */
  onSelect: (city: WorldClockCity) => void;
  /** 删除已添加的时钟 */
  onRemove: (timezone: string) => void;
  /** 通知主面板高亮或取消高亮待删除的卡片 */
  onRemoveHover: (timezone: string | null) => void;
  /** 关闭回调 */
  onClose: () => void;
  /** 可选时区列表 */
  options: TimezoneOption[];
}

/** WorldClockFlag 组件 Props */
export interface WorldClockFlagProps {
  countryCode?: string;
}

// ── Hook 返回类型 ──

/** useCitiesPersistence Hook 返回类型 */
export interface UseCitiesPersistenceReturn {
  /** 持久化的城市列表 */
  cities: WorldClockCity[];
  /** 设置城市列表 */
  setCities: Dispatch<SetStateAction<WorldClockCity[]>>;
  /** 是否已从 store 加载 */
  loaded: boolean;
}

/** useDebouncedQuery Hook 返回类型 */
export interface UseDebouncedQueryReturn {
  /** 当前输入值 */
  query: string;
  /** 防抖后的查询值 */
  debouncedQuery: string;
  /** 更新输入值（自动触发防抖） */
  handleQueryChange: (value: string) => void;
  /** 重置输入 */
  resetQuery: () => void;
}

/** useCityOperations Hook 返回类型 */
export interface UseCityOperationsReturn {
  /** 添加城市（自动去重） */
  addCity: (city: WorldClockCity) => void;
  /** 移除城市 */
  removeCity: (timezone: string) => void;
}

/** useWorldClockState Hook 返回类型 */
export interface UseWorldClockStateReturn {
  /** 持久化的城市列表 */
  cities: WorldClockCity[];
  /** 实时时钟 ticks */
  ticks: WorldClockTick[];
  /** 是否已从 store 加载 */
  loaded: boolean;
  /** 本机时区 */
  localTimezone: string;
  /** 城市选择器可见性 */
  showPicker: boolean;
  /** 设置选择器可见性 */
  setShowPicker: (v: boolean) => void;
  /** 添加城市（自动去重） */
  addCity: (city: WorldClockCity) => void;
  /** 移除城市 */
  removeCity: (timezone: string) => void;
}
