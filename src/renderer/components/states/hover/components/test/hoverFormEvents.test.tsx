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
 * @file hoverFormEvents.test.tsx
 * @description 悬浮页真实内容点击事件的传播拦截与导航回调隔离测试。
 * @author 鸡哥
 */

import { createInstance } from 'i18next';
import { describe, expect, it, vi } from 'vitest';
import { findElement, invoke } from '../../../../test/elementHarness';
import { HoverForm } from '../HoverForm';

vi.hoisted(() => {
  const localStorage = { getItem: () => null, setItem: () => undefined };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: Object.assign(new EventTarget(), {
    localStorage, api: {}, location: { hostname: 'localhost' },
    matchMedia: () => ({ matches: false, addEventListener: () => undefined }),
  }) });
});
const i18n = createInstance();
await i18n.init({ lng: 'zh-CN', resources: {}, fallbackLng: false });

describe('悬浮页公开事件', () => {
  it('点击内容体拦截冒泡且不切换页面或展开岛', () => {
    const setHoverTab = vi.fn();
    const setExpanded = vi.fn();
    const tree = HoverForm({ setHoverTab, setExpanded, fullTimeStr: '10:00', lunarStr: '初一',
      t: i18n.t, hoverTab: 'time', contentRef: { current: null }, getDotLabel: (tab) => tab });
    const stopPropagation = vi.fn();
    invoke(findElement(tree, (node) => node.props.className === 'hover-tab-content'), 'onClick', { stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(setHoverTab).not.toHaveBeenCalled();
    expect(setExpanded).not.toHaveBeenCalled();
  });
});
