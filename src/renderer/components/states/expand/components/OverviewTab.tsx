/**
 * @file OverviewTab.tsx
 * @description Expanded 总览 Tab — 仪表盘式概览：时间、天气、音乐状态、倒计时、待办
 * @author 鸡哥
 */

import React, { useEffect, useState } from 'react';
import useIslandStore from '../../../../store/slices';
import { SvgIcon } from '../../../../utils/SvgIcon';
import { formatTime, getDayName, getLunarDate } from '../../../../utils/timeUtils';

/** 格式化倒计时剩余 */
function formatCountdownRemaining(targetDate: string): string {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return '已到期';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}天${h}时`;
  if (h > 0) return `${h}时${m}分`;
  return `${m}分`;
}

/**
 * 总览 Tab
 * @description 展开状态下仪表盘式概览面板
 */
export function OverviewTab(): React.ReactElement {
  const {
    isMusicPlaying, isPlaying, mediaInfo, coverImage, dominantColor,
    weather, countdown, timerData,
  } = useIslandStore();

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timerRunning = timerData.state === 'running' || timerData.state === 'paused';
  const timerMM = Math.floor(timerData.remainingSeconds / 60).toString().padStart(2, '0');
  const timerSS = (timerData.remainingSeconds % 60).toString().padStart(2, '0');

  const [r, g, b] = dominantColor;

  return (
    <div className="expand-tab-panel overview-dashboard">
      {/* ========== 左区：时间 + 日期 ========== */}
      <div className="ov-dash-time">
        <span className="ov-dash-clock">{formatTime(now)}</span>
        <span className="ov-dash-date">{getDayName(now)}</span>
        <span className="ov-dash-lunar">{getLunarDate(now)}</span>
      </div>

      {/* ========== 中区：卡片组 ========== */}
      <div className="ov-dash-cards">
        {/* 天气卡片 */}
        {weather && (
          <div className="ov-dash-card">
            <span className="ov-dash-card-label">天气</span>
            <span className="ov-dash-card-value">{Math.round(weather.temperature)}°</span>
            <span className="ov-dash-card-sub">{weather.description}</span>
          </div>
        )}

        {/* 倒计时卡片 */}
        {countdown.enabled && (
          <div className="ov-dash-card">
            <span className="ov-dash-card-label">{countdown.label}</span>
            <span className="ov-dash-card-value">{formatCountdownRemaining(countdown.targetDate)}</span>
          </div>
        )}

        {/* 计时器卡片 */}
        {timerRunning && (
          <div className="ov-dash-card">
            <span className="ov-dash-card-label">计时器</span>
            <span className="ov-dash-card-value">{timerMM}:{timerSS}</span>
          </div>
        )}


      </div>

      {/* ========== 右区：正在播放 ========== */}
      <div className="ov-dash-music">
        {isMusicPlaying ? (
          <>
            <div
              className={`ov-dash-cover ${isPlaying ? 'spinning' : ''}`}
              style={{
                backgroundImage: coverImage ? `url(${coverImage})` : undefined,
                boxShadow: `0 0 12px 4px rgba(${r}, ${g}, ${b}, 0.3)`,
              }}
            />
            <div className="ov-dash-music-info">
              <span className="ov-dash-music-title">{mediaInfo.title}</span>
              <span className="ov-dash-music-artist">{mediaInfo.artist}</span>
            </div>
            <div className="ov-dash-music-status">
              <img src={isPlaying ? SvgIcon.PAUSE : SvgIcon.CONTINUE} alt="" className="ov-dash-music-icon" />
            </div>
          </>
        ) : (
          <div className="ov-dash-music-empty">
            <span className="ov-dash-music-empty-text">未在播放</span>
          </div>
        )}
      </div>
    </div>
  );
}
