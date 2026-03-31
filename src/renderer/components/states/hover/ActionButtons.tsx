/**
 * @file ActionButtons.tsx
 * @description 隐藏与退出灵动岛的操作按钮组件
 * @author 鸡哥
 */

import React from 'react';

const HIDE_SVG = '/svg/HIDE.svg';
const POWER_OFF_SVG = '/svg/POWER_OFF.svg';

interface ActionButtonsProps {
  /** 隐藏图标路径 */
  hideIcon?: string;
  /** 退出图标路径 */
  powerOffIcon?: string;
}

/**
 * 操作按钮组件
 * @description 提供隐藏灵动岛和退出应用两个功能按钮
 */
export function ActionButtons({
  hideIcon = HIDE_SVG,
  powerOffIcon = POWER_OFF_SVG,
}: ActionButtonsProps): React.ReactElement {
  const handleHide = (): void => {
    window.api.collapseWindow();
  };

  const handleQuit = (): void => {
    window.api.quitApp();
  };

  return (
    <div className="action-buttons">
      <button
        className="action-btn"
        onClick={handleHide}
        title="隐藏灵动岛"
        aria-label="隐藏灵动岛"
      >
        <img src={hideIcon} alt="隐藏" className="action-btn-icon" />
      </button>
      <button
        className="action-btn"
        onClick={handleQuit}
        title="退出灵动岛"
        aria-label="退出灵动岛"
      >
        <img src={powerOffIcon} alt="退出" className="action-btn-icon" />
      </button>
    </div>
  );
}
