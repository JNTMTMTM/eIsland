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
 * @file dynamicIslandWindowUtils.ts
 * @description 灵动岛窗口相关工具函数。
 * @author 鸡哥
 */

/**
 * @description 判断鼠标是否位于当前窗口范围内。
 * @returns 鼠标在窗口内返回 true，否则返回 false。
 */
export async function isMouseInWindow(): Promise<boolean> {
  try {
    const mouseWindowState = await window.api?.getMouseWindowState?.();
    if (mouseWindowState) {
      const { mousePosition, bounds } = mouseWindowState;
      return (
        mousePosition.x >= bounds.x
        && mousePosition.x <= bounds.x + bounds.width
        && mousePosition.y >= bounds.y
        && mousePosition.y <= bounds.y + bounds.height
      );
    }

    const mousePos = await window.api?.getMousePosition();
    const bounds = await window.api?.getWindowBounds();

    if (!mousePos || !bounds) return false;

    return (
      mousePos.x >= bounds.x
      && mousePos.x <= bounds.x + bounds.width
      && mousePos.y >= bounds.y
      && mousePos.y <= bounds.y + bounds.height
    );
  } catch {
    return false;
  }
}
