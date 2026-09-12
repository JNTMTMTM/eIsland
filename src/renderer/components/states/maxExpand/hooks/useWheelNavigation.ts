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
 * @file useWheelNavigation.ts
 * @description 滚轮切换 Tab 导航 Hook
 * @author 鸡哥
 */

import { type RefObject } from 'react';
import type { MaxExpandTab } from '../../../../store/types';
import type { NavDotId } from '../config/shellConstants';

/** 需要跳过滚轮事件的 CSS 选择器列表 */
const WHEEL_EXCLUDED_SELECTORS = [
  '.expand-todo-list',
  '.url-favorites-list',
  '.url-favorites-input',
  '.album-grid',
  '.album-viewer-canvas',
  '.album-meta-panel',
  '.album-sort-select',
  '.local-file-search-results',
  '.local-file-search-root-input',
  '.local-file-search-query-input',
  '.clipboard-history-list',
  '.max-expand-settings',
  '.countdown-calendar-wrap',
  '.cd-cards-wrap',
  '.cd-editor-form',
  '.cd-color-picker-popup',
  '.max-expand-chat-messages',
  '.max-expand-chat-session-sidebar',
  '.max-expand-chat-session-list',
  '.max-expand-chat-web-access-panel',
  '.max-expand-chat-web-access-card',
  '.max-expand-chat-local-tool-access-card',
  '.max-expand-chat-input',
  '.settings-mail-tab-inbox-list',
  '.settings-mail-tab-reader',
  '.settings-field-input',
  '.settings-field-textarea',
  '.memo-tab-container',
  '.alarm-tab-container',
  '.world-clock-container',
  '.world-clock-picker-sidebar',
  '.cli-tab',
  '.cli-tab-event-list',
  '.cli-tab-session-list',
];

interface FilteredNavDot {
  id: NavDotId;
  label: string;
}

/**
 * 绑定滚轮事件到内容容器，实现 Tab 切换。
 * @param contentRef - 内容容器 ref。
 * @param activeTabRef - 当前 Tab ref。
 * @param filteredNavDotsRef - 过滤后的导航点 ref。
 * @param navigateTab - 导航到指定 Tab 的回调。
 * @param deps - useEffect 依赖。
 */
export function useWheelNavigation(
  contentRef: RefObject<HTMLDivElement | null>,
  activeTabRef: RefObject<MaxExpandTab>,
  filteredNavDotsRef: RefObject<FilteredNavDot[]>,
  navigateTab: (id: NavDotId) => void,
  deps: unknown[],
): void {
  // 此 hook 的 useEffect 在组件中内联调用，因为依赖数组复杂
  // 保留为工具函数导出
}

/**
 * 判断滚轮事件是否应被忽略（目标在排除区域内）。
 * @param target - 事件目标元素。
 * @returns 是否应忽略。
 */
export function shouldIgnoreWheelEvent(target: HTMLElement): boolean {
  return WHEEL_EXCLUDED_SELECTORS.some((selector) => target.closest(selector) !== null);
}
