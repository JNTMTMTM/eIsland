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
 * @file LayoutPreviewSettingsPage.tsx
 * @description 设置页面 - 软件设置总览布局子界面
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../../../store/slices';
import { SilkyWave } from '../../../../../../hover/pages/lyric/components/SilkyWave';
import { MusicBgWavePreview } from '../preview/MusicBgWavePreview';
import { HOVER_MUSIC_BG_STYLE_STORE_KEY } from '../../../config/settingsTabConfig';
import type { AppSettingsSectionProps } from './types';

type HoverMusicBgStyle = 'silky' | 'wave';

type LayoutPreviewSettingsPageProps = Pick<AppSettingsSectionProps, 'layoutConfig' | 'OverviewPreviewComponent' | 'overviewWidgetOptions' | 'overviewClockStyleOptions' | 'updateLayout' | 'updateClockStyle' | 'updateGradientColor'>;

/**
 * 渲染软件设置中的总览布局配置页面
 * @param layoutConfig - 当前总览布局配置
 * @param OverviewPreviewComponent - 总览预览组件
 * @param overviewWidgetOptions - 左右控件可选项
 * @param overviewClockStyleOptions - 中间时钟样式可选项
 * @param updateLayout - 更新左右控件布局方法
 * @param updateClockStyle - 更新时钟样式方法
 * @param updateGradientColor - 更新渐变色方法
 * @returns 总览布局设置页面
 */
export function LayoutPreviewSettingsPage({
  layoutConfig,
  OverviewPreviewComponent,
  overviewWidgetOptions,
  overviewClockStyleOptions,
  updateLayout,
  updateClockStyle,
  updateGradientColor,
}: LayoutPreviewSettingsPageProps): ReactElement {
  const { t } = useTranslation();
  const OverviewPreview = OverviewPreviewComponent;
  const { dominantColor } = useIslandStore();
  const [bgStyle, setBgStyle] = useState<HoverMusicBgStyle>('silky');

  useEffect(() => {
    window.api.storeRead(HOVER_MUSIC_BG_STYLE_STORE_KEY).then((v) => {
      if (v === 'silky' || v === 'wave') setBgStyle(v);
    }).catch(() => {});
  }, []);

  const handleStyleChange = useCallback((style: HoverMusicBgStyle) => {
    setBgStyle(style);
    window.api.storeWrite(HOVER_MUSIC_BG_STYLE_STORE_KEY, style).catch(() => {});
  }, []);

  // dominantColor 范围 0-255
  const waveColor = dominantColor ?? [100, 180, 255];

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.layout.previewTitle', { defaultValue: '总览布局预览' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.layout.previewHint', { defaultValue: '实时显示左右控件组合后的 Expand 态灵动岛样式，切换下方控件可即时预览。' })}</div>
          </div>
          <div className="settings-island-preview-wrap">
            <div className="settings-island-shell" key={`${layoutConfig.left}-${layoutConfig.right}`}>
              <OverviewPreview layoutConfig={layoutConfig} />
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.layout.widgetPickerTitle', { defaultValue: '控件组合' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.layout.widgetPickerHint', { defaultValue: '分别选择左右两侧展示的控件，切换后自动保存。' })}</div>
          </div>
          <div className="settings-layout-controls">
            <div className="settings-layout-control">
              <span className="settings-layout-control-label">{t('settings.app.layout.leftWidget', { defaultValue: '左侧控件' })}</span>
              <div className="settings-layout-options">
                {overviewWidgetOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`settings-layout-btn ${layoutConfig.left === opt.value ? 'active' : ''}`}
                    type="button"
                    onClick={() => updateLayout('left', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-layout-control">
              <span className="settings-layout-control-label">{t('settings.app.layout.rightWidget', { defaultValue: '右侧控件' })}</span>
              <div className="settings-layout-options">
                {overviewWidgetOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`settings-layout-btn ${layoutConfig.right === opt.value ? 'active' : ''}`}
                    type="button"
                    onClick={() => updateLayout('right', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-layout-control">
              <span className="settings-layout-control-label">{t('settings.app.layout.clockStyleTitle', { defaultValue: '中间时钟样式' })}</span>
              <div className="settings-layout-options">
                {overviewClockStyleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`settings-layout-btn ${layoutConfig.clockStyle === opt.value ? 'active' : ''}`}
                    type="button"
                    onClick={() => updateClockStyle(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="settings-layout-gradient-editor">
                <span className="settings-layout-control-label settings-layout-gradient-title">
                  {t('settings.app.layout.gradientEditorTitle', { defaultValue: '渐变颜色编辑' })}
                </span>
                <div className="settings-layout-gradient-pickers">
                  <label className="settings-layout-gradient-item">
                    <span>{t('settings.app.layout.gradientBaseColor', { defaultValue: '基准色' })}</span>
                    <input
                      type="color"
                      value={layoutConfig.gradientColors.middle}
                      onChange={(e) => updateGradientColor(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.layout.musicBgTitle', { defaultValue: 'Hover 音乐背景样式' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.layout.musicBgHint', { defaultValue: '预览并选择 Hover 态歌曲界面的背景波浪效果样式。' })}</div>
          </div>
          <div className="settings-music-bg-preview-row">
            <div className={`settings-music-bg-preview-item ${bgStyle === 'silky' ? 'active' : ''}`} onClick={() => handleStyleChange('silky')}>
              <div className="settings-music-bg-preview-canvas-wrap">
                <SilkyWave color={waveColor} playing />
              </div>
              <span className="settings-music-bg-preview-name">{t('settings.app.layout.musicBgSilky', { defaultValue: '丝滑波浪' })}</span>
            </div>
            <div className={`settings-music-bg-preview-item ${bgStyle === 'wave' ? 'active' : ''}`} onClick={() => handleStyleChange('wave')}>
              <div className="settings-music-bg-preview-canvas-wrap">
                <MusicBgWavePreview color={waveColor} playing />
              </div>
              <span className="settings-music-bg-preview-name">{t('settings.app.layout.musicBgWave', { defaultValue: '音频波浪' })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
