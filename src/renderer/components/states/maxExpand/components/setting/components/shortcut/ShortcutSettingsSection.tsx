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

import { useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement, RefObject, WheelEvent as ReactWheelEvent } from 'react';

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
}

/**
 * 渲染快捷键设置区块
 * @param props - 快捷键设置区域所需参数
 * @returns 快捷键设置区域
 */
export function ShortcutSettingsSection(props: ShortcutSettingsSectionProps): ReactElement {
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
  } = props;

  type ShortcutSettingsPageKey = 'window' | 'capture' | 'media';
  const pages: ShortcutSettingsPageKey[] = ['window', 'capture', 'media'];
  const pageLabels: Record<ShortcutSettingsPageKey, string> = {
    window: '窗口控制',
    capture: '截图',
    media: '音乐控制',
  };
  const [shortcutPage, setShortcutPage] = useState<ShortcutSettingsPageKey>('window');

  const handleShortcutPagesWheel = (e: ReactWheelEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    const mainEl = e.currentTarget.querySelector('.settings-app-page-main') as HTMLElement | null;
    if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
      return;
    }

    const currentIdx = pages.indexOf(shortcutPage);
    if (currentIdx < 0) return;
    const nextIdx = e.deltaY > 0
      ? Math.min(currentIdx + 1, pages.length - 1)
      : Math.max(currentIdx - 1, 0);

    if (nextIdx !== currentIdx) {
      e.preventDefault();
      setShortcutPage(pages[nextIdx]);
    }
  };

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>快捷键</span>
        <span className="settings-app-title-sub">- {pageLabels[shortcutPage]}</span>
      </div>
      <div className="settings-app-pages-layout settings-shortcut-pages-layout" onWheelCapture={handleShortcutPagesWheel}>
        <div className="settings-app-page-main">
          {shortcutPage === 'window' && (
            <>
              <div className="settings-hotkey-section">
                <div className="settings-hotkey-label">隐藏/显示快捷键</div>
                <div className="settings-hotkey-row">
                  <input
                    ref={hotkeyInputRef}
                    className={`settings-hotkey-input ${hotkeyRecording ? 'recording' : ''}${hotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={hotkeyRecording ? '请按下快捷键组合…' : (hideHotkey || '未设置')}
                    onFocus={() => { setHotkeyRecording(true); setHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setHotkeyRecording(true); hotkeyInputRef.current?.focus(); }}>{hotkeyRecording ? '录入中' : '修改'}</button>
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
                    }}>清除</button>
                  )}
                </div>
                {hotkeyError && <div className="settings-hotkey-error">{hotkeyError}</div>}
                <div className="settings-hotkey-hint">点击“修改”后按下组合键（如 Alt+X、Ctrl+Shift+H）</div>
              </div>

              <div className="settings-hotkey-section">
                <div className="settings-hotkey-label">关闭灵动岛快捷键</div>
                <div className="settings-hotkey-row">
                  <input
                    ref={quitHotkeyInputRef}
                    className={`settings-hotkey-input ${quitHotkeyRecording ? 'recording' : ''}${quitHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={quitHotkeyRecording ? '请按下快捷键组合…' : (quitHotkey || '未设置')}
                    onFocus={() => { setQuitHotkeyRecording(true); setQuitHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setQuitHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleQuitHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setQuitHotkeyRecording(true); quitHotkeyInputRef.current?.focus(); }}>{quitHotkeyRecording ? '录入中' : '修改'}</button>
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
                    }}>清除</button>
                  )}
                </div>
                {quitHotkeyError && <div className="settings-hotkey-error">{quitHotkeyError}</div>}
                <div className="settings-hotkey-hint">按下此快捷键将立即关闭灵动岛应用（如 Alt+Q、Ctrl+Shift+Q）</div>
              </div>

              <div className="settings-hotkey-section">
                <div className="settings-hotkey-label">还原默认位置快捷键</div>
                <div className="settings-hotkey-row">
                  <input
                    ref={resetPositionHotkeyInputRef}
                    className={`settings-hotkey-input ${resetPositionHotkeyRecording ? 'recording' : ''}${resetPositionHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={resetPositionHotkeyRecording ? '请按下快捷键组合…' : (resetPositionHotkey || '未设置')}
                    onFocus={() => { setResetPositionHotkeyRecording(true); setResetPositionHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setResetPositionHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleResetPositionHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setResetPositionHotkeyRecording(true); resetPositionHotkeyInputRef.current?.focus(); }}>{resetPositionHotkeyRecording ? '录入中' : '修改'}</button>
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
                    }}>清除</button>
                  )}
                </div>
                {resetPositionHotkeyError && <div className="settings-hotkey-error">{resetPositionHotkeyError}</div>}
                <div className="settings-hotkey-hint">按下此快捷键将把灵动岛恢复到默认顶部居中位置</div>
              </div>
            </>
          )}

          {shortcutPage === 'capture' && (
            <div className="settings-hotkey-section">
              <div className="settings-hotkey-label">选区截图快捷键</div>
              <div className="settings-hotkey-row">
                <input
                  ref={screenshotHotkeyInputRef}
                  className={`settings-hotkey-input ${screenshotHotkeyRecording ? 'recording' : ''}${screenshotHotkeyError ? ' error' : ''}`}
                  type="text"
                  readOnly
                  value={screenshotHotkeyRecording ? '请按下快捷键组合…' : (screenshotHotkey || '未设置')}
                  onFocus={() => { setScreenshotHotkeyRecording(true); setScreenshotHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                  onBlur={() => { setScreenshotHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                  onKeyDown={handleScreenshotHotkeyKeyDown}
                />
                <button className="settings-hotkey-btn" type="button" onClick={() => { setScreenshotHotkeyRecording(true); screenshotHotkeyInputRef.current?.focus(); }}>{screenshotHotkeyRecording ? '录入中' : '修改'}</button>
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
                  }}>清除</button>
                )}
              </div>
              {screenshotHotkeyError && <div className="settings-hotkey-error">{screenshotHotkeyError}</div>}
              <div className="settings-hotkey-hint">按下此快捷键将触发截图选区流程（如 Alt+A、Ctrl+Shift+A）</div>
            </div>
          )}

          {shortcutPage === 'media' && (
            <>
              <div className="settings-hotkey-section">
                <div className="settings-hotkey-label">快速切换歌曲快捷键</div>
                <div className="settings-hotkey-row">
                  <input
                    ref={nextSongHotkeyInputRef}
                    className={`settings-hotkey-input ${nextSongHotkeyRecording ? 'recording' : ''}${nextSongHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={nextSongHotkeyRecording ? '请按下快捷键组合…' : (nextSongHotkey || '未设置')}
                    onFocus={() => { setNextSongHotkeyRecording(true); setNextSongHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setNextSongHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handleNextSongHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setNextSongHotkeyRecording(true); nextSongHotkeyInputRef.current?.focus(); }}>{nextSongHotkeyRecording ? '录入中' : '修改'}</button>
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
                    }}>清除</button>
                  )}
                </div>
                {nextSongHotkeyError && <div className="settings-hotkey-error">{nextSongHotkeyError}</div>}
                <div className="settings-hotkey-hint">按下后触发系统下一曲媒体按键（仅白名单播放器生效）</div>
              </div>

              <div className="settings-hotkey-section">
                <div className="settings-hotkey-label">暂停/播放歌曲快捷键</div>
                <div className="settings-hotkey-row">
                  <input
                    ref={playPauseSongHotkeyInputRef}
                    className={`settings-hotkey-input ${playPauseSongHotkeyRecording ? 'recording' : ''}${playPauseSongHotkeyError ? ' error' : ''}`}
                    type="text"
                    readOnly
                    value={playPauseSongHotkeyRecording ? '请按下快捷键组合…' : (playPauseSongHotkey || '未设置')}
                    onFocus={() => { setPlayPauseSongHotkeyRecording(true); setPlayPauseSongHotkeyError(''); window.api.hotkeySuspend().catch(() => {}); }}
                    onBlur={() => { setPlayPauseSongHotkeyRecording(false); window.api.hotkeyResume().catch(() => {}); }}
                    onKeyDown={handlePlayPauseSongHotkeyKeyDown}
                  />
                  <button className="settings-hotkey-btn" type="button" onClick={() => { setPlayPauseSongHotkeyRecording(true); playPauseSongHotkeyInputRef.current?.focus(); }}>{playPauseSongHotkeyRecording ? '录入中' : '修改'}</button>
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
                    }}>清除</button>
                  )}
                </div>
                {playPauseSongHotkeyError && <div className="settings-hotkey-error">{playPauseSongHotkeyError}</div>}
                <div className="settings-hotkey-hint">按下后触发系统播放/暂停媒体按键（仅白名单播放器生效）</div>
              </div>
            </>
          )}
        </div>

        <div className="settings-app-page-dots" aria-label="快捷键设置分页">
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
