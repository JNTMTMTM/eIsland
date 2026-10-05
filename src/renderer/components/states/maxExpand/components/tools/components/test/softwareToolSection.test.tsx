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
 * @file softwareToolSection.test.tsx
 * @description 验证推荐软件的加载、空态、刷新、反馈及下载事件。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, nodes, render, text, value } from '../../../../test/componentHarness';
import { SETTINGS_OPEN_TAB_STORE_KEY } from '../../config/commonToolboxConfig';
import { SoftwareToolSection } from '../SoftwareToolSection';
import { fire } from './toolTestEvents';
import type { fetchToolboxSoftwareList } from '../../../../../../../api/tools/toolboxSoftwareApi';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn<typeof fetchToolboxSoftwareList>(), write: vi.fn<(key: string, value: string) => Promise<boolean>>(), open: vi.fn(),
}));
vi.mock('../../../../../../../api/tools/toolboxSoftwareApi', () => ({ fetchToolboxSoftwareList: mocks.fetch }));

describe('SoftwareToolSection', () => {
  beforeEach(() => {
    mocks.fetch.mockResolvedValue([]);
    mocks.write.mockResolvedValue(true);
    vi.stubGlobal('window', { api: { storeWrite: mocks.write, clipboardOpenUrl: mocks.open } });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('加载完成后的空态提供刷新和反馈导航', async () => {
    const onFeedbackNavigate = vi.fn();
    let tree = render(SoftwareToolSection, { onFeedbackNavigate });
    expect(text(tree)).toContain('software.loading');
    flushEffects();
    await vi.waitFor(() => { expect(text(render(SoftwareToolSection, { onFeedbackNavigate }))).toContain('software.empty'); });
    tree = render(SoftwareToolSection, { onFeedbackNavigate });
    fire(tree, 'button', 'onClick', 1);
    expect(mocks.write).toHaveBeenCalledWith(SETTINGS_OPEN_TAB_STORE_KEY, 'about-feedback');
    expect(onFeedbackNavigate).toHaveBeenCalledOnce();
    fire(tree, 'button', 'onClick');
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it('返回的软件展示元数据并将下载地址交给系统打开', async () => {
    mocks.fetch.mockResolvedValue([{ id: 1, name: 'Editor', description: 'Description', iconUrl: 'icon.png', url: 'https://example.test/download' }]);
    const initial = render(SoftwareToolSection, { onFeedbackNavigate: vi.fn() });
    expect(nodes(initial, '.software-list-card')).toHaveLength(0);
    flushEffects();
    await vi.waitFor(() => { expect(nodes(render(SoftwareToolSection, { onFeedbackNavigate: vi.fn() }), '.software-list-card')).toHaveLength(1); });
    const tree = render(SoftwareToolSection, { onFeedbackNavigate: vi.fn() });
    expect(text(tree)).toContain('EditorDescription');
    expect(value(tree, 'img', 'alt')).toBe('Editor');
    expect(value(tree, 'img', 'draggable')).toBe(false);
    fire(tree, 'button', 'onClick');
    expect(mocks.open).toHaveBeenCalledWith('https://example.test/download');
  });
});
