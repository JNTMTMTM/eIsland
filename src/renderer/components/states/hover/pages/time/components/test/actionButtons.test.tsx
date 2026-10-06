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
 * @file actionButtons.test.tsx
 * @description ActionButtons 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { elements, invoke } from '../../../../../test/tree';

import { ActionButtons } from '../ActionButtons';
import type { TreeElement } from '../../../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));

const model = vi.hoisted(() => ({ handleHide: vi.fn(), handleQuit: vi.fn() }));
vi.mock('../../hooks/useActionButtons', () => ({ useActionButtons: () => model }));
describe('ActionButtons', () => {
  it('forwards both tool actions and renders accessible icons', () => { const root = ((ActionButtons({}) as TreeElement)); const buttons = elements(root).filter((node) => node.type === 'button'); expect(buttons).toHaveLength(2); buttons.forEach((button) => invoke(button, 'onClick')); expect(model.handleHide).toHaveBeenCalledOnce(); expect(model.handleQuit).toHaveBeenCalledOnce(); expect(elements(root).filter((node) => node.type === 'img').every((node) => typeof node.props.alt === 'string')).toBe(true); });
  it('respects supplied icon overrides', () => { const root = ((ActionButtons({ hideIcon: 'hide.svg', powerOffIcon: 'quit.svg' }) as TreeElement)); expect(elements(root).filter((node) => node.type === 'img').map((node) => node.props.src)).toEqual(['hide.svg', 'quit.svg']); });
});
