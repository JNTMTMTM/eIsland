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
 * @file WheelPicker.tsx
 * @description iOS 风格时间轮盘选择器组件。
 * @author 鸡哥
 */

import React, { useRef } from 'react';
import { WHEEL_ITEM_HEIGHT, WHEEL_VISIBLE_ITEMS } from '../config/wheelPickerConstants';
import type { WheelPickerProps } from '../types/wheelPickerTypes';
import { useWheelPicker } from '../hooks/useWheelPicker';

/** iOS 风格时间轮盘选择器 */
export function WheelPicker({ min, max, value, onChange }: WheelPickerProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const items = React.useMemo(() => Array.from({ length: max - min + 1 }, (_, i) => min + i), [min, max]);
  const padding = Math.floor(WHEEL_VISIBLE_ITEMS / 2);
  const containerHeight = WHEEL_VISIBLE_ITEMS * WHEEL_ITEM_HEIGHT;

  const { handleMouseDown } = useWheelPicker({ containerRef, items, value, onChange });

  return (
    <div className="alarm-wheel-picker" style={{ height: containerHeight }}>
      <div className="alarm-wheel-highlight" />
      <div
        className="alarm-wheel-scroll"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        style={{ height: containerHeight }}
      >
        {Array.from({ length: padding }, (_, i) => (
          <div key={`pt${i}`} className="alarm-wheel-item alarm-wheel-item--empty" style={{ height: WHEEL_ITEM_HEIGHT }} />
        ))}
        {items.map((n) => (
          <div
            key={n}
            className={`alarm-wheel-item${n === value ? ' alarm-wheel-item--active' : ''}`}
            style={{ height: WHEEL_ITEM_HEIGHT }}
          >
            {String(n).padStart(2, '0')}
          </div>
        ))}
        {Array.from({ length: padding }, (_, i) => (
          <div key={`pb${i}`} className="alarm-wheel-item alarm-wheel-item--empty" style={{ height: WHEEL_ITEM_HEIGHT }} />
        ))}
      </div>
    </div>
  );
}
