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
 * @file useActionButtons.ts
 * @description 隐藏与退出灵动岛操作逻辑 Hook
 * @author 鸡哥
 */

import { useCallback } from 'react';

/**
 * 操作按钮逻辑 Hook
 * @description 提供隐藏灵动岛和退出应用的回调
 * @returns 操作回调
 */
export function useActionButtons(): {
  handleHide: () => void;
  handleQuit: () => void;
} {
  const handleHide = useCallback(() => {
    window.api.collapseWindow();
    window.api?.hideWindow();
  }, []);

  const handleQuit = useCallback(() => {
    window.api.quitApp();
  }, []);

  return { handleHide, handleQuit };
}
