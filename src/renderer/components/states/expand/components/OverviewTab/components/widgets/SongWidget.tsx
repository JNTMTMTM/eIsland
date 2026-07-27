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
 * @file SongWidget.tsx
 * @description Overview 正在播放小组件，展示当前播放歌曲信息与媒体控制。
 * @author 鸡哥
 */

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../../store/slices';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
import { KaraokeSyllableLine } from '../../../../../lyrics/components/KaraokeSyllableLine';
import { useCurrentLyric } from '../../../../../lyrics/hooks/useCurrentLyric';
import { useLyricsSettings } from '../../../../../lyrics/hooks/useLyricsSettings';

interface ScrollingTextProps {
  children: ReactNode;
  className: string;
  scrollProgress?: number;
}

/**
 * 仅在文本溢出可用宽度时启用往返滚动。
 * @param props - 文本节点与外层样式类名。
 * @returns 可根据实际宽度切换滚动状态的文本元素。
 */
function ScrollingText({ children, className, scrollProgress }: ScrollingTextProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [overflowDistance, setOverflowDistance] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return undefined;

    const updateOverflow = (): void => {
      setOverflowDistance(Math.max(0, content.scrollWidth - container.clientWidth));
    };
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(container);
    observer.observe(content);
    updateOverflow();

    return () => observer.disconnect();
  }, []);

  const normalizedProgress = scrollProgress === undefined
    ? undefined
    : Math.min(1, Math.max(0, scrollProgress));
  const style = overflowDistance > 0
    ? {
      '--song-text-scroll-distance': `${overflowDistance}px`,
      '--song-text-scroll-duration': `${Math.max(6, overflowDistance / 18 + 4)}s`,
      '--song-text-scroll-offset': `${overflowDistance * (normalizedProgress ?? 0)}px`,
    } as CSSProperties
    : undefined;
  const progressClass = normalizedProgress === undefined ? '' : ' is-progress-driven';

  return (
    <div
      ref={containerRef}
      className={`${className} ov-dash-song-scroll${overflowDistance > 0 ? ` is-overflowing${progressClass}` : ''}`}
    >
      <span ref={contentRef} className="ov-dash-song-scroll-content" style={style}>
        {children}
      </span>
    </div>
  );
}

