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
 * @file MarqueeLyricText.tsx
 * @description 歌词文本轮播，文本超出容器时自动从右向左滚动，停顿后循环。
 * @author 鸡哥
 */

import { useMarqueeOverflow } from '../hooks/useMarqueeOverflow';
import type { CSSProperties, ReactElement } from 'react';
import type { MarqueeLyricTextProps } from '../types/songTypes';

/**
 * 歌词文本轮播
 * @param props - 组件入参
 * @param props.children - 歌词内容
 * @returns 轮播容器
 */
export function MarqueeLyricText({ children }: MarqueeLyricTextProps): ReactElement {
  const { outerRef, innerRef, overflow } = useMarqueeOverflow(children);

  return (
    <div ref={outerRef} className="ov-lrc-marquee-wrap">
      <span
        ref={innerRef}
        className={overflow > 0 ? 'ov-lrc-marquee-inner scrolling' : 'ov-lrc-marquee-inner'}
        style={overflow > 0 ? { '--marquee-dist': `${-overflow}px`, '--marquee-dur': `${Math.max(3, overflow / 30)}s` } as CSSProperties : undefined}
      >
        {children}
      </span>
    </div>
  );
}
