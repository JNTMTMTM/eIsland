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
 * @file useIslandNowPlayingSync.ts
 * @description 音乐播放信息与歌词同步 Hook。
 * @author 鸡哥
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { NowPlayingInfo } from '../../store/isLandStore';
import type { SyncedLyricLine } from '../../store/types';
import type { TranslationLyricsResult } from '../../api/lyrics/lrcApi';
import { fetchLyricsWithTranslation } from '../../api/lyrics/lrcApi';
import { fetchKaraokeLyrics } from '../../api/lyrics/lrcs/karaoke';
import type { KaraokeLine } from '../../api/lyrics/lrcs/karaoke';

interface UseIslandNowPlayingSyncOptions {
  progressEnabled?: boolean;
  handleNowPlayingUpdate: (info: NowPlayingInfo | null) => void;
  updateProgress: (positionMs: number) => void;
  setSyncedLyrics: (lyrics: SyncedLyricLine[] | null) => void;
  setTranslationLyrics: (translation: TranslationLyricsResult | null) => void;
  setLyricsLoading: (loading: boolean) => void;
}

function notFetchedTranslationLyrics(): TranslationLyricsResult {
  return { status: 'not-fetched', lines: null };
}

const TRANSLATION_STATUS_LABELS: Record<TranslationLyricsResult['status'], string> = {
  available: '已获取翻译歌词',
  'not-provided': '播放器未提供翻译歌词',
  'not-fetched': '未获取到翻译歌词',
  unsupported: '当前歌词源不支持翻译歌词',
};

function logTranslationLyricsStatus(translation: TranslationLyricsResult): void {
  console.log(
    `[LyricsTranslation] status=${translation.status} ${TRANSLATION_STATUS_LABELS[translation.status]}, lines=${translation.lines?.length ?? 0}`,
  );
}

/**
 * 记录校准状态变化，避免随播放进度刷新重复输出。
 * @param status - 可用于控制台过滤的状态标识。
 * @param message - 状态说明。
 * @param details - 时间偏差或跳过原因等诊断信息。
 */
function logCalibrationStatus(status: string, message: string, details: Record<string, unknown> = {}): void {
  console.log(`[LyricsCalibrate] status=${status} ${message}`, details);
}

/**
 * @description 同步系统播放信息、进度与歌词数据。
 * @param options - 播放信息同步配置。
 */
