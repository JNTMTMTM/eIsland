/**
 * @file App.tsx
 * @description 根组件，根据灵动岛展开状态渲染对应视图
 * @author 鸡哥
 */

import { useIslandStore } from './stores/useIslandStore';
import { useNotificationStore } from './stores/useNotificationStore';
import DynamicIsland from './components/DynamicIsland/DynamicIsland';
import NotificationPanel from './components/NotificationPanel/NotificationPanel';

function App() {
  const { expanded } = useIslandStore();
  const { notifications } = useNotificationStore();

  return (
    <div className="w-full h-full">
      <DynamicIsland />
      {expanded && notifications.length > 0 && <NotificationPanel />}
    </div>
  );
}

export default App;
