/**
 * @file MaxExpandContent.tsx
 * @description 最大展开模式内容组件，独立于 Expanded 的大面板，包含 AI 对话和设置 Tab
 * @author 鸡哥
 */

import React, { useEffect, useRef, useState } from 'react';
import useIslandStore from '../../../store/slices';
import '../../../styles/settings/settings.css';
import { AiChatTab } from './components/AiChatTab';
import { TodoTab } from './components/TodoTab';
import { SettingsTab } from './components/SettingsTab';

/** 最大展开模式下的子标签页类型 */
type MaxExpandTab = 'aiChat' | 'todo' | 'settings';

/** 导航点标识 — 含特殊动作：expanded 返回 */
type NavDotId = MaxExpandTab | 'expanded';

/** 导航点配置 */
const NAV_DOTS: { id: NavDotId; label: string }[] = [
  { id: 'expanded', label: '返回' },
  { id: 'todo', label: '待办' },
  { id: 'aiChat', label: 'AI 对话' },
  { id: 'settings', label: '设置' },
];

/**
 * 最大展开模式内容组件
 * @description 包含 AI 对话窗口和设置面板，底部导航点切换 Tab 或返回 expanded
 */
export function MaxExpandContent(): React.ReactElement {
  const { setExpanded } = useIslandStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<MaxExpandTab>('todo');
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  /** 滚轮切换 Tab */
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      if (target.closest('.expand-todo-list')) return;
      if (target.closest('.max-expand-settings')) return;
      if (target.closest('.max-expand-chat-messages')) return;
      if (target.closest('.max-expand-chat-input')) return;
      if (target.closest('.settings-field-input')) return;
      if (target.closest('.settings-field-textarea')) return;
      e.preventDefault();

      const cur = activeTabRef.current;
      const currentIndex = NAV_DOTS.findIndex(d => d.id === cur);
      let nextId: NavDotId;
      if (e.deltaY > 0) {
        nextId = NAV_DOTS[(currentIndex + 1) % NAV_DOTS.length].id;
      } else {
        nextId = NAV_DOTS[(currentIndex - 1 + NAV_DOTS.length) % NAV_DOTS.length].id;
      }
      if (nextId === 'expanded') { setExpanded(); return; }
      setActiveTab(nextId);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [setExpanded]);

  /** 导航点点击 */
  const handleNavClick = (id: NavDotId): void => {
    if (id === 'expanded') { setExpanded(); return; }
    setActiveTab(id);
  };

  return (
    <div className="settings-content" ref={contentRef}>
      {/* Tab 内容区域 */}
      <div className="max-expand-tab-content" onClick={(e) => e.stopPropagation()}>
        {activeTab === 'aiChat' && <AiChatTab />}
        {activeTab === 'todo' && <TodoTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>

      {/* 底部导航点 */}
      <div className="settings-nav-dots" onClick={(e) => e.stopPropagation()}>
        {NAV_DOTS.map(({ id, label }) => (
          <button
            key={id}
            className={`settings-nav-dot ${activeTab === id ? 'active' : ''}`}
            onClick={() => handleNavClick(id)}
            title={label}
            aria-label={`切换到${label}`}
          />
        ))}
      </div>
    </div>
  );
}
