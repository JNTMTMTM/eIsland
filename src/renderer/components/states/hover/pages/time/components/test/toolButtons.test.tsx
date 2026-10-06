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
 * @file toolButtons.test.tsx
 * @description ToolButtons 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { elements, invoke } from '../../../../../test/tree';

import { ToolButtons } from '../ToolButtons';
import type { TreeElement } from '../../../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));

const model = vi.hoisted(() => ({ handleScreenshot: vi.fn(), handleTaskManager: vi.fn() }));
vi.mock('../../hooks/useToolButtons', () => ({ useToolButtons: () => model }));
describe('ToolButtons', () => {
  it('forwards both tool actions and renders accessible icons', () => { const root = ((ToolButtons() as TreeElement)); const buttons = elements(root).filter((node) => node.type === 'button'); expect(buttons).toHaveLength(2); buttons.forEach((button) => invoke(button, 'onClick')); expect(model.handleScreenshot).toHaveBeenCalledOnce(); expect(model.handleTaskManager).toHaveBeenCalledOnce(); expect(elements(root).filter((node) => node.type === 'img').every((node) => typeof node.props.alt === 'string')).toBe(true); });
});
