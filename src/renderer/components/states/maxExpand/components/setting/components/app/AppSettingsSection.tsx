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
 * @file AppSettingsSection.tsx
 * @description 设置页面 - 应用设置区块
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutPreviewSettingsPage } from './components/LayoutPreviewSettingsPage';
import { MaxExpandLayoutSettingsPage } from './components/MaxExpandLayoutSettingsPage';
import { HideProcessSettingsPage } from './components/HideProcessSettingsPage';
import { PositionSettingsPage } from './components/PositionSettingsPage';
import { ThemeSettingsPage } from './components/ThemeSettingsPage';
import { BehaviorSettingsPage } from './components/BehaviorSettingsPage';
import { AnimationSettingsPage } from './components/AnimationSettingsPage';
import { LanguageSettingsPage } from './components/LanguageSettingsPage';
import { UrlParserSettingsPage } from './components/UrlParserSettingsPage';
import { ClipboardHistorySettingsSection } from './components/ClipboardHistorySettingsSection';
import { AutostartSettingsPage } from './components/AutostartSettingsPage';
import { AlbumSettingsPage } from './components/AlbumSettingsPage';
import { AppSettingsPageDots } from './components/AppSettingsPageDots';
import type { AppSettingsSectionProps } from './components/types';

/**
 * 渲染应用设置区块
 * @param props - 应用设置区域所需参数
 * @returns 应用设置区域
 */
