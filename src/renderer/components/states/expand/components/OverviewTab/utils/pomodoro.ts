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
 * @file pomodoro.ts
 * @description 番茄钟状态转换与格式化工具函数。
 * @author 鸡哥
 */

import type { PomodoroPhase } from './types';

/** 根据当前阶段和已完成计数，计算下一个番茄钟阶段与更新后的计数。 */
export function advancePomodoroPhase(
  phase: PomodoroPhase,
  count: number,
): { nextPhase: PomodoroPhase; nextCount: number } {
  if (phase === 'work') {
    const nextCount = count + 1;
    const nextPhase: PomodoroPhase = nextCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    return { nextPhase, nextCount };
  }
  return { nextPhase: 'work', nextCount: count };
}

/** 获取番茄钟时间线上下文（前一阶段与下一阶段）。 */
export function getPomodoroTimeline(
  phase: PomodoroPhase,
  count: number,
): { prev: PomodoroPhase | null; next: PomodoroPhase } {
  if (phase === 'work') {
    const prev: PomodoroPhase | null = count === 0 ? null : count % 4 === 0 ? 'longBreak' : 'shortBreak';
    const nextCount = count + 1;
    const next: PomodoroPhase = nextCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    return { prev, next };
  }
  return { prev: 'work', next: 'work' };
}

/** 将秒数格式化为 mm:ss 字符串。 */
export function fmtPomodoroTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
