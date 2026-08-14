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
 * @file LyricsWithTranslation.tsx
 * @description 原文歌词 + 翻译歌词双行展示组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { SyncedLyricLine } from '../../../../store/types';
import { SvgIcon } from '../../../../utils/SvgIcon';
import { KaraokeSyllableLine } from '../../lyrics/components/KaraokeSyllableLine';
import { ScrollingText } from '../../lyrics/components/ScrollingText';
import { useKaraokeScrollProgress } from '../../lyrics/hooks/useKaraokeScrollProgress';

interface LyricsWithTranslationProps {
  currentPositionMs: number;
  lyricsLoading: boolean;
  isIntro: boolean;
  mediaTitle: string;
  currentIdx: number;
  currentText: string;
  currentLine: SyncedLyricLine | null;
  hasSyllables: boolean;
  karaokeEnabled: boolean;
  translationText: string;
}

/**
 * @description 渲染右侧歌词区域：加载中 / 前奏 / 原文+翻译 / 空状态。
 * @param props - 歌词参数。
 * @returns 歌词区域节点。
 */
export function LyricsWithTranslation(props: LyricsWithTranslationProps): ReactElement {
  const { t } = useTranslation();
  const {
    currentPositionMs,
    lyricsLoading,
    isIntro,
    mediaTitle,
    currentIdx,
    currentText,
    currentLine,
    hasSyllables,
    karaokeEnabled,
    translationText,
  } = props;

  const karaokeScrollProgress = useKaraokeScrollProgress(karaokeEnabled, currentLine, hasSyllables, isIntro, currentPositionMs);

  return (
    <div className="lyrics-right">
      {lyricsLoading ? (
        <div className="lyrics-loading">
          <span className="lyrics-loading-dot" />
          <span className="lyrics-loading-dot" />
          <span className="lyrics-loading-dot" />
          <span className="lyrics-loading-label">{t('songTab.lyrics.loading')}</span>
        </div>
      ) : isIntro ? (
        <>
          <span className="lyrics-intro-title-center">{mediaTitle}</span>
          <img src={SvgIcon.MUSIC} alt="" className="lyrics-intro-icon" />
        </>
      ) : currentText ? (
        <div className="lyrics-lines-wrapper">
          <ScrollingText
            key={currentIdx}
            className={`lyrics-current-line${karaokeEnabled && hasSyllables ? ' lyrics-karaoke' : ''}`}
            scrollProgress={karaokeScrollProgress}
          >
            {karaokeEnabled && hasSyllables && currentLine ? (
              <KaraokeSyllableLine
                syllables={currentLine.syllables!}
                lineStartMs={currentLine.time_ms}
                posMs={currentPositionMs}
              />
            ) : (
              currentText
            )}
          </ScrollingText>
          {translationText && (
            <span key={`t-${currentIdx}`} className="lyrics-translation-line">
              {translationText}
            </span>
          )}
        </div>
      ) : (
        <span className="lyrics-empty">{t('songTab.lyrics.empty')} {t('songTab.lyrics.enjoyMusic', { defaultValue: '享受音乐' })}</span>
      )}
    </div>
  );
}
