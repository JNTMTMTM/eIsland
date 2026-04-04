/**
 * @file HoverContent.tsx
 * @description Hover 状态内容组件
 * @author 鸡哥
 */

import React, { useEffect, useRef } from 'react';
import useIslandStore from '../../../store/slices';
import type { HoverTab } from '../../../store/types';
import '../../../styles/hover/hover.css';
import { TimeTab } from './components/TimeTab';
import { LyricsTab } from './components/LrcTab';
import { WeatherTab } from './components/WeatherTab';

interface HoverContentProps {
  /** 完整时间字符串 (YY-MM-DD HH:MM:SS) */
  fullTimeStr: string;
  /** 农历日期字符串 */
  lunarStr: string;
}

/** 导航点配置 */
const NAV_DOTS: { tab: HoverTab; label: string }[] = [
  { tab: 'time', label: '工具' },
  { tab: 'o3ics', label: '歌曲' },
  { tab: 'weather', label: '天气' },
  { tab: 'expand', label: '展开' },
];

/**
 * Hover 状态内容组件
 * @description 左侧有竖向导航点，点击可切换不同的 hover 界面
 */
export function HoverContent({
  fullTimeStr,
  lunarStr
}: HoverContentProps): React.ReactElement {
  const { hoverTab, setHoverTab, setExpanded } = useIslandStore();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      if (hoverTab === 'time' && target.closest('.timer-inputs')) return;
      e.preventDefault();
      const currentIndex = NAV_DOTS.findIndex(d => d.tab === hoverTab);
      let nextTab: HoverTab;
      if (e.deltaY > 0) {
        nextTab = NAV_DOTS[(currentIndex + 1) % NAV_DOTS.length].tab;
      } else {
        nextTab = NAV_DOTS[(currentIndex - 1 + NAV_DOTS.length) % NAV_DOTS.length].tab;
      }
      if (nextTab === 'expand') {
        setExpanded();
        return;
      }
      setHoverTab(nextTab);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [hoverTab, setHoverTab]);

  return (
    <div className="hover-content" ref={contentRef}>
      <div className="hover-nav-dots">
        {NAV_DOTS.map(({ tab, label }) => (
          <button
            key={tab}
            className={`hover-nav-dot ${hoverTab === tab ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); if (tab === 'expand') { setExpanded(); } else { setHoverTab(tab); } }}
            title={label}
            aria-label={`切换到${label}页面`}
          />
        ))}
      </div>

      <div className="hover-tab-content" onClick={(e) => e.stopPropagation()}>
        {hoverTab === 'time' && (
          <TimeTab
            fullTimeStr={fullTimeStr}
            lunarStr={lunarStr}
          />
        )}
        {hoverTab === 'o3ics' && <LyricsTab />}
        {hoverTab === 'weather' && <WeatherTab />}
      </div>
    </div>
  );
}
