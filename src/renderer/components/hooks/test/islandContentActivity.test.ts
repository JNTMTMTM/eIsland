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
 * @file islandContentActivity.test.ts
 * @description 页面活跃上下文真实 Provider 与独立窗口默认值测试。
 * @author 鸡哥
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IslandContentActivityContext, useIslandContentActive } from '../islandContentActivity';

/**
 * 将真实公开 Hook 的上下文值渲染为可断言状态。
 * @returns 活跃状态标记。
 */
function ActivityProbe() {
  const active = useIslandContentActive();
  return createElement('span', { 'data-active': active }, active ? 'active' : 'paused');
}

describe('content activity context', () => {
  it('defaults to active for a page without a surrounding transition', () => {
    expect(renderToStaticMarkup(createElement(ActivityProbe))).toBe('<span data-active="true">active</span>');
  });
  it.each([true, false])('reads actual Provider state active=%s', (value) => {
    const tree = createElement(IslandContentActivityContext.Provider, { value }, createElement(ActivityProbe));
    expect(renderToStaticMarkup(tree)).toBe(value ? '<span data-active="true">active</span>' : '<span data-active="false">paused</span>');
  });
});
