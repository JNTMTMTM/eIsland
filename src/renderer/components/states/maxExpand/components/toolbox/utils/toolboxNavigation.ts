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
 * @file toolboxNavigation.ts
 * @description 工具箱卡片排序、隐藏列表和本地化搜索的纯计算。
 * @author 鸡哥
 */

import { TOOLBOX_NAV_CARD_MAP, TOOLBOX_NAV_CARDS } from '../../tools/config/commonToolboxConfig';
import type { TFunction } from 'i18next';
import type { ToolboxIndexCardId, ToolboxNavCardDef, ToolboxSearchResult } from '../types';

/**
 * 按可见顺序解析卡片，并排除重复及失效入口。
 * @param navOrder - 已保存的可见卡片标识。
 * @returns 合法的有序卡片。
 */
export function getVisibleToolboxCards(navOrder: ToolboxIndexCardId[]): ToolboxNavCardDef[] {
  const seen = new Set<ToolboxIndexCardId>();
  return navOrder.reduce<typeof TOOLBOX_NAV_CARDS>((ordered, id) => {
    if (seen.has(id)) return ordered;
    const card = TOOLBOX_NAV_CARD_MAP.get(id);
    if (card) {
      ordered.push(card);
      seen.add(id);
    }
    return ordered;
  }, []);
}

/**
 * 按隐藏顺序解析卡片，并补入未显示的入口。
 * @param hiddenNavOrder - 已保存的隐藏卡片标识。
 * @param visibleCards - 当前可见卡片。
 * @returns 可添加的有序卡片。
 */
export function getHiddenToolboxCards(hiddenNavOrder: ToolboxIndexCardId[], visibleCards: ToolboxNavCardDef[]): ToolboxNavCardDef[] {
  const visibleSet = new Set(visibleCards.map((card) => card.id));
  const seen = new Set<ToolboxIndexCardId>();

  const fromHidden = hiddenNavOrder.reduce<typeof TOOLBOX_NAV_CARDS>((acc, id) => {
    if (seen.has(id) || visibleSet.has(id)) return acc;
    const card = TOOLBOX_NAV_CARD_MAP.get(id);
    if (card) {
      acc.push(card);
      seen.add(id);
    }
    return acc;
  }, []);

  const remaining = TOOLBOX_NAV_CARDS.filter((card) => !visibleSet.has(card.id) && !seen.has(card.id));
  return [...fromHidden, ...remaining];
}

/**
 * 搜索翻译后的卡片名称与描述。
 * @param searchQuery - 输入的搜索文本。
 * @param t - 当前语言的翻译函数。
 * @returns 匹配卡片；空查询返回 null。
 */
export function searchToolboxCards(searchQuery: string, t: TFunction): ToolboxSearchResult[] | null {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return null;
  return TOOLBOX_NAV_CARDS
    .map((card) => {
      const localizedLabel = t(card.labelKey);
      const localizedDesc = t(card.descKey);
      return { ...card, localizedLabel, localizedDesc };
    })
    .filter((card) => card.localizedLabel.toLowerCase().includes(q) || card.localizedDesc.toLowerCase().includes(q));
}
