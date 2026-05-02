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
 * @file ShortcutSettingsSection.tsx
 * @description 设置页面 - 快捷键设置区块
 * @author 鸡哥
 */

import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement, RefObject } from 'react';
import { useTranslation } from 'react-i18next';

interface ShortcutSettingsSectionProps {
  hotkeyInputRef: RefObject<HTMLInputElement | null>;
  hotkeyRecording: boolean;
  hotkeyError: string;
  hideHotkey: string;
  setHotkeyRecording: (value: boolean) => void;
  setHotkeyError: (value: string) => void;
  handleHotkeyKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  setHideHotkey: (value: string) => void;
  quitHotkeyInputRef: RefObject<HTMLInputElement | null>;
  quitHotkeyRecording: boolean;
  quitHotkeyError: string;
  quitHotkey: string;
  setQuitHotkeyRecording: (value: boolean) => void;
  setQuitHotkeyError: (value: string) => void;
  handleQuitHotkeyKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  setQuitHotkey: (value: string) => void;
  screenshotHotkeyInputRef: RefObject<HTMLInputElement | null>;
  screenshotHotkeyRecording: boolean;
  screenshotHotkeyError: string;
  screenshotHotkey: string;
  setScreenshotHotkeyRecording: (value: boolean) => void;
  setScreenshotHotkeyError: (value: string) => void;
  handleScreenshotHotkeyKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  setScreenshotHotkey: (value: string) => void;
  nextSongHotkeyInputRef: RefObject<HTMLInputElement | null>;
  nextSongHotkeyRecording: boolean;
  nextSongHotkeyError: string;
  nextSongHotkey: string;
  setNextSongHotkeyRecording: (value: boolean) => void;
  setNextSongHotkeyError: (value: string) => void;
  handleNextSongHotkeyKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  setNextSongHotkey: (value: string) => void;
  playPauseSongHotkeyInputRef: RefObject<HTMLInputElement | null>;
  playPauseSongHotkeyRecording: boolean;
  playPauseSongHotkeyError: string;
  playPauseSongHotkey: string;
  setPlayPauseSongHotkeyRecording: (value: boolean) => void;
  setPlayPauseSongHotkeyError: (value: string) => void;
  handlePlayPauseSongHotkeyKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  setPlayPauseSongHotkey: (value: string) => void;
  resetPositionHotkeyInputRef: RefObject<HTMLInputElement | null>;
  resetPositionHotkeyRecording: boolean;
  resetPositionHotkeyError: string;
  resetPositionHotkey: string;
  setResetPositionHotkeyRecording: (value: boolean) => void;
  setResetPositionHotkeyError: (value: string) => void;
  handleResetPositionHotkeyKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  setResetPositionHotkey: (value: string) => void;
  toggleTrayHotkeyInputRef: RefObject<HTMLInputElement | null>;
  toggleTrayHotkeyRecording: boolean;
  toggleTrayHotkeyError: string;
  toggleTrayHotkey: string;
  setToggleTrayHotkeyRecording: (value: boolean) => void;
  setToggleTrayHotkeyError: (value: string) => void;
  handleToggleTrayHotkeyKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  setToggleTrayHotkey: (value: string) => void;
  showSettingsWindowHotkeyInputRef: RefObject<HTMLInputElement | null>;
  showSettingsWindowHotkeyRecording: boolean;
  showSettingsWindowHotkeyError: string;
  showSettingsWindowHotkey: string;
  setShowSettingsWindowHotkeyRecording: (value: boolean) => void;
  setShowSettingsWindowHotkeyError: (value: string) => void;
  handleShowSettingsWindowHotkeyKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  setShowSettingsWindowHotkey: (value: string) => void;
  openClipboardHistoryHotkeyInputRef: RefObject<HTMLInputElement | null>;
  openClipboardHistoryHotkeyRecording: boolean;
  openClipboardHistoryHotkeyError: string;
  openClipboardHistoryHotkey: string;
  setOpenClipboardHistoryHotkeyRecording: (value: boolean) => void;
  setOpenClipboardHistoryHotkeyError: (value: string) => void;
  handleOpenClipboardHistoryHotkeyKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  setOpenClipboardHistoryHotkey: (value: string) => void;
  togglePassthroughHotkeyInputRef: RefObject<HTMLInputElement | null>;
  togglePassthroughHotkeyRecording: boolean;
  togglePassthroughHotkeyError: string;
  togglePassthroughHotkey: string;
  setTogglePassthroughHotkeyRecording: (value: boolean) => void;
  setTogglePassthroughHotkeyError: (value: string) => void;
  handleTogglePassthroughHotkeyKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  setTogglePassthroughHotkey: (value: string) => void;
  toggleUiLockHotkeyInputRef: RefObject<HTMLInputElement | null>;
  toggleUiLockHotkeyRecording: boolean;
  toggleUiLockHotkeyError: string;
  toggleUiLockHotkey: string;
  setToggleUiLockHotkeyRecording: (value: boolean) => void;
  setToggleUiLockHotkeyError: (value: string) => void;
  handleToggleUiLockHotkeyKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  setToggleUiLockHotkey: (value: string) => void;
  agentVoiceInputHotkeyInputRef: RefObject<HTMLInputElement | null>;
  agentVoiceInputHotkeyRecording: boolean;
  agentVoiceInputHotkeyError: string;
  agentVoiceInputHotkey: string;
  setAgentVoiceInputHotkeyRecording: (value: boolean) => void;
  setAgentVoiceInputHotkeyError: (value: string) => void;
  handleAgentVoiceInputHotkeyKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  setAgentVoiceInputHotkey: (value: string) => void;
}

