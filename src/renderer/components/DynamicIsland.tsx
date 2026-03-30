/**
 * @file DynamicIsland.tsx
 * @description 灵动岛主组件，根据 hover/idle 状态渲染不同 UI，响应鼠标事件并控制窗口穿透
 * @author 鸡哥
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import useIslandStore from '../store/isLandStore';
import { formatTime, getDayName } from '../utils/timeUtils';

/** 渲染进程自定义 API 类型声明 */
declare global {
  interface Window {
    api: {
      enableMousePassthrough: () => void;
      disableMousePassthrough: () => void;
      expandWindow: () => void;
      collapseWindow: () => void;
      getMousePosition: () => Promise<{ x: number; y: number }>;
      getWindowBounds: () => Promise<{ x: number; y: number; width: number; height: number } | null>;
    };
  }
}

/**
 * 检查鼠标是否在灵动岛窗口范围内
 * @returns 鼠标在窗口内返回 true，否则返回 false
 */
async function isMouseInWindow(): Promise<boolean> {
  try {
    const mousePos = await window.api?.getMousePosition();
    const bounds = await window.api?.getWindowBounds();

    if (!mousePos || !bounds) return false;

    return (
      mousePos.x >= bounds.x &&
      mousePos.x <= bounds.x + bounds.width &&
      mousePos.y >= bounds.y &&
      mousePos.y <= bounds.y + bounds.height
    );
  } catch {
    return false;
  }
}

/**
 * 灵动岛主组件
 * @description 根据 hover/idle 状态渲染不同 UI，通过 requestAnimationFrame 检测鼠标位置实现可靠的 hover 交互
 */
function DynamicIsland(): React.JSX.Element {
  const { state, weather, setHover, setIdle } = useIslandStore();

  const initRef = useRef(false);
  const isHoveringRef = useRef(false);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [timeStr, setTimeStr] = useState(() => formatTime(new Date()));
  const [dayStr, setDayStr] = useState(() => getDayName(new Date()));

  useEffect(() => {
    const update = (): void => {
      const now = new Date();
      setTimeStr(formatTime(now));
      setDayStr(getDayName(now));
    };
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      window.api?.enableMousePassthrough();
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    if (enterTimerRef.current !== null) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (leaveTimerRef.current !== null) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let rafId: number | null = null;

    const checkMousePosition = async (): Promise<void> => {
      const inWindow = await isMouseInWindow();

      if (inWindow) {
        if (leaveTimerRef.current !== null) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }

        if (!isHoveringRef.current && enterTimerRef.current === null) {
          enterTimerRef.current = setTimeout(() => {
            enterTimerRef.current = null;
            if (isHoveringRef.current) return;

            isHoveringRef.current = true;
            window.api?.disableMousePassthrough();
            window.api?.expandWindow();
            setHover();
          }, 60);
        }
      } else {
        if (enterTimerRef.current !== null) {
          clearTimeout(enterTimerRef.current);
          enterTimerRef.current = null;
        }

        if (isHoveringRef.current && leaveTimerRef.current === null) {
          leaveTimerRef.current = setTimeout(() => {
            leaveTimerRef.current = setTimeout(() => {
              leaveTimerRef.current = null;
              if (!isHoveringRef.current) return;

              isHoveringRef.current = false;
              window.api?.collapseWindow();
              window.api?.enableMousePassthrough();
              setIdle();
            }, 80);
          }, 100);
        }
      }

      rafId = requestAnimationFrame(checkMousePosition);
    };

    rafId = requestAnimationFrame(checkMousePosition);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearAllTimers();
    };
  }, [setHover, setIdle, clearAllTimers]);

  return (
    <div className={`island-shell ${state === 'hover' ? 'hover' : ''}`}>
      <div className="idle-content">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white font-medium tabular-nums">
            {timeStr}
          </span>
          <span className="text-xs text-white opacity-50">
            {dayStr}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-white opacity-60">
            {weather.description || '—'}
          </span>
          <span className="text-sm text-white font-medium tabular-nums">
            {weather.temperature > 0 ? `${weather.temperature}°` : '--°'}
          </span>
        </div>
      </div>

      <div className="hover-content">
        <div className="flex items-center justify-between w-full px-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white font-medium tabular-nums">
              {timeStr}
            </span>
            <span className="text-xs text-white opacity-50">
              {dayStr}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white opacity-60">
              {weather.description || '—'}
            </span>
            <span className="text-sm text-white font-medium tabular-nums">
              {weather.temperature > 0 ? `${weather.temperature}°` : '--°'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DynamicIsland;
