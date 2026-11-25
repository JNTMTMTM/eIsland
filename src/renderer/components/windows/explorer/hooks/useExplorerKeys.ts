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
 * @file useExplorerKeys.ts
 * @description 在独立窗口中处理文件操作快捷键。
 * @author 鸡哥
 */
import { useEffect } from 'react';
import type { UseExplorerReturn } from '../types/explorerTypes';

/**
 * 输入框保留原生剪贴板和编辑快捷键。
 * @param e - 该窗口的文件管理状态。
 * @returns 无返回值。
 */
export default function useExplorerKeys(e: UseExplorerReturn): void {
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.isComposing || event.defaultPrevented || e.dialog) return;
      const key = event.key.toLowerCase();
      const editing = event.target instanceof HTMLInputElement;
      if (event.ctrlKey && key === 'l') {
        const address = document.querySelector<HTMLInputElement>('#explorer-address');
        address?.focus(); address?.select();
      } else if (key === 'f5') e.refresh();
      else if (event.altKey && key === 'arrowleft') e.travel(-1);
      else if (event.altKey && key === 'arrowright') e.travel(1);
      else if (event.altKey && key === 'arrowup' && e.directory?.parent) e.navigate(e.directory.parent);
      else if (editing || event.repeat || e.busy) return;
      else if (event.ctrlKey && key === 'c') e.prepare('copy');
      else if (event.ctrlKey && key === 'x') e.prepare('move');
      else if (event.ctrlKey && key === 'v') e.paste();
      else if (event.ctrlKey && event.shiftKey && key === 'n') e.showDialog('create');
      else if (key === 'f2') e.showDialog('rename');
      else if (key === 'delete') e.showDialog('trash');
      else return;
      event.preventDefault();
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [e]);
}