/**
 * 渲染快捷键设置区块
 * @param props - 快捷键设置区域所需参数
 * @returns 快捷键设置区域
 */
export function ShortcutSettingsSection(props: ShortcutSettingsSectionProps): ReactElement {
  const { t } = useTranslation();
  const {
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
  } = props;

  type ShortcutSettingsPageKey = 'window' | 'capture' | 'media';
  const pages: ShortcutSettingsPageKey[] = ['window', 'capture', 'media'];
  const pageLabels: Record<ShortcutSettingsPageKey, string> = {
    window: t('settings.shortcut.pages.window', { defaultValue: '窗口控制' }),
    capture: t('settings.shortcut.pages.capture', { defaultValue: '截图' }),
    media: t('settings.shortcut.pages.media', { defaultValue: '音乐控制' }),
  };
  const recordingValue = t('settings.shortcut.common.recordingValue', { defaultValue: '请按下快捷键组合…' });
  const notSetValue = t('settings.shortcut.common.notSetValue', { defaultValue: '未设置' });
  const recordingBtn = t('settings.shortcut.common.recordingBtn', { defaultValue: '录入中' });
  const editBtn = t('settings.shortcut.common.editBtn', { defaultValue: '修改' });
  const clearBtn = t('settings.shortcut.common.clearBtn', { defaultValue: '清除' });
  const [shortcutPage, setShortcutPage] = useState<ShortcutSettingsPageKey>('window');
  const shortcutPageRef = useRef(shortcutPage);
  shortcutPageRef.current = shortcutPage;
  const shortcutPagesLayoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = shortcutPagesLayoutRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent): void => {
      e.stopPropagation();
      const target = e.target as HTMLElement | null;
      const mainEl = target?.closest('.settings-app-page-main') as HTMLElement | null;
      if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) return;

      const currentIdx = pages.indexOf(shortcutPageRef.current);
      if (currentIdx < 0) return;
      const nextIdx = e.deltaY > 0
        ? Math.min(currentIdx + 1, pages.length - 1)
        : Math.max(currentIdx - 1, 0);

      if (nextIdx !== currentIdx) {
        e.preventDefault();
        setShortcutPage(pages[nextIdx]);
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>{t('settings.labels.shortcut', { defaultValue: '快捷键' })}</span>
        <span className="settings-app-title-sub">- {pageLabels[shortcutPage]}</span>
      </div>
      <div className="settings-app-pages-layout settings-shortcut-pages-layout" ref={shortcutPagesLayoutRef}>
        <div className="settings-app-page-main">
          {shortcutPage === 'window' && (
            <div className="settings-cards">
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.shortcut.window.toggleIsland.title', { defaultValue: '隐藏/显示快捷键' })}</div>
                  <div className="settings-card-subtitle">{t('settings.shortcut.window.toggleIsland.hint', { defaultValue: '点击“修改”后按下组合键（如 Alt+X、Ctrl+Shift+H）' })}</div>
                </div>
                <div className="settings-hotkey-row">
                  <input
                    ref={hotkeyInputRef}
                    className={`settings-hotkey-input ${hotkeyRecording ? 'recording' : ''}${hotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={hotkeyRecording ? recordingValue : (hideHotkey || notSetValue)}
                    onFocus={() => { setHotkeyRecording(true); setHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setHotkeyRecording(true); hotkeyInputRef.current?.focus(); }}>{hotkeyRecording ? recordingBtn : editBtn}</button>
                  {hideHotkey && (
                    <button className="settings-hotkey-btn" type="button" onClick={() => {
                      window.api.hotkeySet('').then((ok) => {
                        if (ok) {
                          setHideHotkey('');
                          setHotkeyError('');
                          setHotkeyRecording(false);
                          hotkeyInputRef.current?.blur();
                        }
                      }).catch(() => {});
                    }}>{clearBtn}</button>
                  )}
                </div>
                {hotkeyError && <div className="settings-hotkey-error">{hotkeyError}</div>}
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.shortcut.window.quitApp.title', { defaultValue: '关闭灵动岛快捷键' })}</div>
                  <div className="settings-card-subtitle">{t('settings.shortcut.window.quitApp.hint', { defaultValue: '按下此快捷键将立即关闭灵动岛应用（如 Alt+Q、Ctrl+Shift+Q）' })}</div>
                </div>
                <div className="settings-hotkey-row">
                  <input
                    ref={quitHotkeyInputRef}
                    className={`settings-hotkey-input ${quitHotkeyRecording ? 'recording' : ''}${quitHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={quitHotkeyRecording ? recordingValue : (quitHotkey || notSetValue)}
                    onFocus={() => { setQuitHotkeyRecording(true); setQuitHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setQuitHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleQuitHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setQuitHotkeyRecording(true); quitHotkeyInputRef.current?.focus(); }}>{quitHotkeyRecording ? recordingBtn : editBtn}</button>
                  {quitHotkey && (
                    <button className="settings-hotkey-btn" type="button" onClick={() => {
                      window.api.quitHotkeySet('').then((ok) => {
                        if (ok) {
                          setQuitHotkey('');
                          setQuitHotkeyError('');
                          setQuitHotkeyRecording(false);
                          quitHotkeyInputRef.current?.blur();
                        }
                      }).catch(() => {});
                    }}>{clearBtn}</button>
                  )}
                </div>
                {quitHotkeyError && <div className="settings-hotkey-error">{quitHotkeyError}</div>}
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.shortcut.window.resetPosition.title', { defaultValue: '还原默认位置快捷键' })}</div>
                  <div className="settings-card-subtitle">{t('settings.shortcut.window.resetPosition.hint', { defaultValue: '按下此快捷键将把灵动岛恢复到默认顶部居中位置' })}</div>
                </div>
                <div className="settings-hotkey-row">
                  <input
                    ref={resetPositionHotkeyInputRef}
                    className={`settings-hotkey-input ${resetPositionHotkeyRecording ? 'recording' : ''}${resetPositionHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={resetPositionHotkeyRecording ? recordingValue : (resetPositionHotkey || notSetValue)}
                    onFocus={() => { setResetPositionHotkeyRecording(true); setResetPositionHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setResetPositionHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleResetPositionHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setResetPositionHotkeyRecording(true); resetPositionHotkeyInputRef.current?.focus(); }}>{resetPositionHotkeyRecording ? recordingBtn : editBtn}</button>
                  {resetPositionHotkey && (
                    <button className="settings-hotkey-btn" type="button" onClick={() => {
                      window.api.resetPositionHotkeySet('').then((ok) => {
                        if (ok) {
                          setResetPositionHotkey('');
                          setResetPositionHotkeyError('');
                          setResetPositionHotkeyRecording(false);
                          resetPositionHotkeyInputRef.current?.blur();
                        }
                      }).catch(() => {});
                    }}>{clearBtn}</button>
                  )}
                </div>
                {resetPositionHotkeyError && <div className="settings-hotkey-error">{resetPositionHotkeyError}</div>}
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.shortcut.window.toggleTray.title', { defaultValue: '隐藏/显示托盘图标快捷键' })}</div>
                  <div className="settings-card-subtitle">{t('settings.shortcut.window.toggleTray.hint', { defaultValue: '按下此快捷键将隐藏或显示系统托盘中的灵动岛图标' })}</div>
                </div>
                <div className="settings-hotkey-row">
                  <input
                    ref={toggleTrayHotkeyInputRef}
                    className={`settings-hotkey-input ${toggleTrayHotkeyRecording ? 'recording' : ''}${toggleTrayHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={toggleTrayHotkeyRecording ? recordingValue : (toggleTrayHotkey || notSetValue)}
                    onFocus={() => { setToggleTrayHotkeyRecording(true); setToggleTrayHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setToggleTrayHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleToggleTrayHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setToggleTrayHotkeyRecording(true); toggleTrayHotkeyInputRef.current?.focus(); }}>{toggleTrayHotkeyRecording ? recordingBtn : editBtn}</button>
                  {toggleTrayHotkey && (
                    <button className="settings-hotkey-btn" type="button" onClick={() => {
                      window.api.toggleTrayHotkeySet('').then((ok) => {
                        if (ok) {
                          setToggleTrayHotkey('');
                          setToggleTrayHotkeyError('');
                          setToggleTrayHotkeyRecording(false);
                          toggleTrayHotkeyInputRef.current?.blur();
                        }
                      }).catch(() => {});
                    }}>{clearBtn}</button>
                  )}
                </div>
                {toggleTrayHotkeyError && <div className="settings-hotkey-error">{toggleTrayHotkeyError}</div>}
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.shortcut.window.showConfig.title', { defaultValue: '显示配置窗口快捷键' })}</div>
                  <div className="settings-card-subtitle">{t('settings.shortcut.window.showConfig.hint', { defaultValue: '仅在独立窗口模式下生效：按下后将打开独立配置窗口并切换到设置页' })}</div>
                </div>
                <div className="settings-hotkey-row">
                  <input
                    ref={showSettingsWindowHotkeyInputRef}
                    className={`settings-hotkey-input ${showSettingsWindowHotkeyRecording ? 'recording' : ''}${showSettingsWindowHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={showSettingsWindowHotkeyRecording ? recordingValue : (showSettingsWindowHotkey || notSetValue)}
                    onFocus={() => { setShowSettingsWindowHotkeyRecording(true); setShowSettingsWindowHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setShowSettingsWindowHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleShowSettingsWindowHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setShowSettingsWindowHotkeyRecording(true); showSettingsWindowHotkeyInputRef.current?.focus(); }}>{showSettingsWindowHotkeyRecording ? recordingBtn : editBtn}</button>
                  {showSettingsWindowHotkey && (
                    <button className="settings-hotkey-btn" type="button" onClick={() => {
                      window.api.showSettingsWindowHotkeySet('').then((ok) => {
                        if (ok) {
                          setShowSettingsWindowHotkey('');
                          setShowSettingsWindowHotkeyError('');
                          setShowSettingsWindowHotkeyRecording(false);
                          showSettingsWindowHotkeyInputRef.current?.blur();
                        }
                      }).catch(() => {});
                    }}>{clearBtn}</button>
                  )}
                </div>
                {showSettingsWindowHotkeyError && <div className="settings-hotkey-error">{showSettingsWindowHotkeyError}</div>}
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.shortcut.window.openClipboardHistory.title', { defaultValue: '打开剪贴板历史快捷键' })}</div>
                  <div className="settings-card-subtitle">{t('settings.shortcut.window.openClipboardHistory.hint', { defaultValue: '按下后将打开灵动岛并直接切换到剪贴板历史界面' })}</div>
                </div>
                <div className="settings-hotkey-row">
                  <input
                    ref={openClipboardHistoryHotkeyInputRef}
                    className={`settings-hotkey-input ${openClipboardHistoryHotkeyRecording ? 'recording' : ''}${openClipboardHistoryHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={openClipboardHistoryHotkeyRecording ? recordingValue : (openClipboardHistoryHotkey || notSetValue)}
                    onFocus={() => { setOpenClipboardHistoryHotkeyRecording(true); setOpenClipboardHistoryHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setOpenClipboardHistoryHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleOpenClipboardHistoryHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setOpenClipboardHistoryHotkeyRecording(true); openClipboardHistoryHotkeyInputRef.current?.focus(); }}>{openClipboardHistoryHotkeyRecording ? recordingBtn : editBtn}</button>
                  {openClipboardHistoryHotkey && (
                    <button className="settings-hotkey-btn" type="button" onClick={() => {
                      window.api.openClipboardHistoryHotkeySet('').then((ok) => {
                        if (ok) {
                          setOpenClipboardHistoryHotkey('');
                          setOpenClipboardHistoryHotkeyError('');
                          setOpenClipboardHistoryHotkeyRecording(false);
                          openClipboardHistoryHotkeyInputRef.current?.blur();
                        }
                      }).catch(() => {});
                    }}>{clearBtn}</button>
                  )}
                </div>
                {openClipboardHistoryHotkeyError && <div className="settings-hotkey-error">{openClipboardHistoryHotkeyError}</div>}
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.shortcut.window.togglePassthrough.title', { defaultValue: '切换鼠标穿透快捷键' })}</div>
                  <div className="settings-card-subtitle">{t('settings.shortcut.window.togglePassthrough.hint', { defaultValue: '按下此快捷键将锁定或解锁鼠标穿透状态，锁定后灵动岛不会拦截鼠标事件' })}</div>
                </div>
                <div className="settings-hotkey-row">
                  <input
                    ref={togglePassthroughHotkeyInputRef}
                    className={`settings-hotkey-input ${togglePassthroughHotkeyRecording ? 'recording' : ''}${togglePassthroughHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={togglePassthroughHotkeyRecording ? recordingValue : (togglePassthroughHotkey || notSetValue)}
                    onFocus={() => { setTogglePassthroughHotkeyRecording(true); setTogglePassthroughHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setTogglePassthroughHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleTogglePassthroughHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setTogglePassthroughHotkeyRecording(true); togglePassthroughHotkeyInputRef.current?.focus(); }}>{togglePassthroughHotkeyRecording ? recordingBtn : editBtn}</button>
                  {togglePassthroughHotkey && (
                    <button className="settings-hotkey-btn" type="button" onClick={() => {
                      window.api.togglePassthroughHotkeySet('').then((ok) => {
                        if (ok) {
                          setTogglePassthroughHotkey('');
                          setTogglePassthroughHotkeyError('');
                          setTogglePassthroughHotkeyRecording(false);
                          togglePassthroughHotkeyInputRef.current?.blur();
                        }
                      }).catch(() => {});
                    }}>{clearBtn}</button>
                  )}
                </div>
                {togglePassthroughHotkeyError && <div className="settings-hotkey-error">{togglePassthroughHotkeyError}</div>}
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.shortcut.window.toggleUiLock.title', { defaultValue: '切换 UI 状态锁定快捷键' })}</div>
                  <div className="settings-card-subtitle">{t('settings.shortcut.window.toggleUiLock.hint', { defaultValue: '按下后锁定当前 UI 状态，锁定期间不会因鼠标进入/移出或自动逻辑切换状态，再次按下解锁' })}</div>
                </div>
                <div className="settings-hotkey-row">
                  <input
                    ref={toggleUiLockHotkeyInputRef}
                    className={`settings-hotkey-input ${toggleUiLockHotkeyRecording ? 'recording' : ''}${toggleUiLockHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={toggleUiLockHotkeyRecording ? recordingValue : (toggleUiLockHotkey || notSetValue)}
                    onFocus={() => { setToggleUiLockHotkeyRecording(true); setToggleUiLockHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setToggleUiLockHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleToggleUiLockHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setToggleUiLockHotkeyRecording(true); toggleUiLockHotkeyInputRef.current?.focus(); }}>{toggleUiLockHotkeyRecording ? recordingBtn : editBtn}</button>
                  {toggleUiLockHotkey && (
                    <button className="settings-hotkey-btn" type="button" onClick={() => {
                      window.api.toggleUiLockHotkeySet('').then((ok) => {
                        if (ok) {
                          setToggleUiLockHotkey('');
                          setToggleUiLockHotkeyError('');
                          setToggleUiLockHotkeyRecording(false);
                          toggleUiLockHotkeyInputRef.current?.blur();
                        }
                      }).catch(() => {});
                    }}>{clearBtn}</button>
                  )}
                </div>
                {toggleUiLockHotkeyError && <div className="settings-hotkey-error">{toggleUiLockHotkeyError}</div>}
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.shortcut.window.agentVoiceInput.title', { defaultValue: 'Agent 语音输入快捷键' })}</div>
                  <div className="settings-card-subtitle">{t('settings.shortcut.window.agentVoiceInput.hint', { defaultValue: '长按此快捷键将触发 Agent 语音输入，释放后自动关闭' })}</div>
                </div>
                <div className="settings-hotkey-row">
                  <input
                    ref={agentVoiceInputHotkeyInputRef}
                    className={`settings-hotkey-input ${agentVoiceInputHotkeyRecording ? 'recording' : ''}${agentVoiceInputHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={agentVoiceInputHotkeyRecording ? recordingValue : (agentVoiceInputHotkey || notSetValue)}
                    onFocus={() => { setAgentVoiceInputHotkeyRecording(true); setAgentVoiceInputHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setAgentVoiceInputHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleAgentVoiceInputHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setAgentVoiceInputHotkeyRecording(true); agentVoiceInputHotkeyInputRef.current?.focus(); }}>{agentVoiceInputHotkeyRecording ? recordingBtn : editBtn}</button>
                  {agentVoiceInputHotkey && (
                    <button className="settings-hotkey-btn" type="button" onClick={() => {
                      window.api.agentVoiceInputHotkeySet('').then((ok) => {
                        if (ok) {
                          setAgentVoiceInputHotkey('');
                          setAgentVoiceInputHotkeyError('');
                          setAgentVoiceInputHotkeyRecording(false);
                          agentVoiceInputHotkeyInputRef.current?.blur();
                        }
                      }).catch(() => {});
                    }}>{clearBtn}</button>
                  )}
                </div>
                {agentVoiceInputHotkeyError && <div className="settings-hotkey-error">{agentVoiceInputHotkeyError}</div>}
              </div>
            </div>
          )}

          {shortcutPage === 'capture' && (
            <div className="settings-cards">
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.shortcut.capture.screenshot.title', { defaultValue: '选区截图快捷键' })}</div>
                  <div className="settings-card-subtitle">{t('settings.shortcut.capture.screenshot.hint', { defaultValue: '按下此快捷键将触发截图选区流程（如 Alt+A、Ctrl+Shift+A）' })}</div>
                </div>
                <div className="settings-hotkey-row">
                  <input
                    ref={screenshotHotkeyInputRef}
                    className={`settings-hotkey-input ${screenshotHotkeyRecording ? 'recording' : ''}${screenshotHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={screenshotHotkeyRecording ? recordingValue : (screenshotHotkey || notSetValue)}
                    onFocus={() => { setScreenshotHotkeyRecording(true); setScreenshotHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setScreenshotHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleScreenshotHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setScreenshotHotkeyRecording(true); screenshotHotkeyInputRef.current?.focus(); }}>{screenshotHotkeyRecording ? recordingBtn : editBtn}</button>
                  {screenshotHotkey && (
                    <button className="settings-hotkey-btn" type="button" onClick={() => {
                      window.api.screenshotHotkeySet('').then((ok) => {
                        if (ok) {
                          setScreenshotHotkey('');
                          setScreenshotHotkeyError('');
                          setScreenshotHotkeyRecording(false);
                          screenshotHotkeyInputRef.current?.blur();
                        }
                      }).catch(() => {});
                    }}>{clearBtn}</button>
                  )}
                </div>
                {screenshotHotkeyError && <div className="settings-hotkey-error">{screenshotHotkeyError}</div>}
              </div>
            </div>
          )}

          {shortcutPage === 'media' && (
            <div className="settings-cards">
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.shortcut.media.nextSong.title', { defaultValue: '快速切换歌曲快捷键' })}</div>
                  <div className="settings-card-subtitle">{t('settings.shortcut.media.nextSong.hint', { defaultValue: '按下后触发系统下一曲媒体按键（仅白名单播放器生效）' })}</div>
                </div>
                <div className="settings-hotkey-row">
                  <input
                    ref={nextSongHotkeyInputRef}
                    className={`settings-hotkey-input ${nextSongHotkeyRecording ? 'recording' : ''}${nextSongHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={nextSongHotkeyRecording ? recordingValue : (nextSongHotkey || notSetValue)}
                    onFocus={() => { setNextSongHotkeyRecording(true); setNextSongHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setNextSongHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleNextSongHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setNextSongHotkeyRecording(true); nextSongHotkeyInputRef.current?.focus(); }}>{nextSongHotkeyRecording ? recordingBtn : editBtn}</button>
                  {nextSongHotkey && (
                    <button className="settings-hotkey-btn" type="button" onClick={() => {
                      window.api.nextSongHotkeySet('').then((ok) => {
                        if (ok) {
                          setNextSongHotkey('');
                          setNextSongHotkeyError('');
                          setNextSongHotkeyRecording(false);
                          nextSongHotkeyInputRef.current?.blur();
                        }
                      }).catch(() => {});
                    }}>{clearBtn}</button>
                  )}
                </div>
                {nextSongHotkeyError && <div className="settings-hotkey-error">{nextSongHotkeyError}</div>}
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-title">{t('settings.shortcut.media.playPause.title', { defaultValue: '暂停/播放歌曲快捷键' })}</div>
                  <div className="settings-card-subtitle">{t('settings.shortcut.media.playPause.hint', { defaultValue: '按下后触发系统播放/暂停媒体按键（仅白名单播放器生效）' })}</div>
                </div>
                <div className="settings-hotkey-row">
                  <input
                    ref={playPauseSongHotkeyInputRef}
                    className={`settings-hotkey-input ${playPauseSongHotkeyRecording ? 'recording' : ''}${playPauseSongHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={playPauseSongHotkeyRecording ? recordingValue : (playPauseSongHotkey || notSetValue)}
                    onFocus={() => { setPlayPauseSongHotkeyRecording(true); setPlayPauseSongHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setPlayPauseSongHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handlePlayPauseSongHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setPlayPauseSongHotkeyRecording(true); playPauseSongHotkeyInputRef.current?.focus(); }}>{playPauseSongHotkeyRecording ? recordingBtn : editBtn}</button>
                  {playPauseSongHotkey && (
                    <button className="settings-hotkey-btn" type="button" onClick={() => {
                      window.api.playPauseSongHotkeySet('').then((ok) => {
                        if (ok) {
                          setPlayPauseSongHotkey('');
                          setPlayPauseSongHotkeyError('');
                          setPlayPauseSongHotkeyRecording(false);
                          playPauseSongHotkeyInputRef.current?.blur();
                        }
                      }).catch(() => {});
                    }}>{clearBtn}</button>
                  )}
                </div>
                {playPauseSongHotkeyError && <div className="settings-hotkey-error">{playPauseSongHotkeyError}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="settings-app-page-dots" aria-label={t('settings.shortcut.pagination', { defaultValue: '快捷键设置分页' })}>
          {pages.map((page) => (
            <button
              key={page}
              className={`settings-app-page-dot ${shortcutPage === page ? 'active' : ''}`}
              data-label={pageLabels[page]}
              type="button"
              onClick={() => setShortcutPage(page)}
              title={pageLabels[page]}
              aria-label={pageLabels[page]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
