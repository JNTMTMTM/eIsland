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
 * @description 工具箱导航配置读取与合并、卡片排序及本地化搜索。
 * @author 鸡哥
 */

import { DEFAULT_TOOLBOX_NAV_ORDER, TOOLBOX_NAV_CARD_MAP, TOOLBOX_NAV_CARDS, TOOLBOX_NAV_CONFIG_STORE_KEY, TOOLBOX_NAV_ORDER_STORE_KEY, TOOLBOX_HIDDEN_NAV_ORDER_STORE_KEY } from '../../tools/config/commonToolboxConfig';
import type { TFunction } from 'i18next';
import type { ToolboxIndexCardId, ToolboxNavCardDef, ToolboxSearchResult } from '../types';

/** 两种顺序一起提交，避免隐藏列表与可见列表部分保存。 */
export interface ToolboxNavConfig {
  visibleOrder: ToolboxIndexCardId[];
  hiddenOrder: ToolboxIndexCardId[];
}

/** 记录用户意图，保存时可在其他窗口的最新配置上重放。 */
export type ToolboxNavEdit =
  | { type: 'reset' }
  | { type: 'add' | 'remove'; id: ToolboxIndexCardId }
  | { type: 'move'; id: ToolboxIndexCardId; before: ToolboxIndexCardId | null };

function validOrder(raw: unknown): ToolboxIndexCardId[] {
  return Array.isArray(raw) ? [...new Set(raw.filter((id): id is ToolboxIndexCardId =>
    typeof id === 'string' && TOOLBOX_NAV_CARD_MAP.has(id as ToolboxIndexCardId)))] : [];
}

/**
 * 校验旧版及新版顺序，保留明确保存的空列表和隐藏位置。
 * @param visible - 未校验的可见顺序。
 * @param hidden - 未校验的隐藏顺序。
 * @returns 无重复、无交集的配置。
 */
export function parseToolboxNavConfig(visible: unknown, hidden: unknown): ToolboxNavConfig {
  const visibleOrder = validOrder(visible);
  const hiddenOrder = validOrder(hidden).filter((id) => !visibleOrder.includes(id));
  const remaining = DEFAULT_TOOLBOX_NAV_ORDER.filter((id) => !visibleOrder.includes(id) && !hiddenOrder.includes(id));
  // 空数组是用户移除全部卡片后的有效配置；损坏或缺失数据仍恢复默认入口。
  if (Array.isArray(visible) && visible.length === 0) hiddenOrder.push(...remaining);
  else visibleOrder.push(...remaining);
  return { visibleOrder, hiddenOrder };
}

/**
 * 优先读取原子配置，首次保存前兼容旧版两个存储键。
 * @returns 原始比较快照与可用配置。
 */
export async function readToolboxNavConfig(): Promise<{ raw: unknown; config: ToolboxNavConfig }> {
  const raw = await window.api.storeRead(TOOLBOX_NAV_CONFIG_STORE_KEY, true);
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const value = raw as Record<string, unknown>;
    return { raw, config: parseToolboxNavConfig(value.visibleOrder, value.hiddenOrder) };
  }
  const visible = await window.api.storeRead(TOOLBOX_NAV_ORDER_STORE_KEY, true);
  const hidden = await window.api.storeRead(TOOLBOX_HIDDEN_NAV_ORDER_STORE_KEY, true);
  return { raw, config: parseToolboxNavConfig(visible, hidden) };
}

/**
 * 在共享配置上应用本窗口的编辑，保留其他窗口未被本次操作涉及的修改。
 * @param config - 最新共享配置。
 * @param edits - 按用户操作顺序记录的编辑。
 * @returns 合并后的配置。
 */
export function applyToolboxNavEdits(config: ToolboxNavConfig, edits: readonly ToolboxNavEdit[]): ToolboxNavConfig {
  let visibleOrder = [...config.visibleOrder];
  let hiddenOrder = [...config.hiddenOrder];
  edits.forEach((edit) => {
    if (edit.type === 'reset') {
      visibleOrder = [...DEFAULT_TOOLBOX_NAV_ORDER];
      hiddenOrder = [];
    } else if (edit.type === 'remove') {
      visibleOrder = visibleOrder.filter((id) => id !== edit.id);
      if (!hiddenOrder.includes(edit.id)) hiddenOrder.push(edit.id);
    } else if (edit.type === 'add') {
      hiddenOrder = hiddenOrder.filter((id) => id !== edit.id);
      if (!visibleOrder.includes(edit.id)) visibleOrder.push(edit.id);
    } else if (edit.type === 'move' && visibleOrder.includes(edit.id)) {
      visibleOrder = visibleOrder.filter((id) => id !== edit.id);
      const index = edit.before === null ? -1 : visibleOrder.indexOf(edit.before);
      visibleOrder.splice(index < 0 ? visibleOrder.length : index, 0, edit.id);
    }
  });
  return { visibleOrder, hiddenOrder };
}

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
