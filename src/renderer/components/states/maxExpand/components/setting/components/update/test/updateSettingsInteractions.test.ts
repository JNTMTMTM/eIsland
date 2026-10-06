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
 * @file updateSettingsInteractions.test.ts
 * @description 更新设置真实下载指标、公告选择与未知页面兜底回归。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateSettingsSection } from '../UpdateSettingsSection';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle } from '../../app/components/test/themeHookHarness';
import type { ComponentProps } from 'react';
vi.mock('react', async (original) => ({ ...(await original<typeof import('react')>()), ...(await import('../../../../../../../test/elementHarness')).hookMocks, ...(await import('../../app/components/test/themeHookHarness')).lifecycleHooks }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
/**
 * 创建符合组件公开契约的独立输入。
 * @returns 完整设置状态与可观察回调。
 */
function makeProps(): ComponentProps<typeof UpdateSettingsSection> {
  return {
    aboutVersion: '',
    updateAutoPromptEnabled: false,
    announcementShowMode: 'always',
    updateStatus: 'idle',
    updateVersion: '',
    downloadProgress: null,
    currentSourceLabel: '',
    updateError: '',
    onUpdateAutoPromptEnabledChange: vi.fn(),
    onAnnouncementShowModeChange: vi.fn(),
    onCheckUpdate: vi.fn(),
    onDownloadUpdate: vi.fn(),
    onInstallUpdate: vi.fn(),
    onResetGuide: vi.fn(),
    guideResetStatus: 'idle',
    currentUpdateSettingsPageLabel: '',
    updateSettingsPage: 'update-check',
    updateSettingsPages: [],
    updateSettingsPageLabels: { 'update-check': 'Update', 'info-sync': 'Sync' },
    setUpdateSettingsPage: vi.fn(),
  };
}

beforeEach(() => { resetLifecycle(); vi.clearAllMocks(); });
/**
 * 执行真实更新设置并保留导航状态。
 * @param props - 公开更新输入。
 * @returns 实际元素树。
 */
function render(props: ComponentProps<typeof UpdateSettingsSection>) { return renderWithHooks(() => UpdateSettingsSection(props)); }
describe('实际更新设置边界与操作', () => {
  it('下载指标显示真实百分比和速率，错误换行正常替换', () => {
    const props = makeProps(); props.aboutVersion = '1.0.0'; props.updateStatus = 'downloading'; props.downloadProgress = { percent: 42.6, transferred: 100, total: 200, bytesPerSecond: 1.25 * 1024 * 1024 };
    let tree = render(props); expect(textContent(tree)).toContain('43% · 1.3 MB/s'); expect(elementProps(findElement(tree, (node) => elementProps(node).className === 'settings-about-update-progress-fill')).style).toEqual({ width: '42.6%' });
    props.updateStatus = 'error'; props.updateError = 'first\\nsecond'; tree = render(props); expect(textContent(tree)).toContain('first\nsecond');
    props.updateError = ''; tree = render(props); expect(elements(tree).some((node) => elementProps(node).className === 'settings-about-update-error')).toBe(false);
  });
  it('两种公告选择的实际处理器执行，导航展开收起及空页兜底', () => {
    const props = makeProps(); props.updateSettingsPage = 'info-sync';
    const radios = elements(render(props)).filter((node) => node.type === 'input' && elementProps(node).type === 'radio'); radios.forEach((node) => invoke(node, 'onChange'));
    expect(props.onAnnouncementShowModeChange).toHaveBeenNthCalledWith(1, 'always'); expect(props.onAnnouncementShowModeChange).toHaveBeenNthCalledWith(2, 'version-update-only');
    invoke(findElement(render(props), (node) => typeof elementProps(node).onToggle === 'function'), 'onToggle');
    expect(elementProps(findElement(render(props), (node) => typeof elementProps(node).onToggle === 'function')).label).toBe('settings.navigation.collapse');
    invoke(findElement(render(props), (node) => typeof elementProps(node).onToggle === 'function'), 'onToggle');
    expect(elementProps(findElement(render(props), (node) => typeof elementProps(node).onToggle === 'function')).expanded).toBe(false);
    props.updateSettingsPage = 'unknown-runtime-page' as typeof props.updateSettingsPage;
    expect(elementProps(findElement(render(props), (node) => elementProps(node).className === 'settings-app-page-main')).children).toBeNull();
  });
});
