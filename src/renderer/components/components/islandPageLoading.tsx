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
 * @file islandPageLoading.tsx
 * @description expanded 与 maxExpand 共用的性能模式加载动画和文字布局。
 * @author 鸡哥
 */

/* eslint-disable better-tailwindcss/no-unknown-classes -- 两种展开状态复用 settings-layout.css 中的加载样式。 */

import type { ReactElement } from 'react';
import '../../styles/settings/modules/settings-layout.css';

interface IslandPageLoadingProps {
  title: string;
  description: string;
  performanceModeEnabled: boolean;
}

/**
 * 显示当前目标页面的加载反馈，关闭性能模式时不创建动画。
 * @param props - 加载文案和性能模式开关。
 * @param props.title - 包含页面名称的加载标题。
 * @param props.description - 当前页面的加载说明。
 * @param props.performanceModeEnabled - 是否启用性能模式。
 * @returns 加载反馈，普通模式返回 null。
 */
export default function IslandPageLoading({ title, description, performanceModeEnabled }: IslandPageLoadingProps): ReactElement | null {
  if (!performanceModeEnabled) return null;
  return (
    <div className="max-expand-tab-loading" role="status" aria-live="polite">
      <span className="max-expand-tab-loading-spinner" aria-hidden="true" />
      <span className="max-expand-tab-loading-text">
        <span>{title}</span>
        <span className="max-expand-tab-loading-description">{description}</span>
      </span>
    </div>
  );
}

/* eslint-enable better-tailwindcss/no-unknown-classes -- 共享加载样式的例外仅适用于上面的组件。 */
