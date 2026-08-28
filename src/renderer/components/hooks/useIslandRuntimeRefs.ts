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
 * @file useIslandRuntimeRefs.ts
 * @description 灵动岛运行时 Ref 容器 Hook。
 * @author 鸡哥
 */

import { useLayoutEffect, useRef } from 'react';
import type { NotificationData } from '../../store/types';

interface UseIslandRuntimeRefsOptions {
  setNotification: (data: NotificationData) => void;
}

interface IslandRuntimeRefsState {
  initRef: React.MutableRefObject<boolean>;
  isHoveringRef: React.MutableRefObject<boolean>;
  enterTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  leaveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setNotificationRef: React.MutableRefObject<(data: NotificationData) => void>;
  expandLeaveIdleRef: React.MutableRefObject<boolean>;
  maxExpandLeaveIdleRef: React.MutableRefObject<boolean>;
  idleClickExpandRef: React.MutableRefObject<boolean>;
  pendingAnnouncementAfterGuideRef: React.MutableRefObject<boolean>;
  pendingAnnouncementAppVersionRef: React.MutableRefObject<string>;
  startupAutoCheckHandledRef: React.MutableRefObject<boolean>;
  autoDimEnabledRef: React.MutableRefObject<boolean>;
  autoDimDelayRef: React.MutableRefObject<number>;
  positionLockedRef: React.MutableRefObject<boolean>;
}

/**
 * @description 创建并维护灵动岛运行时共享 refs。
 * @param options - 运行时 refs 初始化参数。
 * @returns 运行时共享 refs 集合。
 */
export function useIslandRuntimeRefs(options: UseIslandRuntimeRefsOptions): IslandRuntimeRefsState {
  const { setNotification } = options;

  const initRef = useRef(false);
  const isHoveringRef = useRef(false);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setNotificationRef = useRef(setNotification);
  const expandLeaveIdleRef = useRef(false);
  const maxExpandLeaveIdleRef = useRef(false);
  const idleClickExpandRef = useRef(false);
  const pendingAnnouncementAfterGuideRef = useRef(false);
  const pendingAnnouncementAppVersionRef = useRef('');
  const startupAutoCheckHandledRef = useRef(false);
  const autoDimEnabledRef = useRef(false);
  const autoDimDelayRef = useRef(10);
  const positionLockedRef = useRef(false);

  useLayoutEffect(() => {
    setNotificationRef.current = setNotification;
  }, [setNotification]);

  return {
    initRef,
    isHoveringRef,
    enterTimerRef,
    leaveTimerRef,
    setNotificationRef,
    expandLeaveIdleRef,
    maxExpandLeaveIdleRef,
    idleClickExpandRef,
    pendingAnnouncementAfterGuideRef,
    pendingAnnouncementAppVersionRef,
    startupAutoCheckHandledRef,
    autoDimEnabledRef,
    autoDimDelayRef,
    positionLockedRef,
  };
}
