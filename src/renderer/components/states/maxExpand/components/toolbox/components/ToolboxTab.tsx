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
 * @file ToolboxTab.tsx
 * @description 最大展开模式工具箱的组合入口。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { useToolboxFeedbackNavigation } from '../hooks/useToolboxFeedbackNavigation';
import { useToolboxNavigation } from '../hooks/useToolboxNavigation';
import { ToolboxPanel } from './ToolboxPanel';
import { ToolboxSidebar } from './ToolboxSidebar';
import type { ReactElement } from 'react';

/**
 * 组合工具箱导航状态与展示组件。
 * @returns 最大展开模式工具箱页面。
 */
export function ToolboxTab(): ReactElement {
  const { t, i18n } = useTranslation();
  const handleSoftwareFeedbackNavigate = useToolboxFeedbackNavigation();
  const navigation = useToolboxNavigation(t, i18n.language);
  return (
    <div className="max-expand-settings toolbox-tab-container">
      <div className="max-expand-settings-layout">
        <ToolboxSidebar t={t} navigation={navigation} />
        <ToolboxPanel t={t} navigation={navigation} onSoftwareFeedbackNavigate={handleSoftwareFeedbackNavigate} />
      </div>
    </div>
  );
}
