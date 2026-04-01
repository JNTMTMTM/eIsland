/**
 * @file LrcTab.tsx
 * @description 歌词 Tab 内容组件 - 复刻 Python-island 音乐系统
 * @author 鸡哥
 */

import React, { useEffect, useRef, useState } from 'react';
import useIslandStore from '../../../../store/isLandStore';
import { calculateProgressPercent, calculateSliderPercentFromMouse, calculatePositionFromPercent } from '../../../../utils/musicUtils';

/** 播放/暂停图标 SVG */
function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M6 19h4V5H6zm8-14v14h4V5z" fill="currentColor" />
    </svg>
  );
}

function PrevIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor" />
    </svg>
  );
}

function NextIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6z" fill="currentColor" />
    </svg>
  );
}

/** 播放进度条组件 */
function ProgressBar({
  progressPercent,
  isSeeking,
  seekPercent,
  progressBarRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}: {
  progressPercent: number;
  isSeeking: boolean;
  seekPercent: number;
  progressBarRef: React.RefObject<HTMLDivElement | null>;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
}) {
  const displayPercent = isSeeking ? seekPercent : progressPercent;
  return (
    <div
      className={`lrc-progress-bar ${isSeeking ? 'seeking' : ''}`}
      ref={progressBarRef}
      onMouseDown={onMouseDown}
      onMouseMove={isSeeking ? onMouseMove : undefined}
      onMouseUp={isSeeking ? onMouseUp : undefined}
    >
      <div className="lrc-progress-track">
        <div className="lrc-progress-fill" style={{ width: `${displayPercent}%` }} />
      </div>
      <div className="lrc-progress-thumb" style={{ left: `${displayPercent}%` }} />
    </div>
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

    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const percent = calculateSliderPercentFromMouse(e, rect) * 100;
      setSeekPercent(percent);
    };

    const handleDocumentMouseUp = (e: MouseEvent) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const percent = calculateSliderPercentFromMouse(e, rect);
      const seekMs = calculatePositionFromPercent(percent, currentDurationMs);
      window.api?.mediaSeek(seekMs);
      setIsSeeking(false);
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isSeeking, currentDurationMs]);

  // 元素级别的 mouseup（同步触发，防止 document 监听器尚未附加时鼠标已松开）
  const handleProgressMouseUp = (e: React.MouseEvent) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = calculateSliderPercentFromMouse(e.nativeEvent, rect);
    const seekMs = calculatePositionFromPercent(percent, currentDurationMs);
    window.api?.mediaSeek(seekMs);
    setIsSeeking(false);
  };

  // 元素级别的 mousemove（拖动过程中实时更新进度）
  const handleProgressMouseMove = (e: React.MouseEvent) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = calculateSliderPercentFromMouse(e.nativeEvent, rect) * 100;
    setSeekPercent(percent);
  };

  // 进度条鼠标按下，开始拖动
  const handleProgressMouseDown = (e: React.MouseEvent) => {
    if (currentDurationMs <= 0) return;
    e.stopPropagation();
    if (!progressBarRef.current) return;
    setIsSeeking(true);
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = calculateSliderPercentFromMouse(e.nativeEvent, rect) * 100;
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

  // 歌曲信息展示文本
  const artistText = mediaInfo.artist || '未知艺术家';
  const albumText = mediaInfo.title || '未知歌曲';

  // 是否显示播放控制
  const showControls = isMusicPlaying;

  return (
    <div className="lrc-tab-wrapper">
      {/* 左侧：旋转唱片 */}
      <div className={`lrc-vinyl-disc ${isPlaying ? '' : 'paused'}`}>
        <div className="lrc-vinyl-grooves" />
        <div
          className="lrc-vinyl-cover"
          style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
        />
        <div className="lrc-vinyl-center" />
      </div>

      {/* 右侧：歌曲信息区域 */}
      <div className="lrc-info-section">
        {/* 歌曲标题 */}
        <div
          className={`lrc-title ${!isMusicPlaying ? 'inactive' : ''}`}
          onClick={showControls ? toggleLrcMode : undefined}
          title={showControls ? `歌词模式: ${lrcMode}` : undefined}
        >
          {albumText}
        </div>

        {/* 艺术家 */}
        <div className="lrc-artist">{artistText}</div>

        {/* 歌词内容（仅在歌词模式下显示） */}
        {isMusicPlaying && lrcMode === 'lrc' && currentLyricText && (
          <div className="lrc-lyric-text">{currentLyricText}</div>
        )}

        {/* 进度条 */}
        {isMusicPlaying && (
          <ProgressBar
            progressPercent={progressPercent}
            isSeeking={isSeeking}
            seekPercent={seekPercent}
            progressBarRef={progressBarRef}
            onMouseDown={handleProgressMouseDown}
            onMouseMove={handleProgressMouseMove}
            onMouseUp={handleProgressMouseUp}
          />
        )}
      </div>

      {/* 播放控制按钮 */}
      {showControls && (
        <div className="lrc-media-controls">
          <button
            className="lrc-media-btn"
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            title="上一曲"
          >
            <PrevIcon />
          </button>
          <button
            className="lrc-media-btn lrc-play-btn"
            onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          </button>
          <button
            className="lrc-media-btn"
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            title="下一曲"
          >
            <NextIcon />
          </button>
        </div>
      )}

      {/* 未播放状态提示 */}
      {!isMusicPlaying && (
        <div className="lrc-empty-hint">
          <span>♪</span>
        </div>
      )}
    </div>
  );
}
