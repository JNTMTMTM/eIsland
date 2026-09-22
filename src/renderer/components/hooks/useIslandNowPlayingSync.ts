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

/**
 * 歌词校准：歌词获取完成后，读取 SMTC 当前播放位置，修正歌词时间偏移
 * @description 解决歌词源时间轴与 SMTC 播放位置不对齐的问题
 * @param lyrics - 原始歌词数据
 * @returns 校准后的歌词数据
 */
async function calibrateLyrics(lyrics: SyncedLyricLine[]): Promise<SyncedLyricLine[]> {
  try {
    const ts = await window.api.smtcGetTimestamp();
    if (!ts?.isAvailable || !ts.timeline) {
      console.log('[LyricsCalibrate] SMTC 时间戳不可用，跳过校准');
      return lyrics;
    }

    const smtcPositionMs = ts.timeline.position * 1000;

    // 找到当前播放位置对应的歌词行
    let matchedLine: SyncedLyricLine | undefined;
    for (let i = 0; i < lyrics.length; i++) {
      const line = lyrics[i];
      const next = lyrics[i + 1];
      if (smtcPositionMs >= line.time_ms && (!next || smtcPositionMs < next.time_ms)) {
        matchedLine = line;
        break;
      }
    }
    if (!matchedLine) {
      console.log('[LyricsCalibrate] 未找到匹配歌词行，跳过校准');
      return lyrics;
    }

    // 计算偏差：SMTC 位置 vs 歌词期望位置
    const offsetMs = smtcPositionMs - matchedLine.time_ms;
    // 仅当偏差超过 100ms 时校准，避免无意义的微调
    if (Math.abs(offsetMs) < 100) {
      console.log(`[LyricsCalibrate] 偏差 ${offsetMs.toFixed(0)}ms 在容忍范围内，无需校准`);
      return lyrics;
    }

    console.log(`[LyricsCalibrate] 校准触发: offset=${offsetMs.toFixed(0)}ms, SMTC=${smtcPositionMs.toFixed(0)}ms, 歌词=${matchedLine.time_ms.toFixed(0)}ms, 行="${matchedLine.text}"`);

    // 应用偏移量到所有歌词行
    return lyrics.map((line) => ({
      ...line,
      time_ms: line.time_ms + offsetMs,
    }));
  } catch {
    return lyrics;
  }
}

interface UseIslandNowPlayingSyncOptions {
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
  const songKeyRef = useRef('');
  const progressBaseRef = useRef({ positionMs: 0, durationMs: 0, timestamp: 0 });
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 校准计时器状态，用于暂停/恢复时正确处理剩余时间 */
  const calTimerRef = useRef<{
    timerId: ReturnType<typeof setTimeout> | null;
    remainingMs: number;
    startedAt: number;
    lyrics: SyncedLyricLine[];
  }>({ timerId: null, remainingMs: 0, startedAt: 0, lyrics: [] });

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
    let playing = false;

    const stopProgress = () => {
      if (progressTimerRef.current !== null) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };

    const clearCalibration = () => {
      if (calTimerRef.current.timerId !== null) {
        clearTimeout(calTimerRef.current.timerId);
      }
      calTimerRef.current = { timerId: null, remainingMs: 0, startedAt: 0, lyrics: [] };
    };

    // 仅累计实际播放时间；歌词在暂停期间返回时，不启动校准计时器。
    const scheduleCalibration = (lyrics: SyncedLyricLine[], delayMs: number): void => {
      clearCalibration();
      const version = requestVersion;
      const timerId = playing ? setTimeout(async () => {
        clearCalibration();
        if (disposed || requestVersion !== version) return;
        const calibrated = await calibrateLyrics(lyrics);
        if (disposed || requestVersion !== version) return;
        setSyncedLyricsRef.current(calibrated);
      }, delayMs) : null;
      calTimerRef.current = { timerId, remainingMs: delayMs, startedAt: Date.now(), lyrics };
    };

    const unsubscribe = window.api?.onNowPlayingInfo((info: NowPlayingInfo | null) => {
      if (disposed) return;
      handleNowPlayingUpdateRef.current(info);
      playing = Boolean(info?.title && info.isPlaying);

      const newKey = info?.title ? `${info.title}||${info.artist}` : '';
      if (!newKey) {
        requestVersion += 1;
        songKeyRef.current = '';
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
          try {
            calibrateEnabled = await window.api.musicLyricsCalibrateEnabledGet();
            calibrateDelaySec = await window.api.musicLyricsCalibrateDelayGet();
          } catch {
            // use defaults
          }
          if (!isCurrent()) return;

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
                if (calibrateEnabled) {
                  scheduleCalibration(mapped, calibrateDelaySec * 1000);
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
          if (lyrics && lyrics.length > 0 && calibrateEnabled) {
            scheduleCalibration(lyrics, calibrateDelaySec * 1000);
          }
        };

        void loadLyrics();
      }

      if (info && info.position_ms !== undefined) {
        if (info.isPlaying) {
          // 恢复校准计时器（从暂停恢复时，用剩余时间重新启动）
          const cal = calTimerRef.current;
          if (cal.timerId === null && cal.lyrics.length > 0) {
            scheduleCalibration(cal.lyrics, cal.remainingMs);
          }

          progressBaseRef.current = {
            positionMs: info.position_ms,
            durationMs: info.duration_ms,
            timestamp: Date.now(),
          };

          if (progressTimerRef.current === null) {
            // 进度只需约 15Hz，无需在高刷新率屏幕上每帧唤醒再跳过写入。
            const tick = () => {
              const now = Date.now();
              const base = progressBaseRef.current;
              const elapsed = now - base.timestamp;
              const position = Math.max(0, base.positionMs + elapsed);
              updateProgressRef.current(base.durationMs > 0 ? Math.min(base.durationMs, position) : position);
              if (base.durationMs > 0 && position >= base.durationMs) {
                stopProgress();
              }
            };
            progressTimerRef.current = setInterval(tick, 66);
          }
        } else {
          // 暂停时冻结校准计时器
          const cal = calTimerRef.current;
          if (cal.timerId !== null) {
            clearTimeout(cal.timerId);
            calTimerRef.current = {
              timerId: null,
              remainingMs: Math.max(0, cal.remainingMs - (Date.now() - cal.startedAt)),
              startedAt: 0,
              lyrics: cal.lyrics,
            };
          }

          stopProgress();
          updateProgressRef.current(info.position_ms);
        }
      }
    });

    return () => {
      disposed = true;
      requestVersion += 1;
      songKeyRef.current = '';
      unsubscribe?.();
      stopProgress();
      clearCalibration();
    };
  }, []);
}
