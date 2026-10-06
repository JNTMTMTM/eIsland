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
 * @file mailAccountTabs.test.tsx
 * @description MailAccountTabs 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, trigger, text } from '../../../../test/componentHarness';
import { MailAccountTabs as Component } from '../MailAccountTabs';

describe('MailAccountTabs', () => {
  const props = { accounts: [], activeAccount: null, collapsed: false, onSwitchAccount: vi.fn(), t: (key: string) => key };
  it('omits zero or one account and uses label, address or unnamed fallback', () => {
    expect(render(Component, props)).toBeNull();
    expect(render(Component, { ...props, accounts: [{ id: 'a' }] })).toBeNull();
    const accountItems = [{ id: 'a', label: 'Work' }, { id: 'b', emailAddress: 'b@example.com' }, { id: 'c' }];
    const tree = render(Component, {
      ...props,
      accounts: accountItems,
      activeAccount: accountItems[0],
      collapsed: true
    });
    expect(text(tree)).toBe('Workb@example.commailTab.accounts.unnamed');
    expect(nodes(tree, '.active')).toHaveLength(1);
    expect(nodes(tree, '.is-collapsed')).toHaveLength(1);
    const expanded = render(Component, { ...props, accounts: accountItems, collapsed: false });
    expect(nodes(expanded, '.is-collapsed')).toHaveLength(0);
    trigger(tree, 'button', 'onClick');
    expect(props.onSwitchAccount).toHaveBeenCalledWith(accountItems[0]);
  });
});
