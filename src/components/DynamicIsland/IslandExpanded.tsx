/**
 * @file IslandExpanded.tsx
 * @description 灵动岛展开态（全宽面板）组件，展示通知列表，支持标记已读、关闭操作
 * @author 鸡哥
 */

import { ChevronDown, Bell } from 'lucide-react';
import { useIslandState } from '../../hooks/useIslandState';
import { useNotification } from '../../hooks/useNotification';
import type { Notification } from '../../types/notification';
import NotificationItem from '../NotificationPanel/NotificationItem';

interface IslandExpandedProps {
  notifications: Notification[];
  unreadCount: number;
}

function IslandExpanded({ notifications, unreadCount }: IslandExpandedProps) {
  const { collapse } = useIslandState();
  const { markAsRead, remove } = useNotification();

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-700/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-white text-sm font-semibold">eIsland</span>
          {unreadCount > 0 && (
            <span className="text-neutral-400 text-xs">
              {unreadCount} unread
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={collapse}
          className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-700 hover:bg-neutral-600 transition-colors cursor-pointer"
        >
          <ChevronDown className="w-3 h-3 text-neutral-300" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {notifications.length > 0 ? (
          <div className="space-y-1 px-2">
            {notifications.slice(0, 10).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={() => markAsRead(notification.id)}
                onDismiss={() => remove(notification.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-800 flex items-center justify-center">
                <Bell className="w-6 h-6 text-neutral-500" />
              </div>
              <p className="text-neutral-500 text-sm">No notifications</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IslandExpanded;
