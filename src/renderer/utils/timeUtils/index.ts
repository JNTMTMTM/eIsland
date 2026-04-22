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
 * @file index.ts
 * @description 时间与日期工具函数，提供格式化时间、获取星期等功能
 * @author 鸡哥
 */

import { Lunar } from 'lunar-javascript';

/** 星期中文名称映射 */
export const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const;

/**
 * 格式化时间为 HH:mm 格式（24小时制）
 * @param date - 要格式化的 Date 对象
 * @returns 格式化的时分字符串
 */
export function formatTime(date: Date): string {
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  return `${hour}:${minute}`;
}

/**
 * 格式化时间为 YY-MM-DD HH:mm:ss 格式
 * @param date - 要格式化的 Date 对象
 * @returns 格式化的时间字符串
 */
export function formatFullTime(date: Date): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 获取星期中文名称
 * @param date - 要查询的 Date 对象
 * @returns 星期名称（如"周一"）
 */
export function getDayName(date: Date): string {
  return DAY_NAMES[date.getDay()];
}

/**
 * 获取农历日期描述
 * @param date - 要查询的 Date 对象
 * @returns 农历日期字符串（如"二月十四"、"闰四月廿三"）
 */
export function getLunarDate(date: Date): string {
  const lunar = Lunar.fromDate(date);
  const month = lunar.getMonthInChinese();
  const day = lunar.getDayInChinese();
  return `${month}月${day}`;
}

/**
 * 获取当日宜做事项
 * @param date - 要查询的 Date 对象
 * @returns 宜做事项数组
 */
export function getDayYi(date: Date): string[] {
  const lunar = Lunar.fromDate(date);
  return lunar.getDayYi() as string[];
}

/**
 * 获取当日忌做事项
 * @param date - 要查询的 Date 对象
 * @returns 忌做事项数组
 */
export function getDayJi(date: Date): string[] {
  const lunar = Lunar.fromDate(date);
  return lunar.getDayJi() as string[];
}
