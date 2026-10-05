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
 * @file overviewWidgets.test.tsx
 * @description 验证总览门面全部导出保持实际组件引用。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import * as facade from '../OverviewWidgets';
import * as widgets from '../widgets';

vi.mock('../../../../../../../store/slices', () => ({ default: Object.assign(vi.fn(), { subscribe: vi.fn(), getState: vi.fn() }) }));
vi.mock('../../../../../../../i18n', () => ({ default: { t: (key: string) => key } }));

describe('OverviewWidgets facade', () => {
  it('完整透传全部11个真实控件引用', () => {
    expect(Object.keys(facade).sort()).toEqual(Object.keys(widgets).sort());
    expect(Object.keys(facade)).toHaveLength(11);
    Object.entries(widgets).forEach(([name, component]) => {
      expect(facade[name as keyof typeof facade]).toBe(component);
    });
  });
});
