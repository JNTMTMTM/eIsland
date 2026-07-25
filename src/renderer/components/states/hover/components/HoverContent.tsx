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
 * @file HoverContent.tsx
 * @description Hover 状态内容组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { HoverContentProps } from '../types';
import { useHover } from '../hooks/useHover';
import { HoverForm } from './HoverForm';
import '../../../../styles/hover/hover.css';

/** Hover 状态内容组件 */
export function HoverContent(props: HoverContentProps): ReactElement {
  const hover = useHover(props);
  return (
    <HoverForm
      fullTimeStr={hover.fullTimeStr}
      lunarStr={hover.lunarStr}
      t={hover.t}
      hoverTab={hover.hoverTab}
      setHoverTab={hover.setHoverTab}
      setExpanded={hover.setExpanded}
      contentRef={hover.contentRef}
      getDotLabel={hover.getDotLabel}
    />
  );
}
