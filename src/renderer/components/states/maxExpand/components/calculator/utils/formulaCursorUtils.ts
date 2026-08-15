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

const FUNCTION_OPEN_PATTERN = /[a-z]+\(/gi;

/**
 * 读取指定位置开始的科学函数头。
 * @param formula - 当前公式
 * @param start - token 起始索引
 * @returns 包含函数名与左括号的 token；当前位置不是函数头时返回 null
 */
export function readFunctionOpenToken(formula: string, start: number): string | null {
  const match = formula.slice(start).match(/^[a-z]+\(/i);
  return match?.[0] ?? null;
}

/**
 * 将目标光标位置吸附到科学函数头的前后边界。
 * @param formula - 当前公式
 * @param requestedPosition - 请求移动到的位置
 * @param previousPosition - 移动前的位置，用于判断移动方向
 * @returns 不会位于函数名或名称与左括号之间的光标位置
 */
export function snapFormulaCursor(
  formula: string,
  requestedPosition: number,
  previousPosition: number,
): number {
  const position = Math.max(0, Math.min(requestedPosition, formula.length));

  const match = Array.from(formula.matchAll(FUNCTION_OPEN_PATTERN))
    .find((m) => position > m.index && position < m.index + m[0].length);

  if (match) {
    return position < previousPosition ? match.index : match.index + match[0].length;
  }

  return position;
}