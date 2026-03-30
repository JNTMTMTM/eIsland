/**
 * @file NotificationItem.tsx
 * @description 单条通知卡片组件，展示通知内容，支持点击标记已读、关闭按钮删除
 * @author 鸡哥
 */

import { X } from 'lucide-react';
import type { Notification } from '../../types/notification';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: () => void;
  onDismiss: () => void;
}

function NotificationItem({ notification, onMarkAsRead, onDismiss }: NotificationItemProps) {
  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-blue-500';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      className={`
        w-full p-3 rounded-xl transition-all duration-200 cursor-pointer
        border-l-2 ${getPriorityColor(notification.priority)}
        ${notification.read ? 'bg-transparent hover:bg-neutral-800/30' : 'bg-neutral-800/50 hover:bg-neutral-800/70'}
      `}
    >
      <div className="flex items-start gap-3">
        {notification.icon ? (
          <img
            src={notification.icon}
            alt=""
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-neutral-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-medium">
              {notification.appName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`text-sm font-medium truncate ${notification.read ? 'text-neutral-400' : 'text-white'}`}>
              {notification.title}
            </span>
            <span className="text-neutral-500 text-xs flex-shrink-0">
              {formatTime(notification.timestamp)}
            </span>
          </div>
          <p className="text-neutral-500 text-xs truncate mb-1">
            {notification.appName}
          </p>
          <p className={`text-sm leading-relaxed ${notification.read ? 'text-neutral-500' : 'text-neutral-300'}`}>
            {notification.body}
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-neutral-700 transition-colors flex-shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5 text-neutral-500" />
        </button>
      </div>
    </div>
  );
}

export default NotificationItem;
