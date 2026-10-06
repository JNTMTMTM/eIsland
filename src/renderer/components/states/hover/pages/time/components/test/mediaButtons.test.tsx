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
 * @file mediaButtons.test.tsx
 * @description MediaButtons 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { elements, invoke } from '../../../../../test/tree';

import { MediaButtons } from '../MediaButtons';
import type { TreeElement } from '../../../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));

describe('MediaButtons', () => {
  it.each(['countdown', 'brightness', 'volume'] as const)('reflects %s panel and delegates both toggles', (activePanel) => { const onPanelToggle = vi.fn(); const root = ((MediaButtons({ activePanel, onPanelToggle }) as TreeElement)); const buttons = elements(root).filter((node) => node.type === 'button'); expect(buttons.map((node) => node.props['aria-pressed'])).toEqual([activePanel === 'brightness', activePanel === 'volume']); buttons.forEach((button) => invoke(button, 'onClick')); expect(onPanelToggle.mock.calls).toEqual([['brightness'], ['volume']]); });
});
