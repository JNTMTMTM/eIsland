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
 * @file weatherUtils.ts
 * @description 天气模块工具函数
 * @author 鸡哥
 */

import type { TFunction } from 'i18next';

/**
 * 获取星期标签
 * @param index - 预报天数索引（0=明天，1=后天）
 * @param t - i18n 翻译函数
 * @returns 星期标签字符串
 */
export function getWeekLabel(index: number, t: TFunction): string {
  return index === 0
    ? t('hover.weather.week.tomorrow', { defaultValue: '明天' })
    : t('hover.weather.week.dayAfterTomorrow', { defaultValue: '后天' });
}

/**
 * 获取当前天气图标路径（白天/晚上）
 * @param iconCode - 天气图标编号
 * @param isDay - 是否为白天（true=白天，false=夜晚）
 * @returns 天气图标资源路径
 */
export function getWeatherIconPath(iconCode: number, isDay: boolean): string {
  const suffix = isDay ? 'd' : 'n';
  return `./icon/${iconCode}${suffix}_big.png`;
}

/**
 * 获取小图标路径
 * @param iconCode - 天气图标编号
 * @param isDay - 是否为白天（true=白天，false=夜晚）
 * @returns 天气小图标资源路径
 */
export function getWeatherSmallIconPath(iconCode: number, isDay: boolean): string {
  const suffix = isDay ? 'd' : 'n';
  return `./icon/${iconCode}${suffix}.png`;
}

/**
 * 格式化降水概率文本
 * @param value - 降水概率数值（负值表示无数据）
 * @param t - i18n 翻译函数
 * @returns 格式化后的降水概率字符串
 */
export function formatPrecipitationText(value: number, t: TFunction): string {
  return value < 0 ? ` ${t('hover.weather.na', { defaultValue: 'N/A' })}` : `${value}%`;
}

/**
 * 格式化风速文本
 * @param value - 风速数值（负值表示无数据）
 * @param t - i18n 翻译函数
 * @returns 格式化后的风速字符串
 */
export function formatWindText(value: number, t: TFunction): string {
  return value < 0 ? ` ${t('hover.weather.na', { defaultValue: 'N/A' })}` : `${value}m/s`;
}
