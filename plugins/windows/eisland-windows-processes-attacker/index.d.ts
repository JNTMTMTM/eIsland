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
 * @file index.d.ts
 * @description 关闭进程插件的目标、终止结果与同步原生 API 类型声明。
 * @author 鸡哥
 */

/** 进程名称或正整数进程 ID。 */
export type ProcessTarget = string | number;

/** 未能终止的进程及 Windows 错误码。 */
export interface ProcessCloseFailure {
  pid: number;
  name: string;
  errorCode: number;
}

/** 单个目标对应的进程终止统计。 */
export interface ProcessCloseResult {
  target: ProcessTarget;
  matchedCount: number;
  terminatedCount: number;
  failedCount: number;
  failures: ProcessCloseFailure[];
}

/**
 * 同步终止符合目标的进程。
 * @param target - 进程名称或正整数进程 ID。
 * @returns 匹配、成功、失败数量及失败详情。
 */
export function closeProcess(target: ProcessTarget): ProcessCloseResult;

/**
 * 同步终止多个目标对应的进程。
 * @param targets - 进程名称或进程 ID 数组。
 * @returns 与目标数组顺序一致的终止结果。
 */
export function closeProcesses(targets: ProcessTarget[]): ProcessCloseResult[];
