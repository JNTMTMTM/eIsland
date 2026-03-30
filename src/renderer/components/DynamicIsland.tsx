/**
 * @file DynamicIsland.tsx
 * @description 灵动岛主组件，根据 hover/idle 状态渲染不同 UI，响应鼠标事件并控制窗口穿透
 * @author 鸡哥
 */

import React, { useEffect, useRef, useState } from 'react';
import useIslandStore from '../store/isLandStore';
import { formatTime, getDayName } from '../utils/timeUtils';

/** 渲染进程自定义 API 类型声明 */
declare global {
  interface Window {
    api: {
      enableMousePassthrough: () => void;
      disableMousePassthrough: () => void;
    };
  }
}

function DynamicIsland(): React.JSX.Element {
  const { state, weather, setHover, setIdle } = useIslandStore();

  /** 标记是否已完成初始化，防止 StrictMode 双挂载导致状态抖动 */
  const initRef = useRef(false);

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

  /**
   * 组件挂载时初始化鼠标穿透
   * 避免 Electron 透明窗口遮挡下层应用
   * 仅在首次挂载时执行一次
   */
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      window.api?.enableMousePassthrough();
    }
  }, []);

  /**
   * 鼠标进入灵动岛时：禁用穿透并切换到 hover 状态
   */
  const handleMouseEnter = (): void => {
    window.api?.disableMousePassthrough();
    setHover();
  };

  /**
   * 鼠标离开灵动岛时：恢复穿透并切换到 idle 状态
   */
  const handleMouseLeave = (): void => {
    window.api?.enableMousePassthrough();
    setIdle();
  };

  return (
    <div
      className={`island-shell ${state === 'hover' ? 'hover' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {state === 'idle' ? (
        <div className="flex items-center justify-between w-full px-6">
          {/* 左侧：时间 + 星期 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-white font-medium tabular-nums">
              {timeStr}
            </span>
            <span className="text-xs text-white opacity-50">
              {dayStr}
            </span>
          </div>
          {/* 右侧：天气文字 + 温度 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white opacity-60">
              {weather.description || '—'}
            </span>
            <span className="text-sm text-white font-medium tabular-nums">
              {weather.temperature > 0 ? `${weather.temperature}°` : '--°'}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full px-6">
          {/* 左侧：时间 + 星期 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-white font-medium tabular-nums">
              {timeStr}
            </span>
            <span className="text-xs text-white opacity-50">
              {dayStr}
            </span>
          </div>
          {/* 右侧：天气文字 + 温度 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white opacity-60">
              {weather.description || '—'}
            </span>
            <span className="text-sm text-white font-medium tabular-nums">
              {weather.temperature > 0 ? `${weather.temperature}°` : '--°'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DynamicIsland;
