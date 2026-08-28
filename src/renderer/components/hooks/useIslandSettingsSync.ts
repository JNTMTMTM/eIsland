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
 * @file useIslandSettingsSync.ts
 * @description 灵动岛设置读取与同步 Hook。
 * @author 鸡哥
 */

import { useEffect } from 'react';
import useIslandStore from '../../store/isLandStore';
import type { NotificationData } from '../../store/types';
import { getIslandMorphDuration } from '../../store/constants/islandTransition';
import { ISLAND_WIDTH } from '../../../shared/islandDimensions';
import {
  ISLAND_BG_MEDIA_STORE_KEY,
  ISLAND_BG_IMAGE_STORE_KEY,
  ISLAND_BG_VIDEO_FIT_STORE_KEY,
  ISLAND_BG_VIDEO_MUTED_STORE_KEY,
  ISLAND_BG_VIDEO_LOOP_STORE_KEY,
  ISLAND_BG_VIDEO_VOLUME_STORE_KEY,
  ISLAND_BG_VIDEO_RATE_STORE_KEY,
  ISLAND_BG_VIDEO_HW_DECODE_STORE_KEY,
  LOCAL_ISLAND_BG_SYNC_EVENT,
  normalizeBgMediaConfig,
  resolveBgMediaPreviewUrl,
} from '../config/dynamicIslandConfig';
import { ISLAND_POSITION_LOCKED_STORE_KEY } from '../../../shared/storeKeys';
import { ISLAND_AUTO_DIM_ENABLED_STORE_KEY, ISLAND_AUTO_DIM_DELAY_STORE_KEY, DEFAULT_AUTO_DIM_DELAY_SEC } from './useIslandAutoDim';
import type { IslandBgMediaConfig, UpdateSourceKey } from '../config/dynamicIslandConfig';

interface UseIslandSettingsSyncOptions {
  language: string | undefined;
  initRef: React.MutableRefObject<boolean>;
  setNotificationRef: React.MutableRefObject<(data: NotificationData) => void>;
  applyBgMedia: (media: IslandBgMediaConfig | null, previewUrl: string | null) => void;
  expandLeaveIdleRef: React.MutableRefObject<boolean>;
  maxExpandLeaveIdleRef: React.MutableRefObject<boolean>;
  idleClickExpandRef: React.MutableRefObject<boolean>;
  bgOpacityRef: React.MutableRefObject<number>;
  bgBlurRef: React.MutableRefObject<number>;
  setBgVideoFit: React.Dispatch<React.SetStateAction<'cover' | 'contain'>>;
  setBgVideoMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setBgVideoLoop: React.Dispatch<React.SetStateAction<boolean>>;
  setBgVideoVolume: React.Dispatch<React.SetStateAction<number>>;
  setBgVideoRate: React.Dispatch<React.SetStateAction<number>>;
  setBgVideoHwDecode: React.Dispatch<React.SetStateAction<boolean>>;
  autoDimEnabledRef: React.MutableRefObject<boolean>;
  autoDimDelayRef: React.MutableRefObject<number>;
  positionLockedRef: React.MutableRefObject<boolean>;
}

/**
 * @description 同步存储中的灵动岛设置并监听配置变更。
 * @param options - 设置同步配置。
 */
