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
 * @file toolboxTab.test.tsx
 * @description 验证工具箱全部入口、页面状态、导航编辑与持久化边界。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, nodes, render, text, trigger, value } from '../../../../test/componentHarness';
import { ToolboxTab } from '../ToolboxTab';
import { DownloadToolSection } from '../../../tools/components/DownloadToolSection';
import { EncodingServiceToolSection } from '../../../tools/components/EncodingServiceToolSection';
import { FileCompressionToolSection } from '../../../tools/components/FileCompressionToolSection';
import { FileServiceToolSection } from '../../../tools/components/FileServiceToolSection';
import { FormatFactoryToolSection } from '../../../tools/components/FormatFactoryToolSection';
import { NetworkServiceToolSection } from '../../../tools/components/NetworkServiceToolSection';
import { SoftwareToolSection } from '../../../tools/components/SoftwareToolSection';
import { TranslateToolSection } from '../../../tools/components/TranslateToolSection';
import { DEFAULT_TOOLBOX_NAV_ORDER, TOOLBOX_NAV_CARDS } from '../../../tools/config/commonToolboxConfig';
import { fire } from '../../../tools/components/test/toolTestEvents';
import { expandToolboxTree } from './toolboxTestTree';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  read: vi.fn<(key: string) => Promise<unknown>>(),
  write: vi.fn<(key: string, data: unknown) => Promise<boolean>>(), settings: vi.fn(),
}));
vi.mock('../../../../../../../store/slices', () => ({ default: () => ({ setMaxExpandTab: mocks.settings }) }));
vi.mock('../../../../../../../api/tools/toolboxSoftwareApi', () => ({ fetchToolboxSoftwareList: vi.fn() }));
vi.mock('../../../tools/hooks/useTranslateTool', () => ({ useTranslateTool: vi.fn() }));

const sections = [DownloadToolSection, SoftwareToolSection, TranslateToolSection, FileServiceToolSection,
  EncodingServiceToolSection, NetworkServiceToolSection, FileCompressionToolSection, FormatFactoryToolSection];

/**
 * 展开无状态展示组件，导航 Hook 仍由原有渲染工具执行。
 * @returns 当前工具箱元素树。
 */
function renderToolbox(): ReactNode {
  return expandToolboxTree(render(ToolboxTab));
}

