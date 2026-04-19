import type { Dispatch, ReactElement, SetStateAction } from 'react';
import type { AppSettingsPageKey } from '../../../utils/settingsConfig';
import type { OverviewLayoutConfig, OverviewWidgetType } from '../../../../../../expand/components/OverviewTab';

export interface AppRunningWindow {
  id: string;
  title: string;
  processName: string;
  processPath: string | null;
  processId: number | null;
  iconDataUrl: string | null;
}

export interface AppPositionOffset {
  x: number;
  y: number;
}

export interface AppPositionInput {
  x: string;
  y: string;
}

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
