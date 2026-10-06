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
 * @file mailTab.test.tsx
 * @description MailTab 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, value, trigger } from '../../../../test/componentHarness';
import { MailTab as Component } from '../MailTab';
import { EmptyMailGuide } from '../EmptyMailGuide';
import { MailHeaderActions } from '../MailHeaderActions';
import { MailInboxList } from '../MailInboxList';
import { MailReader } from '../MailReader';
const state = vi.hoisted(() => ({ mailConfigured: true, selectedItem: null as { uid: string } | null, hasSplit: false, toggleInboxItem: vi.fn(), refreshInbox: vi.fn() }));
vi.mock('../../hooks/useMail', () => ({ useMail: () => state }));
describe('MailTab', () => {
  it('shows configuration guide, then list and optional selected reader', () => {
    state.mailConfigured = false;
    expect(nodes(render(Component), EmptyMailGuide)).toHaveLength(1);
    state.mailConfigured = true;
    const tree = render(Component);
    expect(nodes(tree, MailReader)).toHaveLength(0);
    expect(value(tree, MailInboxList, 'onToggleItem')).toBe(state.toggleInboxItem);
    trigger(tree, MailHeaderActions, 'onRefresh');
    expect(state.refreshInbox).toHaveBeenCalledOnce();
    state.selectedItem = { uid: 'a' };
    state.hasSplit = true;
    const split = render(Component);
    expect(value(split, MailReader, 'item')).toBe(state.selectedItem);
    expect(nodes(split, '.has-split')).toHaveLength(1);
  });
});
