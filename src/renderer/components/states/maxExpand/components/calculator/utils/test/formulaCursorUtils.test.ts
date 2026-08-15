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
 */

/**
 * @file formulaCursorUtils.test.ts
 * @description 科学函数 token 光标边界测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { readFunctionOpenToken, snapFormulaCursor } from '../formulaCursorUtils';

describe('readFunctionOpenToken', () => {
  it('将函数名与左括号识别为不可拆分 token', () => {
    expect(readFunctionOpenToken('cos(0)', 0)).toBe('cos(');
    expect(readFunctionOpenToken('2+sqrt(9)', 2)).toBe('sqrt(');
    expect(readFunctionOpenToken('2+3', 0)).toBeNull();
  });
});

describe('snapFormulaCursor', () => {
  it('向右移动时跳到左括号内部', () => {
    expect(snapFormulaCursor('cos(0)', 1, 0)).toBe(4);
    expect(snapFormulaCursor('2+sqrt(9)', 3, 2)).toBe(7);
  });

  it('向左移动时跳到函数名前', () => {
    expect(snapFormulaCursor('cos(0)', 3, 4)).toBe(0);
    expect(snapFormulaCursor('2+sqrt(9)', 6, 7)).toBe(2);
  });

  it('嵌套函数分别保留各自的参数编辑位置', () => {
    expect(snapFormulaCursor('sin(cos(0))+2', 6, 4)).toBe(8);
    expect(snapFormulaCursor('sin(cos(0))+2', 6, 8)).toBe(4);
  });

  it('允许光标停在括号中间和函数外部', () => {
    expect(snapFormulaCursor('cos(0)+2', 4, 3)).toBe(4);
    expect(snapFormulaCursor('cos(0)+2', 5, 4)).toBe(5);
    expect(snapFormulaCursor('cos(0)+2', 8, 7)).toBe(8);
  });
});