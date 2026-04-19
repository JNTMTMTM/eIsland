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
 * @file types.ts
 * @description 设置页面 - 软件设置模块共享类型定义
 * @author 鸡哥
 */

import type { Dispatch, ReactElement, SetStateAction } from 'react';
import type { AppSettingsPageKey } from '../../../utils/settingsConfig';
import type { OverviewLayoutConfig, OverviewWidgetType } from '../../../../../../expand/components/OverviewTab';

/**
 * 运行中窗口信息
 */
export interface AppRunningWindow {
  id: string;
  title: string;
  processName: string;
  processPath: string | null;
  processId: number | null;
  iconDataUrl: string | null;
}

/**
 * 灵动岛位置偏移量
 */
export interface AppPositionOffset {
  x: number;
  y: number;
}

/**
 * 灵动岛位置输入框内容
 */
export interface AppPositionInput {
  x: string;
  y: string;
}

/**
 * 应用设置主组件参数
 * @description 汇总软件设置所有子页面所需的状态和操作函数，用于入口组件分发
 */
export interface AppSettingsSectionProps {
  currentAppSettingsPageLabel: string;
  appSettingsPage: AppSettingsPageKey;
  layoutConfig: OverviewLayoutConfig;
  OverviewPreviewComponent: ({ layoutConfig }: { layoutConfig: OverviewLayoutConfig }) => ReactElement;
  overviewWidgetOptions: { value: OverviewWidgetType; label: string }[];
  updateLayout: (side: 'left' | 'right', value: OverviewWidgetType) => void;
  hideProcessFilter: string;
  setHideProcessFilter: (value: string) => void;
  refreshRunningProcesses: () => Promise<void>;
  hideProcessLoading: boolean;
  hideProcessList: string[];
  toggleHideProcess: (name: string) => void;
  runningProcesses: AppRunningWindow[];
  hideProcessKeyword: string;
  islandPositionOffset: AppPositionOffset;
  applyIslandPositionOffset: (x: number, y: number) => void;
  islandPositionInput: AppPositionInput;
  setIslandPositionInput: Dispatch<SetStateAction<AppPositionInput>>;
  applyIslandPositionInput: () => void;
  islandPositionInputChanged: boolean;
  cancelIslandPositionInput: () => void;
  themeMode: 'dark' | 'light' | 'system';
  setThemeModeState: (mode: 'dark' | 'light' | 'system') => void;
  applyThemeMode: (mode: 'dark' | 'light' | 'system') => Promise<void>;
  appLanguage: 'zh-CN' | 'en-US';
  applyAppLanguage: (language: 'zh-CN' | 'en-US') => void;
  islandOpacity: number;
  applyIslandOpacity: (value: number) => void;
  opacitySaveTimerRef: { current: ReturnType<typeof setTimeout> | null };
  setIslandOpacity: (value: number) => void;
  persistIslandOpacity: (value: number) => void;
  expandLeaveIdle: boolean;
  setExpandLeaveIdle: (value: boolean) => void;
  maxExpandLeaveIdle: boolean;
  setMaxExpandLeaveIdle: (value: boolean) => void;
  clipboardUrlMonitorEnabled: boolean;
  setClipboardUrlMonitorEnabled: (value: boolean) => void;
  clipboardUrlDetectMode: 'https-only' | 'http-https' | 'domain-only';
  setClipboardUrlDetectMode: (value: 'https-only' | 'http-https' | 'domain-only') => void;
  clipboardUrlBlacklist: string[];
  setClipboardUrlBlacklist: (value: string[]) => void;
  clipboardUrlSuppressInFavorites: boolean;
  setClipboardUrlSuppressInFavorites: (value: boolean) => void;
  autostartMode: 'disabled' | 'enabled' | 'high-priority';
  setAutostartMode: (mode: 'disabled' | 'enabled' | 'high-priority') => void;
  bgMediaType: 'image' | 'video' | null;
  bgMediaPreviewUrl: string | null;
  bgVideoFit: 'cover' | 'contain';
  setBgVideoFit: (value: 'cover' | 'contain') => void;
  bgVideoMuted: boolean;
  setBgVideoMuted: (value: boolean) => void;
  bgVideoLoop: boolean;
  setBgVideoLoop: (value: boolean) => void;
  bgVideoVolume: number;
  setBgVideoVolume: (value: number) => void;
  bgVideoRate: number;
  setBgVideoRate: (value: number) => void;
  bgVideoHwDecode: boolean;
  setBgVideoHwDecode: (value: boolean) => void;
  bgImageOpacity: number;
  bgImageBlur: number;
  setBgImageOpacity: (value: number) => void;
  setBgImageBlur: (value: number) => void;
  applyBgOpacity: (value: number) => void;
  applyBgBlur: (value: number) => void;
  applyBgVideoFit: (value: 'cover' | 'contain') => void;
  applyBgVideoMuted: (value: boolean) => void;
  applyBgVideoLoop: (value: boolean) => void;
  applyBgVideoVolume: (value: number) => void;
  applyBgVideoRate: (value: number) => void;
  applyBgVideoHwDecode: (value: boolean) => void;
  persistBgOpacity: (value: number) => void;
  persistBgBlur: (value: number) => void;
  persistBgVideoFit: (value: 'cover' | 'contain') => void;
  persistBgVideoMuted: (value: boolean) => void;
  persistBgVideoLoop: (value: boolean) => void;
  persistBgVideoVolume: (value: number) => void;
  persistBgVideoRate: (value: number) => void;
  persistBgVideoHwDecode: (value: boolean) => void;
  bgOpacitySaveTimerRef: { current: ReturnType<typeof setTimeout> | null };
  bgBlurSaveTimerRef: { current: ReturnType<typeof setTimeout> | null };
  handleSelectBgImage: () => Promise<void>;
  handleSelectBgVideo: () => Promise<void>;
  handleClearBgImage: () => void;
  handleSelectBuiltinBgImage: (src: string, defaultOpacity: number) => void;
  appSettingsPages: AppSettingsPageKey[];
  settingsTabLabels: Record<string, string>;
  setAppSettingsPage: (page: AppSettingsPageKey) => void;
}
