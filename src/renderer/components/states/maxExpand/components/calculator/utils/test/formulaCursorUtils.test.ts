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
import { readFunctionToken, snapFormulaCursor } from '../formulaCursorUtils';

describe('readFunctionToken', () => {
  it('仅将函数调用前的完整单词识别为 token', () => {
    expect(readFunctionToken('cos(0)', 0)).toBe('cos');
    expect(readFunctionToken('2+sqrt(9)', 2)).toBe('sqrt');
    expect(readFunctionToken('2+3', 0)).toBeNull();
  });
});

describe('snapFormulaCursor', () => {
  it('向右移动时跳到函数名末尾', () => {
    expect(snapFormulaCursor('cos(0)', 1, 0)).toBe(3);
    expect(snapFormulaCursor('2+sqrt(9)', 3, 2)).toBe(6);
  });

  it('向左移动时跳到函数名开头', () => {
    expect(snapFormulaCursor('cos(0)', 2, 3)).toBe(0);
    expect(snapFormulaCursor('2+sqrt(9)', 5, 6)).toBe(2);
  });

  it('保留函数名外部的合法位置', () => {
    expect(snapFormulaCursor('cos(0)+2', 4, 3)).toBe(4);
    expect(snapFormulaCursor('cos(0)+2', 8, 7)).toBe(8);
  });
});