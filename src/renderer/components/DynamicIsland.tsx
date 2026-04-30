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
 * @file DynamicIsland.tsx
 * @description 灵动岛主组件，使用状态模式管理 idle/hover/expanded 等状态
 * @author 鸡哥
 */

import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { getColor } from 'colorthief';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../store/isLandStore';
import { formatTime, formatFullTime, getDayName, getLunarDate } from '../utils/timeUtils';
import { IdleContent } from './states/idle/IdleContent';
import { HoverContent } from './states/hover/HoverContent';
import { NotificationContent } from './states/notification/NotificationContent';
import { ExpandedContent } from './states/expand/ExpandedContent';
import { MaxExpandContent } from './states/maxExpand/MaxExpandContent';
import { LyricsContent } from './states/lyrics/LyricsContent';
import { GuideContent } from './states/guide/GuideContent';
import { LoginContent } from './states/login/LoginContent';
import { RegisterContent } from './states/register/RegisterContent';
import { PaymentContent } from './states/payment/PaymentContent';
import { AnnouncementContent } from './states/announcement/AnnouncementContent';
import { SvgIcon } from '../utils/SvgIcon';
import type { NowPlayingInfo } from '../store/isLandStore';
import { fetchLyrics } from '../api/lyrics/lrcApi';
import { fetchKaraokeLyrics } from '../api/lyrics/lrcs/karaoke';
import type { KaraokeLine } from '../api/lyrics/lrcs/karaoke';
import type { SyncedLyricLine } from '../store/types';
import { fetchVersion, reportUpdateDownloadCount } from '../api/update/versionApi';
import { fetchStartupWeatherAlerts } from '../api/weather/weatherApi';
import { fetchUpdateSourceUrl } from '../api/user/userAccountApi';
import { getWebsiteFaviconUrl, getWebsiteHostname } from '../api/site/siteMetaApi';
import {
  fetchCurrentAnnouncement,
  readAnnouncementLastShownAppVersion,
  readAnnouncementShowMode,
  writeAnnouncementLastShownAppVersion,
} from '../api/announcement/announcementApi';
import { readLocalToken } from '../utils/userAccount';

/** 灵动岛状态类型 */
export type IslandState = 'idle' | 'hover' | 'expanded' | 'notification' | 'maxExpand' | 'minimal' | 'lyrics' | 'guide' | 'login' | 'register' | 'payment' | 'announcement';

/** shell.css 中 morph/transition 主时长（0.55s） */
const SHELL_MORPH_DURATION_MS = 550;
const CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY = 'clipboard-url-suppress-in-url-favorites';
export const AI_CHAT_CLIPBOARD_URL_EVENT = 'eisland:ai-chat-clipboard-urls-detected';
const ISLAND_BG_MEDIA_STORE_KEY = 'island-bg-media';
const ISLAND_BG_IMAGE_STORE_KEY = 'island-bg-image';
const ISLAND_BG_VIDEO_FIT_STORE_KEY = 'island-bg-video-fit';
const ISLAND_BG_VIDEO_MUTED_STORE_KEY = 'island-bg-video-muted';
const ISLAND_BG_VIDEO_LOOP_STORE_KEY = 'island-bg-video-loop';
const ISLAND_BG_VIDEO_VOLUME_STORE_KEY = 'island-bg-video-volume';
const ISLAND_BG_VIDEO_RATE_STORE_KEY = 'island-bg-video-rate';
const ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY = 'island-bg-video-hw-decode';
const LOCAL_ISLAND_BG_SYNC_EVENT = 'island-bg-local-sync';
const UPDATE_SOURCE_STORE_KEY = 'update-source';
const UPDATE_AUTO_PROMPT_STORE_KEY = 'update-auto-prompt-enabled';
const WEATHER_ALERT_ENABLED_STORE_KEY = 'weather-alert-enabled';

type UpdateSourceKey = 'cloudflare-r2' | 'tencent-cos' | 'aliyun-oss' | 'github';

const PRO_UPDATE_SOURCE_SET: ReadonlySet<UpdateSourceKey> = new Set<UpdateSourceKey>(['tencent-cos', 'aliyun-oss']);

function normalizeUpdateSource(value: unknown): UpdateSourceKey {
  if (value === 'github') return 'github';
  if (value === 'tencent-cos') return 'tencent-cos';
  if (value === 'aliyun-oss') return 'aliyun-oss';
  return 'cloudflare-r2';
}

function isProOnlyUpdateSource(source: UpdateSourceKey): boolean {
  return PRO_UPDATE_SOURCE_SET.has(source);
}

const normalizeRoleValue = (value: string): string => {
  return value.trim().toLowerCase().replace(/^role_/, '');
};

const getRoleFromToken = (token: string | null | undefined): string | null => {
  if (!token) return null;
  const rawToken = token.trim().replace(/^bearer\s+/i, '');
  const parts = rawToken.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalizedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = JSON.parse(atob(normalizedPayload)) as { role?: unknown };
    return typeof decoded.role === 'string' ? normalizeRoleValue(decoded.role) : null;
  } catch {
    return null;
  }
};

function getUpdateSourceLabel(value: unknown): string {
  if (value === 'github') return 'GitHub Releases';
  if (value === 'tencent-cos') return 'Tencent COS';
  if (value === 'aliyun-oss') return 'Aliyun OSS';
  return 'Cloudflare R2';
}

type IslandBgMediaType = 'image' | 'video';

interface IslandBgMediaConfig {
  type: IslandBgMediaType;
  source: string;
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
    return window.api?.loadWallpaperFile?.(media.source) ?? null;
  }
  if (isDirectBgMediaUrl(media.source)) return media.source;
  return toMediaUrl(media.source);
}