export function useIslandSettingsSync(options: UseIslandSettingsSyncOptions): void {
  const {
    language,
    initRef,
    setNotificationRef,
    applyBgMedia,
    expandLeaveIdleRef,
    maxExpandLeaveIdleRef,
    idleClickExpandRef,
    bgOpacityRef,
    bgBlurRef,
    setBgVideoFit,
    setBgVideoMuted,
    setBgVideoLoop,
    setBgVideoVolume,
    setBgVideoRate,
    setBgVideoHwDecode,
    autoDimEnabledRef,
    autoDimDelayRef,
    positionLockedRef,
  } = options;

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      window.api?.enableMousePassthrough();
      window.api?.expandMouseleaveIdleGet?.().then((value) => { expandLeaveIdleRef.current = value; }).catch(() => {});
      window.api?.maxexpandMouseleaveIdleGet?.().then((value) => { maxExpandLeaveIdleRef.current = value; }).catch(() => {});
      window.api?.idleClickExpandGet?.().then((value) => { idleClickExpandRef.current = value; }).catch(() => {});
      window.api?.storeRead?.(ISLAND_POSITION_LOCKED_STORE_KEY).then((value) => { positionLockedRef.current = value === true; }).catch(() => {});
      window.api?.storeRead?.(ISLAND_AUTO_DIM_ENABLED_STORE_KEY).then((value) => { autoDimEnabledRef.current = value === true; }).catch(() => {});
      window.api?.storeRead?.(ISLAND_AUTO_DIM_DELAY_STORE_KEY).then((value) => { autoDimDelayRef.current = typeof value === 'number' && Number.isFinite(value) ? Math.max(1, value) : DEFAULT_AUTO_DIM_DELAY_SEC; }).catch(() => {});
      window.api?.springAnimationGet?.().then((value) => { useIslandStore.getState().setSpringAnimation(value); }).catch(() => {});
      window.api?.animationSpeedGet?.().then((value) => {
        const speed = value === 'slow' || value === 'medium' || value === 'fast' ? value : 'medium';
        useIslandStore.getState().setAnimationSpeed(speed);
      }).catch(() => {});
      window.api?.shapeModeGet?.().then((value) => {
        const mode = value === 'notch' || value === 'pill' ? value : 'notch';
        useIslandStore.getState().setShapeMode(mode);
      }).catch(() => {});

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
    }

    const unsubscribeSettings = window.api?.onSettingsChanged?.((channel: string, value: unknown) => {
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
            setNotificationRef.current(value as NotificationData & {
              startupUpdateSource?: UpdateSourceKey;
              startupUpdateResolvedUrl?: string;
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
        if (channel === 'island:idle-click-expand') {
          idleClickExpandRef.current = Boolean(value);
        }
        if (channel === `store:${ISLAND_POSITION_LOCKED_STORE_KEY}`) {
          positionLockedRef.current = value === true;
        }
        if (channel === `store:${ISLAND_AUTO_DIM_ENABLED_STORE_KEY}`) {
          autoDimEnabledRef.current = value === true;
        }
        if (channel === `store:${ISLAND_AUTO_DIM_DELAY_STORE_KEY}`) {
          autoDimDelayRef.current = typeof value === 'number' && Number.isFinite(value) ? Math.max(1, value) : DEFAULT_AUTO_DIM_DELAY_SEC;
        }
        if (channel === 'island:spring-animation') {
          useIslandStore.getState().setSpringAnimation(Boolean(value));
        }
        if (channel === 'island:animation-speed') {
          const v = value === 'slow' || value === 'medium' || value === 'fast' ? value : 'medium';
          useIslandStore.getState().setAnimationSpeed(v);
        }
        if (channel === 'island:shape-mode') {
          const v = value === 'notch' || value === 'pill' ? value : 'notch';
          useIslandStore.getState().setShapeMode(v);
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

      const autoDimLocalHandler = (event: Event): void => {
        const detail = (event as CustomEvent).detail;
        if (!detail || typeof detail !== 'object') return;
        if (typeof detail.autoDimEnabled === 'boolean') {
          autoDimEnabledRef.current = detail.autoDimEnabled;
        }
        if (typeof detail.autoDimDelaySec === 'number' && Number.isFinite(detail.autoDimDelaySec)) {
          autoDimDelayRef.current = Math.max(1, detail.autoDimDelaySec);
        }
      };
      window.addEventListener('island-auto-dim-local-sync', autoDimLocalHandler as EventListener);

      const positionLockLocalHandler = (event: Event): void => {
        const detail = (event as CustomEvent).detail;
        if (!detail || typeof detail !== 'object' || typeof detail.locked !== 'boolean') return;
        positionLockedRef.current = detail.locked;
      };
      window.addEventListener('island-position-lock-local-sync', positionLockLocalHandler as EventListener);

      // cleanup: 释放所有监听器，防止组件卸载后残留
      return () => {
        unsubscribeSettings?.();
        window.removeEventListener(LOCAL_ISLAND_BG_SYNC_EVENT, localBgSyncHandler as EventListener);
        window.removeEventListener('island-auto-dim-local-sync', autoDimLocalHandler as EventListener);
        window.removeEventListener('island-position-lock-local-sync', positionLockLocalHandler as EventListener);
      };
  }, [
    language,
    initRef,
    setNotificationRef,
    applyBgMedia,
    expandLeaveIdleRef,
    maxExpandLeaveIdleRef,
    idleClickExpandRef,
    bgOpacityRef,
    bgBlurRef,
    setBgVideoFit,
    setBgVideoMuted,
    setBgVideoLoop,
    setBgVideoVolume,
    setBgVideoRate,
    setBgVideoHwDecode,
    autoDimEnabledRef,
    autoDimDelayRef,
    positionLockedRef,
  ]);

  /** 专用形态模式变更监听（独立于 initRef 守卫，确保始终活跃） */
  useEffect(() => {
    /**
     * 平滑移动窗口（增量式，每帧计算差值）
     * @param totalDx - 水平总位移
     * @param totalDy - 垂直总位移
     * @param duration - 动画时长（毫秒）
     */
    /** 当前动画帧 ID，用于取消 */
    let animFrameId = 0;
    let shapeChangeVersion = 0;

    const animateWindowMove = (totalDx: number, totalDy: number, duration: number): Promise<void> => {
      return new Promise((resolve) => {
        const startTime = performance.now();
        let movedX = 0;
        let movedY = 0;
        const step = (now: number): void => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          /** easeOutCubic 缓动 */
          const eased = 1 - Math.pow(1 - progress, 3);
          const targetMovedX = Math.round(totalDx * eased);
          const targetMovedY = Math.round(totalDy * eased);
          const dx = targetMovedX - movedX;
          const dy = targetMovedY - movedY;
          if (dx !== 0 || dy !== 0) {
            window.api?.moveWindowDelta?.(dx, dy);
            movedX = targetMovedX;
            movedY = targetMovedY;
          }
          if (progress < 1) {
            animFrameId = requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        animFrameId = requestAnimationFrame(step);
      });
    };

    /** 根据当前状态调用对应的窗口 resize */
    const applyWindowForState = (state: string, delayMs = 0): void => {
      if (state === 'hover') {
        window.api?.expandWindow(delayMs);
      } else if (state === 'notification' || state === 'agent' || state === 'stt' || state === 'cli') {
        window.api?.expandWindowNotification(delayMs);
      } else if (state === 'lyrics' || state === 'agentVoiceInput') {
        window.api?.expandWindowLyrics(delayMs);
      } else if (state === 'lyricsTranslation') {
        window.api?.expandWindowLyricsTranslation(delayMs);
      } else if (state === 'expanded') {
        window.api?.expandWindowFull(delayMs);
      } else if (state === 'maxExpand' || state === 'guide' || state === 'login' || state === 'register' || state === 'resetPassword' || state === 'setPassword' || state === 'bindOAuth' || state === 'bindEmail' || state === 'payment' || state === 'announcement' || state === 'questionnaire' || state === 'musicProvidersLogin') {
        window.api?.expandWindowSettings(delayMs);
      } else {
        window.api?.collapseWindow(delayMs);
      }
    };

    const unsub = window.api?.onShapeModeChanged?.((mode: string, targetX: number, targetY: number) => {
      const nextMode = mode === 'notch' || mode === 'pill' ? mode : 'notch';
      const store = useIslandStore.getState();

      shapeChangeVersion += 1;
      const currentVersion = shapeChangeVersion;
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = 0;
      }

      const currentState = store.state;
      const transitionDuration = getIslandMorphDuration(store.animationSpeed);
      if (store.shapeMode !== nextMode) store.setShapeMode(nextMode);
      applyWindowForState(currentState, transitionDuration);

      void window.api.getWindowBounds().then((bounds) => {
        if (currentVersion !== shapeChangeVersion || !bounds) return;
        const targetCenterX = targetX + ISLAND_WIDTH / 2;
        const currentCenterX = bounds.x + bounds.width / 2;
        const dx = Math.round(targetCenterX - currentCenterX);
        const dy = Math.round(targetY - bounds.y);
        return animateWindowMove(dx, dy, transitionDuration).then(async () => {
          if (currentVersion !== shapeChangeVersion) return;
          const settledBounds = await window.api.getWindowBounds();
          if (currentVersion !== shapeChangeVersion || !settledBounds) return;
          const correctionX = Math.round(targetCenterX - (settledBounds.x + settledBounds.width / 2));
          const correctionY = Math.round(targetY - settledBounds.y);
          if (correctionX !== 0 || correctionY !== 0) {
            window.api?.moveWindowDelta?.(correctionX, correctionY);
          }
        });
      }).catch(() => {});
    });
    return () => {
      shapeChangeVersion += 1;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      unsub?.();
    };
  }, []);
}
