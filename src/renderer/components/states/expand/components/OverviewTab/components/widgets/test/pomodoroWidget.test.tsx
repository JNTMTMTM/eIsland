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
 * @file pomodoroWidget.test.tsx
 * @description PomodoroWidget 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, find, invoke, text } from '../../../../../../test/tree';

import { PomodoroWidget } from '../PomodoroWidget';
import type { TreeElement } from '../../../../../../test/tree';
const api = { storeWrite: vi.fn().mockResolvedValue(true) };

const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const model = vi.hoisted(() => ({ store: { pomodoroPhase: 'work', pomodoroRemaining: 1500, pomodoroRunning: false, pomodoroCompletedCount: 0, setPomodoroPhase: vi.fn(), setPomodoroRemaining: vi.fn(), setPomodoroRunning: vi.fn(), setPomodoroCompletedCount: vi.fn() } }));
vi.mock('../../../../../../../../store/slices', () => ({ default: Object.assign(() => model.store, { subscribe: vi.fn(), getState: () => model.store }) }));
vi.mock('../../../../../../../../i18n', () => ({ default: { t: (key: string) => key } }));
beforeEach(() => { model.store.pomodoroPhase = 'work'; model.store.pomodoroRemaining = 1500; model.store.pomodoroRunning = false; model.store.pomodoroCompletedCount = 0; vi.stubGlobal('window', { api }); });
describe('PomodoroWidget', () => {
  it('renders initial work timer without reset-count control', () => { const root = ((PomodoroWidget() as TreeElement)); expect(text(root)).toContain('25:00'); expect(elements(root).some((node) => node.props.className === 'ov-dash-pomodoro-count-reset')).toBe(false); });
  it.each([false, true])('toggles running from %s', (running) => { model.store.pomodoroRunning = running; const root = ((PomodoroWidget() as TreeElement)); const button = find(root, (node) => node.type === 'button' && node.props.title === (running ? 'overview.pomodoro.pause' : 'overview.pomodoro.start')); invoke(button, 'onClick'); expect(model.store.setPomodoroRunning).toHaveBeenCalledWith(!running); });
  it('resets work duration and persists count', () => { model.store.pomodoroCompletedCount = 2; const root = ((PomodoroWidget() as TreeElement)); invoke(find(root, (node) => node.type === 'button' && node.props.title === 'overview.pomodoro.reset'), 'onClick'); expect(model.store.setPomodoroPhase).toHaveBeenCalledWith('work'); expect(model.store.setPomodoroRemaining).toHaveBeenCalledWith(1500); expect(api.storeWrite).toHaveBeenCalledWith('pomodoro-state', { phase: 'work', remaining: 1500, running: false, completedCount: 2 }); });
  it('resets completed count and advances work phase on skip', () => { model.store.pomodoroCompletedCount = 2; const root = ((PomodoroWidget() as TreeElement)); invoke(byClass(root, 'ov-dash-pomodoro-count-reset'), 'onClick'); expect(model.store.setPomodoroCompletedCount).toHaveBeenCalledWith(0); invoke(find(root, (node) => node.type === 'button' && node.props.title === 'overview.pomodoro.skip'), 'onClick'); expect(model.store.setPomodoroPhase).toHaveBeenCalledWith('shortBreak'); expect(model.store.setPomodoroCompletedCount).toHaveBeenCalledWith(3); });
});
