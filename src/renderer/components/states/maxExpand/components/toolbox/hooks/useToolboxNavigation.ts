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
 * @file useToolboxNavigation.ts
 * @description 工具箱页面选择、导航编辑、配置恢复与搜索状态。
 * @author 鸡哥
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_TOOLBOX_NAV_ORDER, TOOLBOX_HIDDEN_NAV_ORDER_STORE_KEY, TOOLBOX_NAV_CARD_MAP, TOOLBOX_NAV_ORDER_STORE_KEY } from '../../tools/config/commonToolboxConfig';
import { getHiddenToolboxCards, getVisibleToolboxCards, searchToolboxCards } from '../utils/toolboxNavigation';
import type { TFunction } from 'i18next';
import type { DragEvent } from 'react';
import type { DownloadPageKey } from '../../tools/config/downloadToolConfig';
import type { FileCompressionPageKey } from '../../tools/config/fileCompressionToolConfig';
import type { FormatFactoryPageKey } from '../../tools/config/formatFactoryToolConfig';
import type { ToolboxIndexCardId, ToolboxSidebarKey, ToolboxNavigationState } from '../types';

/**
 * 管理工具箱导航，保留配置读取顺序与卸载时的取消保护。
 * @param t - 当前语言翻译函数。
 * @param language - 当前语言，切换时刷新搜索结果。
 * @returns 页面状态、导航卡片及编辑操作。
 */
export function useToolboxNavigation(t: TFunction, language: string): ToolboxNavigationState {
  const [activeSidebar, setActiveSidebar] = useState<ToolboxSidebarKey>('index');
  const [downloadPage, setDownloadPage] = useState<DownloadPageKey>('create');
  const [fileCompressionPage, setFileCompressionPage] = useState<FileCompressionPageKey>('imageCompression');
  const [formatFactoryPage, setFormatFactoryPage] = useState<FormatFactoryPageKey>('image');
  const [navOrder, setNavOrder] = useState<ToolboxIndexCardId[]>(DEFAULT_TOOLBOX_NAV_ORDER);
  const [hiddenNavOrder, setHiddenNavOrder] = useState<ToolboxIndexCardId[]>([]);
  const [navEditMode, setNavEditMode] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdxRef = useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const visibleCards = useMemo(() => getVisibleToolboxCards(navOrder), [navOrder]);

  const hiddenCards = useMemo(() => getHiddenToolboxCards(hiddenNavOrder, visibleCards), [hiddenNavOrder, visibleCards]);

  const searchResults = useMemo(() => searchToolboxCards(searchQuery, t), [searchQuery, language, t]);

  const persistToolboxNavConfig = (visibleOrder: ToolboxIndexCardId[], hiddenOrder: ToolboxIndexCardId[]): void => {
    window.api.storeWrite(TOOLBOX_NAV_ORDER_STORE_KEY, visibleOrder).catch(() => {});
    window.api.storeWrite(TOOLBOX_HIDDEN_NAV_ORDER_STORE_KEY, hiddenOrder).catch(() => {});
  };

  const resetToolboxNavConfig = (): void => {
    const nextVisible = [...DEFAULT_TOOLBOX_NAV_ORDER];
    const nextHidden: ToolboxIndexCardId[] = [];
    setNavOrder(nextVisible);
    setHiddenNavOrder(nextHidden);
    persistToolboxNavConfig(nextVisible, nextHidden);
  };

  const navigateByCard = (cardId: ToolboxIndexCardId): void => {
    const card = TOOLBOX_NAV_CARD_MAP.get(cardId);
    if (!card) return;
    setActiveSidebar(card.sidebar);
    if (card.downloadPage) setDownloadPage(card.downloadPage);
    if (card.fileCompressionPage) setFileCompressionPage(card.fileCompressionPage);
    if (card.formatFactoryPage) setFormatFactoryPage(card.formatFactoryPage);
  };

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(TOOLBOX_NAV_ORDER_STORE_KEY).then((savedVisible) => {
      if (cancelled) return;
      const visibleRaw = Array.isArray(savedVisible) ? savedVisible : [];
      window.api.storeRead(TOOLBOX_HIDDEN_NAV_ORDER_STORE_KEY).then((savedHidden) => {
        if (cancelled) return;
        const hiddenRaw = Array.isArray(savedHidden) ? savedHidden : [];
        const validVisible = visibleRaw
          .filter((id): id is ToolboxIndexCardId => typeof id === 'string' && TOOLBOX_NAV_CARD_MAP.has(id as ToolboxIndexCardId))
          .filter((id, idx, arr) => arr.indexOf(id) === idx);
        const mergedVisible = validVisible.length > 0
          ? [...validVisible, ...DEFAULT_TOOLBOX_NAV_ORDER.filter((id) => !validVisible.includes(id))]
          : [...DEFAULT_TOOLBOX_NAV_ORDER];
        const validHidden = hiddenRaw
          .filter((id): id is ToolboxIndexCardId => typeof id === 'string' && TOOLBOX_NAV_CARD_MAP.has(id as ToolboxIndexCardId))
          .filter((id, idx, arr) => arr.indexOf(id) === idx)
          .filter((id) => !mergedVisible.includes(id));
        setNavOrder(mergedVisible);
        setHiddenNavOrder(validHidden);
      }).catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const toggleNavEditMode = (): void => {
    if (navEditMode) {
      persistToolboxNavConfig(navOrder, hiddenNavOrder);
    }
    setNavEditMode(!navEditMode);
  };
  const removeCard = (cardId: ToolboxIndexCardId): void => {
    const nextVisible = navOrder.filter((id) => id !== cardId);
    const nextHidden = hiddenNavOrder.includes(cardId)
      ? hiddenNavOrder
      : [...hiddenNavOrder, cardId];
    setNavOrder(nextVisible);
    setHiddenNavOrder(nextHidden);
  };
  const addCard = (cardId: ToolboxIndexCardId): void => {
    const nextVisible = navOrder.includes(cardId)
      ? navOrder
      : [...navOrder, cardId];
    const nextHidden = hiddenNavOrder.filter((id) => id !== cardId);
    setNavOrder(nextVisible);
    setHiddenNavOrder(nextHidden);
  };
  const handleDragStart = (event: DragEvent<HTMLDivElement>, index: number): void => {
    dragIdxRef.current = index;
    event.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (event: DragEvent<HTMLDivElement>, index: number): void => {
    event.preventDefault();
    setDragOverIdx(index);
  };
  const handleDragLeave = (): void => setDragOverIdx(null);
  const handleDrop = (event: DragEvent<HTMLDivElement>, index: number): void => {
    event.preventDefault();
    setDragOverIdx(null);
    const from = dragIdxRef.current;
    if (from === null || from === index) return;
    const nextOrder = visibleCards.map((item) => item.id);
    const [moved] = nextOrder.splice(from, 1);
    nextOrder.splice(index, 0, moved);
    setNavOrder(nextOrder);
  };
  const handleDragEnd = (): void => {
    dragIdxRef.current = null;
    setDragOverIdx(null);
  };

  return {
    activeSidebar, setActiveSidebar, downloadPage, setDownloadPage,
    fileCompressionPage, setFileCompressionPage, formatFactoryPage, setFormatFactoryPage,
    navEditMode, dragOverIdx, searchQuery, setSearchQuery, visibleCards, hiddenCards, searchResults,
    resetToolboxNavConfig, navigateByCard, toggleNavEditMode, removeCard, addCard,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd,
  };
}
