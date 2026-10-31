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
 * @file useMarqueeOverflow.ts
 * @description 测量歌词文本超出容器的宽度，内容或容器尺寸变化时重新测量。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { UseMarqueeOverflowReturn } from '../types/songTypes';

/**
 * 测量文本溢出宽度。
 * @param content - 文本内容，变化时重新测量
 * @returns 外层/内层引用与溢出像素，未溢出为 0
 */
export function useMarqueeOverflow(content: ReactNode): UseMarqueeOverflowReturn {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) { setOverflow(0); return; }
    const diff = inner.scrollWidth - outer.clientWidth;
    setOverflow(diff > 1 ? diff : 0);
  }, []);

  useEffect(() => {
    measure();
  }, [content, measure]);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [measure]);

  return { outerRef, innerRef, overflow };
}
