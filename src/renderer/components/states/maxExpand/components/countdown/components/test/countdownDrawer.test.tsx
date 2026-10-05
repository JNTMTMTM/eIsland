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
 * @file countdownDrawer.test.tsx
 * @description CountdownDrawer 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value, trigger, text } from '../../../../test/componentHarness';
import { CountdownDrawer as Component } from '../CountdownDrawer';

describe('CountdownDrawer', () => {
  it('retains closed content inert and prevents Escape closure during saving', () => {
    const props = { open: false, saving: true, title: 'Editor', onClose: vi.fn(), children: 'body' };
    const tree = render(Component, props);
    expect(value(tree, '.cd-drawer-layer', 'inert')).toBe(true);
    expect(text(tree)).toContain('Editorbody');
    const event = { key: 'Escape', preventDefault: vi.fn(), stopPropagation: vi.fn() };
    trigger(tree, 'aside', 'onKeyDown', event);
    expect(props.onClose).not.toHaveBeenCalled();
    const opened = render(Component, { ...props, open: true, saving: false });
    expect(value(opened, '.cd-drawer-layer', 'aria-hidden')).toBe(false);
    expect(value(opened, 'aside', 'aria-labelledby')).toBe(value(opened, 'h3', 'id'));
    trigger(opened, 'aside', 'onKeyDown', event);
    expect(props.onClose).toHaveBeenCalledOnce();
    trigger(opened, '.cd-drawer-backdrop', 'onClick');
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });
});
