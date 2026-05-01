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
 * @file StandaloneWindow.tsx
 * @description 倒数日/TODOs/设置 独立窗口根组件 — 浏览器风格顶部 Tab 切换
 * @author 鸡哥
 */

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { TodoTab } from './states/maxExpand/components/TodoTab';
import { CountdownTab } from './states/maxExpand/components/CountdownTab';
import { UrlFavoritesTab } from './states/maxExpand/components/UrlFavoritesTab';
import { AlbumTab } from './states/maxExpand/components/AlbumTab';
import { MailTab } from './states/maxExpand/components/MailTab';
import { LocalFileSearchTab } from './states/maxExpand/components/LocalFileSearchTab';
import { ClipboardHistoryTab } from './states/maxExpand/components/ClipboardHistoryTab';
import { SettingsTab } from './states/maxExpand/components/SettingsTab';
import { LoginContent } from './states/login/LoginContent';
import { RegisterContent } from './states/register/RegisterContent';
import { PaymentContent } from './states/payment/PaymentContent';
import useIslandStore from '../store/slices';
import windowIcon from '../../../resources/icon/eisland.svg';

type WindowTab = 'todo' | 'countdown' | 'urlFavorites' | 'album' | 'mail' | 'localFileSearch' | 'clipboardHistory' | 'settings';
const ACTIVE_TAB_STORE_KEY = 'standalone-window-active-tab';
const LEGACY_ACTIVE_TAB_STORE_KEY = 'countdown-window-active-tab';
const AUTH_INTENT_STORE_KEY = 'standalone-window-auth-intent';
const ISLAND_BG_MEDIA_STORE_KEY = 'island-bg-media';
const ISLAND_BG_IMAGE_STORE_KEY = 'island-bg-image';
const ISLAND_BG_VIDEO_FIT_STORE_KEY = 'island-bg-video-fit';
const ISLAND_BG_VIDEO_MUTED_STORE_KEY = 'island-bg-video-muted';
const ISLAND_BG_VIDEO_LOOP_STORE_KEY = 'island-bg-video-loop';
const ISLAND_BG_VIDEO_VOLUME_STORE_KEY = 'island-bg-video-volume';
const ISLAND_BG_VIDEO_RATE_STORE_KEY = 'island-bg-video-rate';
const ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY = 'island-bg-video-hw-decode';
const ISLAND_BG_OPACITY_STORE_KEY = 'island-bg-opacity';
const ISLAND_BG_BLUR_STORE_KEY = 'island-bg-blur';
const STANDALONE_WINDOW_MAC_CONTROLS_STORE_KEY = 'standalone-window-mac-controls';
const LOCAL_ISLAND_BG_SYNC_EVENT = 'island-bg-local-sync';

type IslandBgMediaType = 'image' | 'video';

interface IslandBgMediaConfig {
  type: IslandBgMediaType;
  source: string;
}

function applyAuthIntent(intent: unknown): void {
  if (intent === 'login') {
    useIslandStore.setState({ state: 'login' });
    return;
  }
  if (intent === 'register') {
    useIslandStore.setState({ state: 'register' });
    return;
  }
  if (intent === null || intent === '' || intent === 'none') {
    useIslandStore.setState({ state: 'maxExpand' });
  }
}

function isDirectBgMediaUrl(source: string): boolean {
  return source.startsWith('data:')
    || source.startsWith('http://')
    || source.startsWith('https://')
    || source.startsWith('blob:')
    || source.startsWith('file:')
    || source.startsWith('/')
    || source.startsWith('./')
    || source.startsWith('../')
    || source.startsWith('assets/');
}

function toMediaUrl(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return `eisland-media://local/${encodeURIComponent(normalized)}`;
}

function normalizeBgMediaConfig(value: unknown): IslandBgMediaConfig | null {
  if (typeof value === 'string') {
    const source = value.trim();
    return source ? { type: 'image', source } : null;
  }
  if (!value || typeof value !== 'object') return null;

  const candidate = value as { type?: unknown; source?: unknown; image?: unknown; url?: unknown };
  const sourceRaw = typeof candidate.source === 'string'
    ? candidate.source
    : typeof candidate.image === 'string'
      ? candidate.image
      : typeof candidate.url === 'string'
        ? candidate.url
        : null;
  if (!sourceRaw) return null;

  const source = sourceRaw.trim();
  if (!source) return null;

  if (candidate.type === 'video') {
    return { type: 'video', source };
  }
  return { type: 'image', source };
}

