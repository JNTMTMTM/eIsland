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
 * @file PomodoroWidget.tsx
 * @description Overview 番茄钟小组件，支持工作/休息计时、轮次进度与控制操作。
 * @author 鸡哥
 */

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../../../../../../i18n';
import useIslandStore from '../../../../../../../store/slices';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
import {
  POMODORO_DURATIONS,
  POMODORO_LABELS,
  POMODORO_STORE_KEY,
  advancePomodoroPhase,
  fmtPomodoroTime,
  getPomodoroTimeline,
  type PomodoroData,
  type PomodoroPhase,
} from '../../utils/overviewUtils';

let pomodoroInitialized = false;
let pomodoroIntervalId: ReturnType<typeof setInterval> | null = null;
let prevPomodoroRunning = false;

function persistPomodoro(phase: PomodoroPhase, remaining: number, count: number): void {
  const payload: PomodoroData = { phase, remaining, running: false, completedCount: count };
  window.api.storeWrite(POMODORO_STORE_KEY, payload).catch(() => {});
}

function startPomodoroInterval(): void {
  if (pomodoroIntervalId !== null) return;
  pomodoroIntervalId = setInterval(() => {
    const store = useIslandStore.getState();
    const current = store.pomodoroRemaining;
    if (current <= 1) {
      clearInterval(pomodoroIntervalId!);
      pomodoroIntervalId = null;
      const finishedPhase = store.pomodoroPhase;
      const { nextPhase, nextCount } = advancePomodoroPhase(store.pomodoroPhase, store.pomodoroCompletedCount);
      const nextRemaining = POMODORO_DURATIONS[nextPhase];
      store.setPomodoroRunning(false);
      store.setPomodoroPhase(nextPhase);
      store.setPomodoroRemaining(nextRemaining);
      store.setPomodoroCompletedCount(nextCount);
      store.setNotification({
        title: i18n.t('notification.pomodoro.title', { defaultValue: '番茄钟' }),
        body: finishedPhase === 'work'
          ? i18n.t('notification.pomodoro.workFinished', { defaultValue: '专注时间结束，开始休息吧' })
          : i18n.t('notification.pomodoro.breakFinished', { defaultValue: '休息时间结束，开始专注吧' }),
        icon: SvgIcon.POMODORO,
      });
      persistPomodoro(nextPhase, nextRemaining, nextCount);
    } else {
      store.setPomodoroRemaining(current - 1);
    }
  }, 1000);
}

function stopPomodoroInterval(): void {
  if (pomodoroIntervalId !== null) {
    clearInterval(pomodoroIntervalId);
    pomodoroIntervalId = null;
  }
}

useIslandStore.subscribe((state) => {
  const running = state.pomodoroRunning;
  if (running === prevPomodoroRunning) return;
  prevPomodoroRunning = running;
  if (running) {
    startPomodoroInterval();
  } else {
    stopPomodoroInterval();
  }
});

