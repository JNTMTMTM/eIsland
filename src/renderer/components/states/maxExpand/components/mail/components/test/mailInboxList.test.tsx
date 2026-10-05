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
 * @file mailInboxList.test.tsx
 * @description MailInboxList 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, nodes, trigger, text } from '../../../../test/componentHarness';
import { MailInboxList as Component } from '../MailInboxList';

describe('MailInboxList', () => {
  const props = { inbox: [], expandedUid: '', hasSplit: false, loadingInbox: true, onToggleItem: vi.fn(), t: (key: string) => key };
  it('shows loading only before the first inbox items arrive', () => {
    expect(nodes(render(Component, props), '.settings-mail-tab-loading')).toHaveLength(1);
    const tree = render(Component, { ...props, inbox: [{ uid: 'a', subject: '', from: '', body: 'Body', date: '2026-10-06' }], expandedUid: 'a' });
    expect(nodes(tree, '.settings-mail-tab-loading')).toHaveLength(0);
    expect(nodes(tree, '.is-expanded')).toHaveLength(1);
    expect(text(tree)).toContain('mailTab.fallbacks.noSubject');
    expect(text(tree)).toContain('Body');
    expect(nodes(tree, '.settings-mail-tab-mail-from')).toHaveLength(1);
    expect(nodes(tree, '.settings-mail-tab-mail-date')).toHaveLength(0);
  });
  it('switches split metadata and supports click, Enter and Space activation', () => {
    const tree = render(Component, { ...props, hasSplit: true, inbox: [{ uid: 'a', subject: 'Subject', from: 'Sender', preview: 'Preview', date: '2026-10-06' }] });
    expect(nodes(tree, '.settings-mail-tab-mail-from')).toHaveLength(0);
    expect(nodes(tree, '.settings-mail-tab-mail-date')).toHaveLength(1);
    trigger(tree, '.settings-mail-tab-mail-item', 'onClick');
    const event = { key: 'Escape', preventDefault: vi.fn() };
    trigger(tree, '.settings-mail-tab-mail-item', 'onKeyDown', event);
    expect(props.onToggleItem).toHaveBeenCalledTimes(1);
    ['Enter', ' '].forEach((keyValue) => trigger(tree, '.settings-mail-tab-mail-item', 'onKeyDown', {
      ...event,
      key: keyValue
    }));
    expect(props.onToggleItem).toHaveBeenCalledTimes(3);
    expect(props.onToggleItem).toHaveBeenLastCalledWith('a');
  });
});
