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
 * @file expandUtils.test.ts
 * @description 展开状态导航点序列、可见页筛选、切换方向与加载页推导测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { buildNavDots, getVisibleExpandTabs, resolveLoadingTab, resolveSlideDirection } from '../expandUtils';

describe('expandUtils', () => {
  it('导航点以 hover 开头，跳过隐藏页，最大展开入口仅在可用时追加', () => {
    const layout = [{ id: 'overview', visible: true }, { id: 'song', visible: false }, { id: 'tools', visible: true }];
    expect(buildNavDots(layout, true)).toEqual(['hover', 'overview', 'tools', 'maxExpand']);
    expect(buildNavDots(layout, false)).toEqual(['hover', 'overview', 'tools']);
    expect(buildNavDots([], false)).toEqual(['hover']);
  });

  it('可见展开页排除 hover 与最大展开入口', () => {
    expect(getVisibleExpandTabs(['hover', 'song', 'maxExpand'])).toEqual(['song']);
  });

  it('按导航点顺序判断方向，原地切换视为前进', () => {
    const dots = buildNavDots([{ id: 'overview', visible: true }, { id: 'song', visible: true }], true);
    expect(resolveSlideDirection(dots, 'overview', 'song')).toBe('right');
    expect(resolveSlideDirection(dots, 'song', 'overview')).toBe('left');
    expect(resolveSlideDirection(dots, 'song', 'song')).toBe('right');
  });

  it('hover 的加载反馈回退为总览，其余页保持不变', () => {
    expect(resolveLoadingTab('hover')).toBe('overview');
    expect(resolveLoadingTab('agentUsage')).toBe('agentUsage');
  });
});
