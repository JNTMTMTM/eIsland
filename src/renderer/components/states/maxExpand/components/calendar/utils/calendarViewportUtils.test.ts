/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarViewportUtils.test.ts
 * @description 验证动态高度月份的可视范围、边界与像素滚动时的窗口复用。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { getCalendarViewportRange } from './calendarViewportUtils';

describe('calendar viewport range', () => {
  const layouts = [
    { top: 0, height: 320 },
    { top: 320, height: 480 },
    { top: 800, height: 376 },
    { top: 1176, height: 420 },
  ];

  it('keeps the current month and a buffer beyond both visible edges', () => {
    expect(getCalendarViewportRange(layouts, 330, 300)).toEqual({ visibleIndex: 1, first: 0, last: 3 });
    expect(getCalendarViewportRange(layouts, 700, 300)).toEqual({ visibleIndex: 1, first: 0, last: 4 });
    expect(getCalendarViewportRange(layouts, 800, 300)).toEqual({ visibleIndex: 2, first: 1, last: 4 });
  });

  it('does not invalidate a month window during fine scrolling within it', () => {
    const first = getCalendarViewportRange(layouts, 330, 300);
    for (let top = 331; top <= 500; top++) {
      expect(getCalendarViewportRange(layouts, top, 300)).toEqual(first);
    }
    expect(getCalendarViewportRange(layouts, 501, 300)).not.toEqual(first);
  });

  it('handles exact month boundaries and viewport edges', () => {
    expect(getCalendarViewportRange(layouts, 0, 320)).toEqual({ visibleIndex: 0, first: 0, last: 2 });
    expect(getCalendarViewportRange(layouts, 320, 480)).toEqual({ visibleIndex: 1, first: 0, last: 3 });
    expect(getCalendarViewportRange(layouts, 1200, 500)).toEqual({ visibleIndex: 3, first: 2, last: 4 });
    expect(getCalendarViewportRange([{ top: 0, height: 320 }], 0, 400)).toEqual({ visibleIndex: 0, first: 0, last: 1 });
  });
});
