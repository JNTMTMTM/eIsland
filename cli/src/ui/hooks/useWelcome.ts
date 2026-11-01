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
 * @file useWelcome.ts
 * @description 欢迎界面的终端尺寸与按键交互
 * @author 鸡哥
 */

import { useInput, useWindowSize } from 'ink';

import { FALLBACK_ROWS } from '../config/uiConfig';

import type { UseWelcomeReturn, WelcomeProps } from '../types/uiTypes';

/**
 * 监听欢迎界面按键并提供终端尺寸
 * @param props - 欢迎界面入参
 * @param props.onEnter - 进入任务界面回调
 * @param props.onQuit - 退出回调
 * @returns 终端列数与行数
 */
export default function useWelcome({ onEnter, onQuit }: WelcomeProps): UseWelcomeReturn {
  const { columns, rows } = useWindowSize();

  useInput((input, key) => {
    if (key.return) {
      onEnter();
    } else if (key.escape || (key.ctrl && input === 'c')) {
      onQuit();
    }
  });

  return { columns, rows: rows || FALLBACK_ROWS };
}