/** 番茄钟小组件，支持工作/休息计时、轮次进度与控制操作。 */
export function PomodoroWidget(): React.ReactElement {
  const { t } = useTranslation();
  const {
    pomodoroPhase: phase,
    pomodoroRemaining: remaining,
    pomodoroRunning: running,
    pomodoroCompletedCount: completedCount,
    setPomodoroPhase: setPhase,
    setPomodoroRemaining: setRemaining,
    setPomodoroRunning: setRunning,
    setPomodoroCompletedCount: setCompletedCount,
  } = useIslandStore();

  useEffect(() => {
    if (pomodoroInitialized) return;
    pomodoroInitialized = true;
    window.api.storeRead(POMODORO_STORE_KEY).then((data) => {
      if (!data) return;
      const d = data as PomodoroData;
      if (d.phase) setPhase(d.phase);
      if (typeof d.remaining === 'number') setRemaining(d.remaining);
      if (typeof d.completedCount === 'number') setCompletedCount(d.completedCount);
    }).catch(() => {});
  }, [setPhase, setRemaining, setCompletedCount]);

  const totalDuration = POMODORO_DURATIONS[phase];
  const progress = 1 - remaining / totalDuration;
  const circumference = 2 * Math.PI * 38;
  const dashOffset = circumference * (1 - progress);

  const handleStartPause = (): void => {
    setRunning(!running);
  };

  const handleReset = (): void => {
    const resetPhase: PomodoroPhase = 'work';
    const resetRemaining = POMODORO_DURATIONS[resetPhase];
    setRunning(false);
    setPhase(resetPhase);
    setRemaining(resetRemaining);
    persistPomodoro(resetPhase, resetRemaining, completedCount);
  };

  const handleResetCount = (): void => {
    const resetPhase: PomodoroPhase = 'work';
    const resetRemaining = POMODORO_DURATIONS[resetPhase];
    setRunning(false);
    setPhase(resetPhase);
    setRemaining(resetRemaining);
    setCompletedCount(0);
    persistPomodoro(resetPhase, resetRemaining, 0);
  };

  const handleSkip = (): void => {
    setRunning(false);
    const { nextPhase, nextCount } = advancePomodoroPhase(phase, completedCount);
    setPhase(nextPhase);
    setCompletedCount(nextCount);
    const nextRemaining = POMODORO_DURATIONS[nextPhase];
    setRemaining(nextRemaining);
    persistPomodoro(nextPhase, nextRemaining, nextCount);
  };

  const phaseColor = phase === 'work' ? '#ff6b6b' : phase === 'shortBreak' ? '#51cf66' : '#339af0';
  const { prev: prevPhase, next: nextPhase } = getPomodoroTimeline(phase, completedCount);

  return (
    <div className="ov-dash-widget ov-dash-pomodoro-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title">{t('overview.pomodoro.title', { defaultValue: '番茄钟' })}</span>
        <span className="ov-dash-pomodoro-count" title={t('overview.pomodoro.completedTitle', { defaultValue: '已完成番茄数' })}>
          <img src={SvgIcon.POMODORO} alt={t('overview.pomodoro.tomato', { defaultValue: '番茄' })} className="ov-dash-pomodoro-icon" />
          {completedCount}
          {completedCount > 0 && (
            <button className="ov-dash-pomodoro-count-reset" onClick={handleResetCount} type="button" title={t('overview.pomodoro.resetCount', { defaultValue: '重置计数' })}>
              <img src={SvgIcon.REVERT} alt={t('overview.pomodoro.reset', { defaultValue: '重置' })} className="ov-dash-pomodoro-count-reset-icon" />
            </button>
          )}
        </span>
      </div>
      <div className="ov-dash-pomodoro-body">
        <div className="ov-dash-pomodoro-ring-wrap">
          <svg className="ov-dash-pomodoro-ring" viewBox="0 0 84 84">
            <circle className="ov-dash-pomodoro-ring-bg" cx="42" cy="42" r="38" />
            <circle
              className="ov-dash-pomodoro-ring-progress"
              cx="42"
              cy="42"
              r="38"
              style={{ stroke: phaseColor, strokeDasharray: circumference, strokeDashoffset: dashOffset }}
            />
          </svg>
          <div className="ov-dash-pomodoro-ring-inner">
            <div className="ov-dash-pomodoro-time">{fmtPomodoroTime(remaining)}</div>
            <div className="ov-dash-pomodoro-phase" style={{ color: phaseColor }}>{t(`overview.pomodoro.phases.${phase}`, { defaultValue: POMODORO_LABELS[phase] })}</div>
          </div>
        </div>

        <div className="ov-dash-pomodoro-timeline" key={`${phase}-${completedCount}`}>
          <div className={`ov-dash-pomodoro-tl-item${!prevPhase ? ' ov-dash-pomodoro-tl-item--empty' : ''}`}>
            {prevPhase && (
              <>
                <div className="ov-dash-pomodoro-tl-dot" />
                <div className="ov-dash-pomodoro-tl-info">
                  <span className="ov-dash-pomodoro-tl-name">{t(`overview.pomodoro.phases.${prevPhase}`, { defaultValue: POMODORO_LABELS[prevPhase] })}</span>
                  <span className="ov-dash-pomodoro-tl-dur">{POMODORO_DURATIONS[prevPhase] / 60}m</span>
                </div>
              </>
            )}
          </div>
          <div className="ov-dash-pomodoro-tl-item ov-dash-pomodoro-tl-item--current">
            <div className="ov-dash-pomodoro-tl-dot ov-dash-pomodoro-tl-dot--current" style={{ background: phaseColor, boxShadow: `0 0 5px ${phaseColor}99` }} />
            <div className="ov-dash-pomodoro-tl-info">
              <span className="ov-dash-pomodoro-tl-name ov-dash-pomodoro-tl-name--current">{t(`overview.pomodoro.phases.${phase}`, { defaultValue: POMODORO_LABELS[phase] })}</span>
              <span className="ov-dash-pomodoro-tl-dur ov-dash-pomodoro-tl-dur--current" style={{ color: phaseColor }}>{fmtPomodoroTime(remaining)}</span>
            </div>
          </div>
          <div className="ov-dash-pomodoro-tl-item">
            <div className="ov-dash-pomodoro-tl-dot" />
            <div className="ov-dash-pomodoro-tl-info">
              <span className="ov-dash-pomodoro-tl-name">{t(`overview.pomodoro.phases.${nextPhase}`, { defaultValue: POMODORO_LABELS[nextPhase] })}</span>
              <span className="ov-dash-pomodoro-tl-dur">{POMODORO_DURATIONS[nextPhase] / 60}m</span>
            </div>
          </div>
        </div>

        <div className="ov-dash-pomodoro-controls">
          <button className="ov-dash-pomodoro-btn" onClick={handleStartPause} type="button" title={running ? t('overview.pomodoro.pause', { defaultValue: '暂停' }) : t('overview.pomodoro.start', { defaultValue: '开始' })}>
            <img src={running ? SvgIcon.PAUSE : SvgIcon.CONTINUE} alt={running ? t('overview.pomodoro.pause', { defaultValue: '暂停' }) : t('overview.pomodoro.start', { defaultValue: '开始' })} className="ov-dash-pomodoro-btn-icon" />
          </button>
          <button className="ov-dash-pomodoro-btn" onClick={handleReset} type="button" title={t('overview.pomodoro.reset', { defaultValue: '重置' })}>
            <img src={SvgIcon.REVERT} alt={t('overview.pomodoro.reset', { defaultValue: '重置' })} className="ov-dash-pomodoro-btn-icon" />
          </button>
          <button className="ov-dash-pomodoro-btn" onClick={handleSkip} type="button" title={t('overview.pomodoro.skip', { defaultValue: '跳过' })}>
            <img src={SvgIcon.NEXT_SONG} alt={t('overview.pomodoro.skip', { defaultValue: '跳过' })} className="ov-dash-pomodoro-btn-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}
