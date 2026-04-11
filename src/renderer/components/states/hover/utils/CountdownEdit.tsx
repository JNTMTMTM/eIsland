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

import React, { useCallback } from 'react';
import useIslandStore from '../../../../store/slices';
import { SvgIcon } from '../../../../utils/SvgIcon';
import { ToolButtons } from './ToolButtons';

type TimerState = 'idle' | 'running' | 'paused';

function padZero(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

/**
 * 可编辑计时器组件
 * @description 位于时间和农历左侧，直接显示输入框，支持开始、暂停、重置
 * 倒计时逻辑由 DynamicIsland 全局管理，此组件仅负责 UI 展示和用户交互
 */
export function CountdownEdit(): React.ReactElement {
  const { timerData, setTimerData } = useIslandStore();

  const timerState: TimerState = timerData?.state ?? 'idle';
  const remainingSeconds: number = timerData?.remainingSeconds ?? 0;
  const inputHours: string = timerData?.inputHours ?? '00';
  const inputMinutes: string = timerData?.inputMinutes ?? '00';
  const inputSeconds: string = timerData?.inputSeconds ?? '00';

  const handleInputChange = useCallback((
    value: string,
    setter: 'inputHours' | 'inputMinutes' | 'inputSeconds',
    max: number
  ) => {
    const num = parseInt(value, 10);
    const newValue = (!isNaN(num) && num <= max)
      ? value.padStart(2, '0')
      : (value === '' ? '00' : timerData?.[setter] ?? '00');

    setTimerData({ [setter]: newValue });
  }, [timerData, setTimerData]);

  const handleWheelChange = useCallback((
    e: React.WheelEvent<HTMLInputElement>,
    setter: 'inputHours' | 'inputMinutes' | 'inputSeconds',
    max: number
  ) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    const currentStr = timerData?.[setter] ?? '00';
    const current = parseInt(currentStr, 10) || 0;
    let next = current + delta;
    if (next < 0) next = max;
    if (next > max) next = 0;
    setTimerData({ [setter]: padZero(next) });
  }, [timerData, setTimerData]);

  const handleStart = useCallback(() => {
    const h = parseInt(inputHours, 10) || 0;
    const m = parseInt(inputMinutes, 10) || 0;
    const s = parseInt(inputSeconds, 10) || 0;
    const total = h * 3600 + m * 60 + s;

    if (total > 0) {
      setTimerData({
        state: 'running',
        remainingSeconds: total,
      });
    }
  }, [inputHours, inputMinutes, inputSeconds, setTimerData]);

  const handlePause = useCallback(() => {
    setTimerData({ state: 'paused' });
  }, [setTimerData]);

  const handleResume = useCallback(() => {
    if (remainingSeconds > 0) {
      setTimerData({ state: 'running' });
    }
  }, [remainingSeconds, setTimerData]);

  const handleReset = useCallback(() => {
    setTimerData({
      state: 'idle',
      remainingSeconds: 0,
      inputHours: '00',
      inputMinutes: '00',
      inputSeconds: '00',
    });
  }, [setTimerData]);

  const getTimeParts = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return { h, m, s };
  };

  const { h, m, s } = getTimeParts(remainingSeconds);
  const isEditing = timerState === 'idle';

  return (
    <div className="timer-container">
      <ToolButtons />

      <div className="timer-tools-divider" />

      <div className="timer-main">
        <div className="timer-title-row">
          <div className="timer-title">
            <span className="text-[10px] text-[var(--color-island-text)] leading-tight">倒计时</span>
          </div>
          <span className="text-[10px] text-[var(--color-island-text)] opacity-60 leading-tight ml-2">滚动滚轮编辑时间</span>
        </div>
        <div className="timer-main-row">
          {isEditing ? (
            <div className="timer-inputs">
            <input
              type="text"
              className="timer-input"
              value={inputHours}
              onChange={(e) => handleInputChange(e.target.value, 'inputHours', 23)}
              onWheel={(e) => handleWheelChange(e, 'inputHours', 23)}
              maxLength={2}
            />
            <span className="timer-sep">:</span>
            <input
              type="text"
              className="timer-input"
              value={inputMinutes}
              onChange={(e) => handleInputChange(e.target.value, 'inputMinutes', 59)}
              onWheel={(e) => handleWheelChange(e, 'inputMinutes', 59)}
              maxLength={2}
            />
            <span className="timer-sep">:</span>
            <input
              type="text"
              className="timer-input"
              value={inputSeconds}
              onChange={(e) => handleInputChange(e.target.value, 'inputSeconds', 59)}
              onWheel={(e) => handleWheelChange(e, 'inputSeconds', 59)}
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
            <button className="timer-btn timer-btn-pause" onClick={handlePause} title="暂停">
              <img src={SvgIcon.PAUSE} alt="暂停" className="timer-btn-icon" />
            </button>
          ) : timerState === 'paused' ? (
            <button className="timer-btn timer-btn-start" onClick={handleResume} title="继续">
              <img src={SvgIcon.CONTINUE} alt="继续" className="timer-btn-icon" />
            </button>
          ) : (
            <button className="timer-btn timer-btn-start" onClick={handleStart} title="开始">
              <img src={SvgIcon.CONTINUE} alt="开始" className="timer-btn-icon" />
            </button>
          )}
          <button className="timer-btn timer-btn-reset" onClick={handleReset} title="重置">
            <img src={SvgIcon.REVERT} alt="重置" className="timer-btn-icon" />
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