export function useIslandNowPlayingSync(options: UseIslandNowPlayingSyncOptions): void {
  const {
    handleNowPlayingUpdate,
    updateProgress,
    setSyncedLyrics,
    setTranslationLyrics,
    setLyricsLoading,
  } = options;

  const handleNowPlayingUpdateRef = useRef(handleNowPlayingUpdate);
  const updateProgressRef = useRef(updateProgress);
  const setSyncedLyricsRef = useRef(setSyncedLyrics);
  const setTranslationLyricsRef = useRef(setTranslationLyrics);
  const setLyricsLoadingRef = useRef(setLyricsLoading);
  const progressEnabledRef = useRef(options.progressEnabled !== false);
  const reconcileProgressRef = useRef<() => void>(() => {});
  useEffect(() => {
    progressEnabledRef.current = options.progressEnabled !== false;
    reconcileProgressRef.current();
  }, [options.progressEnabled]);
  const songKeyRef = useRef('');
  const progressBaseRef = useRef({ positionMs: 0, durationMs: 0, timestamp: 0, playbackRate: 1 });
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 校准计时器状态，用于暂停/恢复时正确处理剩余时间 */
  const calTimerRef = useRef<{
    timerId: ReturnType<typeof setTimeout> | null;
    remainingMs: number;
    startedAt: number;
    pending: boolean;
  }>({ timerId: null, remainingMs: 0, startedAt: 0, pending: false });

  useLayoutEffect(() => {
    handleNowPlayingUpdateRef.current = handleNowPlayingUpdate;
  });

  useLayoutEffect(() => {
    updateProgressRef.current = updateProgress;
  });

  useLayoutEffect(() => {
    setSyncedLyricsRef.current = setSyncedLyrics;
    setTranslationLyricsRef.current = setTranslationLyrics;
    setLyricsLoadingRef.current = setLyricsLoading;
  });

  useEffect(() => {
    let disposed = false;
    let requestVersion = 0;
    let timelineVersion = 0;
    let calibrationSettingsVersion = 0;
    let calibrationEnabledVersion = 0;
    let calibrationDelayVersion = 0;
    let calibrationEnabled = true;
    let calibrationDelayMs = 20000;
    let hasLyrics = false;
    let currentSource = '';
    let playing = false;
    let hasPosition = false;

    const stopProgress = () => {
      if (progressTimerRef.current !== null) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };

    const tick = (): void => {
      const base = progressBaseRef.current;
      const elapsed = playing ? Math.max(0, Date.now() - base.timestamp) * base.playbackRate : 0;
      const position = Math.max(0, base.positionMs + elapsed);
      updateProgressRef.current(base.durationMs > 0 ? Math.min(base.durationMs, position) : position);
      if (base.durationMs > 0 && position >= base.durationMs) stopProgress();
    };
    const reconcileProgress = (): void => {
      if (!playing || !hasPosition || progressBaseRef.current.playbackRate === 0
        || !progressEnabledRef.current || (typeof document !== 'undefined' && document.hidden)) {
        stopProgress();
        return;
      }
      if (progressTimerRef.current === null) {
        progressTimerRef.current = setInterval(tick, 66);
        tick();
      }
    };
    reconcileProgressRef.current = reconcileProgress;
    if (typeof document !== 'undefined') document.addEventListener?.('visibilitychange', reconcileProgress);

    const clearCalibration = () => {
      if (calTimerRef.current.timerId !== null) {
        clearTimeout(calTimerRef.current.timerId);
      }
      calTimerRef.current = { timerId: null, remainingMs: 0, startedAt: 0, pending: false };
    };

    // 校准播放时钟，不把一句歌词内已经播放的时长误当成歌词源的时间偏移。
    const calibrateProgress = async (version: number): Promise<void> => {
      const capturedTimelineVersion = timelineVersion;
      const capturedSettingsVersion = calibrationSettingsVersion;
      const source = currentSource;
      logCalibrationStatus('started', '开始校准播放时钟', { source });
      try {
        const ts = await window.api.smtcGetTimestamp();
        if (disposed) return;
        if (requestVersion !== version || timelineVersion !== capturedTimelineVersion
          || calibrationSettingsVersion !== capturedSettingsVersion || !calibrationEnabled) {
          logCalibrationStatus('skipped', '曲目、进度或设置已变化，忽略旧校准结果', { source, reason: 'context-changed' });
          return;
        }
        if (!ts?.isAvailable || !ts.timeline) {
          logCalibrationStatus('skipped', '播放器时间戳不可用，保留当前播放时钟', { source, reason: 'timestamp-unavailable' });
          return;
        }
        if (!Number.isFinite(ts.timeline.position)) {
          logCalibrationStatus('skipped', '播放器位置无效，保留当前播放时钟', { source, reason: 'invalid-position' });
          return;
        }
        if (ts.sourceAppUserModelId && ts.sourceAppUserModelId !== currentSource) {
          logCalibrationStatus('skipped', '时间戳来自其他播放器，忽略校准结果', { source, reason: 'source-changed' });
          return;
        }
        if (ts.playbackStatus && (ts.playbackStatus === 'playing') !== playing) {
          logCalibrationStatus('skipped', '播放状态已变化，忽略校准结果', { source, reason: 'playback-changed' });
          return;
        }
        const { sampledAtMs } = ts.timeline;
        const { playbackRate: rate } = ts;
        const now = Date.now();
        const previous = progressBaseRef.current;
        const beforeMs = Math.max(0, previous.positionMs + (playing ? Math.max(0, now - previous.timestamp) * previous.playbackRate : 0));
        progressBaseRef.current = {
          positionMs: ts.timeline.position * 1000,
          durationMs: progressBaseRef.current.durationMs,
          timestamp: typeof sampledAtMs === 'number' && Number.isFinite(sampledAtMs) ? sampledAtMs : now,
          playbackRate: typeof rate === 'number' && Number.isFinite(rate) && rate >= 0
            ? rate : progressBaseRef.current.playbackRate,
        };
        hasPosition = true;
        tick();
        reconcileProgress();
        const base = progressBaseRef.current;
        const afterMs = Math.max(0, base.positionMs + (playing ? Math.max(0, now - base.timestamp) * base.playbackRate : 0));
        const before = base.durationMs > 0 ? Math.min(base.durationMs, beforeMs) : beforeMs;
        const after = base.durationMs > 0 ? Math.min(base.durationMs, afterMs) : afterMs;
        logCalibrationStatus('calibrated', '播放时钟校准完成，正偏差表示进度前移，负偏差表示后移', {
          source,
          beforeMs: Math.round(before),
          afterMs: Math.round(after),
          deltaMs: Math.round(after - before),
          playbackRate: base.playbackRate,
        });
      } catch (error) {
        if (!disposed) {
          logCalibrationStatus('failed', '读取播放器时间戳失败，保留当前播放时钟', {
            source,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };

    // 仅累计实际播放时间；歌词在暂停期间返回时，不启动校准计时器。
    const scheduleCalibration = (delayMs: number): void => {
      clearCalibration();
      const version = requestVersion;
      const timerId = playing ? setTimeout(async () => {
        clearCalibration();
        if (disposed || requestVersion !== version) return;
        await calibrateProgress(version);
      }, delayMs) : null;
      calTimerRef.current = { timerId, remainingMs: delayMs, startedAt: Date.now(), pending: true };
      logCalibrationStatus(playing ? 'scheduled' : 'waiting-playback', playing ? '已安排校准，按播放时间倒计时' : '等待恢复播放后继续校准倒计时', {
        remainingMs: delayMs,
        source: currentSource,
      });
    };

    const unsubscribeCalibration = window.api?.onSettingsChanged?.((channel, value) => {
      if (disposed) return;
      if (channel === 'music:lyrics-calibrate-enabled' && typeof value === 'boolean') {
        calibrationEnabled = value;
        calibrationEnabledVersion += 1;
      } else if (channel === 'music:lyrics-calibrate-delay' && typeof value === 'number' && Number.isFinite(value)) {
        calibrationDelayMs = Math.max(0, value * 1000);
        calibrationDelayVersion += 1;
      } else return;
      calibrationSettingsVersion += 1;
      clearCalibration();
      if (calibrationEnabled && hasLyrics) scheduleCalibration(calibrationDelayMs);
      else logCalibrationStatus(calibrationEnabled ? 'waiting-lyrics' : 'disabled', calibrationEnabled ? '校准已启用，等待歌词加载' : '校准已关闭，已取消待执行校准');
    });

    const unsubscribe = window.api?.onNowPlayingInfo((info: NowPlayingInfo | null) => {
      if (disposed) return;
      timelineVersion += 1;
      handleNowPlayingUpdateRef.current(info);
      const nextPlaying = Boolean(info?.title && info.isPlaying);
      if (playing !== nextPlaying && hasPosition) {
        const base = progressBaseRef.current;
        progressBaseRef.current = {
          ...base,
          positionMs: base.positionMs + (playing ? Math.max(0, Date.now() - base.timestamp) * base.playbackRate : 0),
          timestamp: Date.now(),
        };
      }
      playing = nextPlaying;
      currentSource = info?.deviceId ?? '';

      const newKey = info?.title ? JSON.stringify([currentSource, info.title, info.artist, info.album]) : '';
      if (!newKey) {
        requestVersion += 1;
        songKeyRef.current = '';
        hasPosition = false;
        hasLyrics = false;
        stopProgress();
        clearCalibration();
        setSyncedLyricsRef.current(null);
        setTranslationLyricsRef.current(null);
        setLyricsLoadingRef.current(false);
        return;
      }

      if (newKey && newKey !== songKeyRef.current) {
        songKeyRef.current = newKey;
        requestVersion += 1;
        hasLyrics = false;
        hasPosition = false;
        stopProgress();
        clearCalibration();
        setSyncedLyricsRef.current(null);
        setTranslationLyricsRef.current(null);
        setLyricsLoadingRef.current(true);
        const capturedVersion = requestVersion;
        const isCurrent = () => !disposed && requestVersion === capturedVersion;
        const title = info!.title;
        const artist = info!.artist;
        const deviceId = info!.deviceId;

        const loadLyrics = async (): Promise<void> => {
          let lyricsEnabled = true;
          try {
            lyricsEnabled = await window.api.musicLyricsEnabledGet();
          } catch {
            lyricsEnabled = true;
          }
          if (!isCurrent()) return;
          if (!lyricsEnabled) {
            setLyricsLoadingRef.current(false);
            logCalibrationStatus('skipped', '歌词功能已关闭，不启动校准', { reason: 'lyrics-disabled' });
            return;
          }

          let translationEnabled = true;
          try {
            translationEnabled = await window.api.musicLyricsTranslationEnabledGet();
          } catch {
            translationEnabled = true;
          }

          let karaokeEnabled = false;
          try {
            karaokeEnabled = await window.api.musicLyricsKaraokeGet();
          } catch {
            karaokeEnabled = false;
          }

          let calibrateEnabled = true;
          let calibrateDelaySec = 20;
          const capturedEnabledVersion = calibrationEnabledVersion;
          const capturedDelayVersion = calibrationDelayVersion;
          try {
            calibrateEnabled = await window.api.musicLyricsCalibrateEnabledGet();
            calibrateDelaySec = await window.api.musicLyricsCalibrateDelayGet();
          } catch {
            // use defaults
          }
          if (!isCurrent()) return;
          if (capturedEnabledVersion === calibrationEnabledVersion) {
            calibrationEnabled = calibrateEnabled;
          }
          if (capturedDelayVersion === calibrationDelayVersion) {
            calibrationDelayMs = calibrateDelaySec * 1000;
          }
          logCalibrationStatus(calibrationEnabled ? 'waiting-lyrics' : 'disabled', calibrationEnabled ? '校准已启用，等待歌词加载' : '校准已关闭');

          const normalLyricsPromise = fetchLyricsWithTranslation(title, artist, deviceId)
            .catch(() => null);

          if (karaokeEnabled) {
            try {
              const karaoke = await fetchKaraokeLyrics(title, artist, deviceId);
              if (!isCurrent()) return;
              if (karaoke && karaoke.length > 0) {
                const mapped: SyncedLyricLine[] = karaoke.map((line: KaraokeLine) => ({
                  time_ms: line.time_ms,
                  text: line.text,
                  duration_ms: line.duration_ms,
                  syllables: line.syllables,
                }));
                setSyncedLyricsRef.current(mapped);
                setLyricsLoadingRef.current(false);
                hasLyrics = true;
                if (calibrationEnabled) {
                  scheduleCalibration(calibrationDelayMs);
                }

                const normalResult = await normalLyricsPromise;
                if (!isCurrent()) return;
                const translation = normalResult?.translation ?? notFetchedTranslationLyrics();
                logTranslationLyricsStatus(translation);
                if (translationEnabled) setTranslationLyricsRef.current(translation);
                return;
              }
            } catch {
              // fallback to normal lyrics source
            }
            if (!isCurrent()) return;
          }

          const result = await normalLyricsPromise;
          if (!isCurrent()) return;
          const translation = result?.translation ?? notFetchedTranslationLyrics();
          logTranslationLyricsStatus(translation);
          if (translationEnabled) setTranslationLyricsRef.current(translation);
          const lyrics = result?.lyrics ?? null;
          setSyncedLyricsRef.current(lyrics);
          setLyricsLoadingRef.current(false);
          hasLyrics = Boolean(lyrics?.length);
          if (hasLyrics && calibrationEnabled) {
            scheduleCalibration(calibrationDelayMs);
          } else if (calibrationEnabled) {
            logCalibrationStatus('skipped', '未获取到歌词，不启动校准', { reason: 'no-lyrics' });
          }
        };

        void loadLyrics();
      }

      const cal = calTimerRef.current;
      if (playing && cal.timerId === null && cal.pending) {
        scheduleCalibration(cal.remainingMs);
      } else if (!playing && cal.timerId !== null) {
        clearTimeout(cal.timerId);
        calTimerRef.current = {
          timerId: null,
          remainingMs: Math.max(0, cal.remainingMs - (Date.now() - cal.startedAt)),
          startedAt: 0,
          pending: true,
        };
        logCalibrationStatus('paused', '播放已暂停，校准倒计时冻结', { remainingMs: calTimerRef.current.remainingMs });
      }

      if (info && typeof info.position_ms === 'number' && Number.isFinite(info.position_ms)) {
        const sampledAtMs = info.positionTimestampMs;
        const rate = info.playbackRate;
        progressBaseRef.current = {
          positionMs: info.position_ms,
          durationMs: Number.isFinite(info.duration_ms) ? info.duration_ms : 0,
          timestamp: typeof sampledAtMs === 'number' && Number.isFinite(sampledAtMs) ? sampledAtMs : Date.now(),
          playbackRate: typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 ? rate : 1,
        };
        hasPosition = true;
        // 即使插值定时器已经运行，seek 与校准事件也必须立即发布最新进度。
      }
      if (hasPosition && (!playing || progressTimerRef.current !== null || progressBaseRef.current.playbackRate === 0)) tick();
      reconcileProgress();
    });

    return () => {
      disposed = true;
      reconcileProgressRef.current = () => {};
      if (typeof document !== 'undefined') document.removeEventListener?.('visibilitychange', reconcileProgress);
      requestVersion += 1;
      songKeyRef.current = '';
      unsubscribe?.();
      unsubscribeCalibration?.();
      stopProgress();
      clearCalibration();
    };
  }, []);
}
