/**
 * @file timeUtils.ts
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
 * @returns 农历日期字符串（如"二月十二"）
 */
export function getLunarDate(date: Date): string {
  const lunar = Lunar.fromDate(date);
  const month = lunar.getMonthInChinese();
  const day = lunar.getDayInChinese();
  return `${month}${day}`;
}
