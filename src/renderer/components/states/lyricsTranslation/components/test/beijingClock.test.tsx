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
 * @file beijingClock.test.tsx
 * @description BeijingClock 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { BeijingClock } from '../BeijingClock';
import type { TreeElement } from '../../../test/tree';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));

describe('BeijingClock', () => {
  it.each([[false, '12:34'], [true, null], [true, '']] as const)('omits disabled or empty clock', (clockEnabled, clockText) => { expect(((BeijingClock({ clockEnabled, clockText }) as TreeElement))).toBeNull(); });
  it('renders enabled clock text', () => { const root = ((BeijingClock({ clockEnabled: true, clockText: '12:34' }) as TreeElement)); expect(root?.props).toEqual({ className: 'lyrics-time', children: '12:34' }); });
});
