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
 * @file AlbumSettingsPage.tsx
 * @description 设置页面 - 软件设置相册配置子页面（占位）
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

type AlbumOrderMode = 'sequential' | 'random';
type AlbumMediaFilter = 'all' | 'image' | 'video';
type AlbumCardClickBehavior = 'open-album' | 'none';

interface OverviewAlbumCardConfig {
  intervalMs: number;
  autoRotate: boolean;
  orderMode: AlbumOrderMode;
  mediaFilter: AlbumMediaFilter;
  clickBehavior: AlbumCardClickBehavior;
  videoAutoPlay: boolean;
  videoMuted: boolean;
}

const OVERVIEW_ALBUM_CONFIG_STORE_KEY = 'overview-album-config';

const DEFAULT_OVERVIEW_ALBUM_CARD_CONFIG: OverviewAlbumCardConfig = {
  intervalMs: 5000,
  autoRotate: true,
  orderMode: 'sequential',
  mediaFilter: 'all',
  clickBehavior: 'open-album',
  videoAutoPlay: true,
  videoMuted: true,
};

function normalizeOverviewAlbumCardConfig(value: unknown): OverviewAlbumCardConfig {
  const row = (value ?? {}) as Partial<OverviewAlbumCardConfig>;
  const intervalMs = row.intervalMs === 3000 || row.intervalMs === 5000 || row.intervalMs === 8000
    ? row.intervalMs
    : DEFAULT_OVERVIEW_ALBUM_CARD_CONFIG.intervalMs;
  const orderMode = row.orderMode === 'random' ? 'random' : 'sequential';
  const mediaFilter = row.mediaFilter === 'image' || row.mediaFilter === 'video' ? row.mediaFilter : 'all';
  const clickBehavior = row.clickBehavior === 'none' ? 'none' : 'open-album';

  return {
    intervalMs,
    autoRotate: row.autoRotate !== false,
    orderMode,
    mediaFilter,
    clickBehavior,
    videoAutoPlay: row.videoAutoPlay !== false,
    videoMuted: row.videoMuted !== false,
  };
}

/**
 * 渲染相册配置子页面（占位）
 */
