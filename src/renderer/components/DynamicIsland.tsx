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

/** 检查鼠标是否在窗口范围内 */
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

function DynamicIsland(): React.JSX.Element {
  const { state, weather, setHover, setIdle } = useIslandStore();

  /** 标记是否已完成初始化 */
  const initRef = useRef(false);
  const isHoveringRef = useRef(false);

  /** 当前时间状态 */
  const [timeStr, setTimeStr] = useState(() => formatTime(new Date()));
  const [dayStr, setDayStr] = useState(() => getDayName(new Date()));

  /** 定时更新时间，每秒刷新一次 */
  useEffect(() => {
    const update = (): void => {
      const now = new Date();
      setTimeStr(formatTime(now));
      setDayStr(getDayName(now));
    };
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  /** 初始化鼠标穿透 */
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      window.api?.enableMousePassthrough();
    }
  }, []);

  /** 尝试进入 hover 状态 */
  const tryEnterHover = useCallback(async () => {
    if (isHoveringRef.current) return;

    const inWindow = await isMouseInWindow();
    if (!inWindow) return;

    isHoveringRef.current = true;
    window.api?.disableMousePassthrough();
    window.api?.expandWindow();
    setHover();
  }, [setHover]);

  /** 尝试离开 hover 状态 */
  const tryLeaveHover = useCallback(async () => {
    if (!isHoveringRef.current) return;

    isHoveringRef.current = false;
    window.api?.collapseWindow();
    window.api?.enableMousePassthrough();
    setIdle();
  }, [setIdle]);

  /** 鼠标进入 */
  const handleMouseEnter = (): void => {
    tryEnterHover();
  };

  /** 鼠标离开 */
  const handleMouseLeave = (): void => {
    tryLeaveHover();
  };

  /** 全局鼠标移动检测 - 处理穿透状态下的 hover 检测 */
  useEffect(() => {
    let rafId: number | null = null;

    const checkMousePosition = async (): Promise<void> => {
      const inWindow = await isMouseInWindow();

      if (inWindow && !isHoveringRef.current) {
        tryEnterHover();
      } else if (!inWindow && isHoveringRef.current) {
        tryLeaveHover();
      }

      rafId = requestAnimationFrame(checkMousePosition);
    };

    rafId = requestAnimationFrame(checkMousePosition);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [tryEnterHover, tryLeaveHover]);

  return (
    <div
      className={`island-shell ${state === 'hover' ? 'hover' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 空闲状态内容 */}
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

      {/* 悬停状态内容 */}
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
