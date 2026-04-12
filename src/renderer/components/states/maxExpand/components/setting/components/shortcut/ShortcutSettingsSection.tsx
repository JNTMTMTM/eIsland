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

import type { ReactElement } from 'react';

/**
 * 渲染快捷键设置区块
 * @param props - 快捷键设置区域所需参数
 * @returns 快捷键设置区域
 */
export function ShortcutSettingsSection(props: any): ReactElement {
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

    resetPositionHotkeyInputRef,
    resetPositionHotkeyRecording,
    resetPositionHotkeyError,
    resetPositionHotkey,
    setResetPositionHotkeyRecording,
    setResetPositionHotkeyError,
    handleResetPositionHotkeyKeyDown,
    setResetPositionHotkey,
  } = props;

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title">快捷键</div>
      <div className="settings-hotkey-section">
        <div className="settings-hotkey-label">隐藏/显示快捷键</div>
        <div className="settings-hotkey-row">
          <input
            ref={hotkeyInputRef}
            className={`settings-hotkey-input ${hotkeyRecording ? 'recording' : ''}${hotkeyError ? ' error' : ''}`}
            type="text"
            readOnly
            value={hotkeyRecording ? '请按下快捷键组合…' : (hideHotkey || '未设置')}
            onFocus={() => {
              setHotkeyRecording(true);
              setHotkeyError('');
              window.api.hotkeySuspend().catch(() => {});
            }}
            onBlur={() => {
              setHotkeyRecording(false);
              window.api.hotkeyResume().catch(() => {});
            }}
            onKeyDown={handleHotkeyKeyDown}
          />
          <button className="settings-hotkey-btn" type="button" onClick={() => { setHotkeyRecording(true); hotkeyInputRef.current?.focus(); }}>{hotkeyRecording ? '录入中' : '修改'}</button>
          {hideHotkey && (
            <button
              className="settings-hotkey-btn"
              type="button"
              onClick={() => {
                window.api.hotkeySet('').then((ok) => {
                  if (ok) {
                    setHideHotkey('');
                    setHotkeyError('');
                    setHotkeyRecording(false);
                    hotkeyInputRef.current?.blur();
                  }
                }).catch(() => {});
              }}
            >清除</button>
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
    </div>
  );
}
