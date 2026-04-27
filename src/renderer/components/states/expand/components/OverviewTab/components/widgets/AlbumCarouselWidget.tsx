import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
import {
  OVERVIEW_ALBUM_CONFIG_STORE_KEY,
  OVERVIEW_ALBUM_MEDIA_LOAD_DELAY_MS,
  PHOTO_ALBUM_STORE_KEY,
  getOverviewVideoMimeByExt,
  normalizeOverviewAlbumCardConfig,
  normalizeOverviewAlbumItems,
  type OverviewAlbumCardConfig,
  type OverviewAlbumItem,
} from '../../utils/overviewUtils';

interface AlbumCarouselWidgetProps {
  openAlbumPage: () => void;
}

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
  const videoPosterCacheRef = useRef<Record<number, string>>({});

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
    setVideoPosterUrl(videoPosterCacheRef.current[activeItem.id] || null);
  }, [activeItem?.id, activeItem?.mediaType]);

  useEffect(() => {
    let cancelled = false;
    if (!activeItem) {
      setImagePreviewUrl(null);
      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return () => {
        cancelled = true;
      };
    }

    if (activeItem.mediaType === 'image') {
      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setVideoPosterUrl(null);
      window.api.loadWallpaperFile(activeItem.path).then((dataUrl) => {
        if (cancelled) return;
        setImagePreviewUrl(dataUrl || null);
      }).catch(() => {
        if (cancelled) return;
        setImagePreviewUrl(null);
      });
      return () => {
        cancelled = true;
      };
    }

    setImagePreviewUrl(null);

    if (!mediaLoadReady) {
      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return () => {
        cancelled = true;
      };
    }

    window.api.readLocalFileAsBuffer(activeItem.path).then((buf) => {
      if (cancelled || !buf) return;
      const mime = getOverviewVideoMimeByExt(activeItem.ext);
      const arrayBuffer = new ArrayBuffer(buf.byteLength);
      new Uint8Array(arrayBuffer).set(buf);
      const blob = new Blob([arrayBuffer], { type: mime });
      const nextUrl = URL.createObjectURL(blob);

      if (!videoPosterCacheRef.current[activeItem.id]) {
        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.muted = true;
        probe.playsInline = true;
        const cleanupProbe = (): void => {
          probe.src = '';
          probe.load();
        };
        probe.onloadeddata = () => {
          if (cancelled) {
            cleanupProbe();
            return;
          }
          const width = probe.videoWidth;
          const height = probe.videoHeight;
          if (width > 0 && height > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(probe, 0, 0, width, height);
              const poster = canvas.toDataURL('image/jpeg', 0.86);
              videoPosterCacheRef.current[activeItem.id] = poster;
              setVideoPosterUrl(poster);
            }
          }
          cleanupProbe();
        };
        probe.onerror = () => {
          cleanupProbe();
        };
        probe.src = nextUrl;
      }

      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
    }).catch(() => {
      if (cancelled) return;
      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [mediaLoadReady, activeItem?.id, activeItem?.mediaType, activeItem?.path, activeItem?.ext]);

  useEffect(() => {
    return () => {
      setVideoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

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
