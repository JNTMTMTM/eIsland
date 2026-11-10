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
 * @file useFileTransferDrop.ts
 * @description 在 idle/hover/歌词状态下接收系统文件拖入并切换到文件中转站
 * @author 鸡哥
 */

import { useEffect, useRef } from 'react';
import { FILE_TRANSFER_DROP_STATES } from '../config/fileTransferConfig';
import { addFileTransferPaths, loadFileTransferItems } from '../store/fileTransferStore';

interface UseFileTransferDropOptions {
  state: string;
  setFileTransfer: () => void;
}

/**
 * 监听系统文件拖入：拖入窗口即展开中转站，放下后记录文件路径。
 * @param options - 当前岛屿状态与切换入口。
 * @param options.state - 当前岛屿状态。
 * @param options.setFileTransfer - 切换到文件中转站状态。
 */
export function useFileTransferDrop({ state, setFileTransfer }: UseFileTransferDropOptions): void {
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    loadFileTransferItems().catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribe = window.api.onNativeDragEnter((paths) => {
      if (paths.length > 0 && FILE_TRANSFER_DROP_STATES.has(stateRef.current)) setFileTransfer();
    });

    /**
     * 原生放下事件由 runtime 以合成 drop 事件派发到光标下的元素。
     * @param event - 携带原生文件引用的 drop 事件。
     */
    const handleDrop = (event: DragEvent): void => {
      if (!FILE_TRANSFER_DROP_STATES.has(stateRef.current)) return;
      const paths = Array.from(event.dataTransfer?.files ?? [], (file) => window.api.getPathForFile(file)).filter(Boolean);
      if (paths.length === 0) return;
      event.preventDefault();
      addFileTransferPaths(paths);
      if (stateRef.current !== 'fileTransfer') setFileTransfer();
    };

    document.addEventListener('drop', handleDrop);
    return () => {
      unsubscribe();
      document.removeEventListener('drop', handleDrop);
    };
  }, [setFileTransfer]);
}
