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
 * @file translationUtils.ts
 * @description Expanded 翻译页语言图标解析与下拉菜单定位计算。
 * @author 鸡哥
 */

import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { resolveCountryIcon } from '../../../../../../utils/SvgIcon/country-icon';
import { LANG_MENU_ITEM_HEIGHT, LANG_MENU_MIN_HEIGHT, LANG_MENU_OFFSET, LANG_MENU_PADDING } from '../config/translationConfig';
import type { CSSProperties } from 'react';
import type { TranslationLanguageIcon } from '../types/translationTypes';

/**
 * 解析语言图标：优先国旗，自动检测使用 AI 图标。
 * @param code - 语言代码
 * @returns 国旗与最终图标
 */
export function resolveLanguageIcon(code: string): TranslationLanguageIcon {
  const flag = resolveCountryIcon(code);
  return { flag, icon: flag ?? (code === 'auto' ? SvgIcon.AI : undefined) };
}

/**
 * 计算挂载到 body 的下拉菜单位置，高度不超出翻译页底部。
 * @param rect - 触发器矩形
 * @param containerBottom - 可用区域底部
 * @param optionCount - 选项数量
 * @returns 菜单定位样式
 */
export function computeLangMenuStyle(rect: DOMRect, containerBottom: number, optionCount: number): CSSProperties {
  const availableHeight = Math.max(LANG_MENU_MIN_HEIGHT, containerBottom - rect.bottom - LANG_MENU_PADDING);
  const preferredHeight = optionCount * LANG_MENU_ITEM_HEIGHT + LANG_MENU_PADDING;
  return {
    position: 'fixed',
    top: rect.bottom + LANG_MENU_OFFSET,
    left: rect.left,
    width: rect.width,
    maxHeight: Math.min(preferredHeight, availableHeight),
  };
}
