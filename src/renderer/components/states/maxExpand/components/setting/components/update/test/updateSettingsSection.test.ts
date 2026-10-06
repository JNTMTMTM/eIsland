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
 * @file updateSettingsSection.test.ts
 * @description UpdateSettingsSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateSettingsSection } from '../UpdateSettingsSection';
import { elementProps, elements, findElement, invoke, resetState, textContent } from '../../../../../../../test/elementHarness';
import type { ComponentProps } from 'react';
/**
 * 构造隔离设置状态和可观察回调的完整配置。
 * @returns 配置状态及可观察回调。
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
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('UpdateSettingsSection', () => {
  it.each([{ status: 'idle', key: 'check', callback: 'onCheckUpdate' }, { status: 'latest', key: 'latest', callback: 'onCheckUpdate' }, { status: 'available', key: 'download', callback: 'onDownloadUpdate' }, { status: 'ready', key: 'installRestart', callback: 'onInstallUpdate' }, { status: 'error', key: 'retry', callback: 'onCheckUpdate' }] as const)('routes $status update action', ({ status, key, callback }) => {
    const props = { ...makeProps(), updateStatus: status, updateError: 'offline' };
    const tree = UpdateSettingsSection(props);
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === `settings.update.actions.${key}`), 'onClick');
    expect(props[callback]).toHaveBeenCalledOnce();
    if (status === 'error')
    {expect(textContent(tree)).toContain('offline');}
  });
  it('disables checking and renders zero download progress before metrics arrive', () => {
    expect(elementProps(findElement(UpdateSettingsSection({ ...makeProps(), updateStatus: 'checking' }), (n) => n.type === 'button' && textContent(n) === 'settings.update.actions.checking')).disabled).toBe(true);
    resetState();
    const tree = UpdateSettingsSection({ ...makeProps(), updateStatus: 'downloading', downloadProgress: null });
    expect(elementProps(findElement(tree, (n) => n.props.className === 'settings-about-update-progress-fill')).style).toEqual({ width: '0%' });
    expect(textContent(tree)).toContain('settings.update.preparingDownload');
  });
  it.each(['success', 'error'] as const)('renders guide reset %s and information sync callbacks', (guideResetStatus) => {
    const props = { ...makeProps(), updateSettingsPage: 'info-sync' as const };
    props.guideResetStatus = guideResetStatus;
    const tree = UpdateSettingsSection(props);
    invoke(findElement(tree, (n) => n.type === 'input' && elementProps(n).type === 'checkbox'), 'onChange', { target: { checked: true } });
    expect(props.onUpdateAutoPromptEnabledChange).toHaveBeenCalledWith(true);
    const radios = elements(tree).filter((n) => n.type === 'input' && elementProps(n).type === 'radio');
    invoke(radios[1], 'onChange');
    expect(props.onAnnouncementShowModeChange).toHaveBeenCalledWith('version-update-only');
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.update.actions.resetGuide'), 'onClick');
    expect(props.onResetGuide).toHaveBeenCalledOnce();
    expect(textContent(tree)).toContain(guideResetStatus === 'success' ? 'settings.update.guideResetSuccess' : 'settings.update.guideResetError');
  });
});
