/**
 * @file LrcTab.tsx
 * @description 歌词 Tab 内容组件 - 复刻 Python-island 音乐系统
 * @author 鸡哥
 */

import React from 'react';
import useIslandStore from '../../../../store/isLandStore';

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

/**
 * 歌词 Tab 内容
 * @description 显示当前播放歌词、唱片封面和播放控制
 */
export function LyricsTab(): React.ReactElement {
  const {
    isMusicPlaying,
    isPlaying,
    mediaInfo,
    coverImage,
  } = useIslandStore();

  // 媒体控制
  const handlePlayPause = () => window.api?.mediaPlayPause();
  const handlePrev = () => window.api?.mediaPrev();
  const handleNext = () => window.api?.mediaNext();

  // 歌曲信息展示文本
  const artistText = mediaInfo.artist || '未知艺术家';
  const albumText = mediaInfo.title || '未知歌曲';

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
        <div className={`lrc-title ${!isMusicPlaying ? 'inactive' : ''}`}>
          {albumText}
        </div>

        {/* 艺术家 */}
        <div className="lrc-artist">{artistText}</div>
      </div>

      {/* 播放控制按钮 */}
      {isMusicPlaying && (
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
