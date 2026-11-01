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
 * @file useWelcomeGate.ts
 * @description 记录是否已离开欢迎界面
 * @author 鸡哥
 */

import { useCallback, useState } from 'react';

import type { UseWelcomeGateReturn } from '../types/uiTypes';

/**
 * 管理欢迎界面到任务界面的切换
 * @returns 是否已进入与进入回调
 */
export default function useWelcomeGate(): UseWelcomeGateReturn {
  const [entered, setEntered] = useState(false);
  const enter = useCallback(() => setEntered(true), []);
  return { entered, enter };
}
