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
 * @file useIslandDrag.ts
 * @description 灵动岛 pill 模式拖动支持 Hook。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef } from 'react';
import type { IslandShapeMode, IslandState } from '../../store/types';

/** 拖动距离阈值（像素），低于此值视为点击 */
const DRAG_THRESHOLD = 4;

interface UseIslandDragOptions {
  shapeMode: IslandShapeMode;
  state: IslandState;
}

interface UseIslandDragResult {
  /** 包裹 onClick，拖动时忽略点击 */
  wrapClick: (handler: () => void) => () => void;
}

/**
 * @description pill 模式下为灵动岛添加拖动能力。
 * @param options - 形态模式与当前状态。
 * @returns 包装后的点击处理函数。
 */
export function useIslandDrag(options: UseIslandDragOptions): UseIslandDragResult {
  const { shapeMode, state } = options;
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  /** 允许拖动的状态集合 */
  const draggable = shapeMode === 'pill' && (state === 'idle' || state === 'lyrics' || state === 'lyricsTranslation' || state === 'agentVoiceInput');

  useEffect(() => {
    if (!draggable) return;

    const handleMouseDown = (e: MouseEvent): void => {
      if (e.button !== 0) return;
      isDraggingRef.current = true;
      hasMovedRef.current = false;
      startPosRef.current = { x: e.screenX, y: e.screenY };
    };

    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDraggingRef.current) return;
      const dx = e.screenX - startPosRef.current.x;
      const dy = e.screenY - startPosRef.current.y;
      if (!hasMovedRef.current && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        hasMovedRef.current = true;
      }
      if (hasMovedRef.current) {
        window.api?.moveWindowDelta?.(dx, dy);
        startPosRef.current = { x: e.screenX, y: e.screenY };
      }
    };

    const handleMouseUp = (): void => {
      isDraggingRef.current = false;
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggable]);

  const wrapClick = useCallback((handler: () => void) => {
    return () => {
      if (hasMovedRef.current) return;
      handler();
    };
  }, []);

  return { wrapClick };
}
