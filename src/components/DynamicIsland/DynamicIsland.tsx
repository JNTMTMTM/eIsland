/**
 * @file DynamicIsland.tsx
 * @description 灵动岛主容器组件，根据展开状态渲染紧凑态或展开态视图
 * @author 鸡哥
 */

import { useIslandState } from '../../hooks/useIslandState';
import { useNotification } from '../../hooks/useNotification';
import IslandCapsule from './IslandCapsule';
import IslandExpanded from './IslandExpanded';
import { useSettingsStore } from '../../stores/useSettingsStore';

function DynamicIsland() {
  const { expanded, height, width, opacity } = useIslandState();
  const { notifications, unreadCount } = useNotification();
  const { theme } = useSettingsStore();

  const latestNotification = notifications[0];

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden rounded-2xl border"
      style={{
        height: `${height}px`,
        width: `${width}px`,
        opacity,
        backgroundColor: isDark ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDark ? 'rgba(51, 51, 51, 0.8)' : 'rgba(0, 0, 0, 0.1)',
        animation: expanded ? 'island-expand 300ms ease-out' : 'island-collapse 300ms ease-in',
        boxShadow: isDark
          ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          : '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      }}
    >
      {expanded ? (
        <IslandExpanded
          notifications={notifications}
          unreadCount={unreadCount}
        />
      ) : (
        <IslandCapsule
          latestNotification={latestNotification}
          unreadCount={unreadCount}
        />
      )}
    </div>
  );
}

export default DynamicIsland;
