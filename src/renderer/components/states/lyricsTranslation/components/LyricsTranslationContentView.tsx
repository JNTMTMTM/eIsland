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
 * @file LyricsTranslationContentView.tsx
 * @description 带翻译歌词状态的纯展示组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { LyricsTranslationContentViewProps } from '../config/types';
import { GlowBackground } from './GlowBackground';
import { AlbumCover } from './AlbumCover';
import { BeijingClock } from './BeijingClock';
import { LyricsWithTranslation } from './LyricsWithTranslation';

/**
 * @description 渲染带翻译歌词的歌词状态内容。
 * @param props - 视图参数。
 * @returns 歌词翻译内容视图节点。
 */
export function LyricsTranslationContentView(props: LyricsTranslationContentViewProps): ReactElement {
  const {
    currentPositionMs,
    lyricsLoading,
    isMusicPlaying,
    isPlaying,
    coverImage,
    dominantColor,
    glowEnabled,
    clockText,
    clockEnabled,
    isIntro,
    mediaTitle,
    currentIdx,
    currentText,
    currentLine,
    hasSyllables,
    karaokeEnabled,
    translationText,
  } = props;

  return (
    <div className="lyrics-content" data-playing={isPlaying}>
      <GlowBackground isMusicPlaying={isMusicPlaying} isPlaying={isPlaying} coverImage={coverImage} glowEnabled={glowEnabled} dominantColor={dominantColor} />
      <AlbumCover isMusicPlaying={isMusicPlaying} isPlaying={isPlaying} coverImage={coverImage} glowEnabled={glowEnabled} dominantColor={dominantColor} />
      <BeijingClock clockEnabled={clockEnabled} clockText={clockText} />
      <LyricsWithTranslation
        currentPositionMs={currentPositionMs}
        lyricsLoading={lyricsLoading}
        isIntro={isIntro}
        mediaTitle={mediaTitle}
        currentIdx={currentIdx}
        currentText={currentText}
        currentLine={currentLine}
        hasSyllables={hasSyllables}
        karaokeEnabled={karaokeEnabled}
        translationText={translationText}
      />
    </div>
  );
}
