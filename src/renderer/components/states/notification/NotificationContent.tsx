/**
 * @file NotificationContent.tsx
 * @description Notification 状态内容组件
 * @author 鸡哥
 */

import React, { useEffect, useRef } from 'react';
import useIslandStore from '../../../store/isLandStore';
import '../../../styles/notification.css';

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
      <button
        className="notification-close"
        onClick={setIdle}
        aria-label="关闭通知"
      >
        ✕
      </button>
    </div>
  );
}
