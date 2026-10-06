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
 * @file getNavLabel.test.ts
 * @description 导航标签在真实配置规范化后的合法导航集合与损坏持久化输入测试。
 * @author 鸡哥
 */

import { expect, it } from 'vitest';
import { getDefaultNavLabel } from '../getNavLabel';
import { normalizeMaxExpandNavLayoutConfig } from '../../components/setting/utils/settingsConfig';
import type { NavDotId } from '../../config/shellConstants';

it('损坏缓存经白名单规范化后只产生具有默认中文标签的导航', () => {
  const layout = normalizeMaxExpandNavLayoutConfig([
    null, false, { id: 'unknown-navigation', visible: true },
    { id: 'memo', visible: true }, { id: 'todo', visible: false },
  ]);
  expect(layout[0]).toEqual({ id: 'memo', visible: true });
  expect(layout.some((item) => String(item.id) === 'unknown-navigation')).toBe(false);
  expect(getDefaultNavLabel('expanded')).toBe('返回');
  expect(getDefaultNavLabel('settings')).toBe('设置');
  expect(getDefaultNavLabel('memo')).toBe('备忘录');
  layout.forEach(({ id }) => {
    // 与真实 Shell 相同：转换发生在内部白名单规范化之后。
    const navId = id as NavDotId;
    expect(getDefaultNavLabel(navId)).toBeTypeOf('string');
    expect(getDefaultNavLabel(navId)).not.toBe(id);
  });
});
