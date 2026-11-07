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
 * @file migrationUtils.ts
 * @description 纯函数映射流程进度，不把下载完成等同于安装完成。
 * @author 鸡哥
 */
import type { Phase, Progress } from '../../../../shared/types/adapterTypes';
/** 计算向导当前步骤。
 * @param phase - 主进程阶段。
 * @returns 从零开始的导航位置。
 */
export function stepForPhase(phase?: Phase): number {
  if (!phase || phase === 'welcome') return 0;
  if (['inspecting', 'ready', 'error', 'cancelled'].includes(phase)) return 1;
  if (['installing', 'complete', 'installed'].includes(phase)) return 3;
  return 2;
}
/** 计算有界进度；未知总量显示原生不定进度。
 * @param progress - 字节进度。
 * @returns 百分比或 undefined。
 */
export function progressPercent(progress: Progress): number | undefined {
  return progress.total && progress.total > 0 ? Math.min(100, Math.max(0, progress.done / progress.total * 100)) : undefined;
}
