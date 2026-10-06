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
 * @file keyEventToAccelerator.test.ts
 * @description 快捷键修饰键顺序、特殊键映射、大小写及单修饰键过滤测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { keyEventToAccelerator } from '../keyEventToAccelerator';
import type { KeyboardEvent } from 'react';

/**
 * 构造处理函数读取的键盘事件字段，保持其他DOM行为在边界外。
 * @param key - 真实按键名称。
 * @param flags - 按下的修饰键。
 * @returns 快捷键转换所需的事件。
 */
function keyEvent(key: string, flags: Partial<Pick<KeyboardEvent, 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>> = {}): KeyboardEvent {
  return { key, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...flags } as KeyboardEvent;
}
describe('accelerator keyboard protocol', () => {
  it('固定按Ctrl/Alt/Shift/Super顺序组合', () => {
    expect(keyEventToAccelerator(keyEvent('a', { ctrlKey: true, altKey: true, shiftKey: true, metaKey: true }))).toBe('Ctrl+Alt+Shift+Super+A');
  });
  it.each(['Control', 'Alt', 'Shift', 'Meta'])('忽略单修饰键%s，即使其他修饰标志为真', (key) => {
    expect(keyEventToAccelerator(keyEvent(key, { ctrlKey: true }))).toBe('');
  });
  it.each([[' ', 'Space'], ['ArrowUp', 'Up'], ['ArrowDown', 'Down'], ['ArrowLeft', 'Left'], ['ArrowRight', 'Right'], ['Enter', 'Return'], ['Escape', 'Escape'], ['Tab', 'Tab'], ['PageUp', 'PageUp'], ['Insert', 'Insert']])('把%s映射成%s', (key, mapped) => {
    expect(keyEventToAccelerator(keyEvent(key, { altKey: true }))).toBe(`Alt+${  mapped}`);
  });
  it.each(['a', 'F12', 'MediaPlayPause'])('没有修饰键时拒绝%s', (key) => {
    expect(keyEventToAccelerator(keyEvent(key))).toBe('');
  });
  it('保留未映射的完整功能键名', () => {
    expect(keyEventToAccelerator(keyEvent('F12', { shiftKey: true }))).toBe('Shift+F12');
  });
});
