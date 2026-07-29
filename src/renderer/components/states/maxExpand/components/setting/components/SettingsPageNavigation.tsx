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
 * @file SettingsPageNavigation.tsx
 * @description 设置页面 - 右侧可展开分页导航
 * @author 鸡哥
 */

import { type ReactElement } from 'react';
import { SvgIcon } from '../../../../../../utils/SvgIcon';

interface SettingsPageNavigationProps<PageKey extends string> {
  activePage: PageKey;
  expanded: boolean;
  pages: readonly PageKey[];
  pageLabels: Record<PageKey, string>;
  navigationLabel: string;
  onSelectPage: (page: PageKey) => void;
}

interface SettingsPageNavigationToggleProps {
  expanded: boolean;
  label: string;
  onToggle: () => void;
}

/**
 * 渲染设置分页导航的展开或收起按钮。
 * @param expanded - 导航是否展开
 * @param label - 按钮无障碍标签
 * @param onToggle - 展开状态切换回调
 * @returns 标题栏导航开关
 */
export function SettingsPageNavigationToggle({
  expanded,
  label,
  onToggle,
}: SettingsPageNavigationToggleProps): ReactElement {
  return (
    <button
      className="settings-page-navigation-toggle"
      type="button"
      title={label}
      aria-label={label}
      aria-expanded={expanded}
      onClick={onToggle}
    >
      <img
        className="settings-page-navigation-toggle-icon"
        src={expanded ? SvgIcon.EXPAND : SvgIcon.COLLAPSE}
        alt=""
        aria-hidden="true"
      />
    </button>
  );
}

/**
 * 渲染位于页面内容右侧的可展开分页导航。
 * @param activePage - 当前激活分页
 * @param pages - 可用分页列表
 * @param pageLabels - 分页与展示文案映射
 * @param navigationLabel - 导航区域无障碍标签
 * @param onSelectPage - 分页切换回调
 * @returns 挤压主内容区域的右侧分页导航
 */
export function SettingsPageNavigation<PageKey extends string>({
  activePage,
  expanded,
  pages,
  pageLabels,
  navigationLabel,
  onSelectPage,
}: SettingsPageNavigationProps<PageKey>): ReactElement {
  return (
    <nav
      className={`settings-page-navigation${expanded ? ' expanded' : ''}`}
      aria-label={navigationLabel}
      aria-hidden={!expanded}
    >
      {expanded && (
        <div className="settings-page-navigation-menu">
          {pages.map((page) => (
            <button
              key={page}
              className={`settings-page-navigation-item${activePage === page ? ' active' : ''}`}
              type="button"
              onClick={() => onSelectPage(page)}
              aria-current={activePage === page ? 'page' : undefined}
            >
              {pageLabels[page]}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}