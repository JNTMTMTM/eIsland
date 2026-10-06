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
 * @file appSettingsSection.test.ts
 * @description AppSettingsSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSettingsSection } from '../AppSettingsSection';
import { elementProps, elements, findElement, invoke, resetState, rewindState } from '../../../../../../../test/elementHarness';
import makeAppSettingsProps from '../components/test/appSettingsFixture';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('.././components/LayoutPreviewSettingsPage', () => ({ LayoutPreviewSettingsPage: Object.assign(vi.fn(), { displayName: 'LayoutPreviewSettingsPage' }) }));
vi.mock('.././components/ExpandLayoutSettingsPage', () => ({ ExpandLayoutSettingsPage: Object.assign(vi.fn(), { displayName: 'ExpandLayoutSettingsPage' }) }));
vi.mock('.././components/MaxExpandLayoutSettingsPage', () => ({ MaxExpandLayoutSettingsPage: Object.assign(vi.fn(), { displayName: 'MaxExpandLayoutSettingsPage' }) }));
vi.mock('.././components/HideProcessSettingsPage', () => ({ HideProcessSettingsPage: Object.assign(vi.fn(), { displayName: 'HideProcessSettingsPage' }) }));
vi.mock('.././components/PositionSettingsPage', () => ({ PositionSettingsPage: Object.assign(vi.fn(), { displayName: 'PositionSettingsPage' }) }));
vi.mock('.././components/ThemeSettingsPage', () => ({ ThemeSettingsPage: Object.assign(vi.fn(), { displayName: 'ThemeSettingsPage' }) }));
vi.mock('.././components/BehaviorSettingsPage', () => ({ BehaviorSettingsPage: Object.assign(vi.fn(), { displayName: 'BehaviorSettingsPage' }) }));
vi.mock('.././components/AnimationSettingsPage', () => ({ AnimationSettingsPage: Object.assign(vi.fn(), { displayName: 'AnimationSettingsPage' }) }));
vi.mock('.././components/LanguageSettingsPage', () => ({ LanguageSettingsPage: Object.assign(vi.fn(), { displayName: 'LanguageSettingsPage' }) }));
vi.mock('.././components/UrlParserSettingsPage', () => ({ UrlParserSettingsPage: Object.assign(vi.fn(), { displayName: 'UrlParserSettingsPage' }) }));
vi.mock('.././components/ClipboardHistorySettingsSection', () => ({ ClipboardHistorySettingsSection: Object.assign(vi.fn(), { displayName: 'ClipboardHistorySettingsSection' }) }));
vi.mock('.././components/AlarmSettingsPage', () => ({ AlarmSettingsPage: Object.assign(vi.fn(), { displayName: 'AlarmSettingsPage' }) }));
vi.mock('.././components/BreakReminderSettingsPage', () => ({ BreakReminderSettingsPage: Object.assign(vi.fn(), { displayName: 'BreakReminderSettingsPage' }) }));
vi.mock('.././components/AutostartSettingsPage', () => ({ AutostartSettingsPage: Object.assign(vi.fn(), { displayName: 'AutostartSettingsPage' }) }));
vi.mock('.././components/AlbumSettingsPage', () => ({ AlbumSettingsPage: Object.assign(vi.fn(), { displayName: 'AlbumSettingsPage' }) }));
vi.mock('.././components/SoundSettingsPage', () => ({ SoundSettingsPage: Object.assign(vi.fn(), { displayName: 'SoundSettingsPage' }) }));
vi.mock('.././components/NotificationSettingsPage', () => ({ NotificationSettingsPage: Object.assign(vi.fn(), { displayName: 'NotificationSettingsPage' }) }));
vi.mock('.././components/PerformanceSettingsPage', () => ({ PerformanceSettingsPage: Object.assign(vi.fn(), { displayName: 'PerformanceSettingsPage' }) }));
vi.mock('.././components/PerformanceMonitorSettingsPage', () => ({ PerformanceMonitorSettingsPage: Object.assign(vi.fn(), { displayName: 'PerformanceMonitorSettingsPage' }) }));
vi.mock('.././components/ScreenshotSettingsPage', () => ({ ScreenshotSettingsPage: Object.assign(vi.fn(), { displayName: 'ScreenshotSettingsPage' }) }));
vi.mock('.././components/AppSettingsPageDots', () => ({ AppSettingsPageDots: Object.assign(vi.fn(), { displayName: 'AppSettingsPageDots' }) }));
vi.mock('../../SettingsPageNavigation', () => ({ SettingsPageNavigationToggle: Object.assign(vi.fn(), { displayName: 'SettingsPageNavigationToggle' }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('AppSettingsSection', () => {
  it.each([['layout-preview', 'LayoutPreviewSettingsPage'], ['expand-layout', 'ExpandLayoutSettingsPage'], ['maxexpand-layout', 'MaxExpandLayoutSettingsPage'], ['album', 'AlbumSettingsPage'], ['hide-process-list', 'HideProcessSettingsPage'], ['position', 'PositionSettingsPage'], ['theme', 'ThemeSettingsPage'], ['language', 'LanguageSettingsPage'], ['behavior', 'BehaviorSettingsPage'], ['animation', 'AnimationSettingsPage'], ['url-parser', 'UrlParserSettingsPage'], ['clipboard-history', 'ClipboardHistorySettingsSection'], ['alarm', 'AlarmSettingsPage'], ['break-reminder', 'BreakReminderSettingsPage'], ['autostart', 'AutostartSettingsPage'], ['sound', 'SoundSettingsPage'], ['notification', 'NotificationSettingsPage'], ['performance', 'PerformanceSettingsPage'], ['performance-monitor', 'PerformanceMonitorSettingsPage'], ['screenshot-settings', 'ScreenshotSettingsPage']] as const)('routes %s to %s', (appSettingsPage, expected) => {
    const props = makeAppSettingsProps();
    props.appSettingsPage = appSettingsPage;
    const tree = AppSettingsSection(props);
    const children = elements(tree).filter((node) => typeof node.type === 'function');
    expect(children.some((node) => (node.type as unknown as {
      displayName: string;
    }).displayName === expected)).toBe(true);
    expect(children.filter((node) => (node.type as unknown as {
      displayName: string;
    }).displayName.endsWith('SettingsPage'))).toHaveLength(expected.endsWith('SettingsPage') ? 1 : 0);
  });
  it('toggles navigation without losing selected page configuration', () => {
    const props = makeAppSettingsProps();
    const tree = AppSettingsSection(props);
    const toggle = findElement(tree, (node) => typeof elementProps(node).onToggle === 'function');
    expect(elementProps(toggle).expanded).toBe(false);
    invoke(toggle, 'onToggle');
    rewindState();
    const updated = AppSettingsSection(props);
    expect(elementProps(findElement(updated, (node) => 'appSettingsPages' in node.props)).expanded).toBe(true);
  });
});

it('公开页面编号损坏时渲染空内容并保留导航', () => {
  const props = makeAppSettingsProps(); props.appSettingsPage = 'unknown-runtime-page' as typeof props.appSettingsPage;
  const tree = AppSettingsSection(props);
  expect(elementProps(findElement(tree, (node) => elementProps(node).className === 'settings-app-page-main')).children).toBeNull();
  expect(elements(tree).some((node) => typeof elementProps(node).onToggle === 'function')).toBe(true);
});
