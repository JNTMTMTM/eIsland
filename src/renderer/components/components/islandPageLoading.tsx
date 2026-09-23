/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
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
