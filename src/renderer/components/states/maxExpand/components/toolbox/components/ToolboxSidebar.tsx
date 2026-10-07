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
 * @file ToolboxSidebar.tsx
 * @description 工具箱分类侧栏展示。
 * @author 鸡哥
 */

import { TOOLBOX_SIDEBAR_ITEMS } from '../config/toolboxSidebarConfig';
import type { ReactElement } from 'react';
import type { ToolboxNavigationProps } from '../types';

/**
 * 渲染工具分类侧栏。
 * @param props - 侧栏展示输入。
 * @param props.t - 当前语言翻译函数。
 * @param props.navigation - 当前分类及选择操作。
 * @returns 工具箱侧栏。
 */
export function ToolboxSidebar({ t, navigation }: ToolboxNavigationProps): ReactElement {
  const { activeSidebar, setActiveSidebar } = navigation;
  return (
    <div className="max-expand-settings-sidebar">
      {TOOLBOX_SIDEBAR_ITEMS.map((item) => (
        <button
          key={item.key}
          className={`max-expand-settings-sidebar-item ${activeSidebar === item.key ? 'active' : ''}`}
          onClick={() => setActiveSidebar(item.key)}
          type="button"
        >
          <span className="sidebar-dot" />
          {item.sidebarLabelKey
            ? t(item.sidebarLabelKey, { defaultValue: t(item.labelKey) })
            : t(item.labelKey)}
        </button>
      ))}
    </div>
  );
}
