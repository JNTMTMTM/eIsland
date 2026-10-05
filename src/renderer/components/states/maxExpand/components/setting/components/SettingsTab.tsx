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
 * @file SettingsTab.tsx
 * @description 最大展开设置视图，组合各设置分区与控制器
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { memo } from 'react';
import { saveNetworkConfig, saveWeatherProviderConfig } from '../../../../../../store/utils/storage';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { setThemeMode as applyThemeMode } from '../../../../../../utils/theme';
import { PLUGIN_MARKET_PAGES, UPDATE_SOURCES, applyIslandOpacity } from '../config/settingsTabConfig';
import { useSettingsTabController } from '../hooks/useSettingsTabController';
import {
  AI_SETTINGS_PAGES,
  APP_SETTINGS_PAGES,
  LYRICS_SOURCE_OPTIONS,
  MAIL_SETTINGS_PAGES,
  MUSIC_SETTINGS_PAGES,
  NETWORK_SETTINGS_PAGES,
  NETWORK_TIMEOUT_OPTIONS,
  UPDATE_SETTINGS_PAGES,
  WEATHER_LOCATION_PRIORITY_OPTIONS,
  WEATHER_PROVIDER_OPTIONS,
  WEATHER_SETTINGS_PAGES,
} from '../utils/settingsConfig';
import { AboutSettingsSection } from './about/AboutSettingsSection';
import { AiSettingsSection } from './ai/AiSettingsSection';
import { AppSettingsSection } from './app/AppSettingsSection';
import { OverviewPreview } from './app/preview/OverviewPreview';
import { IndexSettingsSection } from './index/IndexSettingsSection';
import { MailSettingsSection } from './mail/MailSettingsSection';
import { MusicSettingsSection } from './music/MusicSettingsSection';
import { NetworkSettingsSection } from './network/NetworkSettingsSection';
import { WallpaperContributionSection } from './pluginMarket/WallpaperContributionSection';
import { WallpaperEditSection } from './pluginMarket/WallpaperEditSection';
import { WallpaperMarketSection } from './pluginMarket/WallpaperMarketSection';
import { SettingsField } from './SettingsField';
import { SettingsPageNavigation, SettingsPageNavigationToggle } from './SettingsPageNavigation';
import { ShortcutSettingsSection } from './shortcut/ShortcutSettingsSection';
import { UpdateSettingsSection } from './update/UpdateSettingsSection';
import { UserSettingsSection } from './user/UserSettingsSection';
import { WeatherSettingsSection } from './weather/WeatherSettingsSection';

/**
 * 组合设置分区，状态和持久化交由领域 hooks 管理。
 * @returns 设置 Tab 组件
 */
