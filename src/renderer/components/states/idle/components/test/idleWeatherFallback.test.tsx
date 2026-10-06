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
 * @file idleWeatherFallback.test.tsx
 * @description 待机组件缺少天气描述时的占位文案与温度保留测试。
 * @author 鸡哥
 */

import { expect, it } from 'vitest';
import { text } from '../../../test/tree';
import { IdleForm } from '../IdleForm';

it('缺少天气描述时显示破折号并保留有效温度', () => {
  const props: Parameters<typeof IdleForm>[0] = {
    timeStr: '12:34', dayStr: 'Tue', weather: { temperature: 21 },
    timerState: 'idle', remainingSeconds: 0, pomodoroRunning: false, pomodoroRemaining: 0,
    isMusicPlaying: false, coverImage: null, isPlaying: false, musicOuterGlowEffectEnabled: true,
    isTimerActive: false, isPomodoroActive: false, p0Count: 0,
    h: 0, m: 0, s: 0, pomodoroM: 0, pomodoroS: 0, r: 0, g: 0, b: 0,
    padZero: (value: number) => String(value).padStart(2, '0'),
    t: ((key: string) => key) as Parameters<typeof IdleForm>[0]['t'],
  };
  expect(text(IdleForm(props))).toContain('—21°');
});
