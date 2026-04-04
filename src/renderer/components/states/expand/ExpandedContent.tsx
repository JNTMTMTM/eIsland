/**
 * @file ExpandedContent.tsx
 * @description Expanded 状态内容组件，单击灵动岛后展开的快捷操作面板
 * @author 鸡哥
 */

import React, { useEffect, useRef } from 'react';
import useIslandStore from '../../../store/slices';
import type { ExpandTab } from '../../../store/types';
import '../../../styles/expanded/expanded.css';
import { MusicTab } from './components/MusicTab';
import { ToolsTab } from './components/ToolsTab';
import { SettingsTab } from './components/SettingsTab';

/** 导航点配置 */
const EXPAND_NAV_DOTS: { tab: ExpandTab; label: string }[] = [
  { tab: 'music', label: '音乐' },
  { tab: 'tools', label: '工具' },
  { tab: 'settings', label: '设置' },
];

/**
 * Expanded 状态内容组件
 * @description 扩展状态下的完整功能面板，底部正中间导航点切换 Tab
 * @returns Expanded 状态下的 UI 元素
 */
export function ExpandedContent(): React.ReactElement {
  const { expandTab, setExpandTab } = useIslandStore();
  const contentRef = useRef<HTMLDivElement>(null);

  /** 滚轮切换 Tab */
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const currentIndex = EXPAND_NAV_DOTS.findIndex(d => d.tab === expandTab);
      if (e.deltaY > 0) {
        const next = (currentIndex + 1) % EXPAND_NAV_DOTS.length;
        setExpandTab(EXPAND_NAV_DOTS[next].tab);
      } else {
        const prev = (currentIndex - 1 + EXPAND_NAV_DOTS.length) % EXPAND_NAV_DOTS.length;
        setExpandTab(EXPAND_NAV_DOTS[prev].tab);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [expandTab, setExpandTab]);

  return (
    <div className="expanded-content" ref={contentRef}>
      {/* Tab 内容区域 */}
      <div className="expand-tab-content" onClick={(e) => e.stopPropagation()}>
        {expandTab === 'music' && <MusicTab />}
        {expandTab === 'tools' && <ToolsTab />}
        {expandTab === 'settings' && <SettingsTab />}
      </div>

      {/* 底部导航点 */}
      <div className="expand-nav-dots" onClick={(e) => e.stopPropagation()}>
        {EXPAND_NAV_DOTS.map(({ tab, label }) => (
          <button
            key={tab}
            className={`expand-nav-dot ${expandTab === tab ? 'active' : ''}`}
            onClick={() => setExpandTab(tab)}
            title={label}
            aria-label={`切换到${label}页面`}
          />
        ))}
      </div>
    </div>
  );
}
