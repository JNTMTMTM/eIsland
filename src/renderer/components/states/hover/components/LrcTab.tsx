/**
 * @file LrcTab.tsx
 * @description 歌词 Tab 内容组件 - 复刻 Python-island 音乐系统
 * @author 鸡哥
 */

import React, { useEffect, useRef, useState } from 'react';
import useIslandStore, { LrcMode, LyricLine, MediaInfo } from '../../../../store/isLandStore';
import { formatMusicTime, calculateProgressPercent } from '../../../../utils/musicUtils';

/** 媒体控制按钮接口 */
interface MediaButtonProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * 媒体控制按钮
 */
function MediaButton({ onClick, title, children, className = '' }: MediaButtonProps) {
  return (
    <button
      className={`lrc-media-btn ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
    >
      {children}
    </button>
  );
}

/**
 * 播放/暂停图标 SVG
 */
function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6zm8-14v14h4V5z" fill="currentColor" />
    </svg>
  );
}

function PrevIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6z" fill="currentColor" />
    </svg>
  );
}

/**
 * 歌词 Tab 内容
 * @description 显示当前播放歌词、唱片封面、进度条和播放控制
 */
export function LyricsTab(): React.ReactElement {
  const {
    isMusicPlaying,
    isPlaying,
    currentLyricText,
    mediaInfo,
    currentPositionMs,
    currentDurationMs,
    coverImage,
    lrcMode,
    setLrcMode,
  } = useIslandStore();

  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPercent, setSeekPercent] = useState(0);

  // 计算当前进度百分比
  const progressPercent = isSeeking
    ? seekPercent
    : calculateProgressPercent(currentPositionMs, currentDurationMs);

  // 处理进度条拖动
  useEffect(() => {
    if (!isSeeking) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const percent = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
      setSeekPercent(percent);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const percent = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const seekMs = Math.round(percent * currentDurationMs);
      window.api?.mediaSeek(seekMs);
      setIsSeeking(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSeeking, currentDurationMs]);

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    if (currentDurationMs <= 0) return;
    e.stopPropagation();
    setIsSeeking(true);
    const rect = progressBarRef.current!.getBoundingClientRect();
    const percent = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    setSeekPercent(percent);
  };

  // 媒体控制
  const handlePlayPause = () => window.api?.mediaPlayPause();
  const handlePrev = () => window.api?.mediaPrev();
  const handleNext = () => window.api?.mediaNext();

  // 切换歌词模式
  const toggleLrcMode = () => {
    const modes: Array<'lrc' | 'info' | 'off'> = ['lrc', 'info', 'off'];
    const currentIndex = modes.indexOf(lrcMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setLrcMode(modes[nextIndex]);
  };

  // 显示内容
  const showContent = isMusicPlaying && lrcMode !== 'off';
  const lyricText = currentLyricText || (lrcMode === 'info' ? mediaInfo.title : '♪');
  const metaText = lrcMode === 'info' ? '' : `${mediaInfo.artist} - ${mediaInfo.title}`;

  return (
    <div className="lrc-tab-wrapper">
      {/* 唱片封面 */}
      <div className={`lrc-vinyl-disc ${isPlaying ? '' : 'paused'}`}>
        <div className="lrc-vinyl-grooves" />
        <div
          className="lrc-vinyl-cover"
          style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
        />
        <div className="lrc-vinyl-center" />
      </div>

      {/* 歌词与信息 */}
      <div className="lrc-info-section">
        <div
          className={`lrc-text ${!currentLyricText && lrcMode !== 'info' ? 'lrc-placeholder' : ''}`}
          onClick={toggleLrcMode}
          title={`歌词模式: ${lrcMode}`}
        >
          {lyricText}
        </div>
        {metaText && <div className="lrc-meta">{metaText}</div>}

        {/* 进度条 */}
        {showContent && (
          <div
            className={`lrc-progress-bar ${isSeeking ? 'seeking' : ''}`}
            ref={progressBarRef}
            onMouseDown={handleProgressMouseDown}
          >
            <div className="lrc-progress-fill" style={{ width: `${progressPercent}%` }} />
            <div className="lrc-progress-thumb" style={{ left: `${progressPercent}%` }} />
          </div>
        )}

        {/* 时间显示 */}
        {showContent && (
          <div className="lrc-time-row">
            <span className="lrc-time-current">{formatMusicTime(currentPositionMs)}</span>
            <span className="lrc-time-sep">/</span>
            <span className="lrc-time-total">{formatMusicTime(currentDurationMs)}</span>
          </div>
        )}
      </div>

      {/* 播放控制按钮 */}
      {showContent && (
        <div className="lrc-media-controls">
          <MediaButton onClick={handlePrev} title="上一曲">
            <PrevIcon />
          </MediaButton>
          <MediaButton onClick={handlePlayPause} title="播放/暂停" className="lrc-play-btn">
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </MediaButton>
          <MediaButton onClick={handleNext} title="下一曲">
            <NextIcon />
          </MediaButton>
        </div>
      )}

      {/* 未播放状态 */}
      {!isMusicPlaying && (
        <div className="lrc-empty-state">
          <span className="lrc-empty-icon">♪</span>
          <span className="lrc-empty-text">播放音乐时显示歌词</span>
        </div>
      )}
    </div>
  );
}
