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

/** 普通模式预览 — 当前行整行纯白高亮 */
function NormalPreview({ lyrics }: { lyrics: string[] }): ReactElement {
  return (
    <div className="guide-lyric-mode-preview-box">
      <span className="guide-lyric-mode-line dim">{lyrics[0]}</span>
      <span className="guide-lyric-mode-line current">{lyrics[1]}</span>
      <span className="guide-lyric-mode-line dim">{lyrics[2]}</span>
      <span className="guide-lyric-mode-line dimmer">{lyrics[3]}</span>
    </div>
  );
}

/** 逐字模式预览 — 当前行带扫光动画渐变 */
function KaraokePreview({ lyrics }: { lyrics: string[] }): ReactElement {
  return (
    <div className="guide-lyric-mode-preview-box">
      <span className="guide-lyric-mode-line dim">{lyrics[0]}</span>
      <span className="guide-lyric-mode-line sweep">{lyrics[1]}</span>
      <span className="guide-lyric-mode-line dim">{lyrics[2]}</span>
      <span className="guide-lyric-mode-line dimmer">{lyrics[3]}</span>
    </div>
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
