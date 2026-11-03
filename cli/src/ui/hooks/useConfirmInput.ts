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
 * @file useConfirmInput.ts
 * @description y/N 确认提示的键盘交互
 * @author 鸡哥
 */

import { useInput } from 'ink';

/**
 * 监听确认按键
 * @description 只有显式输入 y 才确认，Enter、Esc、n 与 Ctrl+C 均视为拒绝，避免误触发布
 * @param onSubmit - 作答回调，仅输入 y 时为 true
 */
export default function useConfirmInput(onSubmit: (confirmed: boolean) => void): void {
  useInput((input, key) => {
    const answer = input.toLowerCase();
    if (answer === 'y') {
      onSubmit(true);
    } else if (answer === 'n' || key.return || key.escape || (key.ctrl && input === 'c')) {
      onSubmit(false);
    }
  });
}
