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
 * @file idleContent.test.tsx
 * @description IdleContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { IdleContent } from '../IdleContent';

import { IdleForm } from '../components/IdleForm';
import type { TreeElement } from '../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));
const model = vi.hoisted(() => ({ useIdle: vi.fn() }));
vi.mock('../hooks/useIdle', () => ({ useIdle: model.useIdle }));
describe('IdleContent', () => {
  it('passes input to idle hook and forwards derived display state', () => { const props = { timeStr: 'time', dayStr: 'day', weather: { temperature: 20 }, timerState: 'idle' as const, remainingSeconds: 0, pomodoroRunning: false, pomodoroRemaining: 0 }; const derived = { ...props, p0Count: 3, isTimerActive: true, h: 1, m: 2, s: 3, padZero: vi.fn() }; model.useIdle.mockReturnValue(derived); const root = ((IdleContent(props) as TreeElement)); expect(model.useIdle).toHaveBeenCalledWith(props); expect(root.type).toBe(IdleForm); expect(root.props).toMatchObject(derived); });
});
