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
 * @file worldClockCityPickerLifecycle.test.tsx
 * @description 城市选择器真实自动聚焦、防抖过滤、退出监听和删除高亮生命周期测试。
 * @author 鸡哥
 */

import {
  afterEach, beforeEach, describe, expect, it, vi
} from 'vitest';
import {
  byClass, elements, invoke, text
} from '../../../../../test/tree';
import {
  renderWithHooks, resetLifecycle, runEffects, unmountHooks
} from '../../../setting/hooks/test/settingsCoverageHarness';
import {
  WorldClockCityPicker
} from '../WorldClockCityPicker';
import type {
  ReactElement
} from 'react';
import type {
  WorldClockCityPickerProps
} from '../../types/worldClockTypes';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));
let props: WorldClockCityPickerProps;
let surface: EventTarget;
const focus = vi.fn();
/** 执行实际组件及其三个真实 Hook 并绑定公开 DOM 引用。
 * @returns 实际选择器树。
 */
function view() {
  return renderWithHooks(() => {
    const component = WorldClockCityPicker as unknown as {
      type: (input: WorldClockCityPickerProps) => ReactElement
    };
    const root = component.type(props);
    const ref = byClass(root, 'world-clock-picker-search').props.ref as {
      current: unknown
    };
    ref.current = {
      focus
    };
    return root;
  });
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers();
  surface = new EventTarget();
  vi.stubGlobal('window', surface);
  props = {
    visible: true, existingTimezones: ['Asia/Chongqing'], options: [{
      timezone: 'Asia/Shanghai', label: 'Shanghai', labelKey: 'shanghai', countryCode: 'CN'
    }, {
      timezone: 'Asia/Tokyo', label: 'Tokyo', labelKey: 'tokyo', countryCode: 'JP'
    }], onSelect: vi.fn(), onRemove: vi.fn(), onRemoveHover: vi.fn(), onClose: vi.fn()
  };
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('城市选择器真实生命周期和查询', () => {
  it('真实输入聚焦、已有别名删除的悬浮焦点和实际选择事件接线', () => {
    view();
    runEffects();
    vi.advanceTimersByTime(50);
    expect(focus).toHaveBeenCalledWith({
      preventScroll: true
    });
    const remove = byClass(view(), 'world-clock-picker-remove');
    ['onMouseEnter', 'onFocus'].forEach((event) => {
      invoke(remove, event);
      expect(props.onRemoveHover).toHaveBeenLastCalledWith('Asia/Chongqing');
    });
    ['onMouseLeave', 'onBlur'].forEach((event) => {
      invoke(remove, event);
      expect(props.onRemoveHover).toHaveBeenLastCalledWith(null);
    });
    invoke(remove, 'onClick');
    expect(props.onRemove).toHaveBeenCalledWith('Asia/Chongqing');
    const choices = elements(view()).filter((node) => node.props.className === 'world-clock-picker-select');
    expect(choices[0].props.disabled).toBe(true);
    invoke(choices[1], 'onClick');
    expect(props.onSelect).toHaveBeenCalledWith(expect.objectContaining({
      timezone: 'Asia/Tokyo', order: 0
    }));
    surface.dispatchEvent(Object.assign(new Event('keydown'), {
      key: 'Escape'
    }));
    expect(props.onClose).toHaveBeenCalledOnce();
  });
  it('真实防抖查询过滤列表、关闭复位与卸载取消计时清理高亮', () => {
    view();
    runEffects();
    invoke(byClass(view(), 'world-clock-picker-search'), 'onChange', {
      target: {
        value: 'Tokyo'
      }
    });
    view();
    runEffects();
    vi.advanceTimersByTime(300);
    expect(elements(view()).filter((node) => node.props.className === 'world-clock-picker-select')).toHaveLength(1);
    expect(text(view())).toContain('Tokyo');
    invoke(byClass(view(), 'world-clock-picker-search'), 'onChange', {
      target: {
        value: 'missing'
      }
    });
    view();
    runEffects();
    vi.advanceTimersByTime(300);
    expect(text(view())).toContain('maxExpand.worldClock.noResults');
    props = {
      ...props, visible: false
    };
    view();
    runEffects();
    expect(byClass(view(), 'world-clock-picker-search').props.value).toBe('');
    props = {
      ...props, visible: true
    };
    view();
    runEffects();
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
    expect(props.onRemoveHover).toHaveBeenLastCalledWith(null);
  });
});
