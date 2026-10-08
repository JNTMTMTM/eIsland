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
import { DEFAULT_TOOLBOX_NAV_ORDER, TOOLBOX_NAV_CARD_MAP, TOOLBOX_NAV_CONFIG_STORE_KEY } from '../../tools/config/commonToolboxConfig';
import { applyToolboxNavEdits, getHiddenToolboxCards, getVisibleToolboxCards, readToolboxNavConfig, searchToolboxCards } from '../utils/toolboxNavigation';
import type { ToolboxNavEdit } from '../utils/toolboxNavigation';
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
  const [navSaving, setNavSaving] = useState(false);
  const [navSaveError, setNavSaveError] = useState(false);
  const editsRef = useRef<ToolboxNavEdit[]>([]);
  const editedRef = useRef(false);
  const savingRef = useRef(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdxRef = useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const visibleCards = useMemo(() => getVisibleToolboxCards(navOrder), [navOrder]);

  const hiddenCards = useMemo(() => getHiddenToolboxCards(hiddenNavOrder, visibleCards), [hiddenNavOrder, visibleCards]);

  const searchResults = useMemo(() => searchToolboxCards(searchQuery, t), [searchQuery, language, t]);

  const persistToolboxNavConfig = async (): Promise<boolean> => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setNavSaving(true);
    setNavSaveError(false);
    try {
      // 两个窗口同时保存时，仅一个比较快照能成功；失败方重新合并其操作。
      const commit = async (attempt: number): Promise<void> => {
        const { raw, config } = await readToolboxNavConfig();
        const next = applyToolboxNavEdits(config, editsRef.current);
        const result = await window.api.storeCompareAndSwap(TOOLBOX_NAV_CONFIG_STORE_KEY, raw, next);
        if (result === 'conflict') {
          if (attempt >= 4) throw new Error('Toolbox navigation save conflicts exceeded retry limit');
          return commit(attempt + 1);
        }
        if (result !== 'updated') throw new Error('Toolbox navigation save failed');
        setNavOrder(next.visibleOrder);
        setHiddenNavOrder(next.hiddenOrder);
        editsRef.current = [];
      };
      await commit(0);
      return true;
    } catch {
      setNavSaveError(true);
      setNavEditMode(true);
      return false;
    } finally {
      savingRef.current = false;
      setNavSaving(false);
    }
  };

  const resetToolboxNavConfig = (): void => {
    if (savingRef.current) return;
    editedRef.current = true;
    editsRef.current = [{ type: 'reset' }];
    const nextVisible = [...DEFAULT_TOOLBOX_NAV_ORDER];
    const nextHidden: ToolboxIndexCardId[] = [];
    setNavOrder(nextVisible);
    setHiddenNavOrder(nextHidden);
    persistToolboxNavConfig().catch(() => undefined);
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
    readToolboxNavConfig().then(({ config }) => {
      if (cancelled || editedRef.current) return;
      setNavOrder(config.visibleOrder);
      setHiddenNavOrder(config.hiddenOrder);
    }).catch(() => { /* 读取失败时保留默认配置，保存时使用严格读取防止覆盖。 */ });
    return () => { cancelled = true; };
  }, []);

  const toggleNavEditMode = async (): Promise<void> => {
    if (savingRef.current) return;
    editedRef.current = true;
    if (navEditMode) {
      if (await persistToolboxNavConfig()) setNavEditMode(false);
    } else setNavEditMode(true);
  };
  const removeCard = (cardId: ToolboxIndexCardId): void => {
    if (savingRef.current) return;
    editedRef.current = true;
    editsRef.current.push({ type: 'remove', id: cardId });
    const nextVisible = navOrder.filter((id) => id !== cardId);
    const nextHidden = hiddenNavOrder.includes(cardId)
      ? hiddenNavOrder
      : [...hiddenNavOrder, cardId];
    setNavOrder(nextVisible);
    setHiddenNavOrder(nextHidden);
  };
  const addCard = (cardId: ToolboxIndexCardId): void => {
    if (savingRef.current) return;
    editedRef.current = true;
    editsRef.current.push({ type: 'add', id: cardId });
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
    if (savingRef.current || from === null || from === index) return;
    const nextOrder = visibleCards.map((item) => item.id);
    const [moved] = nextOrder.splice(from, 1);
    if (!moved) return;
    nextOrder.splice(index, 0, moved);
    editedRef.current = true;
    editsRef.current.push({ type: 'move', id: moved, before: nextOrder[index + 1] ?? null });
    setNavOrder(nextOrder);
  };
  const handleDragEnd = (): void => {
    dragIdxRef.current = null;
    setDragOverIdx(null);
  };

  return {
    activeSidebar, setActiveSidebar, downloadPage, setDownloadPage,
    fileCompressionPage, setFileCompressionPage, formatFactoryPage, setFormatFactoryPage,
    navEditMode, navSaving, navSaveError, dragOverIdx, searchQuery, setSearchQuery, visibleCards, hiddenCards, searchResults,
    resetToolboxNavConfig, navigateByCard, toggleNavEditMode, removeCard, addCard,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd,
  };
}
