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
 * @file countdownCard.test.tsx
 * @description CountdownCard 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { Pin, Repeat2 } from 'lucide-react';
import { render, nodes, trigger, text } from '../../../../test/componentHarness';
import { CountdownCard as Component } from '../CountdownCard';
describe('CountdownCard', () => {
  const now = new Date(2026, 9, 6);
  const item = { id: 1, name: 'Release', date: '2026-10-10', type: 'event', color: '#f00', mode: 'down', repeat: 'none', description: 'notes' };
  it('renders remaining, elapsed inclusive and near-day text branches', () => {
    expect(text(render(Component, { item, now }))).toContain('4countdown.days.remainingUnit');
    const elapsed = render(Component, {
      now,
      item: {
        ...item,
        date: '2026-10-04',
        mode: 'up',
        includeToday: true
      }
    });
    expect(text(elapsed)).toContain('3countdown.days.elapsedUnit');
    const today = render(Component, {
      now,
      item: {
        ...item,
        date: '2026-10-06'
      }
    });
    expect(nodes(today, '.cd-day-caption')).toHaveLength(0);
    expect(text(today)).toContain('countdown.days.today');
  });
  it('uses an interactive card only with a callback and hides compact descriptions', () => {
    const onClick = vi.fn();
    const tree = render(Component, {
      now,
      onClick,
      item: {
        ...item,
        pinned: true,
        repeat: 'yearly'
      },
      compact: true
    });
    expect(nodes(tree, 'button')).toHaveLength(1);
    expect(nodes(tree, '.cd-card-desc')).toHaveLength(0);
    expect(nodes(tree, Pin)).toHaveLength(1);
    expect(nodes(tree, Repeat2)).toHaveLength(1);
    trigger(tree, 'button', 'onClick');
    expect(onClick).toHaveBeenCalledOnce();
    expect(nodes(render(Component, { item, now }), '.cd-card-desc')).toHaveLength(1);
  });
});
