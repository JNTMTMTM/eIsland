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
 * @file AlbumCarouselWidget.tsx
 * @description Overview 相册轮播小组件，支持图片/视频自动轮播、筛选与手动切换。
 * @author 鸡哥
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
import probeVideo from '../../../../../../../utils/media/videoProbe';
import {
  OVERVIEW_ALBUM_CONFIG_STORE_KEY,
  OVERVIEW_ALBUM_MEDIA_LOAD_DELAY_MS,
  PHOTO_ALBUM_STORE_KEY,
  normalizeOverviewAlbumCardConfig,
  normalizeOverviewAlbumItems,
  type OverviewAlbumCardConfig,
  type OverviewAlbumItem,
} from '../../utils/overviewUtils';

interface AlbumCarouselWidgetProps {
  openAlbumPage: () => void;
}

/** 相册轮播小组件，展示照片/视频并支持自动轮播与手动切换。 */
export function AlbumCarouselWidget({ openAlbumPage }: AlbumCarouselWidgetProps): React.ReactElement {
  const { t } = useTranslation();
  const [items, setItems] = useState<OverviewAlbumItem[]>([]);
  const [albumConfig, setAlbumConfig] = useState<OverviewAlbumCardConfig>(() => normalizeOverviewAlbumCardConfig(null));
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [slideDir, setSlideDir] = useState<'prev' | 'next'>('next');
  const [mediaLoadReady, setMediaLoadReady] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoPosterUrl, setVideoPosterUrl] = useState<string | null>(null);
  const videoPosterCacheRef = useRef<{ id: number; poster: string } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMediaLoadReady(true);
    }, OVERVIEW_ALBUM_MEDIA_LOAD_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const applyItems = (value: unknown): void => {
      const next = normalizeOverviewAlbumItems(value);
      setItems(next);
      setActiveIndex((prev) => {
        if (next.length === 0) return 0;
        return Math.min(prev, next.length - 1);
      });
    };

    window.api.storeRead(PHOTO_ALBUM_STORE_KEY).then((value) => {
      if (cancelled) return;
      applyItems(value);
    }).catch(() => {});

    const unsub = window.api.onSettingsChanged((channel, value) => {
      if (cancelled) return;
      if (channel === `store:${PHOTO_ALBUM_STORE_KEY}`) {
        applyItems(value);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(OVERVIEW_ALBUM_CONFIG_STORE_KEY).then((value) => {
      if (cancelled) return;
      setAlbumConfig(normalizeOverviewAlbumCardConfig(value));
    }).catch(() => {
      if (cancelled) return;
      setAlbumConfig(normalizeOverviewAlbumCardConfig(null));
    });

    const unsub = window.api.onSettingsChanged((channel, value) => {
      if (cancelled) return;
      if (channel !== `store:${OVERVIEW_ALBUM_CONFIG_STORE_KEY}`) return;
      setAlbumConfig(normalizeOverviewAlbumCardConfig(value));
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const displayItems = items.filter((item) => {
    if (albumConfig.mediaFilter === 'all') return true;
    if (albumConfig.mediaFilter === 'image') return item.mediaType === 'image';
    return item.mediaType === 'video';
  });

  useEffect(() => {
    setActiveIndex((prev) => {
      if (displayItems.length === 0) return 0;
      return Math.min(prev, displayItems.length - 1);
    });
  }, [displayItems.length]);

  const activeItem = displayItems.length > 0 ? displayItems[activeIndex] : null;

  useEffect(() => {
    if (!activeItem || activeItem.mediaType !== 'video') {
      setVideoPosterUrl(null);
      return;
    }
    setVideoPosterUrl(videoPosterCacheRef.current?.id === activeItem.id ? videoPosterCacheRef.current.poster : null);
  }, [activeItem?.id, activeItem?.mediaType]);

  useEffect(() => {
    const controller = new AbortController();
    setVideoPreviewUrl(null);
    setImagePreviewUrl(null);
    if (!activeItem) {
      videoPosterCacheRef.current = null;
      return () => controller.abort();
    }

    if (activeItem.mediaType === 'image') {
      setVideoPosterUrl(null);
      videoPosterCacheRef.current = null;
      window.api.loadWallpaperFile(activeItem.path).then((dataUrl) => {
        if (!controller.signal.aborted) setImagePreviewUrl(dataUrl || null);
      }).catch(() => {});
      return () => controller.abort();
    }

    if (!mediaLoadReady) return () => controller.abort();
    window.api.getAlbumMediaInfo(activeItem.path).then(async (info) => {
      if (controller.signal.aborted || !info) return;
      setVideoPreviewUrl(info.url);
      if (videoPosterCacheRef.current?.id === activeItem.id) return;
      videoPosterCacheRef.current = null;
      const metadata = await probeVideo(info.url, controller.signal, true);
      if (controller.signal.aborted || !metadata?.poster) return;
      videoPosterCacheRef.current = {id: activeItem.id, poster: metadata.poster};
      setVideoPosterUrl(metadata.poster);
    }).catch(() => {});

    return () => controller.abort();
  }, [mediaLoadReady, activeItem?.id, activeItem?.mediaType, activeItem?.path, activeItem?.ext]);

  const hasImagePreview = activeItem?.mediaType === 'image' && Boolean(imagePreviewUrl);
  const hasVideoPreview = activeItem?.mediaType === 'video' && Boolean(videoPreviewUrl);
  const hasVideoPoster = activeItem?.mediaType === 'video' && Boolean(videoPosterUrl);

  const goNext = useCallback(() => {
    setSlideDir('next');
    setActiveIndex((prev) => {
      if (displayItems.length <= 1) return prev;
      if (albumConfig.orderMode === 'random') {
        let next = prev;
        while (next === prev) {
          next = Math.floor(Math.random() * displayItems.length);
        }
        return next;
      }
      return (prev + 1) % displayItems.length;
    });
  }, [displayItems.length, albumConfig.orderMode]);

  const goPrev = useCallback(() => {
    setSlideDir('prev');
    setActiveIndex((prev) => {
      if (displayItems.length <= 1) return prev;
      if (albumConfig.orderMode === 'random') {
        let next = prev;
        while (next === prev) {
          next = Math.floor(Math.random() * displayItems.length);
        }
        return next;
      }
      return (prev - 1 + displayItems.length) % displayItems.length;
    });
  }, [displayItems.length, albumConfig.orderMode]);

  useEffect(() => {
    if (paused || !albumConfig.autoRotate || displayItems.length <= 1) return;
    const timer = setInterval(() => {
      setSlideDir('next');
      setActiveIndex((prev) => {
        if (albumConfig.orderMode === 'random') {
          let next = prev;
          while (next === prev) {
            next = Math.floor(Math.random() * displayItems.length);
          }
          return next;
        }
        return (prev + 1) % displayItems.length;
      });
    }, albumConfig.intervalMs);
    return () => clearInterval(timer);
  }, [paused, albumConfig.autoRotate, albumConfig.orderMode, albumConfig.intervalMs, displayItems.length]);

  const canOpenAlbum = albumConfig.clickBehavior === 'open-album';

  return (
    <div className="ov-dash-widget ov-dash-album-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link" onClick={openAlbumPage}>{t('overview.album.title', { defaultValue: '相册轮播' })}</span>
      </div>
      {!activeItem ? (
        <div className="ov-dash-album-empty">{t('overview.album.empty', { defaultValue: '相册暂无媒体' })}</div>
      ) : (
        <div
          className="ov-dash-album-card"
          onClick={canOpenAlbum ? openAlbumPage : undefined}
          title={canOpenAlbum ? t('overview.album.open', { defaultValue: '点击进入相册' }) : ''}
        >
          <div className="ov-dash-album-count">{t('overview.album.position', { defaultValue: '{{index}} / {{total}}', index: activeIndex + 1, total: displayItems.length })}</div>
          <div className={`ov-dash-album-media ov-dash-album-media--${slideDir}`} key={`${activeItem.id}-${activeItem.mediaType}`}>
            {hasImagePreview ? (
              <img className="ov-dash-album-preview" src={imagePreviewUrl ?? undefined} alt={activeItem.name} />
            ) : hasVideoPreview ? (
              <video
                className="ov-dash-album-preview ov-dash-album-video"
                src={videoPreviewUrl || undefined}
                poster={videoPosterUrl || undefined}
                muted={albumConfig.videoMuted}
                autoPlay={albumConfig.videoAutoPlay}
                loop
                playsInline
                preload="metadata"
              />
            ) : hasVideoPoster ? (
              <img className="ov-dash-album-preview" src={videoPosterUrl || undefined} alt={activeItem.name} />
            ) : (
              <div className="ov-dash-album-fallback">
                <img src={SvgIcon.PHOTO_ALBUM} alt="" className="ov-dash-album-fallback-icon" />
              </div>
            )}
          </div>
          <div className="ov-dash-album-mask" />
          <div className="ov-dash-album-meta">
            <div className="ov-dash-album-name" title={activeItem.name}>{activeItem.name}</div>
          </div>
          <div className="ov-dash-album-controls" onClick={(e) => e.stopPropagation()}>
            <button className="ov-dash-album-btn" type="button" onClick={goPrev} title={t('overview.album.prev', { defaultValue: '上一张' })}>
              <img src={SvgIcon.PREVIOUS} alt={t('overview.album.prev', { defaultValue: '上一张' })} className="ov-dash-album-btn-icon" />
            </button>
            <button
              className="ov-dash-album-btn ov-dash-album-btn-play"
              type="button"
              onClick={() => {
                if (!albumConfig.autoRotate) return;
                setPaused((v) => !v);
              }}
              disabled={!albumConfig.autoRotate}
              title={paused ? t('overview.album.play', { defaultValue: '继续轮播' }) : t('overview.album.pause', { defaultValue: '暂停轮播' })}
            >
              <img
                src={paused ? SvgIcon.CONTINUE : SvgIcon.PAUSE}
                alt={paused ? t('overview.album.play', { defaultValue: '继续轮播' }) : t('overview.album.pause', { defaultValue: '暂停轮播' })}
                className="ov-dash-album-btn-icon"
              />
            </button>
            <button className="ov-dash-album-btn" type="button" onClick={goNext} title={t('overview.album.next', { defaultValue: '下一张' })}>
              <img src={SvgIcon.NEXT} alt={t('overview.album.next', { defaultValue: '下一张' })} className="ov-dash-album-btn-icon" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
