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
 * @file useFileTransferPanel.ts
 * @description 同步文件中转站列表、拖入高亮和收起交互。
 * @author 鸡哥
 */

import { useEffect, useRef, useState } from 'react';
import { useFileTransferStore } from '../../../../store/fileTransferStore';
import useIslandStore from '../../../../store/slices';
import type { MouseEvent, PointerEvent } from 'react';
import type { UseFileTransferPanelReturn } from '../types/fileTransferTypes';

/**
 * 管理中转站面板的拖入反馈与收起操作。
 * @returns 文件列表、拖入区域状态及面板事件处理器。
 */
export function useFileTransferPanel(): UseFileTransferPanelReturn {
  const items = useFileTransferStore((store) => store.items);
  const returnFromAuth = useIslandStore((store) => store.returnFromAuth);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const pressedTargetRef = useRef<EventTarget | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);

  useEffect(() => window.api.onNativeDragPosition((position) => {
    const target = position && document.elementFromPoint(position.x, position.y);
    setDropZoneActive(dropZoneRef.current?.contains(target) ?? false);
  }), []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (
        event.key !== 'Escape'
        || event.repeat
        || event.defaultPrevented
        || useIslandStore.getState().state !== 'fileTransfer'
      ) return;
      event.preventDefault();
      returnFromAuth();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [returnFromAuth]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    pressedTargetRef.current = event.target;
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    const pressedTarget = pressedTargetRef.current;
    pressedTargetRef.current = null;
    // 从卡片拖到空白处时，浏览器可能把点击派发给共同的父节点。
    if (
      event.target === pressedTarget
      && event.target instanceof HTMLElement
      && event.target.hasAttribute('data-file-transfer-dismiss')
    ) {
      returnFromAuth();
    }
  };

  return { items, dropZoneRef, dropZoneActive, handlePointerDown, handleClick };
}
