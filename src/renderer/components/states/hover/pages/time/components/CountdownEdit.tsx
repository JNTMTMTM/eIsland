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
 * @file CountdownEdit.tsx
 * @description 可编辑计时器组件，支持设置时间、开始、暂停、重置
 * @author 鸡哥
 */

import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { BrightnessControl } from './BrightnessControl';
import { ToolButtons } from './ToolButtons';
import { VolumeControl } from './VolumeControl';
import { useCountdownEdit } from '../hooks/useCountdownEdit';
import type { TimePanelMode } from '../types/timeTabTypes';
import { padZero } from '../utils/timerUtils';

interface CountdownEditProps {
  activePanel: TimePanelMode;
}

/**
 * 可编辑计时器组件
 * @description 位于时间和农历左侧，直接显示输入框，支持开始、暂停、重置
 * 倒计时逻辑由 DynamicIsland 全局管理，此组件仅负责 UI 展示和用户交互
 * @param props - 当前面板模式（倒计时/亮度/音量）
 * @returns 倒计时或亮度/音量控件区域
 */
export function CountdownEdit({ activePanel }: CountdownEditProps): ReactElement {
  const { t } = useTranslation();
  const {
    timerState,
    isEditing,
    inputHours,
    inputMinutes,
    inputSeconds,
    h,
    m,
    s,
    timerInputsRef,
    handleInputChange,
    handleStart,
    handlePause,
    handleResume,
    handleReset,
  } = useCountdownEdit();

  return (
    <div className="timer-container">
      <ToolButtons />

      <div className="timer-tools-divider" />

      <div className="timer-main-shell">
        <div className={`timer-main${activePanel !== 'countdown' ? ' timer-main-hidden' : ''}`}>
          <div className="timer-title-row">
            <div className="timer-title">
              <span className="text-[10px] text-[var(--color-island-text)] leading-tight">{t('hover.timer.title', { defaultValue: '倒计时' })}</span>
            </div>
            <span className="text-[10px] text-[var(--color-island-text)] opacity-60 leading-tight ml-2">{t('hover.timer.editHint', { defaultValue: '滚动滚轮编辑时间' })}</span>
          </div>
          <div className="timer-main-row">
            {isEditing ? (
              <div className="timer-inputs" ref={timerInputsRef}>
                <input
                  type="text"
                  className="timer-input"
                  value={inputHours}
                  onChange={(e) => handleInputChange(e.target.value, 'inputHours', 23)}
                  data-setter="inputHours"
                  data-max="23"
                  maxLength={2}
                />
                <span className="timer-sep">:</span>
                <input
                  type="text"
                  className="timer-input"
                  value={inputMinutes}
                  onChange={(e) => handleInputChange(e.target.value, 'inputMinutes', 59)}
                  data-setter="inputMinutes"
                  data-max="59"
                  maxLength={2}
                />
                <span className="timer-sep">:</span>
                <input
                  type="text"
                  className="timer-input"
                  value={inputSeconds}
                  onChange={(e) => handleInputChange(e.target.value, 'inputSeconds', 59)}
                  data-setter="inputSeconds"
                  data-max="59"
                  maxLength={2}
                />
              </div>
            ) : (
              <div className="timer-display">
                <span className="timer-value">{padZero(h)}</span>
                <span className="timer-sep">:</span>
                <span className="timer-value">{padZero(m)}</span>
                <span className="timer-sep">:</span>
                <span className="timer-value">{padZero(s)}</span>
              </div>
            )}

            <div className="timer-controls">
              {timerState === 'running' ? (
                <button className="timer-btn timer-btn-pause" onClick={handlePause} title={t('hover.timer.actions.pause', { defaultValue: '暂停' })}>
                  <img src={SvgIcon.PAUSE} alt={t('hover.timer.actions.pause', { defaultValue: '暂停' })} className="timer-btn-icon" />
                </button>
              ) : timerState === 'paused' ? (
                <button className="timer-btn timer-btn-start" onClick={handleResume} title={t('hover.timer.actions.resume', { defaultValue: '继续' })}>
                  <img src={SvgIcon.CONTINUE} alt={t('hover.timer.actions.resume', { defaultValue: '继续' })} className="timer-btn-icon" />
                </button>
              ) : (
                <button className="timer-btn timer-btn-start" onClick={handleStart} title={t('hover.timer.actions.start', { defaultValue: '开始' })}>
                  <img src={SvgIcon.CONTINUE} alt={t('hover.timer.actions.start', { defaultValue: '开始' })} className="timer-btn-icon" />
                </button>
              )}
              <button className="timer-btn timer-btn-reset" onClick={handleReset} title={t('hover.timer.actions.reset', { defaultValue: '重置' })}>
                <img src={SvgIcon.REVERT} alt={t('hover.timer.actions.reset', { defaultValue: '重置' })} className="timer-btn-icon" />
              </button>
            </div>
          </div>
        </div>
        {activePanel === 'brightness' && <BrightnessControl />}
        {activePanel === 'volume' && <VolumeControl />}
      </div>
    </div>
  );
}
