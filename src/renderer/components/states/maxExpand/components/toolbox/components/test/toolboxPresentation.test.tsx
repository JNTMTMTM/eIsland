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
 * @file toolboxPresentation.test.tsx
 * @description 验证导航展示对保存拒绝与失效侧栏输入的降级，不执行真实系统操作。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { nodes, render, text } from '../../../../test/componentHarness';
import { ToolboxIndex } from '../ToolboxIndex';
import { ToolboxPanel } from '../ToolboxPanel';
import { fire } from '../../../tools/components/test/toolTestEvents';
import type { TFunction } from 'i18next';
import type { ToolboxNavigationState } from '../../types';

vi.mock('../../../../../../../api/tools/toolboxSoftwareApi', () => ({ fetchToolboxSoftwareList: vi.fn() }));
vi.mock('../../../tools/hooks/useTranslateTool', () => ({ useTranslateTool: vi.fn() }));

const t = ((key: string) => key) as TFunction;

/**
 * 创建真实展示协议的初始导航状态，动作仅记录调用。
 * @returns 完整导航状态。
 */
function navigation(): ToolboxNavigationState {
  return {
    activeSidebar: 'index', setActiveSidebar: vi.fn(),
    downloadPage: 'create', setDownloadPage: vi.fn(),
    fileCompressionPage: 'imageCompression', setFileCompressionPage: vi.fn(),
    formatFactoryPage: 'image', setFormatFactoryPage: vi.fn(),
    navEditMode: false, navSaving: false, navSaveError: false, dragOverIdx: null,
    searchQuery: '', setSearchQuery: vi.fn(), visibleCards: [], hiddenCards: [], searchResults: null,
    resetToolboxNavConfig: vi.fn(), navigateByCard: vi.fn(), toggleNavEditMode: vi.fn<() => Promise<void>>(),
    removeCard: vi.fn(), addCard: vi.fn(), handleDragStart: vi.fn(), handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(), handleDrop: vi.fn(), handleDragEnd: vi.fn(),
  };
}

describe('toolbox presentation boundaries', () => {
  it('异步编辑操作拒绝时点击处理器不产生未处理拒绝', async () => {
    const state = navigation();
    const failure = Promise.reject(new Error('save unavailable'));
    state.toggleNavEditMode = vi.fn<() => Promise<void>>().mockReturnValue(failure);
    const tree = render(ToolboxIndex, { t, navigation: state });
    expect(fire(tree, '.settings-nav-edit-btn', 'onClick', 1)).toBeUndefined();
    await failure.catch(() => undefined);
    expect(state.toggleNavEditMode).toHaveBeenCalledOnce();
    expect(nodes(tree, '.settings-index-card')).toHaveLength(0);
  });

  it('未识别的侧栏值不显示错误标题或挂载其他工具', () => {
    const state = navigation();
    state.activeSidebar = 'removed-tool' as ToolboxNavigationState['activeSidebar'];
    const tree = render(ToolboxPanel, { t, navigation: state, onSoftwareFeedbackNavigate: vi.fn() });
    expect(text(nodes(tree, '.toolbox-panel-title'))).toBe('');
    expect(nodes(tree, '.settings-index-section')).toHaveLength(0);
  });
});
