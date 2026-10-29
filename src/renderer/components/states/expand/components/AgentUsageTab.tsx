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
 * @file AgentUsageTab.tsx
 * @description Expanded Agent 用量 Tab，当前为留白页面
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import type React from 'react';

/**
 * Agent 用量 Tab
 * @description 展开状态下的 Agent 用量面板，内容待后续接入
 * @returns 留白的 Agent 用量面板
 */
export function AgentUsageTab(): React.ReactElement {
  const { t } = useTranslation();
  return <div className="expand-tab-panel" aria-label={t('expanded.nav.agentUsage')} />;
}
