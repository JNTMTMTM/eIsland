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
 * @file countdownPreview.test.tsx
 * @description CountdownPreview 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { render, value } from '../../../../test/componentHarness';
import { CountdownPreview as Component } from '../CountdownPreview';
import { CountdownCard } from '../CountdownCard';
describe('CountdownPreview', () => {
  it('trims a draft title and provides a placeholder for an empty title', () => {
    const draft = { name: '  ', date: '2026-10-06' };
    const now = new Date(2026, 9, 6);
    expect(value(render(Component, { draft, now }), CountdownCard, 'item')).toEqual({ ...draft, id: 0, name: 'countdown.namePlaceholder' });
    expect(value(render(Component, {
      now,
      draft: {
        ...draft,
        name: ' title '
      }
    }), CountdownCard, 'item')).toEqual({ ...draft, id: 0, name: 'title' });
    expect(draft.name).toBe('  ');
  });
});
