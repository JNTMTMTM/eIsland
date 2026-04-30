/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file OverviewPreview.tsx
 * @description 设置页面 - 灵动岛总览静态预览组件
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { OverviewLayoutConfig, OverviewWidgetType } from '../../../../../../expand/components/OverviewTab';
import { SvgIcon } from '../../../../../../../../utils/SvgIcon';

interface PreviewCountdownItem {
  id: number;
  name: string;
  date: string;
  color: string;
  type: string;
  description?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
}

const CD_TYPE_LABELS: Record<string, string> = {
  countdown: '倒数日',
  anniversary: '纪念日',
  birthday: '生日',
  holiday: '节日',
  exam: '考试',
};

function previewDiffDays(targetStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 渲染灵动岛总览静态预览
 * @param layoutConfig - 总览左右卡片布局配置
 * @returns 灵动岛预览区域
 */
export function OverviewPreview({ layoutConfig }: { layoutConfig: OverviewLayoutConfig }): ReactElement {
  const [cdItems, setCdItems] = useState<PreviewCountdownItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead('countdown-dates').then((data) => {
      if (cancelled) return;
      if (Array.isArray(data)) setCdItems(data as PreviewCountdownItem[]);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const cdSorted = [...cdItems].sort((a, b) => {
    const da = Math.abs(previewDiffDays(a.date));
    const db = Math.abs(previewDiffDays(b.date));
    return da - db;
  }).slice(0, 2);

  const renderWidget = (type: OverviewWidgetType): ReactNode => {
    switch (type) {
      case 'shortcuts':
        return (
          <div className="ov-dash-apps-wrap">
            <div className="ov-dash-apps-header">
              <span className="ov-dash-apps-title">快捷启动</span>
              <span className="ov-dash-apps-count">预览</span>
            </div>
            <div className="ov-dash-apps">
              {['应用A', '应用B', '应用C'].map(name => (
                <div key={name} className="ov-dash-app-item" style={{ cursor: 'default' }}>
                  <div className="ov-dash-app-icon-placeholder">📂</div>
                  <span className="ov-dash-app-name">{name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'todo':
        return (
          <div className="ov-dash-todo">
            <div className="ov-dash-todo-header">
              <span className="ov-dash-todo-title">待办事项</span>
              <div className="ov-dash-todo-stats">
                <span className="ov-dash-todo-stat done">✓ 2</span>
                <span className="ov-dash-todo-stat undone">○ 3</span>
              </div>
            </div>
            <div className="ov-dash-todo-list">
              {['示例待办 A', '示例待办 B', '示例待办 C'].map(text => (
                <div key={text} className="ov-dash-todo-item">
                  <div className="ov-dash-todo-row" style={{ cursor: 'default' }}>
                    <span className="ov-dash-todo-check" style={{ cursor: 'default' }}>○</span>
                    <span className="ov-dash-todo-text">{text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'song':
        return (
          <div className="ov-dash-widget ov-dash-song-widget">
            <div className="ov-dash-widget-header">
              <span className="ov-dash-widget-title">正在播放</span>
            </div>
            <div className="ov-dash-song-content">
              <div className="ov-dash-song-body">
                <div className="ov-dash-song-cover" style={{ background: 'rgba(var(--color-text-rgb),0.08)' }} />
                <div className="ov-dash-song-info">
                  <div className="ov-dash-song-title">示例歌曲</div>
                  <div className="ov-dash-song-artist">示例艺术家</div>
                  <div className="ov-dash-song-album">示例专辑</div>
                </div>
              </div>
              <div className="ov-dash-song-controls">
                <span className="ov-dash-song-btn" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.PREVIOUS_SONG} alt="" className="ov-dash-song-btn-icon ov-dash-song-btn-icon--sm" />
                </span>
                <span className="ov-dash-song-btn ov-dash-song-btn-play" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.PAUSE} alt="" className="ov-dash-song-btn-icon" />
                </span>
                <span className="ov-dash-song-btn" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.NEXT_SONG} alt="" className="ov-dash-song-btn-icon ov-dash-song-btn-icon--sm" />
                </span>
              </div>
            </div>
          </div>
        );
      case 'album':
        return (
          <div className="ov-dash-widget ov-dash-album-widget">
            <div className="ov-dash-widget-header">
              <span className="ov-dash-widget-title">相册轮播</span>
              <span className="ov-dash-album-count">3 项</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="ov-dash-album-card" style={{ cursor: 'default', flex: '0 0 292px', width: '92px', height: '112px' }}>
                <div className="ov-dash-album-fallback">
                  <img src={SvgIcon.MUSIC} alt="" className="ov-dash-album-fallback-icon" />
                  <span className="ov-dash-album-fallback-text">示例预览</span>
                </div>
                <div className="ov-dash-album-mask" />
                <div className="ov-dash-album-meta">
                  <div className="ov-dash-album-name">示例图片.jpg</div>
                  <div className="ov-dash-album-position">1 / 3</div>
                </div>
                <div className="ov-dash-album-controls">
                  <span className="ov-dash-album-btn">
                    <img src={SvgIcon.PREVIOUS} alt="上一张" className="ov-dash-album-btn-icon" />
                  </span>
                  <span className="ov-dash-album-btn ov-dash-album-btn-play">
                    <img src={SvgIcon.PAUSE} alt="暂停轮播" className="ov-dash-album-btn-icon" />
                  </span>
                  <span className="ov-dash-album-btn">
                    <img src={SvgIcon.NEXT} alt="下一张" className="ov-dash-album-btn-icon" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      case 'countdown':
        return (
          <div className="ov-dash-widget ov-dash-countdown-widget">
            <div className="ov-dash-widget-header">
              <span className="ov-dash-widget-title">倒数日</span>
            </div>
            {cdSorted.length === 0 ? (
              <div className="ov-dash-countdown-empty">暂无倒数日</div>
            ) : (
              <div className="ov-dash-countdown-cards">
                {cdSorted.map(item => {
                  const days = previewDiffDays(item.date);
                  const typeLabel = CD_TYPE_LABELS[item.type] || item.type;
                  return (
                    <div
                      key={item.id}
                      className={`cd-card cd-card-${item.type} ov-cd-card`}
                      style={{ borderColor: item.color, cursor: 'default' }}
                    >
                      {item.backgroundImage && (
                        <div className="cd-card-bg" style={{ backgroundImage: `url(${item.backgroundImage})`, opacity: item.backgroundOpacity ?? 0.5 }} />
                      )}
                      <div className="cd-card-overlay" style={{ background: `linear-gradient(135deg, ${item.color}30, ${item.color}10)` }} />
                      <div className="cd-card-content">
                        <div className="cd-card-top-row">
                          <span className="cd-card-type-badge" style={{ background: `${item.color}50`, color: '#fff' }}>{typeLabel}</span>
                        </div>
                        <div className="cd-card-name">{item.name}</div>
                        {item.description && <div className="cd-card-desc">{item.description}</div>}
                        <div className="cd-card-bottom">
                          <span className="cd-card-date">{item.date}</span>
                          <span className="cd-card-days" style={{ color: item.color }}>
                            {days > 0 ? `${days} 天后` : days === 0 ? '就是今天' : `${Math.abs(days)} 天前`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'pomodoro':
        return (
          <div className="ov-dash-widget ov-dash-pomodoro-widget">
            <div className="ov-dash-widget-header">
              <span className="ov-dash-widget-title">番茄钟</span>
              <span className="ov-dash-pomodoro-count">
                <img src={SvgIcon.POMODORO} alt="番茄" className="ov-dash-pomodoro-icon" />
                3
                <button className="ov-dash-pomodoro-count-reset" type="button" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.REVERT} alt="重置" className="ov-dash-pomodoro-count-reset-icon" />
                </button>
              </span>
            </div>
            <div className="ov-dash-pomodoro-body">
              <div className="ov-dash-pomodoro-ring-wrap">
                <svg className="ov-dash-pomodoro-ring" viewBox="0 0 84 84">
                  <circle className="ov-dash-pomodoro-ring-bg" cx="42" cy="42" r="38" />
                  <circle
                    className="ov-dash-pomodoro-ring-progress"
                    cx="42" cy="42" r="38"
                    style={{ stroke: '#ff6b6b', strokeDasharray: 2 * Math.PI * 38, strokeDashoffset: 2 * Math.PI * 38 * 0.3 }}
                  />
                </svg>
                <div className="ov-dash-pomodoro-ring-inner">
                  <div className="ov-dash-pomodoro-time">25:00</div>
                  <div className="ov-dash-pomodoro-phase" style={{ color: '#ff6b6b' }}>专注中</div>
                </div>
              </div>
              <div className="ov-dash-pomodoro-timeline">
                <div className="ov-dash-pomodoro-tl-item ov-dash-pomodoro-tl-item--empty">
                  <div className="ov-dash-pomodoro-tl-dot" />
                </div>
                <div className="ov-dash-pomodoro-tl-item ov-dash-pomodoro-tl-item--current">
                  <div className="ov-dash-pomodoro-tl-dot ov-dash-pomodoro-tl-dot--current" style={{ background: '#ff6b6b', boxShadow: '0 0 5px #ff6b6b99' }} />
                  <div className="ov-dash-pomodoro-tl-info">
                    <span className="ov-dash-pomodoro-tl-name ov-dash-pomodoro-tl-name--current">专注中</span>
                    <span className="ov-dash-pomodoro-tl-dur ov-dash-pomodoro-tl-dur--current" style={{ color: '#ff6b6b' }}>25:00</span>
                  </div>
                </div>
                <div className="ov-dash-pomodoro-tl-item">
                  <div className="ov-dash-pomodoro-tl-dot" />
                  <div className="ov-dash-pomodoro-tl-info">
                    <span className="ov-dash-pomodoro-tl-name">短休息</span>
                    <span className="ov-dash-pomodoro-tl-dur">5m</span>
                  </div>
                </div>
              </div>
              <div className="ov-dash-pomodoro-controls">
                <button className="ov-dash-pomodoro-btn" type="button" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.CONTINUE} alt="开始" className="ov-dash-pomodoro-btn-icon" />
                </button>
                <button className="ov-dash-pomodoro-btn" type="button" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.REVERT} alt="重置" className="ov-dash-pomodoro-btn-icon" />
                </button>
                <button className="ov-dash-pomodoro-btn" type="button" style={{ cursor: 'default' }}>
                  <img src={SvgIcon.NEXT_SONG} alt="跳过" className="ov-dash-pomodoro-btn-icon" />
                </button>
              </div>
            </div>
          </div>
        );
      case 'mokugyo':
        return (
          <div className="ov-dash-widget ov-dash-mokugyo-widget">
            <div className="ov-dash-widget-header">
              <span className="ov-dash-widget-title">电子木鱼</span>
            </div>
            <div className="ov-dash-mokugyo-body" style={{ justifyContent: 'center' }}>
              <span className="ov-dash-mokugyo-hit-btn" style={{ cursor: 'default' }}>
                <img src={SvgIcon.MOKUGYO} alt="" className="ov-dash-mokugyo-icon" aria-hidden="true" />
              </span>
            </div>
          </div>
        );
      case 'urlFavorites': {
        const sampleItems = [
          { name: 'GitHub', note: '代码托管' },
          { name: 'Google', note: '' },
          { name: 'Stack Overflow', note: '技术问答' },
        ];
        return (
          <div className="ov-dash-widget ov-dash-url-favorites-widget">
            <div className="ov-dash-widget-header">
              <span className="ov-dash-widget-title">URL 收藏</span>
              <span className="ov-dash-url-favorites-count">3 条</span>
            </div>
            <div className="ov-dash-url-favorites-list">
              {sampleItems.map((item) => (
                <div key={item.name} className="ov-dash-url-favorites-item" style={{ cursor: 'default' }}>
                  <div className="ov-dash-url-favorites-favicon-placeholder" />
                  <span className="ov-dash-url-favorites-name">{item.name}</span>
                  {item.note && <span className="ov-dash-url-favorites-note">{item.note}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="expand-tab-panel overview-dashboard">
      <div className="ov-dash-slot ov-dash-slot-left">
        {renderWidget(layoutConfig.left)}
      </div>
      <div className="ov-dash-time">
        <span className="ov-dash-date">2026年01月01日 星期四</span>
        <span className="ov-dash-clock">12:00:00</span>
        <span className="ov-dash-lunar">乙巳年 腊月十二</span>
        <div className="ov-dash-yiji">
          <div className="ov-dash-yiji-row">
            <span className="ov-dash-yiji-label yi">宜</span>
            <span className="ov-dash-yiji-items">祈福 · 出行 · 开市</span>
          </div>
          <div className="ov-dash-yiji-row">
            <span className="ov-dash-yiji-label ji">忌</span>
            <span className="ov-dash-yiji-items">动土 · 安葬 · 破土</span>
          </div>
        </div>
      </div>
      <div className="ov-dash-slot ov-dash-slot-right">
        {renderWidget(layoutConfig.right)}
      </div>
    </div>
  );
}
