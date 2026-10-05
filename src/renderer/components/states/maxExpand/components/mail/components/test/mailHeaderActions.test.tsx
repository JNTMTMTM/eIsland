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
 * @file mailHeaderActions.test.tsx
 * @description MailHeaderActions 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { MailHeaderActions as Component } from '../MailHeaderActions';

describe('MailHeaderActions', () => {
  it('forwards settings and refresh while exposing loading disabled state', () => {
    const props = { loadingInbox: false, onGoSettings: vi.fn(), onRefresh: vi.fn(), t: (key: string) => key };
    const tree = render(Component, props);
    trigger(tree, 'button', 'onClick');
    (value(tree, 'button', 'onClick', 1) as () => void)();
    expect(props.onGoSettings).toHaveBeenCalledOnce();
    expect(props.onRefresh).toHaveBeenCalledOnce();
    expect(value(tree, 'button', 'disabled', 1)).toBe(false);
    const loading = render(Component, { ...props, loadingInbox: true });
    expect(value(loading, 'button', 'disabled', 1)).toBe(true);
    expect(nodes(loading, '.is-loading')).toHaveLength(1);
  });
});