async function resolveBgMediaPreviewUrl(media: IslandBgMediaConfig): Promise<string | null> {
  if (media.type === 'image') {
    if (isDirectBgMediaUrl(media.source)) return media.source;
    return window.api.loadWallpaperFile?.(media.source) ?? null;
  }
  if (isDirectBgMediaUrl(media.source)) return media.source;
  return toMediaUrl(media.source);
}

const VALID_TABS = new Set<WindowTab>(['todo', 'countdown', 'urlFavorites', 'album', 'mail', 'localFileSearch', 'clipboardHistory', 'settings']);

const TAB_LIST: { key: WindowTab; labelKey: string }[] = [
  { key: 'todo', labelKey: 'standalone.tabs.todo' },
  { key: 'countdown', labelKey: 'standalone.tabs.countdown' },
  { key: 'urlFavorites', labelKey: 'standalone.tabs.urlFavorites' },
  { key: 'album', labelKey: 'standalone.tabs.album' },
  { key: 'mail', labelKey: 'standalone.tabs.mail' },
  { key: 'localFileSearch', labelKey: 'standalone.tabs.localFileSearch' },
  { key: 'clipboardHistory', labelKey: 'standalone.tabs.clipboardHistory' },
  { key: 'settings', labelKey: 'standalone.tabs.settings' },
];

/**
 * 独立窗口根组件
 * @description 提供待办、倒数日与设置三个页签的窗口化视图
 */
