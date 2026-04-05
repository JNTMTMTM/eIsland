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
 * @file NotificationContent.tsx
 * @description Notification 状态内容组件
 * @author 鸡哥
 */

import React, { useEffect, useRef } from 'react';
import useIslandStore from '../../../store/slices';
import '../../../styles/notification/notification.css';

interface NotificationContentProps {
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  body: string;
  /** 通知图标（可选） */
  icon?: string;
}

/**
 * Notification 状态内容组件
 * @description 通知状态，用于显示应用推送或系统通知
 */
export function NotificationContent({
  title,
  body,
  icon,
}: NotificationContentProps): React.ReactElement {
  const { setIdle } = useIslandStore();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIdle();
    }, 5000);
    return () => clearTimeout(timer);
  }, [setIdle]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleClick = (e: MouseEvent): void => {
      const target = e.target as HTMLElement;
      if (target.closest('.notification-close')) return;
      setIdle();
    };

    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [setIdle]);

  return (
    <div className="notification-content" ref={contentRef}>
      <div className="notification-icon">
        {icon ? (
          <img src={icon} alt="" className="notification-icon-img" />
        ) : (
          <div className="notification-icon-default" />
        )}
      </div>
      <div className="notification-info">
        <span className="notification-title">{title}</span>
        <span className="notification-body">{body}</span>
      </div>
    </div>
  );
}
