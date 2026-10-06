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
 * @file useMiniGameNavigation.ts
 * @description 管理小游戏选择、导航排序、搜索及导航配置恢复。
 * @author 鸡哥
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { TFunction, i18n } from 'i18next';
import { GAME_LIST, MINI_GAME_NAV_CARDS, MINI_GAME_NAV_CARD_MAP, DEFAULT_MINI_GAME_NAV_ORDER, MINI_GAME_NAV_ORDER_STORE_KEY, MINI_GAME_HIDDEN_NAV_ORDER_STORE_KEY } from '../config/miniGameConfig';
import type { MiniGameNavigationState, MiniGameIndexCardId } from '../types';

/**
 * 管理导航状态并按当前语言搜索。
 * @param t - 当前语言翻译函数。
 * @param i18n - 当前语言状态。
 * @returns 导航展示数据和事件处理入口。
 */
export function useMiniGameNavigation(t: TFunction, i18n: Pick<i18n, 'language'>): MiniGameNavigationState {
  const [selectedGame, setSelectedGame] = useState<string>(GAME_LIST[0]?.id ?? '');
  const [activeSidebar, setActiveSidebar] = useState<string>('index');
  const [navOrder, setNavOrder] = useState<MiniGameIndexCardId[]>(DEFAULT_MINI_GAME_NAV_ORDER);
  const [hiddenNavOrder, setHiddenNavOrder] = useState<MiniGameIndexCardId[]>([]);
  const [navEditMode, setNavEditMode] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdxRef = useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const visibleCards = useMemo(() => {
    const seen = new Set<MiniGameIndexCardId>();
    return navOrder.reduce<typeof MINI_GAME_NAV_CARDS>((ordered, id) => {
      if (seen.has(id)) return ordered;
      const card = MINI_GAME_NAV_CARD_MAP.get(id);
      if (card) {
        ordered.push(card);
        seen.add(id);
      }
      return ordered;
    }, []);
  }, [navOrder]);

  const hiddenCards = useMemo(() => {
    const visibleSet = new Set(visibleCards.map((card) => card.id));
    const seen = new Set<MiniGameIndexCardId>();

    const fromHidden = hiddenNavOrder.reduce<typeof MINI_GAME_NAV_CARDS>((acc, id) => {
      if (seen.has(id) || visibleSet.has(id)) return acc;
      const card = MINI_GAME_NAV_CARD_MAP.get(id);
      if (card) {
        acc.push(card);
        seen.add(id);
      }
      return acc;
    }, []);

    const remaining = MINI_GAME_NAV_CARDS.filter((card) => !visibleSet.has(card.id) && !seen.has(card.id));
    return [...fromHidden, ...remaining];
  }, [hiddenNavOrder, visibleCards]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return MINI_GAME_NAV_CARDS
      .map((card) => {
        const localizedLabel = t(card.labelKey);
        const localizedDesc = t(card.descKey);
        return { ...card, localizedLabel, localizedDesc };
      })
      .filter((card) => card.localizedLabel.toLowerCase().includes(q) || card.localizedDesc.toLowerCase().includes(q));
  }, [searchQuery, i18n.language, t]);

  const persistMiniGameNavConfig = (visibleOrder: MiniGameIndexCardId[], hiddenOrder: MiniGameIndexCardId[]): void => {
    window.api.storeWrite(MINI_GAME_NAV_ORDER_STORE_KEY, visibleOrder).catch(() => {});
    window.api.storeWrite(MINI_GAME_HIDDEN_NAV_ORDER_STORE_KEY, hiddenOrder).catch(() => {});
  };

  const resetMiniGameNavConfig = (): void => {
    const nextVisible = [...DEFAULT_MINI_GAME_NAV_ORDER];
    const nextHidden: MiniGameIndexCardId[] = [];
    setNavOrder(nextVisible);
    setHiddenNavOrder(nextHidden);
    persistMiniGameNavConfig(nextVisible, nextHidden);
  };

  const navigateByCard = (cardId: MiniGameIndexCardId): void => {
    const card = MINI_GAME_NAV_CARD_MAP.get(cardId);
    if (!card) return;
    setSelectedGame(card.gameId);
    setActiveSidebar(card.gameId);
  };

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(MINI_GAME_NAV_ORDER_STORE_KEY).then((savedVisible) => {
      if (cancelled) return;
      const visibleRaw = Array.isArray(savedVisible) ? savedVisible : [];
      window.api.storeRead(MINI_GAME_HIDDEN_NAV_ORDER_STORE_KEY).then((savedHidden) => {
        if (cancelled) return;
        const hiddenRaw = Array.isArray(savedHidden) ? savedHidden : [];
        const validVisible = visibleRaw
          .filter((id): id is MiniGameIndexCardId => typeof id === 'string' && MINI_GAME_NAV_CARD_MAP.has(id as MiniGameIndexCardId))
          .filter((id, idx, arr) => arr.indexOf(id) === idx);
        const mergedVisible = validVisible.length > 0
          ? [...validVisible, ...DEFAULT_MINI_GAME_NAV_ORDER.filter((id) => !validVisible.includes(id))]
          : [...DEFAULT_MINI_GAME_NAV_ORDER];
        const validHidden = hiddenRaw
          .filter((id): id is MiniGameIndexCardId => typeof id === 'string' && MINI_GAME_NAV_CARD_MAP.has(id as MiniGameIndexCardId))
          .filter((id, idx, arr) => arr.indexOf(id) === idx)
          .filter((id) => !mergedVisible.includes(id));
        setNavOrder(mergedVisible);
        setHiddenNavOrder(validHidden);
      }).catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return {
    selectedGame,
    setSelectedGame,
    activeSidebar,
    setActiveSidebar,
    navOrder,
    setNavOrder,
    hiddenNavOrder,
    setHiddenNavOrder,
    navEditMode,
    setNavEditMode,
    dragOverIdx,
    setDragOverIdx,
    dragIdxRef,
    searchQuery,
    setSearchQuery,
    visibleCards,
    hiddenCards,
    searchResults,
    persistMiniGameNavConfig,
    resetMiniGameNavConfig,
    navigateByCard,
  };
}
