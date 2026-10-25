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
 * @file SongTab.tsx
 * @description 最大展开歌曲面板，展示专辑封面、完整双语歌词和按行跳转。
 * @author 鸡哥
 */

// eslint-disable-next-line project/filename -- 保留已有 SongTab.tsx 组件入口文件名。
import { useCallback, useEffect, useMemo, useRef, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import useIslandStore from '../../../../../../store/slices';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { usePendingSeek } from '../../../../../hooks/usePendingSeek';
import { findCurrentIndex } from '../../../../lyrics/utils/findCurrentIndex';
import { useLyricsSettings } from '../../../../lyrics/hooks/useLyricsSettings';
import { KaraokeSyllableLine } from '../../../../lyrics/components/KaraokeSyllableLine';
import { ScrollingText } from '../../../../lyrics/components/ScrollingText';
import buildSongLyricBlocks from '../utils/buildSongLyricBlocks';
import useSongLyricsWheel from '../hooks/useSongLyricsWheel';
import '../../../../../../styles/lyrics/lyrics.css';
import '../../../../../../styles/settings/modules/settings-skeleton.css';
import '../styles/song.css';

const SKELETON_ROWS = ['first', 'second', 'current', 'fourth', 'last'];

/**
 * 最大展开模式下的歌曲面板。
 * @returns 歌曲面板元素
 */
export default function SongTab(): ReactElement {
  const { t } = useTranslation();
  const { karaokeEnabled } = useLyricsSettings();
  const { mediaInfo, coverImage, dominantColor, isMusicPlaying, isPlaying, syncedLyrics, translationLyrics, lyricsLoading, currentPositionMs, currentDurationMs } = useIslandStore(useShallow((store) => ({
    mediaInfo: store.mediaInfo,
    coverImage: store.coverImage,
    dominantColor: store.dominantColor,
    isMusicPlaying: store.isMusicPlaying,
    isPlaying: store.isPlaying,
    syncedLyrics: store.syncedLyrics,
    translationLyrics: store.translationLyrics,
    lyricsLoading: store.lyricsLoading,
    currentPositionMs: store.currentPositionMs,
    currentDurationMs: store.currentDurationMs,
  })));
  const trackKey = `${mediaInfo.title}\n${mediaInfo.artist}`;
  const { pendingSeek, commitSeek } = usePendingSeek(trackKey);
  const blocks = useMemo(() => buildSongLyricBlocks(syncedLyrics, translationLyrics), [syncedLyrics, translationLyrics]);
  const positionMs = pendingSeek?.targetMs ?? currentPositionMs;
  const currentIndex = findCurrentIndex(blocks, positionMs);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const browsingUntilRef = useRef(0);
  const followTimerRef = useRef<number | null>(null);
  const initialLineRef = useRef<number | null>(null);
  const scrollContextRef = useRef<{ trackKey: string; lyrics: typeof syncedLyrics; visible: boolean } | null>(null);
  const canSeek = isMusicPlaying && Number.isFinite(currentDurationMs) && currentDurationMs > 0;
  const hasLyrics = isMusicPlaying && !lyricsLoading && blocks.length > 0;
  useSongLyricsWheel(lyricsRef, blocks, currentIndex, hasLyrics);

  useEffect(() => {
    const previous = scrollContextRef.current;
    if (!previous || previous.trackKey !== trackKey || previous.lyrics !== syncedLyrics || previous.visible !== hasLyrics) {
      scrollContextRef.current = { trackKey, lyrics: syncedLyrics, visible: hasLyrics };
      browsingUntilRef.current = 0;
      if (followTimerRef.current !== null) window.clearTimeout(followTimerRef.current);
      // 新歌词异步挂载后再归顶，等下一次切行才恢复跟随，避免归顶立即被自动居中覆盖。
      initialLineRef.current = currentIndex;
      lyricsRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    } else if (initialLineRef.current !== currentIndex) {
      initialLineRef.current = null;
    }
  }, [trackKey, syncedLyrics, hasLyrics, currentIndex]);

  const followLyrics = useCallback((): void => {
    if (initialLineRef.current !== null) return;
    const container = lyricsRef.current;
    const active = container?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!container || !active) return;
    const top = active.offsetTop - (container.clientHeight - active.offsetHeight) / 2;
    container.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, []);

  useEffect(() => {
    const scheduleFollow = (): void => {
      if (followTimerRef.current !== null) window.clearTimeout(followTimerRef.current);
      followTimerRef.current = window.setTimeout(followLyrics, Math.max(0, browsingUntilRef.current - Date.now()));
    };
    const container = lyricsRef.current;
    const observer = new ResizeObserver(scheduleFollow);
    if (hasLyrics && container) {
      scheduleFollow();
      observer.observe(container);
    }
    return () => {
      if (followTimerRef.current !== null) window.clearTimeout(followTimerRef.current);
      observer.disconnect();
    };
  }, [currentIndex, blocks, hasLyrics, followLyrics]);

  const handleBrowse = useCallback((): void => {
    // 手动浏览时暂缓跟随；停下后回到当前句，避免歌词变化打断滚动。
    browsingUntilRef.current = Date.now() + 4000;
    initialLineRef.current = null;
    if (followTimerRef.current !== null) window.clearTimeout(followTimerRef.current);
    followTimerRef.current = window.setTimeout(followLyrics, 4000);
  }, [followLyrics]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLElement>): void => {
    // Tab 在歌曲面板内用于访问歌词按钮，不能被外层导航截获。
    event.stopPropagation();
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Tab'].includes(event.key)) handleBrowse();
  }, [handleBrowse]);
  const handleSeek = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    if (!canSeek) return;
    browsingUntilRef.current = 0;
    initialLineRef.current = null;
    commitSeek(Math.min(currentDurationMs, Math.max(0, Number(event.currentTarget.dataset.time))));
    if (followTimerRef.current !== null) window.clearTimeout(followTimerRef.current);
    followTimerRef.current = window.setTimeout(followLyrics, 0);
  }, [canSeek, commitSeek, currentDurationMs, followLyrics]);
  /* eslint-disable promise/prefer-await-to-then -- 原生点击回调同步返回，并处理媒体命令的异步拒绝。 */
  const handlePrev = useCallback((): void => { window.api.mediaPrev().catch(() => undefined); }, []);
  const handlePlayPause = useCallback((): void => { window.api.mediaPlayPause().catch(() => undefined); }, []);
  const handleNext = useCallback((): void => { window.api.mediaNext().catch(() => undefined); }, []);
  /* eslint-enable promise/prefer-await-to-then -- 媒体命令回调结束。 */
  const title = mediaInfo.title || t('songTab.meta.notPlaying');
  const artist = mediaInfo.artist || t('hover.music.unknownArtist');
  const showSkeleton = isMusicPlaying && lyricsLoading;
  const statusText = isMusicPlaying ? t('songTab.lyrics.empty') : t('songTab.onboarding.hint');

  /* eslint-disable better-tailwindcss/no-unknown-classes -- 歌曲页的容器查询与歌词状态样式由本组件导入的 song.css 定义。 */
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- 在容器接收子按钮冒泡的键盘事件，防止外层 Tab 导航截获；交互由原生按钮完成。
    <section className="max-expand-tab-panel song-panel" onKeyDown={handleKeyDown}
      aria-label={t('maxExpand.nav.song')}
      style={{ '--song-accent': dominantColor.join(', ') } as CSSProperties}>
      <div className="song-layout">
        <div className="song-artwork-column">
          <div className="song-cover">
            {coverImage ? <img src={coverImage} alt={title} draggable={false} /> : <img className="song-placeholder-icon-img" src={SvgIcon.MUSIC} alt="" />}
          </div>
          <div className="song-meta">
            <div className="song-title" role="heading" aria-level={2} title={title}>
              <ScrollingText key={trackKey} className="song-title-text">{title}</ScrollingText>
            </div>
            <p className="song-artist" title={artist}>{artist}</p>
            {mediaInfo.album && <p className="song-album" title={mediaInfo.album}>{mediaInfo.album}</p>}
          </div>
          <div className="song-controls">
            <button type="button" onClick={handlePrev} disabled={!isMusicPlaying} aria-label={t('songTab.controls.prev')} title={t('songTab.controls.prev')}>
              <img className="song-control-icon-img" src={SvgIcon.PREVIOUS_SONG} alt="" />
            </button>
            <button className="song-play" type="button" onClick={handlePlayPause} disabled={!isMusicPlaying} aria-label={t(isPlaying ? 'songTab.controls.pause' : 'songTab.controls.play')} title={t(isPlaying ? 'songTab.controls.pause' : 'songTab.controls.play')}>
              <img className="song-control-icon-img" src={isPlaying ? SvgIcon.PAUSE : SvgIcon.CONTINUE} alt="" />
            </button>
            <button type="button" onClick={handleNext} disabled={!isMusicPlaying} aria-label={t('songTab.controls.next')} title={t('songTab.controls.next')}>
              <img className="song-control-icon-img" src={SvgIcon.NEXT_SONG} alt="" />
            </button>
          </div>
        </div>
        <div className="song-lyrics-viewport">
          {showSkeleton && (
            <div className="song-lyrics-skeleton" role="status" aria-busy="true" aria-label={t('songTab.lyrics.loading')}>
              <div className="song-skeleton-lines" aria-hidden="true">
                {SKELETON_ROWS.map((key) => (
                  <div className="song-skeleton-row" key={key}>
                    <span className="settings-skeleton-block settings-skeleton-sweep song-skeleton-original" />
                    <span className="settings-skeleton-block settings-skeleton-sweep song-skeleton-translation" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {hasLyrics && (
            <div className="song-lyrics" ref={lyricsRef} onWheel={handleBrowse} onTouchMove={handleBrowse} onPointerDown={handleBrowse}
              role="region" aria-label={t('songTab.lyrics.all')}>
              {blocks.map((block, index) => (
                <button className="song-lyric-block" key={block.time_ms} type="button" data-time={block.time_ms}
                  aria-current={index === currentIndex ? 'true' : undefined} disabled={!canSeek} onClick={handleSeek}>
                  <span className="song-lyric-original">
                    {index === currentIndex && karaokeEnabled && block.syllables?.length ? (
                      <KaraokeSyllableLine syllables={block.syllables} lineStartMs={block.time_ms} posMs={positionMs} />
                    ) : block.text}
                  </span>
                  {block.translation && <span className="song-lyric-translation">{block.translation}</span>}
                </button>
              ))}
            </div>
          )}
          {!hasLyrics && !showSkeleton && (
            <div className="song-empty" role="status">
              <img className="song-placeholder-icon-img" src={SvgIcon.MUSIC} alt="" />
              <p>{statusText}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
  /* eslint-enable better-tailwindcss/no-unknown-classes -- 歌曲页局部样式结束。 */
}
