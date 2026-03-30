/**
 * @file IslandCapsule.tsx
 * @description 灵动岛紧凑态（胶囊形态）组件，展示最新通知摘要或空闲状态
 * @author 鸡哥
 */

import { useIslandState } from '../../hooks/useIslandState';
import type { Notification } from '../../types/notification';

interface IslandCapsuleProps {
  latestNotification?: Notification;
  unreadCount: number;
}

function IslandCapsule({ latestNotification, unreadCount }: IslandCapsuleProps) {
  const { expand } = useIslandState();

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <button
      type="button"
      onClick={expand}
      className="w-full h-full flex items-center justify-center gap-3 px-4 cursor-pointer transition-all duration-200 active:scale-95"
    >
      {latestNotification ? (
        <>
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getPriorityColor(latestNotification.priority)}`} />
          <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
            <span className="text-white text-sm font-medium truncate">
              {latestNotification.title}
            </span>
            <span className="text-neutral-400 text-xs flex-shrink-0">
              {latestNotification.appName}
            </span>
          </div>
          {unreadCount > 1 && (
            <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-neutral-700 text-white text-xs font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-500" />
          <span className="text-neutral-400 text-sm">eIsland ready</span>
        </div>
      )}
    </button>
  );
}

export default IslandCapsule;
