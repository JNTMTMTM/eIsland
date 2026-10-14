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
 * @file equationUtils.ts
 * @description 线性二次解析解与一般单变量数值解。
 * @author 鸡哥
 */


import type { CalcAngleUnit } from '../types/calculatorTypes';
import { compileNumericFormula, getPolynomialCoefficients } from './calculatorUtils';
import { findRealRoots } from './numericRoots';
export interface EquationResult { roots: number[]; status: 'finite' | 'none' | 'infinite'; approximate: boolean }

/** 求解线性、二次方程，其他单变量方程采用指定区间内的数值搜索。
 * @param equation - 使用 x 的等式，省略等号时右侧为零
 * @param lower - 数值搜索下限
 * @param upper - 数值搜索上限
 * @param angleUnit - 三角函数的角度单位
 * @returns 解及搜索方式
 */
export function solveEquation(equation: string, lower: number, upper: number, angleUnit: CalcAngleUnit): EquationResult {
  const sides = equation.split('=');
  if (sides.length > 2 || !sides[0].trim() || (sides.length === 2 && !sides[1].trim())) throw new Error('Expected value');
  const left = sides[0]; const right = sides[1] ?? '0';
  const a = getPolynomialCoefficients(left, angleUnit); const b = getPolynomialCoefficients(right, angleUnit);
  if (a && b) {
    const coefficients = Array.from({ length: 3 }, (_, i) => (a[i] ?? 0) - (b[i] ?? 0));
    if (!coefficients.every(Number.isFinite)) throw new Error('Non-finite result');
    const [constant, linear, quadratic] = coefficients;
    let roots: number[] = [];
    if (quadratic === 0) {
      if (linear === 0) return { roots, status: constant === 0 ? 'infinite' : 'none', approximate: false };
      roots = [-constant / linear];
    } else {
      const scale = Math.max(...coefficients.map(Math.abs));
      const c = constant / scale; const l = linear / scale; const q = quadratic / scale;
      const discriminant = l * l - 4 * q * c;
      if (discriminant === 0) roots = [-l / (2 * q)];
      else if (discriminant > 0) {
        const stable = -.5 * (l + (l < 0 ? -1 : 1) * Math.sqrt(discriminant));
        roots = [stable / q, c / stable].sort((x, y) => x - y);
      }
    }
    if (!roots.every(Number.isFinite)) throw new Error('Non-finite result');
    roots = roots.map((root) => root === 0 ? 0 : root);
    return { roots, status: roots.length ? 'finite' : 'none', approximate: false };
  }
  const residual = compileNumericFormula('(' + left + ')-(' + right + ')', angleUnit);
  const result = findRealRoots(residual, lower, upper);
  return { roots: result.roots, status: result.identicallyZero ? 'infinite' : result.roots.length ? 'finite' : 'none', approximate: true };
}
