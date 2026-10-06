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
 * @file todoTitleInput.test.tsx
 * @description TodoTitleInput 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { render, value, trigger } from '../../../../test/componentHarness';
import { TodoTitleInput as Component } from '../TodoTitleInput';

describe('TodoTitleInput', () => {
  const props = { text: 'original', label: 'title', className: 'title', onSave: vi.fn() };
  it('tracks the draft and trims changed nonempty titles on blur', () => {
    const tree = render(Component, props);
    expect(value(tree, 'input', 'value')).toBe('original');
    trigger(tree, 'input', 'onChange', { target: { value: ' new ' } });
    expect(value(render(Component, props), 'input', 'value')).toBe(' new ');
    trigger(tree, 'input', 'onBlur', { currentTarget: { value: ' new ' } });
    expect(props.onSave).toHaveBeenCalledWith('new');
    expect(value(render(Component, props), 'input', 'value')).toBe('original');
  });
  it('does not save blank, unchanged or cancelled values', () => {
    const tree = render(Component, props);
    trigger(tree, 'input', 'onBlur', { currentTarget: { value: '  ' } });
    trigger(tree, 'input', 'onBlur', { currentTarget: { value: 'original' } });
    const event = { stopPropagation: vi.fn(), preventDefault: vi.fn(), nativeEvent: { isComposing: false }, key: 'Escape', currentTarget: { blur: vi.fn() } };
    trigger(tree, 'input', 'onKeyDown', event);
    trigger(tree, 'input', 'onBlur', { currentTarget: { value: 'cancelled' } });
    expect(props.onSave).not.toHaveBeenCalled();
    expect(event.currentTarget.blur).toHaveBeenCalledOnce();
  });
  it('ignores IME Enter and commits Enter after composition ends', () => {
    const tree = render(Component, props);
    const event = { stopPropagation: vi.fn(), preventDefault: vi.fn(), nativeEvent: { isComposing: true }, key: 'Enter', currentTarget: { blur: vi.fn() } };
    trigger(tree, 'input', 'onKeyDown', event);
    expect(event.currentTarget.blur).not.toHaveBeenCalled();
    trigger(tree, 'input', 'onKeyDown', { ...event, nativeEvent: { isComposing: false } });
    expect(event.currentTarget.blur).toHaveBeenCalledOnce();
  });
});
