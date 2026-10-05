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
 * @file emptyMailGuide.test.tsx
 * @description EmptyMailGuide 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, trigger, text } from '../../../../test/componentHarness';
import { EmptyMailGuide as Component } from '../EmptyMailGuide';
import { MAIL_HELP_URL } from '../../config/mailConfig';
describe('EmptyMailGuide', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('routes settings and opens the configured help URL', async () => {
    const clipboardOpenUrl = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('window', { api: { clipboardOpenUrl } });
    const onGoSettings = vi.fn();
    const tree = render(Component, { onGoSettings, t: (key: string) => key });
    expect(text(tree)).toContain('mailTab.emptyGuide.title');
    trigger(tree, '.settings-user-primary-btn', 'onClick');
    await trigger(tree, '.settings-user-secondary-btn', 'onClick');
    expect(onGoSettings).toHaveBeenCalledOnce();
    expect(clipboardOpenUrl).toHaveBeenCalledWith(MAIL_HELP_URL);
  });
});
