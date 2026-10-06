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
 * @file expandLayoutSettingsInteractions.test.ts
 * @description 展开布局真实拖拽排序、可见性切换、固定总览及损坏公共数组边界回归。
 * @author 鸡哥
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpandLayoutSettingsPage } from '../ExpandLayoutSettingsPage';
import { elementProps, elements, findElement, invoke } from '../../../../../../../../test/elementHarness';
import { DEFAULT_EXPAND_NAV_LAYOUT } from '../../../../utils/settingsConfig';
import { renderWithHooks, resetLifecycle } from './themeHookHarness';
import type { ComponentProps } from 'react';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./themeHookHarness')).lifecycleHooks
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: {
      defaultValue?: string;
    }) => options?.defaultValue ?? key
  })
}));
let props: ComponentProps<typeof ExpandLayoutSettingsPage>;
/**
 * 执行真实展开布局组件。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => ExpandLayoutSettingsPage(props));
}
/**
 * 收集实际可拖拽行。
 * @returns 当前实际行集合。
 */
function rows() {
  return elements(render()).filter((node) => elementProps(node).draggable === true);
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  props = {
    expandNavLayout: [{
      id: 'song',
      visible: true
    }, {
      id: 'tools',
      visible: false
    }, {
      id: 'unknown-runtime-tab',
      visible: true
    }],
    updateExpandNavLayout: vi.fn()
  };
  vi.mocked(props.updateExpandNavLayout).mockImplementation((value) => {
    props.expandNavLayout = value;
  });
});
describe('真实排序与可见性', () => {
  it('空布局仍显示控制，未知运行时ID使用自身作标签', () => {
    expect(elements(render()).filter((node) => elementProps(node).title === 'unknown-runtime-tab')).toHaveLength(1);
    props.expandNavLayout = [];
    expect(rows()).toHaveLength(0);
    expect(elements(render()).some((node) => elementProps(node).className === 'maxexpand-layout-reset-btn')).toBe(true);
  });
  it('可见切换保留其它项，恢复默认使用独立数组', () => {
    const toggles = () => elements(render()).filter((node) => String(elementProps(node).className).startsWith('maxexpand-layout-item-toggle'));
    invoke(toggles()[0], 'onClick');
    expect(props.expandNavLayout.map((item) => item.visible)).toEqual([false, false, true]);
    invoke(toggles()[1], 'onClick');
    expect(props.expandNavLayout.map((item) => item.visible)).toEqual([false, true, true]);
    invoke(findElement(render(), (node) => elementProps(node).className === 'maxexpand-layout-reset-btn'), 'onClick');
    expect(props.expandNavLayout).toEqual(DEFAULT_EXPAND_NAV_LAYOUT);
    expect(props.expandNavLayout).not.toBe(DEFAULT_EXPAND_NAV_LAYOUT);
  });
  it('上移下移保留项数据，首尾越界不更新', () => {
    const moves = (index: number) => elements(rows()[index]).filter((node) => elementProps(node).className === 'maxexpand-layout-item-move-btn');
    expect(elementProps(moves(0)[0]).disabled).toBe(true);
    invoke(moves(0)[0], 'onClick');
    invoke(moves(2)[1], 'onClick');
    expect(props.updateExpandNavLayout).not.toHaveBeenCalled();
    invoke(moves(1)[0], 'onClick');
    expect(props.expandNavLayout.map((item) => item.id)).toEqual(['tools', 'song', 'unknown-runtime-tab']);
    invoke(moves(0)[1], 'onClick');
    expect(props.expandNavLayout.map((item) => item.id)).toEqual(['song', 'tools', 'unknown-runtime-tab']);
    expect(props.expandNavLayout[1].visible).toBe(false);
  });
  it('真实拖拽更换顺序，高亮及leave/end取消状态', () => {
    const preventDefault = vi.fn();
    invoke(rows()[0], 'onDragStart');
    invoke(rows()[2], 'onDragOver', {
      preventDefault
    });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(String(elementProps(rows()[2]).className)).toContain('drag-over');
    invoke(rows()[2], 'onDragLeave');
    expect(String(elementProps(rows()[2]).className)).not.toContain('drag-over');
    invoke(rows()[2], 'onDragOver', {
      preventDefault
    });
    invoke(rows()[2], 'onDrop');
    expect(props.expandNavLayout.map((item) => item.id)).toEqual(['tools', 'unknown-runtime-tab', 'song']);
    expect(rows().some((node) => String(elementProps(node).className).includes('drag-over'))).toBe(false);
    invoke(rows()[0], 'onDragStart');
    invoke(rows()[1], 'onDragOver', {
      preventDefault
    });
    invoke(rows()[0], 'onDragEnd');
    expect(rows().some((node) => String(elementProps(node).className).includes('drag-over'))).toBe(false);
  });
  it('未开始或同项拖放不更新且清除高亮', () => {
    invoke(rows()[1], 'onDrop');
    expect(props.updateExpandNavLayout).not.toHaveBeenCalled();
    invoke(rows()[0], 'onDragStart');
    invoke(rows()[0], 'onDragOver', {
      preventDefault: vi.fn()
    });
    invoke(rows()[0], 'onDrop');
    expect(props.updateExpandNavLayout).not.toHaveBeenCalled();
    expect(rows().some((node) => String(elementProps(node).className).includes('drag-over'))).toBe(false);
    invoke(rows()[1], 'onDrop');
    expect(props.updateExpandNavLayout).not.toHaveBeenCalled();
  });
});
describe('总览和公开数组边界', () => {
  it('总览始终锁定，回调不隐藏，其他项可切换', () => {
    props.expandNavLayout = [{
      id: 'overview',
      visible: true
    }, {
      id: 'song',
      visible: true
    }];
    const toggle = findElement(rows()[0], (node) => String(elementProps(node).className).startsWith('maxexpand-layout-item-toggle'));
    expect(elementProps(toggle).disabled).toBe(true);
    invoke(toggle, 'onClick');
    expect(props.updateExpandNavLayout).not.toHaveBeenCalled();
    invoke(findElement(rows()[1], (node) => String(elementProps(node).className).startsWith('maxexpand-layout-item-toggle')), 'onClick');
    expect(props.expandNavLayout.map((item) => item.visible)).toEqual([true, false]);
  });
  it('调用方公开可变数组移除目标后，已有真实toggle回调安全忽略', () => {
    const toggle = findElement(rows()[2], (node) => String(elementProps(node).className).startsWith('maxexpand-layout-item-toggle'));
    props.expandNavLayout.splice(2, 1);
    invoke(toggle, 'onClick');
    expect(props.updateExpandNavLayout).not.toHaveBeenCalled();
    expect(props.expandNavLayout.map((item) => item.id)).toEqual(['song', 'tools']);
  });
});
