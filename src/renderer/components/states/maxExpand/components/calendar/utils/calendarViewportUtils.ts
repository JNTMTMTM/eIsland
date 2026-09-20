/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarViewportUtils.ts
 * @description 二分定位可视月份，避免每个滚动像素扫描全部月份并重绘。
 * @author 鸡哥
 */

/**
 * 取得可视月份及前后各一个缓冲月份的范围。
 * @param layouts - 按顶部位置递增的月份布局，至少包含一个月份。
 * @param top - 当前滚动位置。
 * @param height - 可视区域高度。
 * @returns 当前月份索引和待渲染范围，last 不包含在范围内。
 */
export function getCalendarViewportRange(layouts: readonly { top: number; height: number }[], top: number, height: number) {
  let low = 0;
  let high = layouts.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (layouts[middle].top + layouts[middle].height <= top) low = middle + 1;
    else high = middle;
  }
  const visibleIndex = Math.min(low, layouts.length - 1);
  low = visibleIndex;
  high = layouts.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (layouts[middle].top < top + height) low = middle + 1;
    else high = middle;
  }
  return { visibleIndex, first: Math.max(0, visibleIndex - 1), last: Math.min(layouts.length, low + 1) };
}
