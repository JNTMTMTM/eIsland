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
 * @file isDuplicateHotkey.test.ts
 * @description 快捷键冲突检测的空列表、空绑定、自身动作和重复动作分支。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { isDuplicateHotkey } from '../isDuplicateHotkey';

describe('shortcut conflicts', () => {
  it('空列表没有冲突', () => { expect(isDuplicateHotkey('Ctrl+A', 'hide', [])).toBe(false); });
  it('允许当前动作保留原快捷键，并跳过空绑定/其他组合', () => {
    expect(isDuplicateHotkey('Ctrl+A', 'hide', [{ key: 'hide', value: 'Ctrl+A' }, { key: 'quit', value: '' }, { key: 'screenshot', value: 'Ctrl+B' }])).toBe(false);
  });
  it('不同动作相同非空组合构成冲突', () => {
    expect(isDuplicateHotkey('Ctrl+A', 'hide', [{ key: 'quit', value: 'Ctrl+A' }])).toBe(true);
  });
});