export function AlbumSettingsPage(): ReactElement {
  const { t } = useTranslation();
  const [config, setConfig] = useState<OverviewAlbumCardConfig>(DEFAULT_OVERVIEW_ALBUM_CARD_CONFIG);

  useEffect(() => {
    let cancelled = false;

    window.api.storeRead(OVERVIEW_ALBUM_CONFIG_STORE_KEY).then((value) => {
      if (cancelled) return;
      setConfig(normalizeOverviewAlbumCardConfig(value));
    }).catch(() => {
      if (cancelled) return;
      setConfig(DEFAULT_OVERVIEW_ALBUM_CARD_CONFIG);
    });

    const unsub = window.api.onSettingsChanged((channel, value) => {
      if (cancelled) return;
      if (channel !== `store:${OVERVIEW_ALBUM_CONFIG_STORE_KEY}`) return;
      setConfig(normalizeOverviewAlbumCardConfig(value));
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const updateConfig = (patch: Partial<OverviewAlbumCardConfig>): void => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      window.api.storeWrite(OVERVIEW_ALBUM_CONFIG_STORE_KEY, next).catch(() => {});
      return next;
    });
  };

  return (
    <div className="max-expand-settings-section settings-album-page-panel">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.album.carouselTitle', { defaultValue: '相册轮播方式' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.album.carouselHint', { defaultValue: '配置总览相册卡片的轮播顺序、频率、展示内容与点击行为' })}</div>
          </div>

          <div className="settings-card-inline-row">
            <span className="settings-layout-control-label">{t('settings.app.album.intervalLabel', { defaultValue: '轮播间隔' })}</span>
            <label className="settings-card-check">
              <input
                type="radio"
                name="album-interval"
                checked={config.intervalMs === 3000}
                onChange={() => {
                  updateConfig({ intervalMs: 3000 });
                }}
              />
              {t('settings.app.album.interval3s', { defaultValue: '3 秒' })}
            </label>
            <label className="settings-card-check">
              <input
                type="radio"
                name="album-interval"
                checked={config.intervalMs === 5000}
                onChange={() => {
                  updateConfig({ intervalMs: 5000 });
                }}
              />
              {t('settings.app.album.interval5s', { defaultValue: '5 秒' })}
            </label>
            <label className="settings-card-check">
              <input
                type="radio"
                name="album-interval"
                checked={config.intervalMs === 8000}
                onChange={() => {
                  updateConfig({ intervalMs: 8000 });
                }}
              />
              {t('settings.app.album.interval8s', { defaultValue: '8 秒' })}
            </label>
          </div>

          <div className="settings-card-inline-row">
            <span className="settings-layout-control-label">{t('settings.app.album.orderLabel', { defaultValue: '轮播顺序' })}</span>
            <label className="settings-card-check">
              <input
                type="radio"
                name="album-order-mode"
                checked={config.orderMode === 'sequential'}
                onChange={() => {
                  updateConfig({ orderMode: 'sequential' });
                }}
              />
              {t('settings.app.album.orderSequential', { defaultValue: '顺序轮播' })}
            </label>
            <label className="settings-card-check">
              <input
                type="radio"
                name="album-order-mode"
                checked={config.orderMode === 'random'}
                onChange={() => {
                  updateConfig({ orderMode: 'random' });
                }}
              />
              {t('settings.app.album.orderRandom', { defaultValue: '随机轮播' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.album.filterLabel', { defaultValue: '展示资源' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.album.filterHint', { defaultValue: '选择总览相册卡片参与轮播的资源类型' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="radio"
                name="album-media-filter"
                checked={config.mediaFilter === 'all'}
                onChange={() => {
                  updateConfig({ mediaFilter: 'all' });
                }}
              />
              {t('settings.app.album.filterAll', { defaultValue: '全部' })}
            </label>
            <label className="settings-card-check">
              <input
                type="radio"
                name="album-media-filter"
                checked={config.mediaFilter === 'image'}
                onChange={() => {
                  updateConfig({ mediaFilter: 'image' });
                }}
              />
              {t('settings.app.album.filterImage', { defaultValue: '仅图片' })}
            </label>
            <label className="settings-card-check">
              <input
                type="radio"
                name="album-media-filter"
                checked={config.mediaFilter === 'video'}
                onChange={() => {
                  updateConfig({ mediaFilter: 'video' });
                }}
              />
              {t('settings.app.album.filterVideo', { defaultValue: '仅视频' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.album.clickBehaviorLabel', { defaultValue: '点击卡片行为' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.album.clickBehaviorHint', { defaultValue: '配置点击总览相册卡片后的行为' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="radio"
                name="album-click-behavior"
                checked={config.clickBehavior === 'open-album'}
                onChange={() => {
                  updateConfig({ clickBehavior: 'open-album' });
                }}
              />
              {t('settings.app.album.clickBehaviorOpen', { defaultValue: '打开相册页' })}
            </label>
            <label className="settings-card-check">
              <input
                type="radio"
                name="album-click-behavior"
                checked={config.clickBehavior === 'none'}
                onChange={() => {
                  updateConfig({ clickBehavior: 'none' });
                }}
              />
              {t('settings.app.album.clickBehaviorNone', { defaultValue: '无动作' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.album.playbackTitle', { defaultValue: '自动播放与视频行为' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.album.playbackHint', { defaultValue: '仅影响总览相册轮播卡片，不影响相册主页面。' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={config.autoRotate}
                onChange={(e) => {
                  updateConfig({ autoRotate: e.target.checked });
                }}
              />
              {t('settings.app.album.autoRotateToggle', { defaultValue: '启用自动轮播' })}
            </label>
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={config.videoAutoPlay}
                onChange={(e) => {
                  updateConfig({ videoAutoPlay: e.target.checked });
                }}
              />
              {t('settings.app.album.videoAutoPlayToggle', { defaultValue: '视频自动播放' })}
            </label>
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={config.videoMuted}
                onChange={(e) => {
                  updateConfig({ videoMuted: e.target.checked });
                }}
              />
              {t('settings.app.album.videoMutedToggle', { defaultValue: '视频静音播放' })}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
