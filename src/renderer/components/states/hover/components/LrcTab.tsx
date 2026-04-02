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
 * 按视觉宽度截断文本（支持中日韩多字节字符）
 * 中文/繁体汉字: 2em | 日文平假名/片假名: 2em | 韩文 Hangul: 2em | 其他: 1em
 */
function truncateByVisualWidth(text: string, maxWidth: number): string {
  let finalWidth = 0;
  let finalEnd = 0;
  for (const ch of text) {
    const isEastAsianWide =
      /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u1100-\u115f\u3130-\u318f]/.test(ch);
    const charWidth = isEastAsianWide ? 2 : 1;
    if (finalWidth + charWidth > maxWidth - 1) break;
    finalWidth += charWidth;
    finalEnd++;
  }
  if (finalEnd === text.length) return text;
  return text.slice(0, finalEnd) + '…';
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

  const handlePlayPause = () => window.api?.mediaPlayPause();
  const handlePrev = () => window.api?.mediaPrev();
  const handleNext = () => window.api?.mediaNext();

  const artistText = truncateByVisualWidth(mediaInfo.artist || '未知艺术家', 35);
  const albumText = truncateByVisualWidth(mediaInfo.title || '未知歌曲', 35);

  return (
    <div className="lrc-tab-wrapper">
      <div className={`lrc-vinyl-disc ${isPlaying ? '' : 'paused'}`}>
        <div className="lrc-vinyl-grooves" />
        <div
          className="lrc-vinyl-cover"
          style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
        />
        <div className="lrc-vinyl-center" />
      </div>

      <div className="lrc-info-section">
        <div className={`lrc-title ${!isMusicPlaying ? 'inactive' : ''}`}>
          {albumText}
        </div>

        <div className="lrc-artist">{artistText}</div>
      </div>

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

      {!isMusicPlaying && (
        <div className="lrc-empty-hint">
          <span>♪</span>
        </div>
      )}
    </div>
  );
}
