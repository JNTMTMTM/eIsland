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
 * @file TrayMenuSkeleton.tsx
 * @description 托盘菜单骨架屏：菜单状态到达前显示，结构需与 DynamicIslandTrayMenu.html 中的静态骨架一致，
 * React 挂载替换静态骨架时画面不变
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import '../styles/tray-menu-skeleton.css';

/** 菜单项骨架分组，与默认（非独立窗口模式）菜单项及分隔线布局一致 */
const ROW_GROUPS = [['show', 'hide', 'top'], ['log', 'restart'], ['quit']];

/**
 * 托盘菜单骨架屏
 * @returns 骨架屏元素
 */
export function TrayMenuSkeleton(): ReactElement {
  return (
    <div className="tray-skeleton" aria-hidden="true">
      <div className="tray-skeleton-card tray-skeleton-user">
        <span className="tray-skeleton-block tray-skeleton-avatar" />
        <span className="tray-skeleton-lines">
          <span className="tray-skeleton-block tray-skeleton-line" />
          <span className="tray-skeleton-block tray-skeleton-line tray-skeleton-line-short" />
        </span>
      </div>
      <div className="tray-skeleton-card tray-skeleton-music">
        <div className="tray-skeleton-music-main">
          <span className="tray-skeleton-block tray-skeleton-cover" />
          <span className="tray-skeleton-lines">
            <span className="tray-skeleton-block tray-skeleton-line" />
            <span className="tray-skeleton-block tray-skeleton-line tray-skeleton-line-short" />
          </span>
          <span className="tray-skeleton-controls">
            <span className="tray-skeleton-block tray-skeleton-button" />
            <span className="tray-skeleton-block tray-skeleton-button" />
            <span className="tray-skeleton-block tray-skeleton-button" />
          </span>
        </div>
        <span className="tray-skeleton-block tray-skeleton-seek" />
      </div>
      <div className="tray-skeleton-list">
        {ROW_GROUPS.flatMap((group, index) => [
          ...(index > 0 ? [<div key={`separator-${group[0]}`} className="tray-skeleton-separator" />] : []),
          ...group.map((id) => (
            <div key={id} className="tray-skeleton-row">
              <span className="tray-skeleton-block tray-skeleton-row-bar" />
            </div>
          )),
        ])}
      </div>
    </div>
  );
}
