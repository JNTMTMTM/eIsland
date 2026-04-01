/**
 * @file DynamicIsland.tsx
 * @description 灵动岛主组件，使用状态模式管理 idle/hover/expanded 等状态
 * @author 鸡哥
 */

import React, { useEffect, useRef, useState } from 'react';
import useIslandStore from '../store/isLandStore';
import { formatTime, formatFullTime, getDayName, getLunarDate } from '../utils/timeUtils';
import { IdleContent } from './states/idle/IdleContent';
import { HoverContent } from './states/hover/HoverContent';
import { NotificationContent } from './states/notification/NotificationContent';
import { ExpandedContent } from './states/expand/ExpandedContent';

/** 灵动岛状态类型 */
export type IslandState = 'idle' | 'hover' | 'expanded' | 'notification' | 'minimal';

/** 状态配置接口 */
interface StateConfig {
  /** 状态名称 */
  name: IslandState;
  /** 是否启用鼠标穿透 */
  mousePassthrough: boolean;
  /** 是否展开窗口 */
  expanded: boolean;
  /** 状态切换延迟（毫秒） */
  enterDelay: number;
  /** 状态退出延迟（毫秒） */
  leaveDelay: number;
}

/** 状态配置映射表 */
export const STATE_CONFIGS: Record<IslandState, StateConfig> = {
  idle: {
    name: 'idle',
    mousePassthrough: true,
    expanded: false,
    enterDelay: 0,
    leaveDelay: 0,
  },
  hover: {
    name: 'hover',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 60,
    leaveDelay: 80,
  },
  expanded: {
    name: 'expanded',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  notification: {
    name: 'notification',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  minimal: {
    name: 'minimal',
    mousePassthrough: true,
    expanded: false,
    enterDelay: 0,
    leaveDelay: 0,
  },
};

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
 * 获取状态对应的 CSS 类名
 * @param state 当前状态
 * @returns CSS 类名字符串
 */
export function getStateClassName(state: IslandState): string {
  return state === 'idle' ? '' : state;
}

/**
 * 状态渲染配置
 */
interface StateRenderer {
  /** 状态名称 */
  state: IslandState;
  /** 渲染函数 */
  render: () => React.ReactNode;
}

/**
 * 灵动岛主组件
 * @description 使用状态模式管理不同状态的 UI 渲染，通过 requestAnimationFrame 检测鼠标位置实现可靠的 hover 交互
 */
function DynamicIsland(): React.JSX.Element {
  const { state, weather, setHover, setIdle, timerData, setTimerData, notification, setNotification } = useIslandStore();

  const initRef = useRef(false);
  const isHoveringRef = useRef(false);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setNotificationRef = useRef(setNotification);
  setNotificationRef.current = setNotification;

  const [timeStr, setTimeStr] = useState(() => formatTime(new Date()));
  const [dayStr, setDayStr] = useState(() => getDayName(new Date()));
  const [fullTimeStr, setFullTimeStr] = useState(() => formatFullTime(new Date()));
  const [lunarStr, setLunarStr] = useState(() => getLunarDate(new Date()));

  // 全局计时器逻辑
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (timerData?.state === 'running' && timerData.remainingSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        const next = (timerData.remainingSeconds ?? 0) - 1;
        if (next <= 0) {
          setTimerData({
            state: 'idle',
            remainingSeconds: 0,
            inputHours: '00',
            inputMinutes: '00',
            inputSeconds: '00',
          });
          setNotificationRef.current({
            title: '计时器',
            body: '倒计时已结束',
            icon: '/svg/TIMER.svg'
          });
        } else {
          setTimerData({ remainingSeconds: next });
        }
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timerData?.state, timerData?.remainingSeconds, setTimerData]);

  useEffect(() => {
    const update = (): void => {
      const now = new Date();
      setTimeStr(formatTime(now));
      setDayStr(getDayName(now));
      setFullTimeStr(formatFullTime(now));
      setLunarStr(getLunarDate(now));
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

  const clearAllTimers = () => {
    if (enterTimerRef.current !== null) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (leaveTimerRef.current !== null) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  useEffect(() => {
    let rafId: number | null = null;

    const checkMousePosition = async (): Promise<void> => {
      const inWindow = await isMouseInWindow();
      const config = STATE_CONFIGS[state];

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
            if (config.mousePassthrough) {
              window.api?.disableMousePassthrough();
            }
            setHover();
          });
        }
      } else {
        if (enterTimerRef.current !== null) {
          clearTimeout(enterTimerRef.current);
          enterTimerRef.current = null;
        }

        if (isHoveringRef.current && leaveTimerRef.current === null) {
          leaveTimerRef.current = setTimeout(() => {
            leaveTimerRef.current = null;
            if (!isHoveringRef.current) return;

            isHoveringRef.current = false;
            setIdle();
            if (config.expanded) {
              window.api?.collapseWindow();
            }
            if (config.mousePassthrough) {
              window.api?.enableMousePassthrough();
            }
          });
        }
      }

      rafId = requestAnimationFrame(checkMousePosition);
    };

    rafId = requestAnimationFrame(checkMousePosition);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearAllTimers();
    };
  }, [state, setHover, setIdle, clearAllTimers]);

  // 状态渲染配置
  const stateRenderers: StateRenderer[] = [
    {
      state: 'idle',
      render: () => (
        <IdleContent
          timeStr={timeStr}
          dayStr={dayStr}
          weather={weather}
          timerState={timerData?.state ?? 'idle'}
          remainingSeconds={timerData?.remainingSeconds ?? 0}
        />
      ),
    },
    {
      state: 'hover',
      render: () => (
        <HoverContent
          fullTimeStr={fullTimeStr}
          lunarStr={lunarStr}
        />
      ),
    },
    {
      state: 'expanded',
      render: () => (
        <ExpandedContent />
      ),
    },
    {
      state: 'notification',
      render: () => (
        <NotificationContent
          title={notification.title}
          body={notification.body}
          icon={notification.icon}
        />
      ),
    },
  ];

  return (
    <div className={`island-shell ${getStateClassName(state)}`}>
      {stateRenderers
        .filter(renderer => renderer.state === state)
        .map(renderer => renderer.render())}
    </div>
  );
}

export default DynamicIsland;
