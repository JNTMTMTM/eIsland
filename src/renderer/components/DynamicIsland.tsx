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

  /** 标记是否已完成初始化 */
  const initRef = useRef(false);

  /** 当前 hover 状态（ref 驱动，避免闭包延迟） */
  const isHoveringRef = useRef(false);

  /** 进入延迟计时器 ID（用于防抖：鼠标快速划过时避免误触发） */
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 离开延迟计时器 ID（用于防抖：鼠标在边缘反复横跳时不闪烁） */
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /** 清理所有待执行的延迟计时器 */
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

  /**
   * RAF 循环：持续检测鼠标是否在窗口内
   * - 鼠标进入 → 延迟 60ms 后确认（防抖划过误触）
   * - 鼠标离开 → 延迟 100ms 后确认（防抖边缘抖动），再 80ms 延迟收缩窗口（等 bounds 同步）
   */
  useEffect(() => {
    let rafId: number | null = null;

    const checkMousePosition = async (): Promise<void> => {
      const inWindow = await isMouseInWindow();

      if (inWindow) {
        // 鼠标在窗口内：取消待执行的离开，确认进入
        if (leaveTimerRef.current !== null) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }

        if (!isHoveringRef.current && enterTimerRef.current === null) {
          // 防抖延迟后再确认，避免快速划过误触
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
        // 鼠标在窗口外：取消待执行的进入，延迟确认离开
        if (enterTimerRef.current !== null) {
          clearTimeout(enterTimerRef.current);
          enterTimerRef.current = null;
        }

        if (isHoveringRef.current && leaveTimerRef.current === null) {
          // 两次延迟：第一次确认真的离开了，第二次等 bounds 更新
          leaveTimerRef.current = setTimeout(() => {
            leaveTimerRef.current = setTimeout(() => {
              leaveTimerRef.current = null;
              if (!isHoveringRef.current) return;

              isHoveringRef.current = false;
              window.api?.collapseWindow();
              window.api?.enableMousePassthrough();
              setIdle();
            }, 80);
          }, 10);
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
