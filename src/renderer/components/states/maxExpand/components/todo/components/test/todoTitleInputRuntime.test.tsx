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
 * @file todoTitleInputRuntime.test.tsx
 * @description 标题输入真实聚焦、点击冒泡与普通键盘分支测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, resetHook, unmountHook } from '../../../calendar/hooks/test/calendarHookHarness';
import { find, invoke } from '../../../../../test/tree';
import { TodoTitleInput } from '../TodoTitleInput';
beforeEach(resetHook);
afterEach(unmountHook);
describe('TodoTitleInput runtime', () => {
  it('focus clears escape cancellation, click stops bubbling and ordinary key does not blur', () => {
    const save = vi.fn();
    const run = () => renderHook(() => TodoTitleInput({
      text: 'old',
      label: 'title',
      className: 'title',
      onSave: save
    }));
    const stopPropagation = vi.fn();
    const blur = vi.fn();
    const event = {
      stopPropagation,
      preventDefault: vi.fn(),
      nativeEvent: {
        isComposing: false
      },
      key: 'Escape',
      currentTarget: {
        blur
      }
    };
    invoke(find(run(), (n) => n.type === 'input'), 'onKeyDown', event);
    invoke(find(run(), (n) => n.type === 'input'), 'onFocus');
    invoke(find(run(), (n) => n.type === 'input'), 'onClick', {
      stopPropagation
    });
    invoke(find(run(), (n) => n.type === 'input'), 'onBlur', {
      currentTarget: {
        value: 'new'
      }
    });
    expect(save).toHaveBeenCalledWith('new');
    invoke(find(run(), (n) => n.type === 'input'), 'onKeyDown', {
      ...event,
      key: 'Tab'
    });
    expect(blur).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledTimes(3);
  });
});