/** 正在播放小组件，展示当前播放歌曲与媒体控制。 */
export function SongWidget(): ReactElement {
  const { t } = useTranslation();
  const [showLyrics, setShowLyrics] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean | null>(null);
  const [mutePending, setMutePending] = useState(false);
  const {
    mediaInfo,
    coverImage,
    isPlaying,
    isMusicPlaying,
    dominantColor,
    syncedLyrics,
    lyricsLoading,
    currentPositionMs,
    setExpandTab,
  } = useIslandStore();
  const { lyricsEnabled, karaokeEnabled } = useLyricsSettings();
  const { currentIdx, hasLyrics, isIntro, currentLine, currentText, hasSyllables } = useCurrentLyric(
    syncedLyrics,
    lyricsLoading,
    currentPositionMs,
  );

  useEffect(() => {
    let active = true;
    window.api.mediaGetMuted().then((muted) => {
      if (active) setIsMuted(muted);
    }).catch(() => {
      if (active) setIsMuted(null);
    });

    return () => { active = false; };
  }, []);

  const handleToggleMute = async (): Promise<void> => {
    if (mutePending || isMuted === null) return;
    setMutePending(true);
    try {
      const nextMuted = await window.api.mediaToggleMuted();
      if (nextMuted !== null) setIsMuted(nextMuted);
    } catch {
      // 保持最后一次成功读取的系统静音状态。
    } finally {
      setMutePending(false);
    }
  };

  const lyricText = isIntro ? syncedLyrics?.[0]?.text ?? '' : currentText;
  const nextLyricText = syncedLyrics?.[isIntro ? 1 : currentIdx + 1]?.text ?? '';
  const lyricsVisible = showLyrics && lyricsEnabled;
  const karaokeLineDurationMs = currentLine?.syllables?.reduce(
    (duration, syllable) => Math.max(duration, syllable.start_offset_ms + syllable.duration_ms),
    0,
  ) ?? 0;
  const karaokeLinearScrollProgress = karaokeEnabled && hasSyllables && currentLine && !isIntro && karaokeLineDurationMs > 0
    ? Math.min(1, Math.max(0, (currentPositionMs - currentLine.time_ms) / (karaokeLineDurationMs * 0.85)))
    : undefined;
  // 平滑变速避免线性跟随在行首、行尾产生突兀位移。
  const karaokeScrollProgress = karaokeLinearScrollProgress === undefined
    ? undefined
    : karaokeLinearScrollProgress ** 2 * (3 - 2 * karaokeLinearScrollProgress);
  const [r, g, b] = dominantColor;
  const muteLabel = isMuted
    ? t('overview.song.unmute')
    : t('overview.song.mute');

  return (
    <div className="ov-dash-widget ov-dash-song-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link" onClick={() => setExpandTab('song')}>{t('overview.song.nowPlaying', { defaultValue: '正在播放' })}</span>
      </div>
      {isMusicPlaying ? (
        <div
          className="ov-dash-song-content"
          style={{ '--song-glow': `rgba(${r}, ${g}, ${b}, 0.35)` } as CSSProperties}
        >
          {coverImage && (
            <div
              className="ov-dash-song-bg"
              style={{ backgroundImage: `url(${coverImage})` }}
            />
          )}
          <div className="ov-dash-song-body">
            <div
              className="ov-dash-song-cover"
              style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
            />
            {lyricsVisible ? (
              <div className="ov-dash-song-lyrics">
                {lyricsLoading ? (
                  <ScrollingText className="ov-dash-song-lyric-status is-loading">
                    {t('songTab.lyrics.loading')}
                  </ScrollingText>
                ) : hasLyrics && lyricText ? (
                  <>
                    <ScrollingText
                      key={currentIdx}
                      className={`ov-dash-song-lyric-current${karaokeEnabled && hasSyllables && !isIntro ? ' karaoke' : ''}`}
                      scrollProgress={karaokeScrollProgress}
                    >
                      {karaokeEnabled && hasSyllables && currentLine && !isIntro ? (
                        <KaraokeSyllableLine
                          syllables={currentLine.syllables!}
                          lineStartMs={currentLine.time_ms}
                          posMs={currentPositionMs}
                        />
                      ) : (
                        lyricText
                      )}
                    </ScrollingText>
                    {nextLyricText && (
                      <ScrollingText className="ov-dash-song-lyric-next">
                        {nextLyricText}
                      </ScrollingText>
                    )}
                  </>
                ) : (
                  <ScrollingText className="ov-dash-song-lyric-status">
                    {t('songTab.lyrics.empty')}
                  </ScrollingText>
                )}
              </div>
            ) : (
              <div className="ov-dash-song-info">
                <ScrollingText className="ov-dash-song-title">
                  {mediaInfo.title || t('overview.song.unknownTitle', { defaultValue: '未知歌曲' })}
                </ScrollingText>
                <ScrollingText className="ov-dash-song-artist">
                  {mediaInfo.artist || t('overview.song.unknownArtist', { defaultValue: '未知艺术家' })}
                </ScrollingText>
                {mediaInfo.album && (
                  <ScrollingText className="ov-dash-song-album">
                    {mediaInfo.album}
                  </ScrollingText>
                )}
              </div>
            )}
          </div>
          <div className="ov-dash-song-controls">
            <button
              className="ov-dash-song-btn"
              onClick={() => setShowLyrics((visible) => !visible)}
              type="button"
              title={lyricsVisible ? t('overview.song.information') : t('overview.song.lyric')}
              aria-pressed={lyricsVisible}
              disabled={!lyricsEnabled}
            >
              <img
                src={lyricsVisible ? SvgIcon.INFORMATION : SvgIcon.LYRIC}
                alt={lyricsVisible ? t('overview.song.information') : t('overview.song.lyric')}
                className="ov-dash-song-btn-icon ov-dash-song-btn-icon--lg"
              />
            </button>
            <button className="ov-dash-song-btn" onClick={() => window.api.mediaPrev()} type="button" title={t('overview.song.prev', { defaultValue: '上一首' })}>
              <img src={SvgIcon.PREVIOUS_SONG} alt={t('overview.song.prev', { defaultValue: '上一首' })} className="ov-dash-song-btn-icon ov-dash-song-btn-icon--sm" />
            </button>
            <button className="ov-dash-song-btn ov-dash-song-btn-play" onClick={() => window.api.mediaPlayPause()} type="button" title={isPlaying ? t('overview.song.pause', { defaultValue: '暂停' }) : t('overview.song.play', { defaultValue: '播放' })}>
              {isPlaying ? (
                <img src={SvgIcon.PAUSE} alt={t('overview.song.pause', { defaultValue: '暂停' })} className="ov-dash-song-btn-icon" />
              ) : (
                <img src={SvgIcon.CONTINUE} alt={t('overview.song.play', { defaultValue: '播放' })} className="ov-dash-song-btn-icon" />
              )}
            </button>
            <button className="ov-dash-song-btn" onClick={() => window.api.mediaNext()} type="button" title={t('overview.song.next', { defaultValue: '下一首' })}>
              <img src={SvgIcon.NEXT_SONG} alt={t('overview.song.next', { defaultValue: '下一首' })} className="ov-dash-song-btn-icon ov-dash-song-btn-icon--sm" />
            </button>
            <button
              className="ov-dash-song-btn"
              onClick={handleToggleMute}
              type="button"
              title={muteLabel}
              aria-pressed={isMuted === true}
              disabled={mutePending || isMuted === null}
            >
              <img
                src={isMuted ? SvgIcon.VOLUME : SvgIcon.MUTE}
                alt={muteLabel}
                className="ov-dash-song-btn-icon ov-dash-song-btn-icon--lg"
              />
            </button>
          </div>
        </div>
      ) : (
        <div className="ov-dash-song-empty">{t('overview.song.empty', { defaultValue: '暂无播放中的歌曲' })}</div>
      )}
    </div>
  );
}
