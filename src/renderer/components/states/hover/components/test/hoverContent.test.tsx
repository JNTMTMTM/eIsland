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
 * @file hoverContent.test.tsx
 * @description HoverContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { translate } from '../../../test/tree';

import { HoverContent } from '../HoverContent';

import { HoverForm } from '../HoverForm';
import type { TreeElement } from '../../../test/tree';
vi.mock('../../../../../store/slices', () => ({ default: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));
const model = vi.hoisted(() => ({ useHover: vi.fn() }));
vi.mock('../../hooks/useHover', () => ({ useHover: model.useHover }));
describe('HoverContent', () => {
  it('forwards source props and all derived hover actions', () => { const props = { fullTimeStr: '12:34:56', lunarStr: 'lunar' }; const derived = { ...props, t: translate, hoverTab: 'weather', setHoverTab: vi.fn(), setExpanded: vi.fn(), contentRef: { current: null }, getDotLabel: vi.fn() }; model.useHover.mockReturnValue(derived); const root = ((HoverContent(props) as TreeElement)); expect(model.useHover).toHaveBeenCalledWith(props); expect(root.type).toBe(HoverForm); expect(root.props).toEqual(derived); });
});
