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
 * @file useAlbumVirtualGrid.ts
 * @description 按滚动窗口计算分组网格可见行，DOM 与媒体请求只覆盖可视区及两行预取。
 * @author 鸡哥
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UIEvent } from 'react';
import type { AlbumGroup, AlbumGroupMode, AlbumItem } from '../types/albumTypes';

const GAP = 8;
const GROUP_GAP = 14;
const OVERSCAN_ROWS = 2;
interface GroupLayout {
  group: AlbumGroup;
  top: number;
  height: number;
  headerHeight: number;
  rows: number;
}
/** 按实际列宽定位分组，不为离屏项目生成 DOM。
 * @param groups - 已排序分组。
 * @param columns - 每行列数。
 * @param width - 网格内容宽度。
 * @param mode - 分组显示模式。
 * @returns 分组位置与行尺寸。
 */
export function buildAlbumVirtualLayout(groups: AlbumGroup[], columns: number, width: number, mode: AlbumGroupMode) {
  const tileWidth = Math.max(1, (width - GAP * (columns - 1)) / columns);
  const rowHeight = tileWidth + 24;
  const stride = rowHeight + GAP;
  let top = 0;
  const positioned = groups.map((group): GroupLayout => {
    const rows = Math.ceil(group.items.length / columns);
    const headerHeight = mode === 'none' ? 0 : group.subtitle ? 52 : 36;
    const height = headerHeight + (headerHeight && rows ? GAP : 0) + Math.max(0, rows * stride - GAP);
    const result = { group, top, height, headerHeight, rows };
    top += height + GROUP_GAP;
    return result;
  });
  return { groups: positioned, columns, stride, rowHeight, totalHeight: Math.max(0, top - GROUP_GAP) };
}
/** 用二分定位分组，只切出可视行和少量预取行。
 * @param layout - 网格布局。
 * @param scrollTop - 当前滚动位置。
 * @param height - 可视区高度。
 * @returns 带上下占位距离的可见分组。
 */
export function getAlbumVisibleGroups(layout: ReturnType<typeof buildAlbumVirtualLayout>, scrollTop: number, height: number): Array<GroupLayout & { items: AlbumItem[]; paddingTop: number; paddingBottom: number }> {
  if (height <= 0) return [];
  const top = Math.min(scrollTop, Math.max(0, layout.totalHeight - height));
  const start = Math.max(0, top - OVERSCAN_ROWS * layout.stride);
  const end = top + height + OVERSCAN_ROWS * layout.stride;
  let low = 0;
  let high = layout.groups.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const group = layout.groups[middle];
    if (group.top + group.height < start) low = middle + 1;
    else high = middle;
  }
  const visible: Array<GroupLayout & { items: AlbumItem[]; paddingTop: number; paddingBottom: number }> = [];
  for (let index = low; index < layout.groups.length; index += 1) {
    const positioned = layout.groups[index];
    if (positioned.top > end) break;
    const gridTop = positioned.top + positioned.headerHeight + (positioned.headerHeight ? GAP : 0);
    const first = Math.max(0, Math.floor((start - gridTop) / layout.stride));
    const last = Math.min(positioned.rows, Math.max(first + 1, Math.ceil((end - gridTop) / layout.stride)));
    visible.push({ ...positioned,
      items: positioned.group.items.slice(first * layout.columns, last * layout.columns),
      paddingTop: first * layout.stride, paddingBottom: Math.max(0, positioned.rows - last) * layout.stride,
    });
  }
  return visible;
}
/** 跟踪容器尺寸和滚动位置，生成有界网格窗口。
 * @param groups - 已排序分组。
 * @param columns - 每行列数。
 * @param mode - 分组显示模式。
 * @returns 滚动容器引用、事件和可见网格布局。
 */
export function useAlbumVirtualGrid(groups: AlbumGroup[], columns: number, mode: AlbumGroupMode) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 800, height: 600, top: 0 });
  const measure = useCallback((element: HTMLDivElement): void => {
    const next = { width: Math.max(1, element.clientWidth - 4), height: element.clientHeight, top: element.scrollTop };
    setViewport((previous) => previous.width === next.width && previous.height === next.height && previous.top === next.top ? previous : next);
  }, []);
  const layout = useMemo(() => buildAlbumVirtualLayout(groups, columns, viewport.width, mode), [groups, columns, viewport.width, mode]);
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    measure(element);
    const observer = new ResizeObserver(() => measure(element));
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure, layout.totalHeight]);
  const visibleGroups = useMemo(() => getAlbumVisibleGroups(layout, viewport.top, viewport.height), [layout, viewport.top, viewport.height]);
  const visibleItems = useMemo(() => visibleGroups.flatMap((group) => group.items), [visibleGroups]);
  const onScroll = useCallback((event: UIEvent<HTMLDivElement>): void => measure(event.currentTarget), [measure]);
  return { scrollRef, onScroll, visibleGroups, visibleItems, totalHeight: layout.totalHeight, rowHeight: layout.rowHeight };
}