/** 各状态对应的窗口面积（宽×高），用于判断状态切换是放大还是缩小 */
const STATE_AREA: Record<string, number> = {
  idle: 260 * 42,
  minimal: 260 * 42,
  lyrics: 500 * 42,
  hover: 500 * 60,
  notification: 500 * 88,
  expanded: 860 * 150,
  maxExpand: 860 * 400,
  guide: 860 * 400,
  login: 860 * 400,
  register: 860 * 400,
  payment: 860 * 400,
  announcement: 860 * 400,
};

/** 状态配置接口 */
interface StateConfig {
  /** 状态名称 */
  name: IslandState;
  /** 是否启用鼠标穿透 */
  mousePassthrough: boolean;
  /** 是否展开窗口 */
  expanded: boolean;
  /** 状态切换延迟（毫秒） */
  enterDelay: number;
  /** 状态退出延迟（毫秒） */
  leaveDelay: number;
}

/** 状态配置映射表 */
export const STATE_CONFIGS: Record<IslandState, StateConfig> = {
  idle: {
    name: 'idle',
    mousePassthrough: true,
    expanded: false,
    enterDelay: 0,
    leaveDelay: 0,
  },
  hover: {
    name: 'hover',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 60,
    leaveDelay: 80,
  },
  expanded: {
    name: 'expanded',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  notification: {
    name: 'notification',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  maxExpand: {
    name: 'maxExpand',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  minimal: {
    name: 'minimal',
    mousePassthrough: true,
    expanded: false,
    enterDelay: 0,
    leaveDelay: 0,
  },
  lyrics: {
    name: 'lyrics',
    mousePassthrough: true,
    expanded: true,
    enterDelay: 50,
    leaveDelay: 0,
  },
  guide: {
    name: 'guide',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  login: {
    name: 'login',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  register: {
    name: 'register',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  payment: {
    name: 'payment',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
  announcement: {
    name: 'announcement',
    mousePassthrough: false,
    expanded: true,
    enterDelay: 0,
    leaveDelay: 0,
  },
};

/**
 * 检查鼠标是否在灵动岛窗口范围内
 * @returns 鼠标在窗口内返回 true，否则返回 false
 */
async function isMouseInWindow(): Promise<boolean> {
  try {
    const mousePos = await window.api?.getMousePosition();
    const bounds = await window.api?.getWindowBounds();

    if (!mousePos || !bounds) return false;

    return (
      mousePos.x >= bounds.x &&
      mousePos.x <= bounds.x + bounds.width &&
      mousePos.y >= bounds.y &&
      mousePos.y <= bounds.y + bounds.height
    );
  } catch {
    return false;
  }
}

/**
 * 获取状态对应的 CSS 类名
 * @param state 当前状态
 * @returns CSS 类名字符串
 */
export function getStateClassName(state: IslandState): string {
  return state === 'idle' ? '' : state;
}

/**
 * 状态渲染配置
 */
interface StateRenderer {
  /** 状态名称 */
  state: IslandState;
  /** 渲染函数 */
  render: () => React.ReactNode;
}

/**
 * 灵动岛主组件
 * @description 使用状态模式管理不同状态的 UI 渲染，通过 requestAnimationFrame 检测鼠标位置实现可靠的 hover 交互
 */
function DynamicIsland(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { state, weather, setHover, setIdle, setExpanded, setLyrics, setGuide, setAnnouncement, timerData, setTimerData, notification, setNotification, handleNowPlayingUpdate, updateProgress, coverImage, isMusicPlaying, isPlaying, dominantColor, setDominantColor, setSyncedLyrics, setLyricsLoading, syncedLyrics, lyricsLoading, pomodoroRunning, pomodoroRemaining, springAnimation } = useIslandStore();
  const prevStateRef = useRef(state);
  const [morphing, setMorphing] = useState(false);
  const [fromState, setFromState] = useState('');
  const handleNowPlayingUpdateRef = useRef(handleNowPlayingUpdate);
  const updateProgressRef = useRef(updateProgress);
  const setSyncedLyricsRef = useRef(setSyncedLyrics);
  const setLyricsLoadingRef = useRef(setLyricsLoading);
  /** 当前歌曲标识，用于检测切歌 */
  const songKeyRef = useRef('');
  useEffect(() => {
    if (prevStateRef.current === state) return;
    setFromState(prevStateRef.current);
    prevStateRef.current = state;
    setMorphing(true);
    const id = setTimeout(() => { setMorphing(false); setFromState(''); }, SHELL_MORPH_DURATION_MS);
    return () => clearTimeout(id);
  }, [state]);

  useLayoutEffect(() => {
    handleNowPlayingUpdateRef.current = handleNowPlayingUpdate;
  });

  useLayoutEffect(() => {
    updateProgressRef.current = updateProgress;
  });

  useLayoutEffect(() => {
    setSyncedLyricsRef.current = setSyncedLyrics;
    setLyricsLoadingRef.current = setLyricsLoading;
  });

  // 用于平滑进度插值的基准数据（来自 SMTC Worker 事件）
  const progressBaseRef = useRef({ positionMs: 0, durationMs: 0, timestamp: 0 });
  // rAF 循环 ID，用于停止插值
  const progressRafRef = useRef<number | null>(null);

  const initRef = useRef(false);
  const isHoveringRef = useRef(false);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setNotificationRef = useRef(setNotification);
  const expandLeaveIdleRef = useRef(false);
  const maxExpandLeaveIdleRef = useRef(false);
  const pendingAnnouncementAfterGuideRef = useRef(false);
  const pendingAnnouncementAppVersionRef = useRef('');
  const startupAutoCheckHandledRef = useRef(false);
  const bgOpacityRef = useRef<number>(30);
  const bgBlurRef = useRef<number>(0);
  const [bgVideoFit, setBgVideoFit] = useState<'cover' | 'contain'>('cover');
  const [bgVideoMuted, setBgVideoMuted] = useState<boolean>(true);
  const [bgVideoLoop, setBgVideoLoop] = useState<boolean>(true);
  const [bgVideoVolume, setBgVideoVolume] = useState<number>(0.6);
  const [bgVideoRate, setBgVideoRate] = useState<number>(1);
  const [bgVideoHwDecode, setBgVideoHwDecode] = useState<boolean>(true);
  const bgVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const [bgMedia, setBgMedia] = useState<{ type: IslandBgMediaType; previewUrl: string } | null>(null);

  const applyBgMedia = (media: IslandBgMediaConfig | null, previewUrl: string | null): void => {
    const el = document.getElementById('island-bg-layer');
    if (!el) return;
    const applyLayerVisibility = (): void => {
      el.style.opacity = String(Math.max(0, Math.min(100, bgOpacityRef.current)) / 100);
      const safeBlur = Math.max(0, Math.min(20, Math.round(bgBlurRef.current)));
      el.style.filter = safeBlur > 0 ? `blur(${safeBlur}px)` : 'none';
    };
    if (media?.type === 'image' && previewUrl) {
      el.style.backgroundImage = `url(${previewUrl})`;
      applyLayerVisibility();
      setBgMedia(null);
      return;
    }
    el.style.backgroundImage = '';
    if (media?.type === 'video' && previewUrl) {
      applyLayerVisibility();
      setBgMedia({ type: 'video', previewUrl });
      return;
    }
    el.style.opacity = '0';
    el.style.filter = 'none';
    setBgMedia(null);
  };

  // 同步 ref 以在回调中使用最新函数
  useLayoutEffect(() => {
    setNotificationRef.current = setNotification;
  });

  /** 从专辑封面提取主题色并存入 store */
  useEffect(() => {
    if (!coverImage) {
      setDominantColor([0, 0, 0]);
      return;
    }
    let isStale = false;
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = coverImage;
    img.onload = async () => {
      if (isStale) return;
      try {
        const color = await getColor(img, { colorSpace: 'rgb' });
        if (color && !isStale) {
          const { r, g, b } = color.rgb();
          setDominantColor([r, g, b]);
        }
      } catch (e) {
        console.error('ColorThief error:', e);
      }
    };
    return () => {
      isStale = true;
      img.onload = null;
      img.src = '';
    };
  }, [coverImage, setDominantColor]);

  const formatWeekday = (date: Date): string => t(`overview.time.weekdays.${date.getDay()}`, { defaultValue: getDayName(date) });

  const [timeStr, setTimeStr] = useState(() => formatTime(new Date()));
  const [dayStr, setDayStr] = useState(() => formatWeekday(new Date()));
  const [fullTimeStr, setFullTimeStr] = useState(() => formatFullTime(new Date()));
  const [lunarStr, setLunarStr] = useState(() => getLunarDate(new Date()));

  // 全局计时器逻辑
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (timerData?.state === 'running' && timerData.remainingSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        const next = (timerData.remainingSeconds ?? 0) - 1;
        if (next <= 0) {
          setTimerData({
            state: 'idle',
            remainingSeconds: 0,
            inputHours: '00',
            inputMinutes: '00',
            inputSeconds: '00',
          });
          setNotificationRef.current({
            title: t('notification.timer.title', { defaultValue: '计时器' }),
            body: t('notification.timer.finished', { defaultValue: '倒计时已结束' }),
            icon: SvgIcon.TIMER
          });
        } else {
          setTimerData({ remainingSeconds: next });
        }
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timerData?.state, timerData?.remainingSeconds, setTimerData, i18n.resolvedLanguage]);

  useEffect(() => {
    const update = (): void => {
      const now = new Date();
      setTimeStr(formatTime(now));
      setDayStr(formatWeekday(now));
      setFullTimeStr(formatFullTime(now));
      setLunarStr(getLunarDate(now));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [i18n.resolvedLanguage]);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      window.api?.enableMousePassthrough();
      window.api?.expandMouseleaveIdleGet?.().then((v) => { expandLeaveIdleRef.current = v; }).catch(() => {});
      window.api?.maxexpandMouseleaveIdleGet?.().then((v) => { maxExpandLeaveIdleRef.current = v; }).catch(() => {});

      Promise.all([
        window.api?.storeRead?.(ISLAND_BG_MEDIA_STORE_KEY),
        window.api?.storeRead?.(ISLAND_BG_IMAGE_STORE_KEY) as Promise<string | null>,
        window.api?.storeRead?.(ISLAND_BG_VIDEO_FIT_STORE_KEY) as Promise<'cover' | 'contain' | null>,
        window.api?.storeRead?.(ISLAND_BG_VIDEO_MUTED_STORE_KEY) as Promise<boolean | null>,
        window.api?.storeRead?.(ISLAND_BG_VIDEO_LOOP_STORE_KEY) as Promise<boolean | null>,
        window.api?.storeRead?.('island-bg-opacity') as Promise<number | null>,
        window.api?.storeRead?.('island-bg-blur') as Promise<number | null>,
        window.api?.storeRead?.(ISLAND_BG_VIDEO_VOLUME_STORE_KEY) as Promise<number | null>,
        window.api?.storeRead?.(ISLAND_BG_VIDEO_RATE_STORE_KEY) as Promise<number | null>,
        window.api?.storeRead?.(ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY) as Promise<boolean | null>,
      ]).then(async ([mediaRaw, legacyImage, videoFit, videoMuted, videoLoop, bgOpacity, bgBlur, videoVolume, videoRate, videoHwDecode]) => {
        const el = document.getElementById('island-bg-layer');
        if (!el) return;
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
        if (typeof bgOpacity === 'number' && Number.isFinite(bgOpacity)) {
          bgOpacityRef.current = Math.max(0, Math.min(100, bgOpacity));
        }
        if (typeof bgBlur === 'number' && Number.isFinite(bgBlur)) {
          bgBlurRef.current = Math.max(0, Math.min(20, Math.round(bgBlur)));
        }
        const media = normalizeBgMediaConfig(mediaRaw)
          ?? (typeof legacyImage === 'string' ? normalizeBgMediaConfig(legacyImage) : null);
        if (media) {
          const previewUrl = await resolveBgMediaPreviewUrl(media);
          if (previewUrl) {
            applyBgMedia(media, previewUrl);
          }
        } else {
          el.style.opacity = String(bgOpacityRef.current / 100);
          const safeBlur = bgBlurRef.current;
          el.style.filter = safeBlur > 0 ? `blur(${safeBlur}px)` : 'none';
        }
      }).catch(() => {});

      // 首次启动或更新后显示引导页
      Promise.all([
        window.api?.storeRead?.('guide-shown-version') as Promise<string | null>,
        window.api?.updaterVersion?.(),
      ]).then(([shownVersion, currentVersion]) => {
        if (currentVersion && shownVersion !== currentVersion) {
          setTimeout(() => setGuide(), 800);
        }
      }).catch(() => {});

      // 跨窗口设置同步
      window.api?.onSettingsChanged?.((channel: string, value: unknown) => {
        if (channel === 'shortcut:open-clipboard-history') {
          const store = useIslandStore.getState();
          store.setMaxExpandTab('clipboardHistory');
          store.setMaxExpand();
        }
        if (channel === 'shortcut:toggle-ui-lock') {
          const store = useIslandStore.getState();
          store.toggleUiStateLock();
        }
        if (channel === 'notification:show') {
          if (value && typeof value === 'object' && 'title' in (value as object) && 'body' in (value as object)) {
            setNotificationRef.current(value as {
              title: string;
              body: string;
              icon?: string;
              type?: 'default' | 'source-switch' | 'update-available' | 'update-downloading' | 'update-ready' | 'weather-alert-startup' | 'clipboard-url' | 'restart-required';
              sourceAppId?: string;
              updateVersion?: string;
              updateSourceLabel?: string;
              weatherAlertTime?: string;
              startupUpdateSource?: UpdateSourceKey;
              startupUpdateResolvedUrl?: string;
              urls?: string[];
            });
          }
        }
        if (channel === 'guide:show') {
          setGuide();
        }
        if (channel === 'island:opacity') {
          const v = typeof value === 'number' ? Math.max(10, Math.min(100, Math.round(value))) : 100;
          document.documentElement.style.setProperty('--island-opacity', String(v));
        }
        if (channel === 'island:expand-mouseleave-idle') {
          expandLeaveIdleRef.current = Boolean(value);
        }
        if (channel === 'island:maxexpand-mouseleave-idle') {
          maxExpandLeaveIdleRef.current = Boolean(value);
        }
        if (channel === 'store:island-bg-media') {
          const media = normalizeBgMediaConfig(value);
          if (!media) {
            applyBgMedia(null, null);
            return;
          }
          resolveBgMediaPreviewUrl(media).then((previewUrl) => {
            if (!previewUrl) {
              applyBgMedia(null, null);
              return;
            }
            applyBgMedia(media, previewUrl);
          }).catch(() => {});
        }
        if (channel === 'store:island-bg-opacity') {
          const el = document.getElementById('island-bg-layer');
          if (!el) return;
          const v = typeof value === 'number' && Number.isFinite(value) ? value : 100;
          bgOpacityRef.current = Math.max(0, Math.min(100, v));
          el.style.opacity = String(bgOpacityRef.current / 100);
        }
        if (channel === 'store:island-bg-blur') {
          const el = document.getElementById('island-bg-layer');
          if (!el) return;
          const v = typeof value === 'number' && Number.isFinite(value) ? value : 0;
          bgBlurRef.current = Math.max(0, Math.min(20, Math.round(v)));
          el.style.filter = bgBlurRef.current > 0 ? `blur(${bgBlurRef.current}px)` : 'none';
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
        if (channel === 'island:position') {
          const offset = value as { x: number; y: number };
          if (offset && typeof offset.x === 'number' && typeof offset.y === 'number') {
            window.api?.setIslandPositionOffset?.(offset).catch(() => {});
          }
        }
      });

      // 同窗口内（集成模式）背景媒体同步：设置页直接 DOM 操作 + 本地事件
      const localBgSyncHandler = (event: Event): void => {
        const customEvent = event as CustomEvent<{ media?: IslandBgMediaConfig | null; previewUrl?: string | null; opacity?: number; blur?: number; videoFit?: 'cover' | 'contain'; videoMuted?: boolean; videoLoop?: boolean; videoVolume?: number; videoRate?: number; videoHwDecode?: boolean }>;
        const detail = customEvent.detail;
        if (!detail || typeof detail !== 'object') return;
        if ('media' in detail || 'previewUrl' in detail) {
          applyBgMedia(detail.media ?? null, detail.previewUrl ?? null);
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
    }
  }, [i18n.resolvedLanguage]);

  // idle 状态下：正在播放且歌词已识别/加载中时，自动切到歌词态
  useEffect(() => {
    if (state !== 'idle') return;
    if (timerData?.state !== 'idle') return;
    if (isPlaying && ((syncedLyrics?.length ?? 0) > 0 || lyricsLoading)) {
      setLyrics();
    }
  }, [state, timerData?.state, isPlaying, syncedLyrics, lyricsLoading, setLyrics]);

  useEffect(() => {
    const unsub = window.api?.onUpdaterStartupAutoCheckRequest?.(() => {
      if (startupAutoCheckHandledRef.current) return;
      startupAutoCheckHandledRef.current = true;
      void (async () => {
        const autoPromptValue = await window.api?.storeRead?.(UPDATE_AUTO_PROMPT_STORE_KEY).catch(() => null);
        const autoPromptEnabled = typeof autoPromptValue === 'boolean' ? autoPromptValue : true;
        if (!autoPromptEnabled) return;

        const token = readLocalToken();
        const isProUser = getRoleFromToken(token) === 'pro';
        const sourceRaw = await window.api?.storeRead?.(UPDATE_SOURCE_STORE_KEY).catch(() => null);
        let startupSource = normalizeUpdateSource(sourceRaw);
        let startupResolvedUrl: string | undefined;

        if (isProOnlyUpdateSource(startupSource)) {
          if (!token || !isProUser) {
            startupSource = 'cloudflare-r2';
          } else {
            const resolved = await fetchUpdateSourceUrl(token, startupSource);
            if (resolved.ok && resolved.data?.url) {
              startupResolvedUrl = resolved.data.url;
            } else {
              startupSource = 'cloudflare-r2';
            }
          }
        }

        const continueStartupUpdateCheck = async (): Promise<void> => {
          await window.api?.updaterCheck(startupSource, startupResolvedUrl).catch(() => {});
        };

        const weatherAlertEnabledValue = await window.api?.storeRead?.(WEATHER_ALERT_ENABLED_STORE_KEY).catch(() => null);
        const weatherAlertEnabled = typeof weatherAlertEnabledValue === 'boolean' ? weatherAlertEnabledValue : true;
        if (!weatherAlertEnabled || !isProUser || !token) {
          await continueStartupUpdateCheck();
          return;
        }

        try {
          const weatherAlertPayload = await fetchStartupWeatherAlerts(token);
          if (weatherAlertPayload.alerts.length > 0) {
            const firstAlert = weatherAlertPayload.alerts[0];
            const firstAlertTitle = firstAlert.title
              || firstAlert.typeName
              || t('notification.weatherAlert.defaultTitle', { defaultValue: '天气预警' });
            const city = weatherAlertPayload.location.city
              || t('notification.weatherAlert.unknownCity', { defaultValue: '当前位置' });
            const body = weatherAlertPayload.alerts.length > 1
              ? t('notification.weatherAlert.bodyWithMore', {
                  defaultValue: '{{city}}：{{title}}，另有 {{count}} 条预警。',
                  city,
                  title: firstAlertTitle,
                  count: weatherAlertPayload.alerts.length - 1,
                })
              : t('notification.weatherAlert.bodySingle', {
                  defaultValue: '{{city}}：{{title}}',
                  city,
                  title: firstAlertTitle,
                });
            setNotificationRef.current({
              title: t('notification.weatherAlert.title', { defaultValue: '天气预警提醒' }),
              body,
              icon: SvgIcon.WEATHER,
              type: 'weather-alert-startup',
              weatherAlertTime: firstAlert.pubTime,
              startupUpdateSource: startupSource,
              startupUpdateResolvedUrl: startupResolvedUrl,
            });
            return;
          }
        } catch (error) {
          console.warn('[Updater] startup weather alert pre-check failed:', error);
        }

        await continueStartupUpdateCheck();
      })();
    });
    return () => {
      unsub?.();
    };
  }, [i18n.resolvedLanguage, t]);

  useEffect(() => {
    const unsub = window.api?.onUpdaterNotAvailable?.(() => {
      void (async () => {
        const current = useIslandStore.getState().state;
        if (current === 'login' || current === 'register' || current === 'payment') return;

        const mode = await readAnnouncementShowMode();
        const currentVersion = await window.api?.updaterVersion?.() ?? '';
        if (mode === 'version-update-only') {
          const lastShownVersion = await readAnnouncementLastShownAppVersion();
          if (currentVersion && lastShownVersion === currentVersion) return;
        }

        const announcement = await fetchCurrentAnnouncement();
        if (!announcement) return;

        const applyShownVersion = async (): Promise<void> => {
          if (mode !== 'version-update-only' || !currentVersion) return;
          await writeAnnouncementLastShownAppVersion(currentVersion);
        };

        if (current === 'guide') {
          pendingAnnouncementAfterGuideRef.current = true;
          pendingAnnouncementAppVersionRef.current = mode === 'version-update-only' ? currentVersion : '';
          return;
        }

        setAnnouncement();
        await applyShownVersion();
      })();
    });
    return () => {
      unsub?.();
    };
  }, [setAnnouncement]);

  useEffect(() => {
    if (!pendingAnnouncementAfterGuideRef.current) return;
    if (state === 'guide' || state === 'login' || state === 'register' || state === 'payment') return;

    pendingAnnouncementAfterGuideRef.current = false;
    setAnnouncement();

    const pendingVersion = pendingAnnouncementAppVersionRef.current;
    pendingAnnouncementAppVersionRef.current = '';
    if (pendingVersion) {
      void writeAnnouncementLastShownAppVersion(pendingVersion);
    }
  }, [state, setAnnouncement]);

  // 背景视频的音量 / 速度随设置变更即时生效，避免重建 <video>
  useEffect(() => {
    const el = bgVideoElementRef.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, bgVideoVolume));
    el.playbackRate = Math.max(0.25, Math.min(3, bgVideoRate));
  }, [bgVideoVolume, bgVideoRate]);

  // 用 ref 保存最新的循环开关，让下面的原生事件监听随时读到最新值
  const bgVideoLoopRef = useRef<boolean>(bgVideoLoop);
  useEffect(() => { bgVideoLoopRef.current = bgVideoLoop; }, [bgVideoLoop]);

  // 自定义背景视频循环：绕开 React 合成事件与 Chromium 原生 loop 的偶发失效，
  // 直接用 DOM 级 addEventListener 监听 ended + timeupdate 双重触发。
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

  // 用户在视频已经播完后再开启循环，需要立刻重启
  useEffect(() => {
    if (!bgVideoLoop) return;
    const el = bgVideoElementRef.current;
    if (!el) return;
    if (el.ended) {
      try { el.currentTime = 0; } catch { /* ignore */ }
      el.play().catch(() => {});
    }
  }, [bgVideoLoop]);

  // 全局订阅 NowPlaying 歌曲信息（主进程推送）
  // 在 DynamicIsland 层级订阅，确保应用启动时就开始监听
  useEffect(() => {
    const stopProgressRAF = () => {
      if (progressRafRef.current !== null) {
        cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = null;
      }
    };
    const unsubscribe = window.api?.onNowPlayingInfo((info: NowPlayingInfo | null) => {
      handleNowPlayingUpdateRef.current(info);

      // ===== 歌词获取：检测切歌后立即获取 =====
      const newKey = info ? `${info.title}||${info.artist}` : '';
      if (newKey && newKey !== songKeyRef.current) {
        songKeyRef.current = newKey;
        console.log('[Lyrics] Song changed:', info!.title, '-', info!.artist, '| pos_ms:', info!.position_ms, '| dur_ms:', info!.duration_ms);
        setSyncedLyricsRef.current(null);
        setLyricsLoadingRef.current(true);
        const capturedKey = newKey;
        const title = info!.title;
        const artist = info!.artist;
        const deviceId = info!.deviceId;

        /**
         * 逐字优先流程: 开关开启 → 先拉 YRC/QRC/KRC 等逐字歌词源,
         * 任何一源命中则渲染逐字扫光; 全部失败则走原逐行链路。
         */
        const loadLyrics = async (): Promise<void> => {
          let karaokeEnabled = false;
          try {
            karaokeEnabled = await window.api.musicLyricsKaraokeGet();
          } catch {
            karaokeEnabled = false;
          }

          if (karaokeEnabled) {
            try {
              const karaoke = await fetchKaraokeLyrics(title, artist, deviceId);
              if (songKeyRef.current !== capturedKey) return;
              if (karaoke && karaoke.length > 0) {
                const mapped: SyncedLyricLine[] = karaoke.map((l: KaraokeLine) => ({
                  time_ms: l.time_ms,
                  text: l.text,
                  duration_ms: l.duration_ms,
                  syllables: l.syllables,
                }));
                console.log('[Lyrics] Karaoke fetched:', mapped.length, 'lines');
                setSyncedLyricsRef.current(mapped);
                return;
              }
            } catch (err) {
              console.warn('[Lyrics] Karaoke fetch failed, falling back:', err);
            }
            if (songKeyRef.current !== capturedKey) return;
          }

          try {
            const result = await fetchLyrics(title, artist, deviceId);
            if (songKeyRef.current !== capturedKey) return;
            console.log('[Lyrics] Fetched:', result ? `${result.length} lines` : 'null');
            setSyncedLyricsRef.current(result);
          } catch (err) {
            console.error('[Lyrics] Fetch error:', err);
            if (songKeyRef.current === capturedKey) setSyncedLyricsRef.current(null);
          }
        };

        loadLyrics();
      } else if (!newKey) {
        songKeyRef.current = '';
        setSyncedLyricsRef.current(null);
      }

      if (info && info.position_ms !== undefined) {
        if (info.isPlaying) {
          // 重置插值基准：必须无条件更新，确保切歌时 durationMs 也同步刷新
          progressBaseRef.current = {
            positionMs: info.position_ms,
            durationMs: info.duration_ms,
            timestamp: Date.now(),
          };
          // 复用已有循环；若旧循环已停止则自动重新启动
          if (progressRafRef.current === null) {
            let lastProgressWrite = 0;
            const tick = () => {
              const now = Date.now();
              const base = progressBaseRef.current;
              const elapsed = now - base.timestamp;
              if (now - lastProgressWrite >= 66) {
                lastProgressWrite = now;
                updateProgressRef.current(base.positionMs + elapsed);
              }
              progressRafRef.current = requestAnimationFrame(tick);
            };
            progressRafRef.current = requestAnimationFrame(tick);
          }
        } else {
          // 暂停时：停止插值并直接设置最终位置
          stopProgressRAF();
          updateProgressRef.current(info.position_ms);
        }
      }
    });
    return () => {
      unsubscribe?.();
      stopProgressRAF();
    };
  }, []);

  // 订阅播放源切换请求（主进程推送）
  useEffect(() => {
    const unsubSwitch = window.api?.onSourceSwitchRequest((data) => {
      setNotificationRef.current({
        title: t('notification.sourceSwitch.title', { defaultValue: '检测到其他播放源' }),
        body: `${data.title} - ${data.artist}（${data.sourceAppId}）`,
        icon: SvgIcon.MUSIC,
        type: 'source-switch',
        sourceAppId: data.sourceAppId,
      });
    });
    return () => {
      unsubSwitch?.();
    };
  }, [i18n.resolvedLanguage]);

  // 订阅有新版本可用事件（启动时自动检查推送，仅首次弹出通知）
  const updateNotifiedRef = useRef(false);
  useEffect(() => {
    const unsubAvailable = window.api?.onUpdaterAvailable?.((data) => {
      if (updateNotifiedRef.current) return;
      updateNotifiedRef.current = true;
      Promise.all([
        fetchVersion().catch(() => null),
        window.api?.storeRead?.(UPDATE_SOURCE_STORE_KEY).catch(() => null),
      ]).then(([info, source]) => {
        const desc = (info?.description ?? '').trim();
        const updateSourceLabel = getUpdateSourceLabel(source);
        setNotificationRef.current({
          title: t('notification.update.availableTitle', { defaultValue: '发现新版本' }),
          body: desc || t('notification.update.availableBody', { defaultValue: '是否立即下载？' }),
          icon: SvgIcon.UPDATE,
          type: 'update-available',
          updateVersion: data.version,
          updateSourceLabel,
        });
      });
    });
    return () => {
      unsubAvailable?.();
    };
  }, [i18n.resolvedLanguage]);

  // 订阅更新下载完成事件（主进程推送）
  useEffect(() => {
    const unsubUpdate = window.api?.onUpdaterDownloaded?.((data) => {
      reportUpdateDownloadCount(data.version).catch(() => {});
      setNotificationRef.current({
        title: t('notification.update.readyTitle', { defaultValue: '更新就绪' }),
        body: t('notification.update.readyBody', {
          defaultValue: '新版本 v{{version}} 已下载完成，是否立即安装？',
          version: data.version,
        }),
        icon: SvgIcon.UPDATE,
        type: 'update-ready',
        updateVersion: data.version,
      });
    });
    return () => {
      unsubUpdate?.();
    };
  }, [i18n.resolvedLanguage]);

  // 订阅剪贴板 URL 检测事件（主进程推送）
  useEffect(() => {
    const unsubClipboard = window.api?.onClipboardUrlsDetected?.(({ urls, title }) => {
      let suppressInFavorites = true;
      try {
        const raw = localStorage.getItem(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY);
        if (raw === '0') suppressInFavorites = false;
        if (raw === '1') suppressInFavorites = true;
      } catch { /* noop */ }

      const store = useIslandStore.getState();
      if (
        suppressInFavorites
        && store.state === 'maxExpand'
        && (store.maxExpandTab === 'urlFavorites' || store.maxExpandTab === 'clipboardHistory' || store.maxExpandTab === 'aiChat')
      ) return;

      const faviconUrl = getWebsiteFaviconUrl(urls[0]);
      const hostname = getWebsiteHostname(urls[0]);
      setNotificationRef.current({
        title: t('notification.clipboard.detectedTitle', { defaultValue: '检测到链接' }),
        body: title || hostname || urls[0],
        icon: faviconUrl || SvgIcon.LINK,
        type: 'clipboard-url',
        urls,
      });
    });
    return () => {
      unsubClipboard?.();
    };
  }, [i18n.resolvedLanguage]);

  // 必须放在 useEffect 之前，且 useCallback 依赖为空（所有依赖都是 ref/函数）
  const clearAllTimers = React.useCallback(() => {
    if (enterTimerRef.current !== null) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (leaveTimerRef.current !== null) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let rafId: number | null = null;
    let aborted = false;
    let lastCheckTime = 0;
    const CHECK_INTERVAL = 16; // ~60fps throttle

    if (state === 'maxExpand' || state === 'expanded' || state === 'announcement') {
      isHoveringRef.current = true;
    }

    const checkMousePosition = async (): Promise<void> => {
      if (aborted) return;

      const now = Date.now();
      if (now - lastCheckTime < CHECK_INTERVAL) {
        rafId = requestAnimationFrame(checkMousePosition);
        return;
      }
      lastCheckTime = now;

      const inWindow = await isMouseInWindow();
      if (aborted) return;

      if (useIslandStore.getState().uiStateLocked) {
        clearAllTimers();
        if (!aborted) {
          rafId = requestAnimationFrame(checkMousePosition);
        }
        return;
      }

      const config = STATE_CONFIGS[state];
      const sliderCaptchaActive = Boolean(document.querySelector('.slider-captcha-overlay'));

      if (sliderCaptchaActive) {
        if (leaveTimerRef.current !== null) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }
        isHoveringRef.current = true;
        window.api?.disableMousePassthrough();
        if (!aborted) {
          rafId = requestAnimationFrame(checkMousePosition);
        }
        return;
      }

      if (state === 'notification' || state === 'guide' || state === 'login' || state === 'register' || state === 'payment' || state === 'announcement') {
        if (inWindow) {
          window.api?.disableMousePassthrough();
        }
        if (!aborted) {
          rafId = requestAnimationFrame(checkMousePosition);
        }
        return;
      }

      if (inWindow) {
        if (leaveTimerRef.current !== null) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }

        if (!isHoveringRef.current && enterTimerRef.current === null) {
          enterTimerRef.current = setTimeout(() => {
            enterTimerRef.current = null;
            if (aborted || isHoveringRef.current) return;

            isHoveringRef.current = true;
            if (config.mousePassthrough) {
              window.api?.disableMousePassthrough();
            }
            setHover();
          });
        }
      } else {
        if (enterTimerRef.current !== null) {
          clearTimeout(enterTimerRef.current);
          enterTimerRef.current = null;
        }

        if (isHoveringRef.current && leaveTimerRef.current === null) {
          const shouldLeave =
            state === 'expanded' ? expandLeaveIdleRef.current :
            state === 'maxExpand' ? maxExpandLeaveIdleRef.current :
            true;

          if (shouldLeave) {
            leaveTimerRef.current = setTimeout(() => {
              leaveTimerRef.current = null;
              if (aborted || !isHoveringRef.current) return;

              isHoveringRef.current = false;
              const store = useIslandStore.getState();
              if (store.isPlaying && store.timerData.state === 'idle' && ((store.syncedLyrics?.length ?? 0) > 0 || store.lyricsLoading)) {
                setLyrics();
              } else {
                setIdle(true);
              }
            });
          }
        }
      }

      if (!aborted) {
        rafId = requestAnimationFrame(checkMousePosition);
      }
    };

    rafId = requestAnimationFrame(checkMousePosition);

    return () => {
      aborted = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearAllTimers();
    };
  }, [state, setHover, setIdle, setExpanded, setLyrics, clearAllTimers]);

  // 状态渲染配置
  const stateRenderers: StateRenderer[] = [
    {
      state: 'idle',
      render: () => (
        <IdleContent
          timeStr={timeStr}
          dayStr={dayStr}
          weather={weather}
          timerState={timerData?.state ?? 'idle'}
          remainingSeconds={timerData?.remainingSeconds ?? 0}
          pomodoroRunning={pomodoroRunning}
          pomodoroRemaining={pomodoroRemaining}
        />
      ),
    },
    {
      state: 'hover',
      render: () => (
        <HoverContent
          fullTimeStr={fullTimeStr}
          lunarStr={lunarStr}
        />
      ),
    },
    {
      state: 'expanded',
      render: () => (
        <ExpandedContent />
      ),
    },
    {
      state: 'notification',
      render: () => (
        <NotificationContent
          title={notification.title}
          body={notification.body}
          icon={notification.icon}
          type={notification.type}
          sourceAppId={notification.sourceAppId}
          updateVersion={notification.updateVersion}
          updateSourceLabel={notification.updateSourceLabel}
          weatherAlertTime={notification.weatherAlertTime}
          startupUpdateSource={notification.startupUpdateSource}
          startupUpdateResolvedUrl={notification.startupUpdateResolvedUrl}
          urls={notification.urls}
        />
      ),
    },
    {
      state: 'maxExpand',
      render: () => (
        <MaxExpandContent />
      ),
    },
    {
      state: 'lyrics',
      render: () => (
        <LyricsContent />
      ),
    },
    {
      state: 'guide',
      render: () => (
        <GuideContent />
      ),
    },
    {
      state: 'login',
      render: () => (
        <LoginContent />
      ),
    },
    {
      state: 'register',
      render: () => (
        <RegisterContent />
      ),
    },
    {
      state: 'payment',
      render: () => (
        <PaymentContent />
      ),
    },
    {
      state: 'announcement',
      render: () => (
        <AnnouncementContent />
      ),
    },
  ];

  /**
   * 单击灵动岛切换状态
   * @description hover 状态下单击展开到 expanded；expanded 状态下单击收回到 hover
   */
  const handleIslandClick = React.useCallback(() => {
    if (state === 'hover') {
      setExpanded();
    } else if (state === 'expanded' || state === 'maxExpand' || state === 'announcement') {
      setHover();
    }
  }, [state, setExpanded, setHover]);

  const [r, g, b] = dominantColor;
  const showGlow = isMusicPlaying && coverImage;

  return (
    <div
      className={`island-shell ${getStateClassName(state)}${morphing ? ' morphing' : ''}${fromState ? ` from-${fromState}` : ''}${morphing && fromState && (STATE_AREA[fromState] ?? 0) > (STATE_AREA[state] ?? 0) ? ' instant-resize' : ''}${showGlow ? ' music-glow' : ''}${showGlow && !isPlaying ? ' music-paused' : ''}${springAnimation ? ' spring-animation' : ''}`}
      onClick={handleIslandClick}
      style={showGlow ? {
        '--glow-r': r,
        '--glow-g': g,
        '--glow-b': b,
      } as React.CSSProperties : undefined}
    >
      <div className="island-bg-layer" id="island-bg-layer">
        {bgMedia?.type === 'video' && (
          <video
            key={`${bgMedia.previewUrl}-${bgVideoHwDecode ? 'hw' : 'sw'}`}
            ref={bgVideoElementRef}
            className="island-bg-video"
            src={bgMedia.previewUrl}
            autoPlay
            muted={bgVideoMuted || bgVideoVolume <= 0}
            playsInline
            preload="auto"
            disableRemotePlayback
            style={{ objectFit: bgVideoFit, imageRendering: bgVideoHwDecode ? undefined : 'auto' }}
            onLoadedMetadata={(event) => {
              // Chromium 原生 loop 在 eisland-media:// 协议 / 部分 mp4 容器下会偶发失效，
              // 这里完全关掉原生 loop，统一由 onEnded 手动回到 0 重播。
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
      {stateRenderers
        .filter(renderer => renderer.state === state)
        .map(renderer => (
          <React.Fragment key={renderer.state}>{renderer.render()}</React.Fragment>
        ))}
    </div>
  );
}

export default DynamicIsland;
