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
 * @file ScrollingText.tsx
 * @description 文本溢出时往返滚动的通用组件，供歌词状态与播放小组件复用
 * @author 鸡哥
 */

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

interface ScrollingTextProps {
  children: ReactNode;
  className: string;
  scrollProgress?: number;
}

/**
 * 仅在文本溢出可用宽度时启用往返滚动。
 * @param props - 文本节点与外层样式类名。
 * @returns 可根据实际宽度切换滚动状态的文本元素。
 */
export function ScrollingText({ children, className, scrollProgress }: ScrollingTextProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [overflowDistance, setOverflowDistance] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return undefined;

    const updateOverflow = (): void => {
      setOverflowDistance(Math.max(0, content.scrollWidth - container.clientWidth));
    };
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(container);
    observer.observe(content);
    updateOverflow();

    return () => observer.disconnect();
  }, []);

  const normalizedProgress = scrollProgress === undefined
    ? undefined
    : Math.min(1, Math.max(0, scrollProgress));
  const style = overflowDistance > 0
    ? {
      '--scroll-text-distance': `${overflowDistance}px`,
      '--scroll-text-duration': `${Math.max(6, overflowDistance / 18 + 4)}s`,
      '--scroll-text-offset': `${overflowDistance * (normalizedProgress ?? 0)}px`,
    } as CSSProperties
    : undefined;
  const progressClass = normalizedProgress === undefined ? '' : ' is-progress-driven';

  return (
    <div
      ref={containerRef}
      className={`${className} scroll-text${overflowDistance > 0 ? ` is-overflowing${progressClass}` : ''}`}
    >
      <span ref={contentRef} className="scroll-text-content" style={style}>
        {children}
      </span>
    </div>
  );
}
