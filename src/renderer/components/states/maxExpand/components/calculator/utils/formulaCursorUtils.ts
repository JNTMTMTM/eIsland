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
 * @file formulaCursorUtils.ts
 * @description 计算器函数 token 识别与不可拆分光标定位。
 * @author 鸡哥
 */

const FUNCTION_TOKEN_PATTERN = /[a-z]+(?=\()/gi;

/**
 * 读取指定位置开始的科学函数名。
 * @param formula - 当前公式
 * @param start - token 起始索引
 * @returns 科学函数名；当前位置不是函数起点时返回 null
 */
export function readFunctionToken(formula: string, start: number): string | null {
  const match = formula.slice(start).match(/^[a-z]+(?=\()/i);
  return match?.[0] ?? null;
}

/**
 * 将目标光标位置吸附到科学函数名的前后边界。
 * @param formula - 当前公式
 * @param requestedPosition - 请求移动到的位置
 * @param previousPosition - 移动前的位置，用于判断移动方向
 * @returns 不会位于函数名内部的光标位置
 */
export function snapFormulaCursor(
  formula: string,
  requestedPosition: number,
  previousPosition: number,
): number {
  const position = Math.max(0, Math.min(requestedPosition, formula.length));
  FUNCTION_TOKEN_PATTERN.lastIndex = 0;

  for (const match of formula.matchAll(FUNCTION_TOKEN_PATTERN)) {
    const start = match.index;
    const end = start + match[0].length;
    if (position > start && position < end) {
      return position < previousPosition ? start : end;
    }
  }

  return position;
}