export function AppSettingsSection({
  currentAppSettingsPageLabel,
  appSettingsPage,
  layoutConfig,
  OverviewPreviewComponent,
  overviewWidgetOptions,
  updateLayout,
  maxExpandNavLayout,
  updateMaxExpandNavLayout,

  hideProcessFilter,
  setHideProcessFilter,
  refreshRunningProcesses,
  hideProcessLoading,
  hideProcessList,
  toggleHideProcess,
  runningProcesses,
  hideProcessKeyword,

  islandPositionOffset,
  applyIslandPositionOffset,
  islandPositionInput,
  setIslandPositionInput,
  applyIslandPositionInput,
  islandPositionInputChanged,
  cancelIslandPositionInput,
  islandDisplaySelection,
  islandDisplayOptions,
  setIslandDisplaySelection,

  themeMode,
  setThemeModeState,
  applyThemeMode,
  standaloneMacControls,
  setStandaloneMacControls,
  appLanguage,
  applyAppLanguage,
  islandOpacity,
  applyIslandOpacity,
  opacitySaveTimerRef,
  setIslandOpacity,
  persistIslandOpacity,

  expandLeaveIdle,
  setExpandLeaveIdle,
  maxExpandLeaveIdle,
  setMaxExpandLeaveIdle,
  clipboardUrlMonitorEnabled,
  setClipboardUrlMonitorEnabled,
  clipboardUrlDetectMode,
  setClipboardUrlDetectMode,
  clipboardUrlBlacklist,
  setClipboardUrlBlacklist,
  clipboardUrlSuppressInFavorites,
  setClipboardUrlSuppressInFavorites,

  autostartMode,
  setAutostartMode,

  bgMediaType,
  bgMediaPreviewUrl,
  bgVideoFit,
  setBgVideoFit,
  bgVideoMuted,
  setBgVideoMuted,
  bgVideoLoop,
  setBgVideoLoop,
  bgVideoVolume,
  setBgVideoVolume,
  bgVideoRate,
  setBgVideoRate,
  bgVideoHwDecode,
  setBgVideoHwDecode,
  syncDesktopWallpaperOnBackgroundChange,
  setSyncDesktopWallpaperOnBackgroundChange,
  bgImageOpacity,
  bgImageBlur,
  setBgImageOpacity,
  setBgImageBlur,
  applyBgOpacity,
  applyBgBlur,
  applyBgVideoFit,
  applyBgVideoMuted,
  applyBgVideoLoop,
  applyBgVideoVolume,
  applyBgVideoRate,
  applyBgVideoHwDecode,
  persistBgOpacity,
  persistBgBlur,
  persistBgVideoFit,
  persistBgVideoMuted,
  persistBgVideoLoop,
  persistBgVideoVolume,
  persistBgVideoRate,
  persistBgVideoHwDecode,
  bgOpacitySaveTimerRef,
  bgBlurSaveTimerRef,
  handleSelectBgImage,
  handleSelectBgVideo,
  handleClearBgImage,
  handleSelectBuiltinBgImage,
  appSettingsPages,
  settingsTabLabels,
  setAppSettingsPage,
}: AppSettingsSectionProps): ReactElement {
  const { t } = useTranslation();

  const renderCurrentPage = (): ReactElement | null => {
    switch (appSettingsPage) {
      case 'layout-preview':
        return (
          <LayoutPreviewSettingsPage
            layoutConfig={layoutConfig}
            OverviewPreviewComponent={OverviewPreviewComponent}
            overviewWidgetOptions={overviewWidgetOptions}
            updateLayout={updateLayout}
          />
        );
      case 'maxexpand-layout':
        return (
          <MaxExpandLayoutSettingsPage
            maxExpandNavLayout={maxExpandNavLayout}
            updateMaxExpandNavLayout={updateMaxExpandNavLayout}
          />
        );
      case 'album':
        return <AlbumSettingsPage />;
      case 'hide-process-list':
        return (
          <HideProcessSettingsPage
            hideProcessFilter={hideProcessFilter}
            setHideProcessFilter={setHideProcessFilter}
            refreshRunningProcesses={refreshRunningProcesses}
            hideProcessLoading={hideProcessLoading}
            hideProcessList={hideProcessList}
            toggleHideProcess={toggleHideProcess}
            runningProcesses={runningProcesses}
            hideProcessKeyword={hideProcessKeyword}
          />
        );
      case 'position':
        return (
          <PositionSettingsPage
            islandPositionOffset={islandPositionOffset}
            applyIslandPositionOffset={applyIslandPositionOffset}
            islandPositionInput={islandPositionInput}
            setIslandPositionInput={setIslandPositionInput}
            applyIslandPositionInput={applyIslandPositionInput}
            islandPositionInputChanged={islandPositionInputChanged}
            cancelIslandPositionInput={cancelIslandPositionInput}
            islandDisplaySelection={islandDisplaySelection}
            islandDisplayOptions={islandDisplayOptions}
            setIslandDisplaySelection={setIslandDisplaySelection}
          />
        );
      case 'theme':
        return (
          <ThemeSettingsPage
            themeMode={themeMode}
            setThemeModeState={setThemeModeState}
            applyThemeMode={applyThemeMode}
            standaloneMacControls={standaloneMacControls}
            setStandaloneMacControls={setStandaloneMacControls}
            bgMediaType={bgMediaType}
            bgMediaPreviewUrl={bgMediaPreviewUrl}
            bgVideoFit={bgVideoFit}
            setBgVideoFit={setBgVideoFit}
            bgVideoMuted={bgVideoMuted}
            setBgVideoMuted={setBgVideoMuted}
            bgVideoLoop={bgVideoLoop}
            setBgVideoLoop={setBgVideoLoop}
            bgVideoVolume={bgVideoVolume}
            setBgVideoVolume={setBgVideoVolume}
            bgVideoRate={bgVideoRate}
            setBgVideoRate={setBgVideoRate}
            bgVideoHwDecode={bgVideoHwDecode}
            setBgVideoHwDecode={setBgVideoHwDecode}
            syncDesktopWallpaperOnBackgroundChange={syncDesktopWallpaperOnBackgroundChange}
            setSyncDesktopWallpaperOnBackgroundChange={setSyncDesktopWallpaperOnBackgroundChange}
            bgImageOpacity={bgImageOpacity}
            bgImageBlur={bgImageBlur}
            setBgImageOpacity={setBgImageOpacity}
            setBgImageBlur={setBgImageBlur}
            applyBgOpacity={applyBgOpacity}
            applyBgBlur={applyBgBlur}
            applyBgVideoFit={applyBgVideoFit}
            applyBgVideoMuted={applyBgVideoMuted}
            applyBgVideoLoop={applyBgVideoLoop}
            applyBgVideoVolume={applyBgVideoVolume}
            applyBgVideoRate={applyBgVideoRate}
            applyBgVideoHwDecode={applyBgVideoHwDecode}
            persistBgOpacity={persistBgOpacity}
            persistBgBlur={persistBgBlur}
            persistBgVideoFit={persistBgVideoFit}
            persistBgVideoMuted={persistBgVideoMuted}
            persistBgVideoLoop={persistBgVideoLoop}
            persistBgVideoVolume={persistBgVideoVolume}
            persistBgVideoRate={persistBgVideoRate}
            persistBgVideoHwDecode={persistBgVideoHwDecode}
            bgOpacitySaveTimerRef={bgOpacitySaveTimerRef}
            bgBlurSaveTimerRef={bgBlurSaveTimerRef}
            handleSelectBgImage={handleSelectBgImage}
            handleSelectBgVideo={handleSelectBgVideo}
            handleClearBgImage={handleClearBgImage}
            handleSelectBuiltinBgImage={handleSelectBuiltinBgImage}
            islandOpacity={islandOpacity}
            setIslandOpacity={setIslandOpacity}
            applyIslandOpacity={applyIslandOpacity}
            persistIslandOpacity={persistIslandOpacity}
            opacitySaveTimerRef={opacitySaveTimerRef}
          />
        );
      case 'behavior':
        return (
          <BehaviorSettingsPage
            expandLeaveIdle={expandLeaveIdle}
            setExpandLeaveIdle={setExpandLeaveIdle}
            maxExpandLeaveIdle={maxExpandLeaveIdle}
            setMaxExpandLeaveIdle={setMaxExpandLeaveIdle}
          />
        );
      case 'animation':
        return <AnimationSettingsPage />;
      case 'language':
        return <LanguageSettingsPage appLanguage={appLanguage} applyAppLanguage={applyAppLanguage} />;
      case 'url-parser':
        return (
          <UrlParserSettingsPage
            clipboardUrlMonitorEnabled={clipboardUrlMonitorEnabled}
            setClipboardUrlMonitorEnabled={setClipboardUrlMonitorEnabled}
            clipboardUrlDetectMode={clipboardUrlDetectMode}
            setClipboardUrlDetectMode={setClipboardUrlDetectMode}
            clipboardUrlBlacklist={clipboardUrlBlacklist}
            setClipboardUrlBlacklist={setClipboardUrlBlacklist}
            clipboardUrlSuppressInFavorites={clipboardUrlSuppressInFavorites}
            setClipboardUrlSuppressInFavorites={setClipboardUrlSuppressInFavorites}
          />
        );
      case 'clipboard-history':
        return <ClipboardHistorySettingsSection />;
      case 'autostart':
        return <AutostartSettingsPage autostartMode={autostartMode} setAutostartMode={setAutostartMode} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>{t('settings.labels.app', { defaultValue: '软件设置' })}</span>
        <span className="settings-app-title-sub">- {currentAppSettingsPageLabel}</span>
      </div>

      <div className="settings-app-pages-layout">
        <div className="settings-app-page-main">{renderCurrentPage()}</div>

        <AppSettingsPageDots
          appSettingsPage={appSettingsPage}
          appSettingsPages={appSettingsPages}
          settingsTabLabels={settingsTabLabels}
          setAppSettingsPage={setAppSettingsPage}
        />
      </div>
    </div>
  );
}
