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
 * @file useWheelNavigation.test.ts
 * @description 滚轮导航兼容导出的真实调用及无副作用契约测试。
 * @author 鸡哥
 */

import { expect, it, vi } from 'vitest';
import { shouldIgnoreWheelEvent, useWheelNavigation } from '../useWheelNavigation';
import type { MaxExpandTab } from '../../../../../store/types';
import type { NavDotId } from '../../config/shellConstants';

it('兼容 Hook 不重复注册 Shell 已内联的导航逻辑，也不修改公开引用', () => {
  const contentRef = { current: null };
  const activeTabRef = { current: 'todo' as MaxExpandTab };
  const filteredNavDotsRef = { current: [{ id: 'todo' as NavDotId, label: '待办' }] };
  const navigate = vi.fn<(id: NavDotId) => void>();
  expect(useWheelNavigation(contentRef, activeTabRef, filteredNavDotsRef, navigate, [])).toBeUndefined();
  expect(contentRef.current).toBeNull();
  expect(activeTabRef.current).toBe('todo');
  expect(filteredNavDotsRef.current).toEqual([{ id: 'todo', label: '待办' }]);
  expect(navigate).not.toHaveBeenCalled();
});

it('滚轮目标通过原生 closest 区分可编辑区和普通导航区', () => {
  const closest = vi.fn<(selector: string) => Element | null>().mockReturnValue(null);
  const target = { closest } as unknown as HTMLElement;
  expect(shouldIgnoreWheelEvent(target)).toBe(false);
  expect(closest).toHaveBeenCalledWith('.expand-todo-list');
  closest.mockImplementation((selector) => selector === '.clipboard-history-list' ? target : null);
  expect(shouldIgnoreWheelEvent(target)).toBe(true);
});
