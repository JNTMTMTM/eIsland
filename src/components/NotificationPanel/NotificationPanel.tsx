/**
 * @file NotificationPanel.tsx
 * @description 通知面板组件，在灵动岛展开态下展示完整通知列表
 * @author 鸡哥
 */

import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

function NotificationPanel() {
  const { notifications, unreadCount, markAllAsRead, clearAll } = useNotification();

  return (
    <div className="mt-2 p-4 rounded-2xl border border-neutral-700/50 bg-neutral-900/90 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-white text-base font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors text-xs cursor-pointer"
            >
              <Check className="w-3 h-3" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors text-xs cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {notification.title}
                  </p>
                  <p className="text-neutral-400 text-xs mt-0.5">
                    {notification.body}
                  </p>
                </div>
                <span className="text-neutral-500 text-xs">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
              <Bell className="w-8 h-8 text-neutral-600" />
            </div>
            <p className="text-neutral-500 text-sm">No notifications</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;
