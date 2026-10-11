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
 * @file useAlbumGridConfig.ts
 * @description 相册网格配置 hook — 列数、排序、筛选、分组及持久化。
 * @author 鸡哥
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AlbumFilterMode, AlbumGroupMode, AlbumItem, AlbumMeta, AlbumSortMode, UseAlbumGridConfigReturn } from '../types/albumTypes';
import { COLUMNS_STORE_KEY, GROUP_MODE_STORE_KEY, SORT_STORE_KEY } from '../config/albumConfig';
import { clampColumns, formatDateGroup, getFolderName, getParentFolder, sortAlbumItems } from '../utils/albumUtils';

/** 相册网格配置 hook */
export function useAlbumGridConfig(
  items: AlbumItem[],
  metaCache: Record<number, AlbumMeta>,
  loaded: boolean,
  initColumns: number,
  initSortMode: AlbumSortMode,
  initGroupMode: AlbumGroupMode,
): UseAlbumGridConfigReturn {
  const { t, i18n } = useTranslation();
  const [columns, setColumns] = useState<number>(initColumns);
  const [sortMode, setSortMode] = useState<AlbumSortMode>(initSortMode);
  const [filterMode, setFilterMode] = useState<AlbumFilterMode>('all');
  const [groupMode, setGroupMode] = useState<AlbumGroupMode>(initGroupMode);
  const [configInited, setConfigInited] = useState(false);

  /** 用 init 值同步一次（仅首次 loaded 后） */
  useEffect(() => {
    if (!loaded || configInited) return;
    setColumns(initColumns);
    setSortMode(initSortMode);
    setGroupMode(initGroupMode);
    setConfigInited(true);
  }, [loaded, initColumns, initSortMode, initGroupMode, configInited]);

  /** 持久化列数 */
  useEffect(() => {
    if (!loaded) return;
    window.api.storeWrite(COLUMNS_STORE_KEY, columns).catch(() => { });
  }, [columns, loaded]);

  /** 持久化排序模式 */
  useEffect(() => {
    if (!loaded) return;
    window.api.storeWrite(SORT_STORE_KEY, sortMode).catch(() => { });
  }, [sortMode, loaded]);

  /** 持久化浏览模式 */
  useEffect(() => {
    if (!loaded) return;
    window.api.storeWrite(GROUP_MODE_STORE_KEY, groupMode).catch(() => { });
  }, [groupMode, loaded]);

  /** 已排序的条目列表 */
  const durationRef = useRef<Record<number, AlbumMeta>>({});
  const durationMeta = useMemo(() => {
    if (sortMode !== 'durationAsc' && sortMode !== 'durationDesc') return undefined;
    const durations = Object.entries(metaCache).filter(([, meta]) => meta.durationSec !== undefined);
    if (durations.length !== Object.keys(durationRef.current).length
      || durations.some(([id, meta]) => durationRef.current[Number(id)]?.durationSec !== meta.durationSec)) {
      durationRef.current = Object.fromEntries(durations.map(([id, meta]) => [id, { durationSec: meta.durationSec }]));
    }
    return durationRef.current;
  }, [sortMode, metaCache]);
  const sortedItems = useMemo(() => sortAlbumItems(items, sortMode, durationMeta ?? {}), [items, sortMode, durationMeta]);

  /** 已筛选的条目列表 */
  const filteredItems = useMemo(() => {
    if (filterMode === 'image') return sortedItems.filter((item) => item.mediaType === 'image');
    if (filterMode === 'video') return sortedItems.filter((item) => item.mediaType === 'video');
    return sortedItems;
  }, [sortedItems, filterMode]);

  /** 已分组的条目列表 */
  const groupedItems = useMemo(() => {
    if (groupMode === 'none') {
      return [{ key: 'all', title: t('albumTab.group.all'), subtitle: '', items: filteredItems }];
    }
    const groups = new Map<string, { key: string; title: string; subtitle: string; items: AlbumItem[] }>();
    filteredItems.forEach((item) => {
      const key = groupMode === 'folder'
        ? getParentFolder(item.path)
        : formatDateGroup(item.addedAt, i18n.language || navigator.language || 'zh-CN');
      const fallbackTitle = groupMode === 'folder' ? t('albumTab.group.unknownFolder') : t('albumTab.group.unknownDate');
      const title = key === '-' ? fallbackTitle : (groupMode === 'folder' ? getFolderName(key) : key);
      const subtitle = groupMode === 'folder' && key !== '-' ? key : '';
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(key, { key, title, subtitle, items: [item] });
      }
    });
    return Array.from(groups.values());
  }, [filteredItems, groupMode, i18n.language, t]);

  const handleColumnsChange = (delta: number): void => {
    setColumns((prev) => clampColumns(prev + delta));
  };

  const handleSortChange = (value: string): void => {
    if (value === 'addedDesc' || value === 'addedAsc' || value === 'nameAsc' || value === 'nameDesc' || value === 'durationDesc' || value === 'durationAsc') {
      setSortMode(value);
    }
  };

  const handleFilterModeChange = (mode: AlbumFilterMode): void => { setFilterMode(mode); };
  const handleGroupModeChange = (mode: AlbumGroupMode): void => { setGroupMode(mode); };

  return {
    columns,
    setColumns,
    sortMode,
    setSortMode,
    filterMode,
    setFilterMode,
    groupMode,
    setGroupMode,
    sortedItems,
    filteredItems,
    groupedItems,
    handleColumnsChange,
    handleSortChange,
    handleFilterModeChange,
    handleGroupModeChange,
  };
}
