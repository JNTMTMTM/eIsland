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
import type { Point } from '../../../tauri/types';
import type { IslandShapeMode, IslandState } from '../../store/types';

const DRAG_THRESHOLD = 4;

interface UseIslandDragOptions {
  shapeMode: IslandShapeMode;
  state: IslandState;
  positionLockedRef: React.MutableRefObject<boolean>;
}

interface UseIslandDragResult {
  wrapClick: (handler: () => void) => () => void;
}

/**
 * 在胶囊中区分点击与拖动，越过阈值后由系统持续移动窗口。
 * @param options - 当前形态、状态和位置锁。
 * @returns 抑制拖动后点击的包装函数。
 */
export function useIslandDrag(options: UseIslandDragOptions): UseIslandDragResult {
  const { shapeMode, state, positionLockedRef } = options;
  const hasMovedRef = useRef(false);
  const draggable = shapeMode === 'pill' && (state === 'idle' || state === 'lyrics' || state === 'lyricsTranslation' || state === 'agentVoiceInput');

  useEffect(() => {
    if (!draggable) return;

    let origin: Point | null = null;
    const cancel = (): void => { origin = null; };

    const handleMouseDown = (event: MouseEvent): void => {
      if (event.button !== 0) return;
      hasMovedRef.current = false;
      origin = positionLockedRef.current ? null : { x: event.screenX, y: event.screenY };
    };

    const handleMouseMove = (event: MouseEvent): void => {
      if (!origin) return;
      if (positionLockedRef.current || (event.buttons & 1) === 0) {
        cancel();
        return;
      }
      const dx = event.screenX - origin.x;
      const dy = event.screenY - origin.y;
      if (Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) return;

      // 原生拖动接管后 WebView 不一定会收到 mouseup。
      hasMovedRef.current = true;
      cancel();
      window.api.startPillDrag(dx, dy);
    };

    const handleMouseUp = (event: MouseEvent): void => {
      if (event.button === 0) cancel();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', cancel);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', cancel);
      hasMovedRef.current = false;
    };
  }, [draggable, positionLockedRef]);

  const wrapClick = useCallback((handler: () => void) => () => {
    if (!hasMovedRef.current) handler();
  }, []);

  return { wrapClick };
}
