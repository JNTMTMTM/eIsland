/**
 * @file DynamicIsland.tsx
 * @description 灵动岛主组件，根据 hover/idle 状态渲染不同 UI，响应鼠标事件并控制窗口穿透
 * @author 鸡哥
 */

import React, { useEffect, useRef } from 'react';
// import { Activity, Moon } from 'lucide-react';
import useIslandStore from '../store/isLandStore';

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
  const { state, setHover, setIdle } = useIslandStore();

  /** 标记是否已完成初始化，防止 StrictMode 双挂载导致状态抖动 */
  const initRef = useRef(false);

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
        <div className="flex items-center gap-2">
          <span className="text-xs text-[--color-island-text] opacity-60 tracking-wide font-medium">
            静默状态
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm text-[--color-island-text] tracking-wide font-medium">
            hover 状态
          </span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[--color-island-accent] animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-[--color-island-pill] animate-pulse opacity-70" />
            <div className="w-1.5 h-1.5 rounded-full bg-[--color-island-accent] opacity-40 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}

export default DynamicIsland;
