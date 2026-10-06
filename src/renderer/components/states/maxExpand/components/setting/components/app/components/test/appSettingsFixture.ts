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
 * @file appSettingsFixture.ts
 * @description 软件设置测试的显式状态和回调，保持业务 Props 类型校验。
 * @author 鸡哥
 */

import { createElement } from 'react';
import { vi } from 'vitest';
import type { AppSettingsSectionProps } from '../types';
/**
 * 创建彼此独立的软件设置测试输入。
 * @returns 含完整设置状态与可断言回调的输入。
 */
export default function makeAppSettingsProps(): AppSettingsSectionProps {
  return {
    currentAppSettingsPageLabel: 'Layout',
    appSettingsPage: 'layout-preview',
    layoutConfig: { left: 'shortcuts', right: 'todo', clockStyle: 'classic', gradientColors: { start: '#000000', middle: '#888888', end: '#ffffff' } },
    OverviewPreviewComponent: vi.fn(() => createElement('div', { 'data-preview': true })),
    overviewWidgetOptions: [{ value: 'shortcuts', label: 'Shortcuts' }, { value: 'todo', label: 'Todo' }],
    overviewClockStyleOptions: [{ value: 'classic', label: 'Classic' }, { value: 'gradient', label: 'Gradient' }],
    updateLayout: vi.fn(),
    updateClockStyle: vi.fn(),
    updateGradientColor: vi.fn(),
    expandNavLayout: [{ id: 'overview', visible: true }, { id: 'todo', visible: true }],
    updateExpandNavLayout: vi.fn(),
    maxExpandNavLayout: [{ id: 'todo', visible: true }, { id: 'calendar', visible: false }],
    updateMaxExpandNavLayout: vi.fn(),
    hideProcessFilter: '',
    setHideProcessFilter: vi.fn(),
    refreshRunningProcesses: vi.fn(() => Promise.resolve()),
    hideProcessLoading: false,
    hideProcessList: [],
    toggleHideProcess: vi.fn(),
    runningProcesses: [],
    hideProcessKeyword: '',
    autoHideFullscreenWindows: false,
    setAutoHideFullscreenWindows: vi.fn(),
    islandPositionOffset: { x: 20, y: 30 },
    islandPositionLocked: false,
    onIslandPositionLockedChange: vi.fn(),
    applyIslandPositionOffset: vi.fn(),
    islandPositionInput: { x: '20', y: '30' },
    setIslandPositionInput: vi.fn(),
    applyIslandPositionInput: vi.fn(),
    islandPositionInputChanged: false,
    cancelIslandPositionInput: vi.fn(),
    islandDisplaySelection: '',
    islandDisplayOptions: [{ id: 'primary', label: 'Primary' }],
    setIslandDisplaySelection: vi.fn(),
    themeMode: 'dark',
    setThemeModeState: vi.fn(),
    applyThemeMode: vi.fn(() => Promise.resolve()),
    standaloneMacControls: false,
    setStandaloneMacControls: vi.fn(),
    appLanguage: 'en-US',
    applyAppLanguage: vi.fn(),
    islandOpacity: 100,
    applyIslandOpacity: vi.fn(),
    opacitySaveTimerRef: { current: null },
    setIslandOpacity: vi.fn(),
    persistIslandOpacity: vi.fn(),
    autoDimEnabled: false,
    handleAutoDimEnabledChange: vi.fn(),
    autoDimDelaySec: 10,
    handleAutoDimDelayChange: vi.fn(),
    expandLeaveIdle: false,
    setExpandLeaveIdle: vi.fn(),
    maxExpandLeaveIdle: false,
    setMaxExpandLeaveIdle: vi.fn(),
    clipboardUrlMonitorEnabled: false,
    setClipboardUrlMonitorEnabled: vi.fn(),
    clipboardUrlDetectMode: 'https-only',
    setClipboardUrlDetectMode: vi.fn(),
    clipboardUrlBlacklist: [],
    setClipboardUrlBlacklist: vi.fn(),
    clipboardUrlSuppressInFavorites: false,
    setClipboardUrlSuppressInFavorites: vi.fn(),
    autostartMode: 'disabled',
    setAutostartMode: vi.fn(),
    bgMediaType: null,
    bgMediaPreviewUrl: null,
    bgVideoFit: 'cover',
    setBgVideoFit: vi.fn(),
    bgVideoMuted: false,
    setBgVideoMuted: vi.fn(),
    bgVideoLoop: false,
    setBgVideoLoop: vi.fn(),
    bgVideoVolume: 0.6,
    setBgVideoVolume: vi.fn(),
    bgVideoRate: 1,
    setBgVideoRate: vi.fn(),
    bgVideoHwDecode: false,
    setBgVideoHwDecode: vi.fn(),
    syncDesktopWallpaperOnBackgroundChange: false,
    setSyncDesktopWallpaperOnBackgroundChange: vi.fn(),
    bgImageOpacity: 100,
    bgImageBlur: 100,
    setBgImageOpacity: vi.fn(),
    setBgImageBlur: vi.fn(),
    applyBgOpacity: vi.fn(),
    applyBgBlur: vi.fn(),
    applyBgVideoFit: vi.fn(),
    applyBgVideoMuted: vi.fn(),
    applyBgVideoLoop: vi.fn(),
    applyBgVideoVolume: vi.fn(),
    applyBgVideoRate: vi.fn(),
    applyBgVideoHwDecode: vi.fn(),
    persistBgOpacity: vi.fn(),
    persistBgBlur: vi.fn(),
    persistBgVideoFit: vi.fn(),
    persistBgVideoMuted: vi.fn(),
    persistBgVideoLoop: vi.fn(),
    persistBgVideoVolume: vi.fn(),
    persistBgVideoRate: vi.fn(),
    persistBgVideoHwDecode: vi.fn(),
    bgOpacitySaveTimerRef: { current: null },
    bgBlurSaveTimerRef: { current: null },
    handleSelectBgImage: vi.fn(() => Promise.resolve()),
    handleSelectBgVideo: vi.fn(() => Promise.resolve()),
    handleClearBgImage: vi.fn(),
    handleSelectBuiltinBgImage: vi.fn(),
    appSettingsPages: ['language', 'theme'],
    settingsTabLabels: { language: 'Language', theme: 'Theme' },
    setAppSettingsPage: vi.fn(),
  } satisfies AppSettingsSectionProps;
}