describe('ToolboxTab', () => {
  beforeEach(() => {
    mocks.read.mockResolvedValue(null);
    mocks.write.mockResolvedValue(true);
    vi.stubGlobal('window', Object.assign(new EventTarget(), { api: { storeRead: mocks.read, storeWrite: mocks.write } }));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('首页呈现全部导航，侧栏选择真实工具组件并可返回首页', () => {
    expect(nodes(renderToolbox(), '.settings-index-card')).toHaveLength(12);
    sections.forEach((section, index) => {
      fire(renderToolbox(), '.max-expand-settings-sidebar-item', 'onClick', index + 1);
      const tree = renderToolbox();
      expect(nodes(tree, section)).toHaveLength(1);
      expect(nodes(tree, '.toolbox-panel-title')).toHaveLength(1);
    });
    fire(renderToolbox(), '.max-expand-settings-sidebar-item', 'onClick', 0);
    expect(nodes(renderToolbox(), '.settings-index-card')).toHaveLength(12);
  });

  it.each(TOOLBOX_NAV_CARDS.map((card, index) => ({ index, ...card })))('首页入口 $id转发工具及对应子页', (card) => {
    fire(renderToolbox(), '.settings-index-card', 'onClick', card.index);
    const tree = renderToolbox();
    const section = sections[['download', 'software', 'translate', 'fileService', 'encodingService', 'networkService', 'fileCompression', 'formatFactory'].indexOf(card.sidebar)];
    expect(nodes(tree, section)).toHaveLength(1);
    if (card.downloadPage) expect(value(tree, section, 'downloadPage')).toBe(card.downloadPage);
    if (card.fileCompressionPage) expect(value(tree, section, 'fileCompressionPage')).toBe(card.fileCompressionPage);
    if (card.formatFactoryPage) expect(value(tree, section, 'formatFactoryPage')).toBe(card.formatFactoryPage);
  });

  it.each([
    { index: 1, component: DownloadToolSection, setter: 'setDownloadPage', prop: 'downloadPage', page: 'history' },
    { index: 7, component: FileCompressionToolSection, setter: 'setFileCompressionPage', prop: 'fileCompressionPage', page: 'history' },
    { index: 8, component: FormatFactoryToolSection, setter: 'setFormatFactoryPage', prop: 'formatFactoryPage', page: 'video' },
  ])('侧栏 $index传递子页变更并更新标题', ({ index, component, setter, prop, page }) => {
    fire(renderToolbox(), '.max-expand-settings-sidebar-item', 'onClick', index);
    trigger(renderToolbox(), component, setter, page);
    const tree = renderToolbox();
    expect(value(tree, component, prop)).toBe(page);
    expect(text(nodes(tree, '.settings-app-title-sub'))).toContain(page);
  });

  it('搜索忽略大小写和首尾空白，无结果可清空，匹配入口选择后清空', () => {
    fire(renderToolbox(), '.settings-index-search-input', 'onChange', 0, { target: { value: '  DOWNLOAD-HISTORY  ' } });
    let tree = renderToolbox();
    expect(nodes(tree, '.settings-index-search-dropdown-item')).toHaveLength(1);
    fire(tree, '.settings-index-search-dropdown-item', 'onClick');
    tree = renderToolbox();
    expect(value(tree, DownloadToolSection, 'downloadPage')).toBe('history');
    fire(tree, '.max-expand-settings-sidebar-item', 'onClick', 0);
    expect(value(renderToolbox(), '.settings-index-search-input', 'value')).toBe('');
    fire(renderToolbox(), '.settings-index-search-input', 'onChange', 0, { target: { value: 'no-match' } });
    expect(text(renderToolbox())).toContain('searchEmpty');
    fire(renderToolbox(), '.settings-index-search-clear', 'onClick');
    expect(nodes(renderToolbox(), '.settings-index-search-dropdown')).toHaveLength(0);
  });

  it('编辑移除、补回、保存和重置导航，保存失败不破坏已编辑状态', async () => {
    fire(renderToolbox(), '.settings-nav-edit-btn', 'onClick', 1);
    expect(text(renderToolbox())).toContain('emptyAddable');
    fire(renderToolbox(), '.settings-index-card-remove', 'onClick', 0);
    const tree = renderToolbox();
    expect(nodes(tree, '.settings-index-card')).toHaveLength(11);
    expect(nodes(tree, '.settings-nav-add-item')).toHaveLength(1);
    fire(tree, '.settings-nav-add-item', 'onClick');
    expect(nodes(renderToolbox(), '.settings-index-card')).toHaveLength(12);
    mocks.write.mockRejectedValue(new Error('storage offline'));
    fire(renderToolbox(), '.settings-nav-edit-btn', 'onClick', 1);
    await Promise.resolve();
    expect(mocks.write).toHaveBeenCalledWith('toolbox-nav-order', [...DEFAULT_TOOLBOX_NAV_ORDER.slice(1), DEFAULT_TOOLBOX_NAV_ORDER[0]]);
    expect(mocks.write).toHaveBeenCalledWith('toolbox-hidden-nav-order', []);
    fire(renderToolbox(), '.settings-nav-edit-btn', 'onClick', 0);
    expect(nodes(renderToolbox(), '.settings-index-card').map((node) => node.key)).toEqual(DEFAULT_TOOLBOX_NAV_ORDER.map((id) => `.$${  id}`));
  });

  it('拖拽改序、悬停及离开清理，未开始或同位置放下保持顺序', () => {
    fire(renderToolbox(), '.settings-nav-edit-btn', 'onClick', 1);
    const event = { preventDefault: vi.fn(), dataTransfer: { effectAllowed: '' } };
    fire(renderToolbox(), '.settings-index-card', 'onDrop', 2, event);
    fire(renderToolbox(), '.settings-index-card', 'onDragStart', 0, event);
    expect(event.dataTransfer.effectAllowed).toBe('move');
    fire(renderToolbox(), '.settings-index-card', 'onDragOver', 2, event);
    expect(value(renderToolbox(), '.settings-index-card', 'className', 2)).toContain('drag-over');
    fire(renderToolbox(), '.settings-index-card', 'onDragLeave', 2);
    expect(value(renderToolbox(), '.settings-index-card', 'className', 2)).not.toContain('drag-over');
    fire(renderToolbox(), '.settings-index-card', 'onDrop', 2, event);
    expect(text(nodes(renderToolbox(), '.settings-index-card')[2])).toContain('download-create');
    fire(renderToolbox(), '.settings-index-card', 'onDragEnd', 2);
    fire(renderToolbox(), '.settings-nav-edit-btn', 'onClick', 1);
    expect(mocks.write).toHaveBeenCalledWith('toolbox-nav-order', [
      ...DEFAULT_TOOLBOX_NAV_ORDER.slice(1, 3), DEFAULT_TOOLBOX_NAV_ORDER[0], ...DEFAULT_TOOLBOX_NAV_ORDER.slice(3),
    ]);
  });

  it('存储配置过滤无效值、重复项并补齐缺失入口', async () => {
    mocks.read.mockResolvedValueOnce(['software', 'software', 'invalid', 7]).mockResolvedValueOnce(['software', 'invalid']);
    await renderToolbox(); flushEffects();
    await vi.waitFor(() => { expect(mocks.read).toHaveBeenCalledTimes(2); });
    const tree = renderToolbox();
    expect(nodes(tree, '.settings-index-card')).toHaveLength(12);
    expect(text(nodes(tree, '.settings-index-card')[0])).toContain('nav.software.label');
    fire(tree, '.settings-nav-edit-btn', 'onClick', 1);
    expect(nodes(renderToolbox(), '.settings-nav-add-item')).toHaveLength(0);
  });

  it.each([true, false])('读取配置异常或卸载后完成时保留默认入口：异常=%s', async (reject) => {
    const pending = Promise.withResolvers<unknown>();
    mocks.read.mockReturnValueOnce(pending.promise);
    await renderToolbox();
    const cleanups = flushEffects();
    if (reject) pending.reject(new Error('read offline'));
    else { cleanups.forEach((cleanup) => cleanup()); pending.resolve(['software']); }
    await Promise.resolve();
    expect(mocks.read).toHaveBeenCalledTimes(1);
    expect(text(nodes(renderToolbox(), '.settings-index-card')[0])).toContain('download-create');
  });

  it('软件反馈切换设置并发送已有页面导航事件', () => {
    const events: unknown[] = [];
    window.addEventListener('standalone-tab-switch', (event) => { events.push((event as CustomEvent<unknown>).detail); });
    window.addEventListener('settings-open-tab-intent', (event) => { events.push((event as CustomEvent<unknown>).detail); });
    fire(renderToolbox(), '.max-expand-settings-sidebar-item', 'onClick', 2);
    trigger(renderToolbox(), SoftwareToolSection, 'onFeedbackNavigate');
    expect(mocks.settings).toHaveBeenCalledWith('settings');
    expect(events).toEqual(['settings', 'about-feedback']);
  });
});
