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
 * @file brightnessControl.test.tsx
 * @description BrightnessControl 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { byClass, invoke, text } from '../../../../../test/tree';

import { BrightnessControl } from '../BrightnessControl';
import type { TreeElement } from '../../../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));

const model = vi.hoisted(() => ({ brightness: 50, isAvailable: true, handleBrightnessChange: vi.fn() }));
vi.mock('../../hooks/useBrightness', () => ({ useBrightness: () => model }));
describe('BrightnessControl', () => {
  it.each([0, 50, 100])('renders boundary value %i and forwards slider event', (value) => { model.brightness = value; model.isAvailable = true; const root = ((BrightnessControl() as TreeElement)); const input = byClass(root, 'brightness-slider'); expect(input.props).toMatchObject({ value, min: '0', max: '100', step: '1', disabled: false }); expect(text(root)).toContain(`${value}%`); const event = { target: { value: '25' } }; invoke(input, 'onChange', event); expect(model.handleBrightnessChange).toHaveBeenCalledWith(event); });
  it('disables unavailable system control', () => { model.isAvailable = false; const root = ((BrightnessControl() as TreeElement)); expect(byClass(root, 'brightness-slider').props.disabled).toBe(true); expect(text(root)).toContain('hover.brightness.unavailable'); });
});
