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
 * @file useFileTransferItem.ts
 * @description 中转文件条目的图标加载与拖出/点击交互
 * @author 鸡哥
 */

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { FILE_TRANSFER_DRAG_THRESHOLD } from '../config/fileTransferConfig';

interface UseFileTransferItemReturn {
  icon: string | null;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
}

/**
 * 管理单个中转文件：移动超过阈值时拖出到其他应用，原地松开时打开文件。
 * @param path - 文件本机绝对路径。
 * @returns 文件图标与指针事件处理器。
 */
export function useFileTransferItem(path: string): UseFileTransferItemReturn {
  const [icon, setIcon] = useState<string | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.api.getFileIcon(path).then((data) => {
      if (!cancelled) setIcon(data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [path]);

  const onPointerDown = (event: PointerEvent<HTMLElement>): void => {
    if (event.button !== 0) return;
    originRef.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>): void => {
    const origin = originRef.current;
    if (!origin) return;
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < FILE_TRANSFER_DRAG_THRESHOLD) return;
    originRef.current = null;
    window.api.startFileDrag([path]).catch(() => {});
  };

  const onPointerUp = (): void => {
    if (!originRef.current) return;
    originRef.current = null;
    window.api.openFile(path).catch(() => {});
  };

  return { icon, onPointerDown, onPointerMove, onPointerUp };
}
