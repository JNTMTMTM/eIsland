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
 * @file idleForm.test.tsx
 * @description IdleForm 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { byClass, elements, text, translate } from '../../../test/tree';

import { IdleForm } from '../IdleForm';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));

function fixture() { return { timeStr: '12:34', dayStr: 'Monday', weather: { temperature: 25, description: 'Clear' }, t: translate, isMusicPlaying: false, coverImage: '', isPlaying: false, musicOuterGlowEffectEnabled: true, isTimerActive: false, isPomodoroActive: false, p0Count: 0, h: 1, m: 2, s: 3, pomodoroM: 24, pomodoroS: 59, r: 10, g: 20, b: 30, padZero: (value: number) => String(value).padStart(2, '0') }; }
function render(props = fixture()) { return ((IdleForm(props as unknown as Parameters<typeof IdleForm>[0]) as TreeElement)); }
describe('IdleForm', () => {
  it('renders idle clock and weather without album art', () => { const root = render(); expect(text(root)).toContain('12:34Monday'); expect(text(root)).toContain('25°'); expect(elements(root).some((node) => String(node.props.className).includes('idle-album-cover'))).toBe(false); });
  it('prioritizes countdown above pomodoro, todo and weather', () => { const props = fixture(); props.isTimerActive = true; props.isPomodoroActive = true; props.p0Count = 4; expect(text(render(props))).toContain('01:02:03'); expect(text(render(props))).not.toContain('P0-TODO'); props.isTimerActive = false; expect(text(render(props))).toContain('24:59'); props.isPomodoroActive = false; expect(text(render(props))).toContain('P0-TODO4'); });
  it('renders zero weather temperature fallback', () => { const props = fixture(); props.weather.temperature = 0; expect(text(render(props))).toContain('--°'); });
  it('reflects playback, paused glow and disabled outer effect', () => { const props = fixture(); props.isMusicPlaying = true; props.coverImage = 'cover.jpg'; const paused = render(props); expect(byClass(paused, 'idle-glow').props.className).toContain('paused'); expect(byClass(paused, 'idle-album-cover').props.className).toContain('glowing'); props.isPlaying = true; expect(byClass(render(props), 'idle-album-cover').props.className).not.toContain('paused'); props.musicOuterGlowEffectEnabled = false; expect(byClass(render(props), 'idle-glow').props.style).toBeUndefined(); expect(byClass(render(props), 'idle-album-cover').props.className).not.toContain('glowing'); });
});
