/**
 * @file HoverContent.tsx
 * @description Hover 状态内容组件
 * @author 鸡哥
 */

import React, { useEffect, useRef } from 'react';
import useIslandStore, { HoverTab } from '../../../store/isLandStore';
import '../../../styles/hover.css';
import { TimeTab } from './components/TimeTab';
import { LyricsTab } from './components/LyricsTab';
import { ActionButtons } from './utils/ActionButtons';
import { CountdownEdit } from './utils/CountdownEdit';

interface HoverContentProps {
  /** 完整时间字符串 (YY-MM-DD HH:MM:SS) */
  fullTimeStr: string;
  /** 农历日期字符串 */
  lunarStr: string;
}

/** 导航点配置 */
const NAV_DOTS: { tab: HoverTab; label: string }[] = [
  { tab: 'time', label: '时间' },
  { tab: 'o3ics', label: '歌词' },
];

/**
 * Hover 状态内容组件
 * @description 左侧有竖向导航点，点击可切换不同的 hover 界面
 */
export function HoverContent({
  fullTimeStr,
  lunarStr
}: HoverContentProps): React.ReactElement {
  const { hoverTab, setHoverTab } = useIslandStore();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      if (hoverTab === 'time' && target.closest('.timer-inputs')) return;
      e.preventDefault();
      const currentIndex = NAV_DOTS.findIndex(d => d.tab === hoverTab);
      if (e.deltaY > 0) {
        const next = (currentIndex + 1) % NAV_DOTS.length;
        setHoverTab(NAV_DOTS[next].tab);
      } else {
        const prev = (currentIndex - 1 + NAV_DOTS.length) % NAV_DOTS.length;
        setHoverTab(NAV_DOTS[prev].tab);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [hoverTab, setHoverTab]);

  return (
    <div className="hover-content" ref={contentRef}>
      {/* 左侧操作按钮 */}
      <ActionButtons />

      {/* 左侧竖向导航点 */}
      <div className="hover-nav-dots">
        {NAV_DOTS.map(({ tab, label }) => (
          <button
            key={tab}
            className={`hover-nav-dot ${hoverTab === tab ? 'active' : ''}`}
            onClick={() => setHoverTab(tab)}
            title={label}
            aria-label={`切换到${label}页面`}
          />
        ))}
      </div>

      {/* 右侧内容区域 */}
      <div className="hover-tab-content">
        {hoverTab === 'time' && (
          <div className="time-tab-wrapper">
            <CountdownEdit />
            <div className="timer-divider" />
            <TimeTab
              fullTimeStr={fullTimeStr}
              lunarStr={lunarStr}
            />
          </div>
        )}
        {hoverTab === 'o3ics' && <LyricsTab />}
      </div>
    </div>
  );
}
