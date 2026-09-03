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
 * @file WorldClockTab.tsx
 * @description 最大展开模式 — 世界时钟 Tab — 占位组件（内容留白）
 * @author 鸡哥
 */

import type { ReactElement } from 'react';

/**
 * 世界时钟 Tab — 最大展开模式下的世界时钟面板（占位）
 */
export function WorldClockTab(): ReactElement {
  return <div className="max-expand-tab-panel world-clock-panel" />;
}
