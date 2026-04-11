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
 * @file SettingsTab.tsx
 * @description Expanded 设置 Tab
 * @author 鸡哥
 */

import type React from 'react';

/**
 * 设置 Tab
 * @description 展开状态下的设置面板
 */
export function SettingsTab(): React.ReactElement {
  return (
    <div className="expand-tab-panel">
      <span className="text-sm text-[var(--color-island-text)] opacity-40">设置</span>
    </div>
  );
}
