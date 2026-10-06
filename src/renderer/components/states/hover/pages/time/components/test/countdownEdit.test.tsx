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
 * @file countdownEdit.test.tsx
 * @description CountdownEdit 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, find, invoke, text } from '../../../../../test/tree';

import { CountdownEdit } from '../CountdownEdit';

import { BrightnessControl } from '../BrightnessControl';
import { VolumeControl } from '../VolumeControl';
import type { TreeElement } from '../../../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));
const model = vi.hoisted(() => ({ timerState: 'idle', isEditing: true, inputHours: '01', inputMinutes: '02', inputSeconds: '03', h: 1, m: 2, s: 3, timerInputsRef: { current: null }, handleInputChange: vi.fn(), handleStart: vi.fn(), handlePause: vi.fn(), handleResume: vi.fn(), handleReset: vi.fn() }));
vi.mock('../../hooks/useCountdownEdit', () => ({ useCountdownEdit: () => model }));
beforeEach(() => { model.timerState = 'idle'; model.isEditing = true; });
describe('CountdownEdit', () => {
  it('forwards each edit value together with its bounds', () => { const root = ((CountdownEdit({ activePanel: 'countdown' }) as TreeElement)); const inputs = elements(root).filter((node) => node.type === 'input'); inputs.forEach((input) => invoke(input, 'onChange', { target: { value: '9' } })); expect(model.handleInputChange.mock.calls).toEqual([['9', 'inputHours', 23], ['9', 'inputMinutes', 59], ['9', 'inputSeconds', 59]]); });
  it.each([['idle', 'handleStart'], ['running', 'handlePause'], ['paused', 'handleResume']] as const)('forwards %s timer control', (timerState, handler) => { model.timerState = timerState; const root = ((CountdownEdit({ activePanel: 'countdown' }) as TreeElement)); invoke(find(root, (node) => String(node.props.className).startsWith('timer-btn ') && !String(node.props.className).includes('reset')), 'onClick'); expect(model[handler]).toHaveBeenCalledOnce(); invoke(byClass(root, 'timer-btn-reset'), 'onClick'); expect(model.handleReset).toHaveBeenCalledOnce(); });
  it('renders a padded timer when editing is inactive', () => { model.isEditing = false; const root = ((CountdownEdit({ activePanel: 'countdown' }) as TreeElement)); expect(text(byClass(root, 'timer-display'))).toBe('01:02:03'); expect(elements(root).some((node) => node.type === 'input')).toBe(false); });
  it.each([['brightness', BrightnessControl], ['volume', VolumeControl]] as const)('hides countdown and selects %s control', (activePanel, type) => { const root = ((CountdownEdit({ activePanel }) as TreeElement)); expect(byClass(root, 'timer-main').props.className).toContain('timer-main-hidden'); expect(find(root, (node) => node.type === type)).toBeDefined(); });
});
