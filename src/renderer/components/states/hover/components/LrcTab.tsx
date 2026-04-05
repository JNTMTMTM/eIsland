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
 * @file LrcTab.tsx
 * @description 歌词 Tab 内容组件 - 复刻 Python-island 音乐系统
 * @author 鸡哥
 */

import useIslandStore from '../../../../store/slices';
import { SvgIcon } from '../../../../utils/SvgIcon';

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
    dominantColor,
  } = useIslandStore();

  const handlePlayPause = () => window.api?.mediaPlayPause();
  const handlePrev = () => window.api?.mediaPrev();
  const handleNext = () => window.api?.mediaNext();

  const artistText = truncateByVisualWidth(mediaInfo.artist || '未知艺术家', 50);
  const albumText = truncateByVisualWidth(mediaInfo.title || '未知歌曲', 45);

  const [r, g, b] = dominantColor;

  return (
    <div className={`lrc-tab-wrapper ${isPlaying ? 'playing' : ''}`}>
      <div className="lrc-vinyl-disc">
        <div
          className="lrc-vinyl-cover"
          style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
        />
      </div>

      <div className="lrc-info-section">
        <div className={`lrc-title ${!isMusicPlaying ? 'inactive' : ''}`}>
          {albumText}
        </div>

        <div className="lrc-artist">{artistText}</div>
      </div>

      <div className="lrc-media-controls">
        <button
          className="lrc-media-btn"
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          title="上一曲"
          disabled={!isMusicPlaying}
        >
          <img src={SvgIcon.PREVIOUS_SONG} alt="上一曲" className="lrc-media-btn-icon lrc-media-btn-icon--sm" />
        </button>
        <button
          className="lrc-media-btn lrc-play-btn"
          onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
          title={isPlaying ? '暂停' : '播放'}
          disabled={!isMusicPlaying}
        >
          {isPlaying ? (
            <img src={SvgIcon.PAUSE} alt="暂停" className="lrc-media-btn-icon" />
          ) : (
            <img src={SvgIcon.CONTINUE} alt="播放" className="lrc-media-btn-icon" />
          )}
        </button>
        <button
          className="lrc-media-btn"
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          title="下一曲"
          disabled={!isMusicPlaying}
        >
          <img src={SvgIcon.NEXT_SONG} alt="下一曲" className="lrc-media-btn-icon lrc-media-btn-icon--sm" />
        </button>
      </div>

      <div
        className="lrc-wave-container"
        style={{
          '--wave-color-1': `rgba(${r}, ${g}, ${b}, 0.3)`,
          '--wave-color-2': `rgba(${r}, ${g}, ${b}, 0.2)`,
          '--wave-color-3': `rgba(${r}, ${g}, ${b}, 0.1)`,
        } as React.CSSProperties}
      >
        <div className="lrc-wave lrc-wave-1" />
        <div className="lrc-wave lrc-wave-2" />
        <div className="lrc-wave lrc-wave-3" />
      </div>
    </div>
  );
}
