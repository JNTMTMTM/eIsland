/**
 * @file ToolButtons.tsx
 * @description 截图和任务管理器工具按钮组件
 */

import React, { useCallback } from 'react';
import { SvgIcon } from '../../../../utils/SvgIcon';

/**
 * 工具按钮组件
 * @description 提供截图和打开任务管理器两个功能按钮
 */
export function ToolButtons(): React.ReactElement {
  const handleScreenshot = useCallback(async () => {
    try {
      const base64 = await window.api.screenshot();
      if (base64) {
        const link = document.createElement('a');
        link.download = `screenshot_${Date.now()}.png`;
        link.href = `data:image/png;base64,${base64}`;
        link.click();
      }
    } catch (err) {
      console.error('[ToolButtons] screenshot error:', err);
    }
  }, []);

  const handleTaskManager = useCallback(() => {
    window.api.openTaskManager();
  }, []);

  return (
    <div className="timer-tools">
      <button className="action-btn" onClick={handleScreenshot} title="截图">
        <img src={SvgIcon.SCREENSHOT} alt="截图" className="action-btn-icon" />
      </button>
      <button className="action-btn" onClick={handleTaskManager} title="任务管理器">
        <img src={SvgIcon.TASK_MANAGER} alt="任务管理器" className="action-btn-icon" />
      </button>
    </div>
  );
}
