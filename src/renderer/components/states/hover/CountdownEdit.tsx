/**
 * @file CountdownEdit.tsx
 * @description 可编辑计时器组件，支持设置时间、开始、暂停、重置
 * @author 鸡哥
 */

import React, { useState, useEffect, useCallback } from 'react';

type TimerState = 'idle' | 'running' | 'paused';

function padZero(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

/**
 * 可编辑计时器组件
 * @description 位于时间和农历左侧，直接显示输入框，支持开始、暂停、重置
 */
export function CountdownEdit(): React.ReactElement {
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [inputHours, setInputHours] = useState('00');
  const [inputMinutes, setInputMinutes] = useState('00');
  const [inputSeconds, setInputSeconds] = useState('00');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (timerState === 'running' && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setTimerState('idle');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState, remainingSeconds]);

  const handleInputChange = useCallback((
    value: string,
    setter: (v: string) => void,
    max: number
  ) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num <= max) {
      setter(value.padStart(2, '0'));
    } else if (value === '') {
      setter('00');
    }
  }, []);

  const handleStart = useCallback(() => {
    const h = parseInt(inputHours, 10) || 0;
    const m = parseInt(inputMinutes, 10) || 0;
    const s = parseInt(inputSeconds, 10) || 0;
    const total = h * 3600 + m * 60 + s;

    if (total > 0) {
      setRemainingSeconds(total);
      setTimerState('running');
    }
  }, [inputHours, inputMinutes, inputSeconds]);

  const handlePause = useCallback(() => {
    setTimerState('paused');
  }, []);

  const handleResume = useCallback(() => {
    if (remainingSeconds > 0) {
      setTimerState('running');
    }
  }, [remainingSeconds]);

  const handleReset = useCallback(() => {
    setTimerState('idle');
    setRemainingSeconds(0);
    setInputHours('00');
    setInputMinutes('00');
    setInputSeconds('00');
  }, []);

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
      <div className="timer-main">
        {isEditing ? (
          <div className="timer-inputs">
            <input
              type="text"
              className="timer-input"
              value={inputHours}
              onChange={(e) => handleInputChange(e.target.value, setInputHours, 23)}
              maxLength={2}
            />
            <span className="timer-sep">:</span>
            <input
              type="text"
              className="timer-input"
              value={inputMinutes}
              onChange={(e) => handleInputChange(e.target.value, setInputMinutes, 59)}
              maxLength={2}
            />
            <span className="timer-sep">:</span>
            <input
              type="text"
              className="timer-input"
              value={inputSeconds}
              onChange={(e) => handleInputChange(e.target.value, setInputSeconds, 59)}
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
            <button className="timer-btn timer-btn-pause" onClick={handlePause}>⏸</button>
          ) : timerState === 'paused' ? (
            <button className="timer-btn timer-btn-start" onClick={handleResume}>▶</button>
          ) : (
            <button className="timer-btn timer-btn-start" onClick={handleStart}>▶</button>
          )}
          <button className="timer-btn timer-btn-reset" onClick={handleReset}>↺</button>
        </div>
      </div>
    </div>
  );
}