export const SettingsTab = memo(function SettingsTab(): ReactElement {
  const {
    settingsRef,
    activeTab,
    setActiveTab,
    getSettingsLabel,
    visibleCards,
    hiddenCards,
    navEditMode,
    navOrder,
    hiddenNavOrder,
    dragIdxRef,
    setNavOrder,
    setHiddenNavOrder,
    setNavEditMode,
    resetNavConfig,
    persistNavConfig,
    setAppSettingsPage,
    setMusicSettingsPage,
    setAiSettingsPage,
    setNetworkSettingsPage,
    handleNavAction,
    currentAppSettingsPageLabel,
    appSettingsPage,
    layoutConfig,
    translatedOverviewWidgetOptions,
    translatedOverviewClockStyleOptions,
    updateLayout,
    updateClockStyle,
    updateGradientColor,
    expandNavLayout,
    updateExpandNavLayout,
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
    autoHideFullscreenWindows,
    setAutoHideFullscreenWindows,
    islandPositionOffset,
    islandPositionLocked,
    handleIslandPositionLockedChange,
    applyIslandPositionOffset,
    islandPositionInput,
    setIslandPositionInput,
    applyIslandPositionInput,
    islandPositionInputChanged,
    cancelIslandPositionInput,
    islandDisplaySelection,
    islandDisplayOptions,
    handleIslandDisplaySelectionChange,
    themeMode,
    setThemeModeState,
    standaloneMacControls,
    setStandaloneMacControls,
    appLanguage,
    applyAppLanguage,
    islandOpacity,
    opacitySaveTimerRef,
    setIslandOpacity,
    persistIslandOpacity,
    autoDimEnabled,
    handleAutoDimEnabledChange,
    autoDimDelaySec,
    handleAutoDimDelayChange,
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
    bgMedia,
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
    translatedSettingsTabLabels,
    isProUser,
    networkTimeoutMs,
    customTimeoutInput,
    staticAssetNode,
    staticAssetNodeOptions,
    setNetworkTimeoutMs,
    setCustomTimeoutInput,
    setStaticAssetNode,
    currentNetworkSettingsPageLabel,
    networkSettingsPage,
    translatedNetworkSettingsPageLabels,
    updateSource,
    handleUpdateSourceChange,
    currentMailSettingsPageLabel,
    mailSettingsPage,
    mailAccounts,
    activeMailAccountId,
    setMailAccounts,
    setActiveMailAccountId,
    mailFetchLimit,
    setMailFetchLimit,
    translatedMailSettingsPageLabels,
    setMailSettingsPage,
    currentWeatherSettingsPageLabel,
    weatherSettingsPage,
    weatherLocationPriority,
    applyWeatherLocationPriority,
    setWeatherLocationConfigMessage,
    weatherCustomCityInput,
    setWeatherCustomCityInput,
    testWeatherCustomLocation,
    setWeatherCustomLocationTesting,
    setWeatherCustomLocationTestMessage,
    weatherCustomLocationTesting,
    saveWeatherLocationSettings,
    weatherLocationConfigMessage,
    weatherCustomLocationTestMessage,
    weatherPrimaryProvider,
    setWeatherPrimaryProvider,
    weatherAlertEnabled,
    applyWeatherAlertEnabled,
    translatedWeatherSettingsPageLabels,
    setWeatherSettingsPage,
    hotkeyInputRef,
    hotkeyRecording,
    hotkeyError,
    hideHotkey,
    setHotkeyRecording,
    setHotkeyError,
    handleHotkeyKeyDown,
    setHideHotkey,
    quitHotkeyInputRef,
    quitHotkeyRecording,
    quitHotkeyError,
    quitHotkey,
    setQuitHotkeyRecording,
    setQuitHotkeyError,
    handleQuitHotkeyKeyDown,
    setQuitHotkey,
    screenshotHotkeyInputRef,
    screenshotHotkeyRecording,
    screenshotHotkeyError,
    screenshotHotkey,
    setScreenshotHotkeyRecording,
    setScreenshotHotkeyError,
    handleScreenshotHotkeyKeyDown,
    setScreenshotHotkey,
    nextSongHotkeyInputRef,
    nextSongHotkeyRecording,
    nextSongHotkeyError,
    nextSongHotkey,
    setNextSongHotkeyRecording,
    setNextSongHotkeyError,
    handleNextSongHotkeyKeyDown,
    setNextSongHotkey,
    playPauseSongHotkeyInputRef,
    playPauseSongHotkeyRecording,
    playPauseSongHotkeyError,
    playPauseSongHotkey,
    setPlayPauseSongHotkeyRecording,
    setPlayPauseSongHotkeyError,
    handlePlayPauseSongHotkeyKeyDown,
    setPlayPauseSongHotkey,
    resetPositionHotkeyInputRef,
    resetPositionHotkeyRecording,
    resetPositionHotkeyError,
    resetPositionHotkey,
    setResetPositionHotkeyRecording,
    setResetPositionHotkeyError,
    handleResetPositionHotkeyKeyDown,
    setResetPositionHotkey,
    toggleTrayHotkeyInputRef,
    toggleTrayHotkeyRecording,
    toggleTrayHotkeyError,
    toggleTrayHotkey,
    setToggleTrayHotkeyRecording,
    setToggleTrayHotkeyError,
    handleToggleTrayHotkeyKeyDown,
    setToggleTrayHotkey,
    showSettingsWindowHotkeyInputRef,
    showSettingsWindowHotkeyRecording,
    showSettingsWindowHotkeyError,
    showSettingsWindowHotkey,
    setShowSettingsWindowHotkeyRecording,
    setShowSettingsWindowHotkeyError,
    handleShowSettingsWindowHotkeyKeyDown,
    setShowSettingsWindowHotkey,
    openClipboardHistoryHotkeyInputRef,
    openClipboardHistoryHotkeyRecording,
    openClipboardHistoryHotkeyError,
    openClipboardHistoryHotkey,
    setOpenClipboardHistoryHotkeyRecording,
    setOpenClipboardHistoryHotkeyError,
    handleOpenClipboardHistoryHotkeyKeyDown,
    setOpenClipboardHistoryHotkey,
    togglePassthroughHotkeyInputRef,
    togglePassthroughHotkeyRecording,
    togglePassthroughHotkeyError,
    togglePassthroughHotkey,
    setTogglePassthroughHotkeyRecording,
    setTogglePassthroughHotkeyError,
    handleTogglePassthroughHotkeyKeyDown,
    setTogglePassthroughHotkey,
    toggleUiLockHotkeyInputRef,
    toggleUiLockHotkeyRecording,
    toggleUiLockHotkeyError,
    toggleUiLockHotkey,
    setToggleUiLockHotkeyRecording,
    setToggleUiLockHotkeyError,
    handleToggleUiLockHotkeyKeyDown,
    setToggleUiLockHotkey,
    agentVoiceInputHotkeyInputRef,
    agentVoiceInputHotkeyRecording,
    agentVoiceInputHotkeyError,
    agentVoiceInputHotkey,
    setAgentVoiceInputHotkeyRecording,
    setAgentVoiceInputHotkeyError,
    handleAgentVoiceInputHotkeyKeyDown,
    setAgentVoiceInputHotkey,
    toggleShapeModeHotkeyInputRef,
    toggleShapeModeHotkeyRecording,
    toggleShapeModeHotkeyError,
    toggleShapeModeHotkey,
    setToggleShapeModeHotkeyRecording,
    setToggleShapeModeHotkeyError,
    handleToggleShapeModeHotkeyKeyDown,
    setToggleShapeModeHotkey,
    currentMusicSettingsPageLabel,
    musicSettingsPage,
    whitelist,
    setWhitelist,
    whitelistInputError,
    setWhitelistInputError,
    whitelistDraft,
    setWhitelistDraft,
    handleAddWhitelist,
    handleDetectSourceAppId,
    detectingSourceAppId,
    detectedSources,
    lyricsSource,
    setLyricsSource,
    lyricsEnabled,
    setLyricsEnabled,
    lyricsTranslationEnabled,
    setLyricsTranslationEnabled,
    lyricsKaraoke,
    setLyricsKaraoke,
    lyricsClock,
    setLyricsClock,
    lyricsCalibrateEnabled,
    setLyricsCalibrateEnabled,
    lyricsCalibrateDelay,
    setLyricsCalibrateDelay,
    musicSmtcUnsubscribeInput,
    setMusicSmtcUnsubscribeInput,
    musicSmtcNeverUnsubscribe,
    setMusicSmtcNeverUnsubscribe,
    saveMusicSmtcUnsubscribeConfig,
    setMusicSmtcConfigMessage,
    musicSmtcConfigMessage,
    translatedMusicSettingsPageLabels,
    currentAiSettingsPageLabel,
    aiSettingsPage,
    aiConfig,
    setAiConfig,
    onAddWorkspace,
    onRemoveWorkspace,
    aboutVersion,
    updateAutoPromptEnabled,
    announcementShowMode,
    updateStatus,
    updateVersion,
    downloadProgress,
    currentSourceLabel,
    updateError,
    handleUpdateAutoPromptEnabledChange,
    handleAnnouncementShowModeChange,
    handleCheckUpdate,
    handleDownloadUpdate,
    handleInstallUpdate,
    handleResetGuide,
    guideResetStatus,
    currentUpdateSettingsPageLabel,
    updateSettingsPage,
    translatedUpdateSettingsPageLabels,
    setUpdateSettingsPage,
    t,
    hasLoginSession,
    currentPluginMarketPageLabel,
    pluginMarketPage,
    wallpaperDetailOpen,
    pluginMarketNavigationExpanded,
    setWallpaperMarketRefreshKey,
    wallpaperSearchExpanded,
    setWallpaperSearchExpanded,
    setPluginMarketNavigationExpanded,
    wallpaperMarketRefreshKey,
    handleApplyMarketplaceWallpaper,
    setWallpaperDetailOpen,
    setPluginMarketPage,
    pluginMarketPageLabels,
    setLogin,
    setRegister,
    userInitialProfilePage,
    aboutInitialPage,
  } = useSettingsTabController();

  return (
    <div className="max-expand-settings" ref={settingsRef}>
      <div className="max-expand-settings-layout">
        <div className="max-expand-settings-sidebar">
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'index' ? 'active' : ''}`}
            onClick={() => setActiveTab('index')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('index')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'app' ? 'active' : ''}`}
            onClick={() => setActiveTab('app')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('app')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'pluginMarket' ? 'active' : ''}`}
            onClick={() => setActiveTab('pluginMarket')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('pluginMarket')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'network' ? 'active' : ''}`}
            onClick={() => setActiveTab('network')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('network')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'mail' ? 'active' : ''}`}
            onClick={() => setActiveTab('mail')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('mail')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'weather' ? 'active' : ''}`}
            onClick={() => setActiveTab('weather')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('weather')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'music' ? 'active' : ''}`}
            onClick={() => setActiveTab('music')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('music')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('ai')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'shortcut' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortcut')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('shortcut')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('user')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'update' ? 'active' : ''}`}
            onClick={() => setActiveTab('update')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('update')}
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
            type="button"
          >
            <span className="sidebar-dot" />
            {getSettingsLabel('about')}
          </button>
        </div>

        <div className="max-expand-settings-panel settings-scrollbar-thin">
          {activeTab === 'index' && (
            <IndexSettingsSection
              visibleCards={visibleCards}
              hiddenCards={hiddenCards}
              navEditMode={navEditMode}
              navOrder={navOrder}
              hiddenNavOrder={hiddenNavOrder}
              dragIdxRef={dragIdxRef}
              setNavOrder={setNavOrder}
              setHiddenNavOrder={setHiddenNavOrder}
              setNavEditMode={setNavEditMode}
              resetNavConfig={resetNavConfig}
              persistNavConfig={persistNavConfig}
              setAppSettingsPage={setAppSettingsPage}
              setMusicSettingsPage={setMusicSettingsPage}
              setAiSettingsPage={setAiSettingsPage}
              setNetworkSettingsPage={setNetworkSettingsPage}
              setActiveTab={setActiveTab}
              onAction={handleNavAction}
            />
          )}

          {activeTab === 'app' && (
            <AppSettingsSection
              currentAppSettingsPageLabel={currentAppSettingsPageLabel}
              appSettingsPage={appSettingsPage}
              layoutConfig={layoutConfig}
              OverviewPreviewComponent={OverviewPreview}
              overviewWidgetOptions={translatedOverviewWidgetOptions}
              overviewClockStyleOptions={translatedOverviewClockStyleOptions}
              updateLayout={updateLayout}
              updateClockStyle={updateClockStyle}
              updateGradientColor={updateGradientColor}
              expandNavLayout={expandNavLayout}
              updateExpandNavLayout={updateExpandNavLayout}
              maxExpandNavLayout={maxExpandNavLayout}
              updateMaxExpandNavLayout={updateMaxExpandNavLayout}
              hideProcessFilter={hideProcessFilter}
              setHideProcessFilter={setHideProcessFilter}
              refreshRunningProcesses={refreshRunningProcesses}
              hideProcessLoading={hideProcessLoading}
              hideProcessList={hideProcessList}
              toggleHideProcess={toggleHideProcess}
              runningProcesses={runningProcesses}
              hideProcessKeyword={hideProcessKeyword}
              autoHideFullscreenWindows={autoHideFullscreenWindows}
              setAutoHideFullscreenWindows={setAutoHideFullscreenWindows}
              islandPositionOffset={islandPositionOffset}
              islandPositionLocked={islandPositionLocked}
              onIslandPositionLockedChange={handleIslandPositionLockedChange}
              applyIslandPositionOffset={applyIslandPositionOffset}
              islandPositionInput={islandPositionInput}
              setIslandPositionInput={setIslandPositionInput}
              applyIslandPositionInput={applyIslandPositionInput}
              islandPositionInputChanged={islandPositionInputChanged}
              cancelIslandPositionInput={cancelIslandPositionInput}
              islandDisplaySelection={islandDisplaySelection}
              islandDisplayOptions={islandDisplayOptions}
              setIslandDisplaySelection={handleIslandDisplaySelectionChange}
              themeMode={themeMode}
              setThemeModeState={setThemeModeState}
              applyThemeMode={applyThemeMode}
              standaloneMacControls={standaloneMacControls}
              setStandaloneMacControls={setStandaloneMacControls}
              appLanguage={appLanguage}
              applyAppLanguage={applyAppLanguage}
              islandOpacity={islandOpacity}
              applyIslandOpacity={applyIslandOpacity}
              opacitySaveTimerRef={opacitySaveTimerRef}
              setIslandOpacity={setIslandOpacity}
              persistIslandOpacity={persistIslandOpacity}
              autoDimEnabled={autoDimEnabled}
              handleAutoDimEnabledChange={handleAutoDimEnabledChange}
              autoDimDelaySec={autoDimDelaySec}
              handleAutoDimDelayChange={handleAutoDimDelayChange}
              expandLeaveIdle={expandLeaveIdle}
              setExpandLeaveIdle={setExpandLeaveIdle}
              maxExpandLeaveIdle={maxExpandLeaveIdle}
              setMaxExpandLeaveIdle={setMaxExpandLeaveIdle}
              clipboardUrlMonitorEnabled={clipboardUrlMonitorEnabled}
              setClipboardUrlMonitorEnabled={setClipboardUrlMonitorEnabled}
              clipboardUrlDetectMode={clipboardUrlDetectMode}
              setClipboardUrlDetectMode={setClipboardUrlDetectMode}
              clipboardUrlBlacklist={clipboardUrlBlacklist}
              setClipboardUrlBlacklist={setClipboardUrlBlacklist}
              clipboardUrlSuppressInFavorites={clipboardUrlSuppressInFavorites}
              setClipboardUrlSuppressInFavorites={setClipboardUrlSuppressInFavorites}
              autostartMode={autostartMode}
              setAutostartMode={setAutostartMode}
              bgMediaType={bgMedia?.type ?? null}
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
              appSettingsPages={APP_SETTINGS_PAGES}
              settingsTabLabels={translatedSettingsTabLabels}
              setAppSettingsPage={setAppSettingsPage}
            />
          )}

          {activeTab === 'network' && (
            <NetworkSettingsSection
              isProUser={isProUser}
              networkTimeoutMs={networkTimeoutMs}
              customTimeoutInput={customTimeoutInput}
              staticAssetNode={staticAssetNode}
              networkTimeoutOptions={NETWORK_TIMEOUT_OPTIONS}
              staticAssetNodeOptions={staticAssetNodeOptions}
              setNetworkTimeoutMs={setNetworkTimeoutMs}
              setCustomTimeoutInput={setCustomTimeoutInput}
              setStaticAssetNode={setStaticAssetNode}
              saveNetworkConfig={saveNetworkConfig}
              currentNetworkSettingsPageLabel={currentNetworkSettingsPageLabel}
              networkSettingsPage={networkSettingsPage}
              networkSettingsPages={NETWORK_SETTINGS_PAGES}
              networkSettingsPageLabels={translatedNetworkSettingsPageLabels}
              setNetworkSettingsPage={setNetworkSettingsPage}
              updateSource={updateSource}
              updateSources={UPDATE_SOURCES}
              onUpdateSourceChange={handleUpdateSourceChange}
            />
          )}

          {activeTab === 'mail' && (
            <MailSettingsSection
              currentMailSettingsPageLabel={currentMailSettingsPageLabel}
              mailSettingsPage={mailSettingsPage}
              mailAccounts={mailAccounts}
              activeMailAccountId={activeMailAccountId}
              setMailAccounts={setMailAccounts}
              setActiveMailAccountId={setActiveMailAccountId}
              mailFetchLimit={mailFetchLimit}
              setMailFetchLimit={setMailFetchLimit}
              mailSettingsPages={MAIL_SETTINGS_PAGES}
              mailSettingsPageLabels={translatedMailSettingsPageLabels}
              setMailSettingsPage={setMailSettingsPage}
            />
          )}

          {activeTab === 'weather' && (
            <WeatherSettingsSection
              currentWeatherSettingsPageLabel={currentWeatherSettingsPageLabel}
              weatherSettingsPage={weatherSettingsPage}
              weatherLocationPriorityOptions={WEATHER_LOCATION_PRIORITY_OPTIONS}
              weatherLocationPriority={weatherLocationPriority}
              applyWeatherLocationPriority={applyWeatherLocationPriority}
              setWeatherLocationConfigMessage={setWeatherLocationConfigMessage}
              weatherCustomCityInput={weatherCustomCityInput}
              setWeatherCustomCityInput={setWeatherCustomCityInput}
              testWeatherCustomLocation={testWeatherCustomLocation}
              setWeatherCustomLocationTesting={setWeatherCustomLocationTesting}
              setWeatherCustomLocationTestMessage={setWeatherCustomLocationTestMessage}
              weatherCustomLocationTesting={weatherCustomLocationTesting}
              saveWeatherLocationSettings={saveWeatherLocationSettings}
              weatherLocationConfigMessage={weatherLocationConfigMessage}
              weatherCustomLocationTestMessage={weatherCustomLocationTestMessage}
              weatherProviderOptions={WEATHER_PROVIDER_OPTIONS}
              weatherPrimaryProvider={weatherPrimaryProvider}
              isProUser={isProUser}
              setWeatherPrimaryProvider={setWeatherPrimaryProvider}
              saveWeatherProviderConfig={saveWeatherProviderConfig}
              weatherAlertEnabled={weatherAlertEnabled}
              setWeatherAlertEnabled={applyWeatherAlertEnabled}
              weatherSettingsPages={WEATHER_SETTINGS_PAGES}
              weatherSettingsPageLabels={translatedWeatherSettingsPageLabels}
              setWeatherSettingsPage={setWeatherSettingsPage}
            />
          )}

          {activeTab === 'shortcut' && (
            <ShortcutSettingsSection
              hotkeyInputRef={hotkeyInputRef}
              hotkeyRecording={hotkeyRecording}
              hotkeyError={hotkeyError}
              hideHotkey={hideHotkey}
              setHotkeyRecording={setHotkeyRecording}
              setHotkeyError={setHotkeyError}
              handleHotkeyKeyDown={handleHotkeyKeyDown}
              setHideHotkey={setHideHotkey}
              quitHotkeyInputRef={quitHotkeyInputRef}
              quitHotkeyRecording={quitHotkeyRecording}
              quitHotkeyError={quitHotkeyError}
              quitHotkey={quitHotkey}
              setQuitHotkeyRecording={setQuitHotkeyRecording}
              setQuitHotkeyError={setQuitHotkeyError}
              handleQuitHotkeyKeyDown={handleQuitHotkeyKeyDown}
              setQuitHotkey={setQuitHotkey}
              screenshotHotkeyInputRef={screenshotHotkeyInputRef}
              screenshotHotkeyRecording={screenshotHotkeyRecording}
              screenshotHotkeyError={screenshotHotkeyError}
              screenshotHotkey={screenshotHotkey}
              setScreenshotHotkeyRecording={setScreenshotHotkeyRecording}
              setScreenshotHotkeyError={setScreenshotHotkeyError}
              handleScreenshotHotkeyKeyDown={handleScreenshotHotkeyKeyDown}
              setScreenshotHotkey={setScreenshotHotkey}
              nextSongHotkeyInputRef={nextSongHotkeyInputRef}
              nextSongHotkeyRecording={nextSongHotkeyRecording}
              nextSongHotkeyError={nextSongHotkeyError}
              nextSongHotkey={nextSongHotkey}
              setNextSongHotkeyRecording={setNextSongHotkeyRecording}
              setNextSongHotkeyError={setNextSongHotkeyError}
              handleNextSongHotkeyKeyDown={handleNextSongHotkeyKeyDown}
              setNextSongHotkey={setNextSongHotkey}
              playPauseSongHotkeyInputRef={playPauseSongHotkeyInputRef}
              playPauseSongHotkeyRecording={playPauseSongHotkeyRecording}
              playPauseSongHotkeyError={playPauseSongHotkeyError}
              playPauseSongHotkey={playPauseSongHotkey}
              setPlayPauseSongHotkeyRecording={setPlayPauseSongHotkeyRecording}
              setPlayPauseSongHotkeyError={setPlayPauseSongHotkeyError}
              handlePlayPauseSongHotkeyKeyDown={handlePlayPauseSongHotkeyKeyDown}
              setPlayPauseSongHotkey={setPlayPauseSongHotkey}
              resetPositionHotkeyInputRef={resetPositionHotkeyInputRef}
              resetPositionHotkeyRecording={resetPositionHotkeyRecording}
              resetPositionHotkeyError={resetPositionHotkeyError}
              resetPositionHotkey={resetPositionHotkey}
              setResetPositionHotkeyRecording={setResetPositionHotkeyRecording}
              setResetPositionHotkeyError={setResetPositionHotkeyError}
              handleResetPositionHotkeyKeyDown={handleResetPositionHotkeyKeyDown}
              setResetPositionHotkey={setResetPositionHotkey}
              toggleTrayHotkeyInputRef={toggleTrayHotkeyInputRef}
              toggleTrayHotkeyRecording={toggleTrayHotkeyRecording}
              toggleTrayHotkeyError={toggleTrayHotkeyError}
              toggleTrayHotkey={toggleTrayHotkey}
              setToggleTrayHotkeyRecording={setToggleTrayHotkeyRecording}
              setToggleTrayHotkeyError={setToggleTrayHotkeyError}
              handleToggleTrayHotkeyKeyDown={handleToggleTrayHotkeyKeyDown}
              setToggleTrayHotkey={setToggleTrayHotkey}
              showSettingsWindowHotkeyInputRef={showSettingsWindowHotkeyInputRef}
              showSettingsWindowHotkeyRecording={showSettingsWindowHotkeyRecording}
              showSettingsWindowHotkeyError={showSettingsWindowHotkeyError}
              showSettingsWindowHotkey={showSettingsWindowHotkey}
              setShowSettingsWindowHotkeyRecording={setShowSettingsWindowHotkeyRecording}
              setShowSettingsWindowHotkeyError={setShowSettingsWindowHotkeyError}
              handleShowSettingsWindowHotkeyKeyDown={handleShowSettingsWindowHotkeyKeyDown}
              setShowSettingsWindowHotkey={setShowSettingsWindowHotkey}
              openClipboardHistoryHotkeyInputRef={openClipboardHistoryHotkeyInputRef}
              openClipboardHistoryHotkeyRecording={openClipboardHistoryHotkeyRecording}
              openClipboardHistoryHotkeyError={openClipboardHistoryHotkeyError}
              openClipboardHistoryHotkey={openClipboardHistoryHotkey}
              setOpenClipboardHistoryHotkeyRecording={setOpenClipboardHistoryHotkeyRecording}
              setOpenClipboardHistoryHotkeyError={setOpenClipboardHistoryHotkeyError}
              handleOpenClipboardHistoryHotkeyKeyDown={handleOpenClipboardHistoryHotkeyKeyDown}
              setOpenClipboardHistoryHotkey={setOpenClipboardHistoryHotkey}
              togglePassthroughHotkeyInputRef={togglePassthroughHotkeyInputRef}
              togglePassthroughHotkeyRecording={togglePassthroughHotkeyRecording}
              togglePassthroughHotkeyError={togglePassthroughHotkeyError}
              togglePassthroughHotkey={togglePassthroughHotkey}
              setTogglePassthroughHotkeyRecording={setTogglePassthroughHotkeyRecording}
              setTogglePassthroughHotkeyError={setTogglePassthroughHotkeyError}
              handleTogglePassthroughHotkeyKeyDown={handleTogglePassthroughHotkeyKeyDown}
              setTogglePassthroughHotkey={setTogglePassthroughHotkey}
              toggleUiLockHotkeyInputRef={toggleUiLockHotkeyInputRef}
              toggleUiLockHotkeyRecording={toggleUiLockHotkeyRecording}
              toggleUiLockHotkeyError={toggleUiLockHotkeyError}
              toggleUiLockHotkey={toggleUiLockHotkey}
              setToggleUiLockHotkeyRecording={setToggleUiLockHotkeyRecording}
              setToggleUiLockHotkeyError={setToggleUiLockHotkeyError}
              handleToggleUiLockHotkeyKeyDown={handleToggleUiLockHotkeyKeyDown}
              setToggleUiLockHotkey={setToggleUiLockHotkey}
              agentVoiceInputHotkeyInputRef={agentVoiceInputHotkeyInputRef}
              agentVoiceInputHotkeyRecording={agentVoiceInputHotkeyRecording}
              agentVoiceInputHotkeyError={agentVoiceInputHotkeyError}
              agentVoiceInputHotkey={agentVoiceInputHotkey}
              setAgentVoiceInputHotkeyRecording={setAgentVoiceInputHotkeyRecording}
              setAgentVoiceInputHotkeyError={setAgentVoiceInputHotkeyError}
              handleAgentVoiceInputHotkeyKeyDown={handleAgentVoiceInputHotkeyKeyDown}
              setAgentVoiceInputHotkey={setAgentVoiceInputHotkey}
              toggleShapeModeHotkeyInputRef={toggleShapeModeHotkeyInputRef}
              toggleShapeModeHotkeyRecording={toggleShapeModeHotkeyRecording}
              toggleShapeModeHotkeyError={toggleShapeModeHotkeyError}
              toggleShapeModeHotkey={toggleShapeModeHotkey}
              setToggleShapeModeHotkeyRecording={setToggleShapeModeHotkeyRecording}
              setToggleShapeModeHotkeyError={setToggleShapeModeHotkeyError}
              handleToggleShapeModeHotkeyKeyDown={handleToggleShapeModeHotkeyKeyDown}
              setToggleShapeModeHotkey={setToggleShapeModeHotkey}
            />
          )}

          {activeTab === 'music' && (
            <MusicSettingsSection
              currentMusicSettingsPageLabel={currentMusicSettingsPageLabel}
              musicSettingsPage={musicSettingsPage}
              whitelist={whitelist}
              setWhitelist={setWhitelist}
              whitelistInputError={whitelistInputError}
              setWhitelistInputError={setWhitelistInputError}
              whitelistDraft={whitelistDraft}
              setWhitelistDraft={setWhitelistDraft}
              handleAddWhitelist={handleAddWhitelist}
              handleDetectSourceAppId={handleDetectSourceAppId}
              detectingSourceAppId={detectingSourceAppId}
              detectedSources={detectedSources}
              lyricsSourceOptions={LYRICS_SOURCE_OPTIONS}
              lyricsSource={lyricsSource}
              setLyricsSource={setLyricsSource}
              lyricsEnabled={lyricsEnabled}
              setLyricsEnabled={setLyricsEnabled}
              lyricsTranslationEnabled={lyricsTranslationEnabled}
              setLyricsTranslationEnabled={setLyricsTranslationEnabled}
              lyricsKaraoke={lyricsKaraoke}
              setLyricsKaraoke={setLyricsKaraoke}
              lyricsClock={lyricsClock}
              setLyricsClock={setLyricsClock}
              lyricsCalibrateEnabled={lyricsCalibrateEnabled}
              setLyricsCalibrateEnabled={setLyricsCalibrateEnabled}
              lyricsCalibrateDelay={lyricsCalibrateDelay}
              setLyricsCalibrateDelay={setLyricsCalibrateDelay}
              musicSmtcUnsubscribeInput={musicSmtcUnsubscribeInput}
              setMusicSmtcUnsubscribeInput={setMusicSmtcUnsubscribeInput}
              musicSmtcNeverUnsubscribe={musicSmtcNeverUnsubscribe}
              setMusicSmtcNeverUnsubscribe={setMusicSmtcNeverUnsubscribe}
              saveMusicSmtcUnsubscribeConfig={saveMusicSmtcUnsubscribeConfig}
              setMusicSmtcConfigMessage={setMusicSmtcConfigMessage}
              musicSmtcConfigMessage={musicSmtcConfigMessage}
              musicSettingsPages={MUSIC_SETTINGS_PAGES}
              musicSettingsPageLabels={translatedMusicSettingsPageLabels}
              setMusicSettingsPage={setMusicSettingsPage}
            />
          )}

          {activeTab === 'ai' && (
            <AiSettingsSection
              currentAiSettingsPageLabel={currentAiSettingsPageLabel}
              aiSettingsPage={aiSettingsPage}
              aiConfig={aiConfig}
              setAiConfig={setAiConfig}
              onAddWorkspace={onAddWorkspace}
              onRemoveWorkspace={onRemoveWorkspace}
              SettingsFieldComponent={SettingsField}
              aiSettingsPages={AI_SETTINGS_PAGES}
              aiSettingsPageLabels={translatedSettingsTabLabels}
              setAiSettingsPage={setAiSettingsPage}
              isProUser={isProUser}
            />
          )}

          {activeTab === 'update' && (
            <UpdateSettingsSection
              aboutVersion={aboutVersion}
              updateAutoPromptEnabled={updateAutoPromptEnabled}
              announcementShowMode={announcementShowMode}
              updateStatus={updateStatus}
              updateVersion={updateVersion}
              downloadProgress={downloadProgress}
              currentSourceLabel={currentSourceLabel}
              updateError={updateError}
              onUpdateAutoPromptEnabledChange={handleUpdateAutoPromptEnabledChange}
              onAnnouncementShowModeChange={handleAnnouncementShowModeChange}
              onCheckUpdate={handleCheckUpdate}
              onDownloadUpdate={handleDownloadUpdate}
              onInstallUpdate={handleInstallUpdate}
              onResetGuide={handleResetGuide}
              guideResetStatus={guideResetStatus}
              currentUpdateSettingsPageLabel={currentUpdateSettingsPageLabel}
              updateSettingsPage={updateSettingsPage}
              updateSettingsPages={UPDATE_SETTINGS_PAGES}
              updateSettingsPageLabels={translatedUpdateSettingsPageLabels}
              setUpdateSettingsPage={setUpdateSettingsPage}
            />
          )}

          {activeTab === 'pluginMarket' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title settings-app-title-line">
                <span>{t('settings.labels.pluginMarket', { defaultValue: '综合市场' })}</span>
                {hasLoginSession && <span className="settings-app-title-sub">- {currentPluginMarketPageLabel}</span>}
                {hasLoginSession && (pluginMarketPage === 'wallpaper' || pluginMarketPage === 'edit') && (
                  <>
                    <button
                      className={`settings-app-title-refresh-btn${wallpaperDetailOpen && pluginMarketNavigationExpanded ? ' disabled' : ''}`}
                      type="button"
                      disabled={wallpaperDetailOpen && pluginMarketNavigationExpanded}
                      onClick={() => setWallpaperMarketRefreshKey((prev) => prev + 1)}
                      title={t('settings.pluginMarket.wallpaper.actions.refresh', { defaultValue: '刷新壁纸列表' })}
                      aria-label={t('settings.pluginMarket.wallpaper.actions.refresh', { defaultValue: '刷新壁纸列表' })}
                    >
                      <img src={SvgIcon.REVERT} alt="" className="settings-app-title-refresh-icon" />
                    </button>
                    {pluginMarketPage === 'wallpaper' && (
                      <button
                        className={`settings-app-title-refresh-btn${wallpaperSearchExpanded ? ' active' : ''}${wallpaperDetailOpen && pluginMarketNavigationExpanded ? ' disabled' : ''}`}
                        type="button"
                        disabled={wallpaperDetailOpen && pluginMarketNavigationExpanded}
                        onClick={() => setWallpaperSearchExpanded((prev) => !prev)}
                        title={t('settings.pluginMarket.wallpaper.actions.expandSearch', { defaultValue: '展开搜索' })}
                        aria-label={t('settings.pluginMarket.wallpaper.actions.expandSearch', { defaultValue: '展开搜索' })}
                      >
                        <img src={SvgIcon.SEARCH} alt="" className="settings-app-title-search-icon" />
                      </button>
                    )}
                  </>
                )}
                {hasLoginSession && (
                  <SettingsPageNavigationToggle
                    expanded={pluginMarketNavigationExpanded}
                    label={t(pluginMarketNavigationExpanded ? 'settings.navigation.collapse' : 'settings.navigation.expand')}
                    onToggle={() => setPluginMarketNavigationExpanded((current) => !current)}
                  />
                )}
              </div>
              {hasLoginSession ? (
                <div className="settings-app-pages-layout" style={{ marginTop: 0 }}>
                  <div className="settings-app-page-main">
                    {pluginMarketPage === 'wallpaper' && (
                      <WallpaperMarketSection
                        key={wallpaperMarketRefreshKey}
                        onApplyBackground={handleApplyMarketplaceWallpaper}
                        searchExpanded={wallpaperSearchExpanded}
                        onSearchExpandedChange={setWallpaperSearchExpanded}
                        onDetailOpenChange={setWallpaperDetailOpen}
                      />
                    )}
                    {pluginMarketPage === 'apps' && (
                      <div className="settings-cards">
                        <div className="settings-coming-soon">
                          <div className="settings-coming-soon-title">
                            {t('settings.pluginMarket.apps.comingSoon', { defaultValue: '敬请期待' })}
                          </div>
                          <div className="settings-coming-soon-hint">
                            {t('settings.pluginMarket.apps.comingSoonHint', { defaultValue: '应用市场功能即将上线' })}
                          </div>
                        </div>
                      </div>
                    )}
                    {pluginMarketPage === 'contribution' && (
                      <WallpaperContributionSection />
                    )}
                    {pluginMarketPage === 'edit' && (
                      <WallpaperEditSection
                        key={wallpaperMarketRefreshKey}
                        onGoWallpaper={() => setPluginMarketPage('wallpaper')}
                      />
                    )}
                  </div>
                  <SettingsPageNavigation
                    activePage={pluginMarketPage}
                    expanded={pluginMarketNavigationExpanded}
                    pages={PLUGIN_MARKET_PAGES}
                    pageLabels={pluginMarketPageLabels}
                    navigationLabel={t('settings.pluginMarket.pagination')}
                    onSelectPage={setPluginMarketPage}
                  />
                </div>
              ) : (
                <div className="settings-user-auth">
                  <div className="settings-user-auth-entry-title">
                    {t('settings.pluginMarket.auth.entryTitle', { defaultValue: '登录后即可访问综合市场内容' })}
                  </div>
                  <div className="settings-user-auth-entry-actions">
                    <button
                      type="button"
                      className="settings-user-primary-btn"
                      onClick={() => setLogin()}
                    >
                      {t('settings.pluginMarket.auth.gotoLogin', { defaultValue: '前往登录' })}
                    </button>
                    <button
                      type="button"
                      className="settings-user-secondary-btn"
                      onClick={() => setRegister()}
                    >
                      {t('settings.pluginMarket.auth.gotoRegister', { defaultValue: '前往注册' })}
                    </button>
                  </div>
                  <div className="settings-user-auth-hint">
                    {t('settings.pluginMarket.auth.hint', { defaultValue: '登录后可浏览壁纸与插件内容。' })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'user' && <UserSettingsSection initialProfilePage={userInitialProfilePage} />}

          {activeTab === 'about' && <AboutSettingsSection aboutVersion={aboutVersion} initialPage={aboutInitialPage} />}
        </div>
      </div>
    </div>
  );
});

SettingsTab.displayName = 'SettingsTab';
