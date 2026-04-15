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
import useIslandStore from '../store/isLandStore';
import { formatTime, formatFullTime, getDayName, getLunarDate } from '../utils/timeUtils';
import { IdleContent } from './states/idle/IdleContent';
import { HoverContent } from './states/hover/HoverContent';
import { NotificationContent } from './states/notification/NotificationContent';
import { ExpandedContent } from './states/expand/ExpandedContent';
import { MaxExpandContent } from './states/maxExpand/MaxExpandContent';
import { LyricsContent } from './states/lyrics/LyricsContent';
import { GuideContent } from './states/guide/GuideContent';
import { SvgIcon } from '../utils/SvgIcon';
import type { NowPlayingInfo } from '../store/isLandStore';
import { fetchLyrics } from '../api/lrcApi';
import { fetchVersion, reportUpdateDownloadCount } from '../api/versionApi';
import { getWebsiteFaviconUrl, getWebsiteHostname } from '../api/siteMetaApi';

/** 灵动岛状态类型 */
export type IslandState = 'idle' | 'hover' | 'expanded' | 'notification' | 'maxExpand' | 'minimal' | 'lyrics' | 'guide';

/** shell.css 中 morph/transition 主时长（0.55s） */
const SHELL_MORPH_DURATION_MS = 550;
const CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY = 'clipboard-url-suppress-in-url-favorites';

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
  const { state, weather, setHover, setIdle, setExpanded, setLyrics, setGuide, timerData, setTimerData, notification, setNotification, handleNowPlayingUpdate, updateProgress, coverImage, isMusicPlaying, isPlaying, dominantColor, setDominantColor, setSyncedLyrics, setLyricsLoading, syncedLyrics, lyricsLoading, pomodoroRunning, pomodoroRemaining, springAnimation } = useIslandStore();
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

  const [timeStr, setTimeStr] = useState(() => formatTime(new Date()));
  const [dayStr, setDayStr] = useState(() => getDayName(new Date()));
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
            title: '计时器',
            body: '倒计时已结束',
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
  }, [timerData?.state, timerData?.remainingSeconds, setTimerData]);

  useEffect(() => {
    const update = (): void => {
      const now = new Date();
      setTimeStr(formatTime(now));
      setDayStr(getDayName(now));
      setFullTimeStr(formatFullTime(now));
      setLunarStr(getLunarDate(now));
    };
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      window.api?.enableMousePassthrough();
      window.api?.expandMouseleaveIdleGet?.().then((v) => { expandLeaveIdleRef.current = v; }).catch(() => {});
      window.api?.maxexpandMouseleaveIdleGet?.().then((v) => { maxExpandLeaveIdleRef.current = v; }).catch(() => {});

      Promise.all([
        window.api?.storeRead?.('island-bg-image') as Promise<string | null>,
        window.api?.storeRead?.('island-bg-opacity') as Promise<number | null>,
      ]).then(async ([bgImage, bgOpacity]) => {
        const el = document.getElementById('island-bg-layer');
        if (!el) return;
        if (bgImage && typeof bgImage === 'string') {
          let url = bgImage;
          if (!bgImage.startsWith('data:') && !bgImage.startsWith('/') && !bgImage.startsWith('http')) {
            const dataUrl = await window.api?.loadWallpaperFile?.(bgImage);
            if (dataUrl) url = dataUrl; else return;
          }
          el.style.backgroundImage = `url(${url})`;
        }
        if (typeof bgOpacity === 'number' && Number.isFinite(bgOpacity)) {
          el.style.opacity = String(Math.max(0, Math.min(100, bgOpacity)) / 100);
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
        if (channel === 'notification:show') {
          if (value && typeof value === 'object' && 'title' in (value as object) && 'body' in (value as object)) {
            setNotificationRef.current(value as {
              title: string;
              body: string;
              icon?: string;
              type?: 'default' | 'source-switch' | 'update-available' | 'update-ready' | 'clipboard-url' | 'restart-required';
              sourceAppId?: string;
              updateVersion?: string;
              urls?: string[];
            });
          }
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
        if (channel === 'store:island-bg-image') {
          const el = document.getElementById('island-bg-layer');
          if (!el) return;
          const bgImage = value as string | null;
          if (bgImage && typeof bgImage === 'string') {
            if (!bgImage.startsWith('data:') && !bgImage.startsWith('/') && !bgImage.startsWith('http')) {
              window.api?.loadWallpaperFile?.(bgImage).then((dataUrl) => {
                if (dataUrl) el.style.backgroundImage = `url(${dataUrl})`;
              }).catch(() => {});
            } else {
              el.style.backgroundImage = `url(${bgImage})`;
            }
          } else {
            el.style.backgroundImage = '';
          }
        }
        if (channel === 'store:island-bg-opacity') {
          const el = document.getElementById('island-bg-layer');
          if (!el) return;
          const v = typeof value === 'number' && Number.isFinite(value) ? value : 100;
          el.style.opacity = String(Math.max(0, Math.min(100, v)) / 100);
        }
        if (channel === 'island:position') {
          const offset = value as { x: number; y: number };
          if (offset && typeof offset.x === 'number' && typeof offset.y === 'number') {
            window.api?.setIslandPositionOffset?.(offset).catch(() => {});
          }
        }
      });
    }
  }, []);

  // idle 状态下：正在播放且歌词已识别/加载中时，自动切到歌词态
  useEffect(() => {
    if (state !== 'idle') return;
    if (timerData?.state !== 'idle') return;
    if (isPlaying && ((syncedLyrics?.length ?? 0) > 0 || lyricsLoading)) {
      setLyrics();
    }
  }, [state, timerData?.state, isPlaying, syncedLyrics, lyricsLoading, setLyrics]);

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
        fetchLyrics(info!.title, info!.artist, info!.deviceId).then(result => {
          if (songKeyRef.current !== capturedKey) return;
          console.log('[Lyrics] Fetched:', result ? `${result.length} lines` : 'null');
          setSyncedLyricsRef.current(result);
        }).catch((err) => {
          console.error('[Lyrics] Fetch error:', err);
          if (songKeyRef.current === capturedKey) setSyncedLyricsRef.current(null);
        });
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
        title: '检测到其他播放源',
        body: `${data.title} - ${data.artist}（${data.sourceAppId}）`,
        icon: SvgIcon.MUSIC,
        type: 'source-switch',
        sourceAppId: data.sourceAppId,
      });
    });
    return () => {
      unsubSwitch?.();
    };
  }, []);

  // 订阅有新版本可用事件（启动时自动检查推送，仅首次弹出通知）
  const updateNotifiedRef = useRef(false);
  useEffect(() => {
    const unsubAvailable = window.api?.onUpdaterAvailable?.((data) => {
      if (updateNotifiedRef.current) return;
      updateNotifiedRef.current = true;
      fetchVersion().then((info) => {
        const desc = (info?.description ?? '').trim();
        setNotificationRef.current({
          title: '发现新版本',
          body: desc || '是否立即下载？',
          icon: SvgIcon.UPDATE,
          type: 'update-available',
          updateVersion: data.version,
        });
      }).catch(() => {
        setNotificationRef.current({
          title: '发现新版本',
          body: '是否立即下载？',
          icon: SvgIcon.UPDATE,
          type: 'update-available',
          updateVersion: data.version,
        });
      });
    });
    return () => {
      unsubAvailable?.();
    };
  }, []);

  // 订阅更新下载完成事件（主进程推送）
  useEffect(() => {
    const unsubUpdate = window.api?.onUpdaterDownloaded?.((data) => {
      reportUpdateDownloadCount(data.version).catch(() => {});
      setNotificationRef.current({
        title: '更新就绪',
        body: `新版本 v${data.version} 已下载完成，是否立即安装？`,
        icon: SvgIcon.UPDATE,
        type: 'update-ready',
        updateVersion: data.version,
      });
    });
    return () => {
      unsubUpdate?.();
    };
  }, []);

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
      if (suppressInFavorites && store.state === 'maxExpand' && store.maxExpandTab === 'urlFavorites') return;

      const faviconUrl = getWebsiteFaviconUrl(urls[0]);
      const hostname = getWebsiteHostname(urls[0]);
      setNotificationRef.current({
        title: '检测到链接',
        body: title || hostname || urls[0],
        icon: faviconUrl || SvgIcon.LINK,
        type: 'clipboard-url',
        urls,
      });
    });
    return () => {
      unsubClipboard?.();
    };
  }, []);

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

    if (state === 'maxExpand' || state === 'expanded') {
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

      const config = STATE_CONFIGS[state];

      if (state === 'notification' || state === 'guide') {
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
  ];

  /**
   * 单击灵动岛切换状态
   * @description hover 状态下单击展开到 expanded；expanded 状态下单击收回到 hover
   */
  const handleIslandClick = React.useCallback(() => {
    if (state === 'hover') {
      setExpanded();
    } else if (state === 'expanded' || state === 'maxExpand') {
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
      <div className="island-bg-layer" id="island-bg-layer" />
      {stateRenderers
        .filter(renderer => renderer.state === state)
        .map(renderer => (
          <React.Fragment key={renderer.state}>{renderer.render()}</React.Fragment>
        ))}
    </div>
  );
}

export default DynamicIsland;
