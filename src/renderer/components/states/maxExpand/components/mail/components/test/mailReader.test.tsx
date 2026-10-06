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
 * @file mailReader.test.tsx
 * @description MailReader 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value, trigger, text } from '../../../../test/componentHarness';
import { MailReader as Component } from '../MailReader';

describe('MailReader', () => {
  it('builds body HTML with fallbacks and isolates reader events', () => {
    const tree = render(Component, { item: { subject: '', from: '', body: '', preview: '<b>Preview</b>' }, t: (key: string) => key });
    expect(text(tree)).toContain('mailTab.fallbacks.noSubject');
    expect(value(tree, 'iframe', 'srcDoc')).toContain('&lt;b&gt;Preview&lt;/b&gt;');
    expect(value(tree, 'iframe', 'title')).toBe('');
    const event = { stopPropagation: vi.fn() };
    ['onClick', 'onKeyDown', 'onWheel'].forEach((name) => trigger(tree, '.settings-mail-tab-reader', name, event));
    expect(event.stopPropagation).toHaveBeenCalledTimes(3);
    const body = render(Component, { item: { subject: 'Subject', from: 'Sender', body: '<p>Body</p>', preview: 'ignored' }, t: (key: string) => key });
    expect(value(body, 'iframe', 'srcDoc')).toContain('<p>Body</p>');
    expect(value(body, 'iframe', 'srcDoc')).not.toContain('ignored');
    const empty = render(Component, { item: { subject: '', from: '', body: '', preview: '' }, t: (key: string) => key });
    expect(value(empty, 'iframe', 'srcDoc')).toContain('>-<');
  });
});