export function StandaloneWindow(): ReactElement {
  const { t } = useTranslation();
  const state = useIslandStore((s) => s.state);
  const [activeTab, setActiveTab] = useState<WindowTab>('todo');
  const [bgMedia, setBgMedia] = useState<{ type: IslandBgMediaType; previewUrl: string } | null>(null);
  const [bgVideoFit, setBgVideoFit] = useState<'cover' | 'contain'>('cover');
  const [bgVideoMuted, setBgVideoMuted] = useState<boolean>(true);
  const [bgVideoLoop, setBgVideoLoop] = useState<boolean>(true);
  const [bgVideoVolume, setBgVideoVolume] = useState<number>(0.6);
  const [bgVideoRate, setBgVideoRate] = useState<number>(1);
  const [bgVideoHwDecode, setBgVideoHwDecode] = useState<boolean>(true);
  const bgVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const [bgImageOpacity, setBgImageOpacity] = useState<number>(30);
  const [bgImageBlur, setBgImageBlur] = useState<number>(0);
  const [standaloneMacControls, setStandaloneMacControls] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const applyBgMedia = (media: IslandBgMediaConfig | null, previewUrl: string | null): void => {
      if (!media || !previewUrl) {
        setBgMedia(null);
        return;
      }
      setBgMedia({ type: media.type, previewUrl });
    };

    const applyBgOpacity = (opacityValue: unknown): void => {
      const safe = typeof opacityValue === 'number' && Number.isFinite(opacityValue)
        ? Math.max(0, Math.min(100, Math.round(opacityValue)))
        : 30;
      setBgImageOpacity(safe);
    };

    const applyBgBlur = (blurValue: unknown): void => {
      const safe = typeof blurValue === 'number' && Number.isFinite(blurValue)
        ? Math.max(0, Math.min(20, Math.round(blurValue)))
        : 0;
      setBgImageBlur(safe);
    };

    window.api.storeRead(ACTIVE_TAB_STORE_KEY).then((tab) => {
      if (cancelled) return;
      if (VALID_TABS.has(tab as WindowTab)) {
        setActiveTab(tab as WindowTab);
        return;
      }
      window.api.storeRead(LEGACY_ACTIVE_TAB_STORE_KEY).then((legacyTab) => {
        if (cancelled) return;
        if (VALID_TABS.has(legacyTab as WindowTab)) {
          setActiveTab(legacyTab as WindowTab);
        }
      }).catch(() => {});
    }).catch(() => {});

    window.api.storeRead(AUTH_INTENT_STORE_KEY).then((intent) => {
      if (cancelled) return;
      if (intent === 'login' || intent === 'register') {
        setActiveTab('settings');
        applyAuthIntent(intent);
        window.api.storeWrite(AUTH_INTENT_STORE_KEY, null).catch(() => {});
      }
    }).catch(() => {});

    Promise.all([
      window.api.storeRead(ISLAND_BG_MEDIA_STORE_KEY),
      window.api.storeRead(ISLAND_BG_IMAGE_STORE_KEY) as Promise<string | null>,
      window.api.storeRead(ISLAND_BG_VIDEO_FIT_STORE_KEY) as Promise<'cover' | 'contain' | null>,
      window.api.storeRead(ISLAND_BG_VIDEO_MUTED_STORE_KEY) as Promise<boolean | null>,
      window.api.storeRead(ISLAND_BG_VIDEO_LOOP_STORE_KEY) as Promise<boolean | null>,
      window.api.storeRead(ISLAND_BG_VIDEO_VOLUME_STORE_KEY) as Promise<number | null>,
      window.api.storeRead(ISLAND_BG_VIDEO_RATE_STORE_KEY) as Promise<number | null>,
      window.api.storeRead(ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY) as Promise<boolean | null>,
    ]).then(async ([mediaRaw, legacyImage, videoFit, videoMuted, videoLoop, videoVolume, videoRate, videoHwDecode]) => {
      if (cancelled) return;
      if (videoFit === 'cover' || videoFit === 'contain') {
        setBgVideoFit(videoFit);
      }
      if (typeof videoMuted === 'boolean') {
        setBgVideoMuted(videoMuted);
      }
      if (typeof videoLoop === 'boolean') {
        setBgVideoLoop(videoLoop);
      }
      if (typeof videoVolume === 'number' && Number.isFinite(videoVolume)) {
        setBgVideoVolume(Math.max(0, Math.min(1, videoVolume)));
      }
      if (typeof videoRate === 'number' && Number.isFinite(videoRate)) {
        setBgVideoRate(Math.max(0.25, Math.min(3, videoRate)));
      }
      if (typeof videoHwDecode === 'boolean') {
        setBgVideoHwDecode(videoHwDecode);
      }
      const media = normalizeBgMediaConfig(mediaRaw)
        ?? (typeof legacyImage === 'string' ? normalizeBgMediaConfig(legacyImage) : null);
      if (!media) {
        applyBgMedia(null, null);
        return;
      }
      const previewUrl = await resolveBgMediaPreviewUrl(media);
      if (cancelled) return;
      applyBgMedia(media, previewUrl);
    }).catch(() => {});

    window.api.storeRead(ISLAND_BG_OPACITY_STORE_KEY).then((opacity) => {
      if (cancelled) return;
      applyBgOpacity(opacity);
    }).catch(() => {});

    window.api.storeRead(ISLAND_BG_BLUR_STORE_KEY).then((blur) => {
      if (cancelled) return;
      applyBgBlur(blur);
    }).catch(() => {});

    window.api.storeRead(STANDALONE_WINDOW_MAC_CONTROLS_STORE_KEY).then((value) => {
      if (cancelled) return;
      if (typeof value === 'boolean') {
        setStandaloneMacControls(value);
      }
    }).catch(() => {});

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${ACTIVE_TAB_STORE_KEY}`) {
        if (VALID_TABS.has(value as WindowTab)) {
          setActiveTab(value as WindowTab);
        }
      }
      if (channel === `store:${AUTH_INTENT_STORE_KEY}`) {
        if (value === 'login' || value === 'register') {
          setActiveTab('settings');
          applyAuthIntent(value);
          window.api.storeWrite(AUTH_INTENT_STORE_KEY, null).catch(() => {});
        }
      }
      if (channel === `store:${ISLAND_BG_MEDIA_STORE_KEY}`) {
        const media = normalizeBgMediaConfig(value);
        if (!media) {
          applyBgMedia(null, null);
          return;
        }
        resolveBgMediaPreviewUrl(media).then((previewUrl) => {
          if (cancelled) return;
          applyBgMedia(media, previewUrl);
        }).catch(() => {});
      }
      if (channel === `store:${ISLAND_BG_OPACITY_STORE_KEY}`) {
        applyBgOpacity(value);
      }
      if (channel === `store:${ISLAND_BG_BLUR_STORE_KEY}`) {
        applyBgBlur(value);
      }
      if (channel === `store:${ISLAND_BG_VIDEO_FIT_STORE_KEY}`) {
        if (value === 'cover' || value === 'contain') {
          setBgVideoFit(value);
        }
      }
      if (channel === `store:${ISLAND_BG_VIDEO_MUTED_STORE_KEY}`) {
        if (typeof value === 'boolean') {
          setBgVideoMuted(value);
        }
      }
      if (channel === `store:${ISLAND_BG_VIDEO_LOOP_STORE_KEY}`) {
        if (typeof value === 'boolean') {
          setBgVideoLoop(value);
        }
      }
      if (channel === `store:${ISLAND_BG_VIDEO_VOLUME_STORE_KEY}`) {
        if (typeof value === 'number' && Number.isFinite(value)) {
          setBgVideoVolume(Math.max(0, Math.min(1, value)));
        }
      }
      if (channel === `store:${ISLAND_BG_VIDEO_RATE_STORE_KEY}`) {
        if (typeof value === 'number' && Number.isFinite(value)) {
          setBgVideoRate(Math.max(0.25, Math.min(3, value)));
        }
      }
      if (channel === `store:${ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY}`) {
        if (typeof value === 'boolean') {
          setBgVideoHwDecode(value);
        }
      }
      if (channel === `store:${STANDALONE_WINDOW_MAC_CONTROLS_STORE_KEY}`) {
        if (typeof value === 'boolean') {
          setStandaloneMacControls(value);
        }
      }
    });

    const localBgSyncHandler = (event: Event): void => {
      const customEvent = event as CustomEvent<{ media?: IslandBgMediaConfig | null; previewUrl?: string | null; image?: string | null; opacity?: number; blur?: number; videoFit?: 'cover' | 'contain'; videoMuted?: boolean; videoLoop?: boolean; videoVolume?: number; videoRate?: number; videoHwDecode?: boolean }>;
      const detail = customEvent.detail;
      if (!detail || typeof detail !== 'object') return;
      const hasMediaPayload = 'media' in detail || 'previewUrl' in detail;
      if (hasMediaPayload) {
        applyBgMedia(detail.media ?? null, detail.previewUrl ?? null);
      }
      if (!hasMediaPayload && 'image' in detail) {
        const media = typeof detail.image === 'string'
          ? normalizeBgMediaConfig(detail.image)
          : null;
        applyBgMedia(media, detail.image ?? null);
      }
      if ('opacity' in detail) {
        applyBgOpacity(detail.opacity);
      }
      if ('blur' in detail) {
        applyBgBlur(detail.blur);
      }
      if (detail.videoFit === 'cover' || detail.videoFit === 'contain') {
        setBgVideoFit(detail.videoFit);
      }
      if (typeof detail.videoMuted === 'boolean') {
        setBgVideoMuted(detail.videoMuted);
      }
      if (typeof detail.videoLoop === 'boolean') {
        setBgVideoLoop(detail.videoLoop);
      }
      if (typeof detail.videoVolume === 'number' && Number.isFinite(detail.videoVolume)) {
        setBgVideoVolume(Math.max(0, Math.min(1, detail.videoVolume)));
      }
      if (typeof detail.videoRate === 'number' && Number.isFinite(detail.videoRate)) {
        setBgVideoRate(Math.max(0.25, Math.min(3, detail.videoRate)));
      }
      if (typeof detail.videoHwDecode === 'boolean') {
        setBgVideoHwDecode(detail.videoHwDecode);
      }
    };
    window.addEventListener(LOCAL_ISLAND_BG_SYNC_EVENT, localBgSyncHandler as EventListener);

    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener(LOCAL_ISLAND_BG_SYNC_EVENT, localBgSyncHandler as EventListener);
    };
  }, []);

  const bgVideoLoopRef = useRef<boolean>(bgVideoLoop);
  useEffect(() => { bgVideoLoopRef.current = bgVideoLoop; }, [bgVideoLoop]);

  // 自定义背景视频循环：绕开 React 合成事件与 Chromium 原生 loop 的偶发失效
  useEffect(() => {
    if (bgMedia?.type !== 'video') return;
    const el = bgVideoElementRef.current;
    if (!el) return;
    el.loop = false;
    const restart = (): void => {
      if (!bgVideoLoopRef.current) return;
      try { el.currentTime = 0; } catch { /* ignore */ }
      el.play().catch(() => {});
    };
    const onEnded = (): void => { restart(); };
    const onTimeUpdate = (): void => {
      if (!bgVideoLoopRef.current) return;
      const duration = el.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (duration - el.currentTime <= 0.12) {
        restart();
      }
    };
    el.addEventListener('ended', onEnded);
    el.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [bgMedia?.previewUrl, bgMedia?.type, bgVideoHwDecode]);

  useEffect(() => {
    if (!bgVideoLoop) return;
    const el = bgVideoElementRef.current;
    if (!el) return;
    if (el.ended) {
      try { el.currentTime = 0; } catch { /* ignore */ }
      el.play().catch(() => {});
    }
  }, [bgVideoLoop]);

  useEffect(() => {
    const el = bgVideoElementRef.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, bgVideoVolume));
    el.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
  }, [bgVideoVolume, bgVideoRate]);

  const switchTab = (tab: WindowTab): void => {
    setActiveTab(tab);
    window.api.storeWrite(ACTIVE_TAB_STORE_KEY, tab).catch(() => {});
  };

  return (
    <div className="cw-root">
      <div
        className="cw-bg-layer"
        style={{
          backgroundImage: bgMedia?.type === 'image' && bgMedia.previewUrl ? `url(${bgMedia.previewUrl})` : 'none',
          opacity: bgMedia?.previewUrl ? bgImageOpacity / 100 : 0,
          filter: bgMedia?.previewUrl && bgImageBlur > 0 ? `blur(${bgImageBlur}px)` : 'none',
        }}
      >
        {bgMedia?.type === 'video' && (
          <video
            key={`${bgMedia.previewUrl}-${bgVideoHwDecode ? 'hw' : 'sw'}`}
            ref={bgVideoElementRef}
            className="cw-bg-video"
            src={bgMedia.previewUrl}
            autoPlay
            muted={bgVideoMuted || bgVideoVolume <= 0}
            playsInline
            preload="auto"
            disableRemotePlayback
            style={{ objectFit: bgVideoFit, imageRendering: bgVideoHwDecode ? undefined : 'auto' }}
            onLoadedMetadata={(event) => {
              event.currentTarget.loop = false;
              event.currentTarget.volume = Math.max(0, Math.min(1, bgVideoVolume));
              event.currentTarget.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
            }}
            onCanPlay={(event) => {
              event.currentTarget.loop = false;
              event.currentTarget.volume = Math.max(0, Math.min(1, bgVideoVolume));
              event.currentTarget.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
              event.currentTarget.play().catch(() => {});
            }}
          />
        )}
      </div>
      {/* 顶部栏：浏览器风格 Tab + 窗口控制 */}
      <div className="cw-chrome">
        <img className="cw-window-icon" src={windowIcon} alt="eIsland" />
        <div className="cw-tabs">
          {TAB_LIST.map((tab) => (
            <button
              key={tab.key}
              className={`cw-tab ${activeTab === tab.key ? 'cw-tab--active' : ''}`}
              onClick={() => switchTab(tab.key)}
              type="button"
            >
              <span className="cw-tab__label">{t(tab.labelKey)}</span>
            </button>
          ))}
        </div>
        <div className="cw-chrome__drag" />
        <div className={`cw-chrome__controls ${standaloneMacControls ? 'cw-chrome__controls--mac' : ''}`}>
          {standaloneMacControls ? (
            <>
              <button className="cw-ctrl cw-ctrl--mac cw-ctrl--mac-minimize" type="button" title={t('standalone.controls.minimize')} onClick={() => window.api.windowMinimize()}>
                <span className="cw-ctrl-dot" />
              </button>
              <button className="cw-ctrl cw-ctrl--mac cw-ctrl--mac-maximize" type="button" title={t('standalone.controls.maximize')} onClick={() => window.api.windowMaximize()}>
                <span className="cw-ctrl-dot" />
              </button>
              <button className="cw-ctrl cw-ctrl--mac cw-ctrl--mac-close" type="button" title={t('standalone.controls.close')} onClick={() => window.api.windowClose()}>
                <span className="cw-ctrl-dot" />
              </button>
            </>
          ) : (
            <>
              <button className="cw-ctrl" type="button" title={t('standalone.controls.minimize')} onClick={() => window.api.windowMinimize()}>
                <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
              </button>
              <button className="cw-ctrl" type="button" title={t('standalone.controls.maximize')} onClick={() => window.api.windowMaximize()}>
                <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
              </button>
              <button className="cw-ctrl cw-ctrl--close" type="button" title={t('standalone.controls.close')} onClick={() => window.api.windowClose()}>
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className="cw-viewport">
        {activeTab === 'todo' && <TodoTab />}
        {activeTab === 'countdown' && <CountdownTab />}
        {activeTab === 'urlFavorites' && <UrlFavoritesTab />}
        {activeTab === 'album' && <AlbumTab />}
        {activeTab === 'mail' && <MailTab />}
        {activeTab === 'localFileSearch' && <LocalFileSearchTab />}
        {activeTab === 'clipboardHistory' && <ClipboardHistoryTab />}
        {activeTab === 'settings' && state === 'login' && <LoginContent />}
        {activeTab === 'settings' && state === 'register' && <RegisterContent />}
        {activeTab === 'settings' && state === 'payment' && <PaymentContent />}
        {activeTab === 'settings' && state !== 'login' && state !== 'register' && state !== 'payment' && <SettingsTab />}
      </div>
    </div>
  );
}
