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
 * @file AnimationSettingsPage.tsx
 * @description 设置页面 - 软件设置动画子界面
 * @author 鸡哥
 */

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../../../store/slices';
import { SvgIcon } from '../../../../../../../../utils/SvgIcon';
import { SPLASH_VIDEO_SRC } from '../../../../../../../config/splashWindowConfig';
import { WaveEffect } from '../../../../../../../components/DynamicIslandSharedWaveEffect';

const MAXEXPAND_TAB_ANIMATION_KEY = 'maxexpand-tab-animation';
const EXPAND_TAB_ANIMATION_KEY = 'expand-tab-animation';
const STARTUP_ANIMATION_ENABLED_STORE_KEY = 'startup-animation-enabled';
const SPLASH_BG_COLOR_STORE_KEY = 'splash-bg-color';
const DEFAULT_SPLASH_BG_COLOR = '#000000';

/**
 * 渲染软件动画设置页面
 * @returns 动画设置页面
 */
export function AnimationSettingsPage(): ReactElement {
  const { t } = useTranslation();
  const springAnimation = useIslandStore((state) => state.springAnimation);
  const animationSpeed = useIslandStore((state) => state.animationSpeed);
  const [maxExpandTabAnim, setMaxExpandTabAnim] = useState(true);
  const [expandTabAnim, setExpandTabAnim] = useState(true);
  const [startupAnimationEnabled, setStartupAnimationEnabled] = useState<boolean>(true);
  const [splashBgColor, setSplashBgColor] = useState(DEFAULT_SPLASH_BG_COLOR);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(MAXEXPAND_TAB_ANIMATION_KEY).then((v: unknown) => {
      if (cancelled) return;
      if (v === false) setMaxExpandTabAnim(false);
    }).catch(() => {});
    window.api.storeRead(EXPAND_TAB_ANIMATION_KEY).then((v: unknown) => {
      if (cancelled) return;
      if (v === false) setExpandTabAnim(false);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(STARTUP_ANIMATION_ENABLED_STORE_KEY).then((data) => {
      if (cancelled) return;
      setStartupAnimationEnabled(typeof data === 'boolean' ? data : true);
    }).catch(() => {
      if (cancelled) return;
      setStartupAnimationEnabled(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(SPLASH_BG_COLOR_STORE_KEY).then((v) => {
      if (cancelled) return;
      if (typeof v === 'string') setSplashBgColor(v);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleMaxExpandTabAnimChange = (enabled: boolean): void => {
    setMaxExpandTabAnim(enabled);
    window.api.storeWrite(MAXEXPAND_TAB_ANIMATION_KEY, enabled).catch(() => {});
    window.api.settingsPreview('settings:maxexpand-tab-animation', enabled).catch(() => {});
  };

  const handleExpandTabAnimChange = (enabled: boolean): void => {
    setExpandTabAnim(enabled);
    window.api.storeWrite(EXPAND_TAB_ANIMATION_KEY, enabled).catch(() => {});
    window.api.settingsPreview('settings:expand-tab-animation', enabled).catch(() => {});
  };

  const handleStartupAnimationEnabledChange = (enabled: boolean): void => {
    setStartupAnimationEnabled(enabled);
    window.api.storeWrite(STARTUP_ANIMATION_ENABLED_STORE_KEY, enabled).catch(() => {});
  };

  const handleSplashBgColorChange = (color: string): void => {
    setSplashBgColor(color);
    window.api.storeWrite(SPLASH_BG_COLOR_STORE_KEY, color).catch(() => {});
  };

  const handleSplashBgColorReset = (): void => {
    setSplashBgColor(DEFAULT_SPLASH_BG_COLOR);
    window.api.storeWrite(SPLASH_BG_COLOR_STORE_KEY, null).catch(() => {});
  };

  const handlePreviewPlay = (): void => {
    const video = previewVideoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {});
    setPreviewPlaying(true);
  };

  const handlePreviewStop = (): void => {
    const video = previewVideoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setPreviewPlaying(false);
  };

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.animation.springTitle', { defaultValue: '灵动岛弹性动画' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.animation.springHint', { defaultValue: '关闭后，展开和收起动画将变得更加平滑内敛，消除弹跳感' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={springAnimation}
                onChange={(e) => {
                  const next = e.target.checked;
                  useIslandStore.getState().setSpringAnimation(next);
                  window.api.springAnimationSet(next).catch(() => {});
                }}
              />
              {t('settings.app.animation.springToggle', { defaultValue: '启用弹性动画' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.animation.animSpeedTitle', { defaultValue: '灵动岛动画速度' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.animation.animSpeedHint', { defaultValue: '控制灵动岛状态切换时的过渡动画快慢' })}</div>
          </div>
          <div className="settings-card-inline-row">
            {(['slow', 'medium', 'fast'] as const).map((speed) => (
              <label className="settings-card-check" key={speed}>
                <input
                  type="radio"
                  name="animation-speed"
                  checked={animationSpeed === speed}
                  onChange={() => {
                    useIslandStore.getState().setAnimationSpeed(speed);
                    window.api.animationSpeedSet(speed).catch(() => {});
                  }}
                />
                {t(`settings.app.animation.animSpeed_${speed}`, {
                  defaultValue: speed === 'slow' ? '慢' : speed === 'medium' ? '中' : '快',
                })}
              </label>
            ))}
          </div>
        </div>
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.animation.expandTabSwitchTitle', { defaultValue: 'Expand 切换动画' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.animation.expandTabSwitchHint', { defaultValue: '启用后，展开态切换页面时将播放左右滑动过渡动画' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={expandTabAnim}
                onChange={(e) => handleExpandTabAnimChange(e.target.checked)}
              />
              {t('settings.app.animation.expandTabSwitchToggle', { defaultValue: '启用切换动画' })}
            </label>
          </div>
        </div>
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.animation.maxExpandTabSwitchTitle', { defaultValue: 'MaxExpand 切换动画' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.animation.maxExpandTabSwitchHint', { defaultValue: '启用后，最大展开态切换页面时将播放左右滑动过渡动画' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={maxExpandTabAnim}
                onChange={(e) => handleMaxExpandTabAnimChange(e.target.checked)}
              />
              {t('settings.app.animation.maxExpandTabSwitchToggle', { defaultValue: '启用切换动画' })}
            </label>
          </div>
        </div>
        <div className="settings-splash-preview-row">
          <div className="settings-splash-preview-cards">
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title">{t('settings.app.animation.startupAnimationTitle', { defaultValue: '是否显示启动动画' })}</div>
                <div className="settings-card-subtitle">{t('settings.app.animation.startupAnimationHint', { defaultValue: '开启后每次启动显示启动动画，关闭后不显示' })}</div>
              </div>
              <div className="settings-card-inline-row">
                <label className="settings-card-check">
                  <input
                    type="checkbox"
                    checked={startupAnimationEnabled}
                    onChange={(e) => {
                      handleStartupAnimationEnabledChange(e.target.checked);
                    }}
                  />
                  {t('settings.app.animation.startupAnimationToggle', { defaultValue: '显示启动动画' })}
                </label>
              </div>
            </div>
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title-row">
                  <div className="settings-card-title">{t('settings.app.animation.splashBgColorTitle', { defaultValue: '启动画面背景颜色' })}</div>
                  <button
                    className="maxexpand-layout-reset-btn"
                    type="button"
                    onClick={handleSplashBgColorReset}
                    title={t('settings.app.animation.resetDefault', { defaultValue: '恢复默认' })}
                  >
                    <img src={SvgIcon.REVERT} alt="" className="maxexpand-layout-reset-btn-icon" />
                    {t('settings.app.animation.resetDefault', { defaultValue: '恢复默认' })}
                  </button>
                </div>
                <div className="settings-card-subtitle">{t('settings.app.animation.splashBgColorHint', { defaultValue: '自定义启动画面的背景颜色' })}</div>
              </div>
              <div className="settings-card-inline-row">
                <span className="settings-performance-monitor-color-control">
                  <input
                    className="settings-performance-monitor-color-input"
                    type="color"
                    value={splashBgColor}
                    onChange={(e) => handleSplashBgColorChange(e.target.value)}
                  />
                  <span className="settings-performance-monitor-color-value">{splashBgColor}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="settings-splash-preview-container">
            <div className="settings-splash-preview-stage" style={{ background: splashBgColor }}>
              <WaveEffect playing={previewPlaying} color={splashBgColor} />
              <video
                ref={previewVideoRef}
                className="splash-video"
                src={SPLASH_VIDEO_SRC}
                muted
                onEnded={() => setPreviewPlaying(false)}
              />
            </div>
            <div className="settings-splash-preview-controls">
              <button
                className="settings-splash-preview-btn"
                type="button"
                onClick={handlePreviewPlay}
                disabled={previewPlaying}
              >
                {t('settings.app.animation.previewPlay', { defaultValue: '预览' })}
              </button>
              <button
                className="settings-splash-preview-btn"
                type="button"
                onClick={handlePreviewStop}
                disabled={!previewPlaying}
              >
                {t('settings.app.animation.previewStop', { defaultValue: '停止' })}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
