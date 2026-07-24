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
 * @file LyricModeStep.tsx
 * @description 引导配置 — 歌词模式设置步骤组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { LYRIC_MODE_OPTIONS } from '../config/lyricModeOptions';
import { useLyricModeSetting } from '../hooks/useLyricModeSetting';
import type { LyricModeStepProps } from '../types';

/**
 * 获取示例歌词数组
 * @param t - 国际化函数
 * @returns 四行示例歌词
 */
function getSampleLyrics(t: TFunction): string[] {
  return [
    t('guide.lyricMode.sampleLyrics.0', { defaultValue: '这是一句测试歌词' }),
    t('guide.lyricMode.sampleLyrics.1', { defaultValue: '音乐在空中飘荡' }),
    t('guide.lyricMode.sampleLyrics.2', { defaultValue: '旋律轻轻回响' }),
    t('guide.lyricMode.sampleLyrics.3', { defaultValue: '每个音符都在歌唱' }),
  ];
}

/** 普通模式预览 SVG — 歌词以纯文本逐行显示 */
function NormalPreview({ lyrics }: { lyrics: string[] }): ReactElement {
  return (
    <svg className="guide-lyric-mode-preview-svg" viewBox="0 0 220 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 歌词容器背景 */}
      <rect x="6" y="4" width="208" height="102" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* 非当前行 — 暗色 */}
      <text x="110" y="28" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="11" fontFamily="inherit">{lyrics[0]}</text>
      {/* 当前行 — 亮色纯文本，无扫光 */}
      <text x="110" y="52" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12" fontWeight="600" fontFamily="inherit">{lyrics[1]}</text>
      {/* 下一行 — 暗色 */}
      <text x="110" y="74" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="11" fontFamily="inherit">{lyrics[2]}</text>
      {/* 再下一行 — 更暗 */}
      <text x="110" y="94" textAnchor="middle" fill="rgba(255,255,255,0.1)" fontSize="10" fontFamily="inherit">{lyrics[3]}</text>
    </svg>
  );
}

/** 逐字模式预览 SVG — 当前行带扫光渐变高亮效果 */
function KaraokePreview({ lyrics }: { lyrics: string[] }): ReactElement {
  return (
    <svg className="guide-lyric-mode-preview-svg" viewBox="0 0 220 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* 扫光渐变 — 左侧高亮过渡到右侧暗色 */}
        <linearGradient id="karaoke-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="70%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
        </linearGradient>
      </defs>
      {/* 歌词容器背景 */}
      <rect x="6" y="4" width="208" height="102" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* 非当前行 — 暗色 */}
      <text x="110" y="28" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="11" fontFamily="inherit">{lyrics[0]}</text>
      {/* 当前行 — 扫光渐变高亮 */}
      <text x="110" y="52" textAnchor="middle" fill="url(#karaoke-sweep)" fontSize="12" fontWeight="600" fontFamily="inherit">{lyrics[1]}</text>
      {/* 下一行 — 暗色 */}
      <text x="110" y="74" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="11" fontFamily="inherit">{lyrics[2]}</text>
      {/* 再下一行 — 更暗 */}
      <text x="110" y="94" textAnchor="middle" fill="rgba(255,255,255,0.1)" fontSize="10" fontFamily="inherit">{lyrics[3]}</text>
    </svg>
  );
}

/**
 * 歌词模式设置步骤组件
 * @description 选择普通模式或逐字（卡拉 OK）模式，带可视化预览
 */
export function LyricModeStep({ onNext, onPrev }: LyricModeStepProps): ReactElement {
  const { t } = useTranslation();
  const { karaoke, setKaraoke } = useLyricModeSetting();
  const lyrics = getSampleLyrics(t);

  return (
    <div className="guide-step">
      <div className="guide-step-header">
        <h2>{t('guide.lyricMode.title', { defaultValue: '歌词显示模式' })}</h2>
        <p>{t('guide.lyricMode.subtitle', { defaultValue: '选择歌词的高亮显示方式' })}</p>
      </div>
      <div className="guide-lyric-mode-content">
        <div className="guide-lyric-mode-card-list">
          {LYRIC_MODE_OPTIONS.map((opt) => {
            const previewKey = opt.value ? 'karaoke' : 'normal';
            const Preview = opt.value ? KaraokePreview : NormalPreview;
            return (
              <button
                key={previewKey}
                className={`guide-lyric-mode-card${karaoke === opt.value ? ' selected' : ''}`}
                onClick={(): void => { setKaraoke(opt.value); }}
              >
                <div className="guide-lyric-mode-preview">
                  <Preview lyrics={lyrics} />
                </div>
                <span className="guide-lyric-mode-card-label">
                  {t(opt.labelKey, { defaultValue: previewKey })}
                </span>
                <span className="guide-lyric-mode-card-desc">
                  {t(opt.descKey, { defaultValue: '' })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="guide-step-footer">
        <button className="guide-prev-btn" onClick={onPrev}>
          {t('guide.actions.prev', { defaultValue: '上一步' })}
        </button>
        <button className="guide-next-btn" onClick={onNext}>
          {t('guide.actions.next', { defaultValue: '下一步' })}
        </button>
      </div>
    </div>
  );
}
