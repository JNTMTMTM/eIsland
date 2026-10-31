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
 * @file ExpandedContent.tsx
 * @description Expanded 状态内容组件，单击灵动岛后展开的快捷操作面板
 * @author 鸡哥
 */

import '../../../../styles/expanded/expanded.css';
import { useExpandedContent } from '../hooks/useExpandedContent';
import { ExpandedNavDots } from './ExpandedNavDots';
import { ExpandedTabContent } from './ExpandedTabContent';
import type { ReactElement } from 'react';

/**
 * Expanded 状态内容组件
 * @description 扩展状态下的完整功能面板，底部正中间导航点切换 Tab
 * @returns 展开面板
 */
export function ExpandedContent(): ReactElement {
  const { expandTab, contentRef, slideDir, tabAnimation, navDots, handleNavDotClick } = useExpandedContent();

  return (
    <div className="expanded-content" ref={contentRef}>
      <ExpandedTabContent expandTab={expandTab} slideDir={slideDir} tabAnimation={tabAnimation} />
      <ExpandedNavDots navDots={navDots} expandTab={expandTab} onNavDotClick={handleNavDotClick} />
    </div>
  );
}
