/**
 * @file ToolsTab.tsx
 * @description Expanded 系统工具 Tab
 * @author 鸡哥
 */

import React from 'react';

/**
 * 系统工具 Tab
 * @description 展开状态下的系统工具面板（截图、任务管理器等）
 */
export function ToolsTab(): React.ReactElement {
  return (
    <div className="expand-tab-panel">
      <span className="text-sm text-white opacity-40">系统工具</span>
    </div>
  );
}
