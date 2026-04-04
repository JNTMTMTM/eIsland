/**
 * @file SettingsContent.tsx
 * @description Settings 状态内容组件，独立于 Expanded 的设置面板
 * @author 鸡哥
 */

import React, { useEffect, useRef } from 'react';
import useIslandStore from '../../../store/slices';
import '../../../styles/settings/settings.css';

/**
 * Settings 状态内容组件
 * @description 独立的设置面板，底部导航点可返回 expanded 状态
 */
export function SettingsContent(): React.ReactElement {
  const { setExpanded } = useIslandStore();
  const contentRef = useRef<HTMLDivElement>(null);

  /** 滚轮返回 expanded */
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent): void => {
      e.preventDefault();
      setExpanded();
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [setExpanded]);

  return (
    <div className="settings-content" ref={contentRef}>
      {/* 设置主体区域 */}
      <div className="settings-body" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm text-white opacity-40">设置</span>
      </div>

      {/* 底部导航点 — 返回 expanded */}
      <div className="settings-nav-dots" onClick={(e) => e.stopPropagation()}>
        <button
          className="settings-nav-dot"
          onClick={() => setExpanded()}
          title="返回"
          aria-label="返回到展开界面"
        />
        <button
          className="settings-nav-dot active"
          title="设置"
          aria-label="设置"
        />
      </div>
    </div>
  );
}
