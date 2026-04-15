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
 * @file smtcService.ts
 * @description SMTC (System Media Transport Controls) 服务模块
 * @description 管理 Windows 系统媒体会话，处理播放状态和音源切换
 * @author 鸡哥
 */

import { BrowserWindow } from 'electron';
import { Worker } from 'worker_threads';
import { join } from 'path';

interface DetectedSourceEntry {
  isPlaying: boolean;
  hasTitle: boolean;
  updatedAt: number;
}

interface SmtcSessionRuntimeEntry {
  payload: {
    title: string;
    artist: string;
    album: string;
    duration_ms: number;
    position_ms: number;
    isPlaying: boolean;
    thumbnail: string | null;
    canFastForward: boolean;
    canSkip: boolean;
    canLike: boolean;
    canChangeVolume: boolean;
    canSetOutput: boolean;
    deviceId: string;
  };
  hasTitle: boolean;
  isPlaying: boolean;
  playStartedAt: number;
  updatedAt: number;
}

interface CreateSmtcServiceOptions {
  getMainWindow: () => BrowserWindow | null;
  getWhitelist: () => string[];
  getSmtcUnsubscribeMs: () => number;
  unsubscribeNeverValue: number;
  cleanupIntervalMs: number;
}

interface PublicSessionRuntimeEntry {
  payload: unknown;
  hasTitle: boolean;
}

interface SmtcService {
  initWorker: () => void;
  cleanupWorker: () => void;
  isWhitelisted: () => boolean;
  pickDetectedSourceAppId: () => Promise<string>;
  detectAllSources: () => Promise<Array<{ sourceAppId: string; isPlaying: boolean; hasTitle: boolean; thumbnail: string | null }>>;
  getPendingSourceSwitchId: () => string;
  setPendingSourceSwitchId: (id: string) => void;
  getPendingSourceSwitchEntry: () => unknown;
  clearPendingSourceSwitchEntry: () => void;
  getCurrentDeviceId: () => string;
  setCurrentDeviceId: (id: string) => void;
  getSmtcSessionRuntime: () => Map<string, PublicSessionRuntimeEntry> | null;
}

/**
 * 创建 SMTC 服务实例
 * @description 初始化 SMTC 监控服务，管理媒体会话和音源切换
 * @param options - 服务配置选项，包含窗口获取和白名单配置
 * @returns SMTC 服务对象，包含初始化和清理方法
 */
export function createSmtcService(options: CreateSmtcServiceOptions): SmtcService {
  let smtcWorker: Worker | null = null;
  let currentDeviceId = options.getWhitelist()[0] || '';
  const detectedSourceRuntime = new Map<string, DetectedSourceEntry>();
  let smtcSessionRuntime: Map<string, SmtcSessionRuntimeEntry> | null = null;
  let pendingSourceSwitchId = '';
  let pendingSourceSwitchEntry: SmtcSessionRuntimeEntry | null = null;
  let lastSmtcCleanupAt = 0;
  let pendingDetectResolve: ((sources: Array<{ sourceAppId: string; isPlaying: boolean; hasTitle: boolean; thumbnail: string | null }>) => void) | null = null;

  function isWhitelisted(): boolean {
    const id = currentDeviceId.toLowerCase();
    return options.getWhitelist().some((name) => id.includes(name.toLowerCase()));
  }

  function pickDetectedSourceAppId(): string {
    let bestPlaying = '';
    let bestPlayingAt = 0;
    let bestTitled = '';
    let bestTitledAt = 0;

    detectedSourceRuntime.forEach((entry, sourceAppId) => {
      if (entry.isPlaying && entry.updatedAt >= bestPlayingAt) {
        bestPlaying = sourceAppId;
        bestPlayingAt = entry.updatedAt;
      }
      if (entry.hasTitle && entry.updatedAt >= bestTitledAt) {
        bestTitled = sourceAppId;
        bestTitledAt = entry.updatedAt;
      }
    });

    return bestPlaying || bestTitled;
  }

  function cleanupStaleSmtcRuntime(sessionRuntime: Map<string, SmtcSessionRuntimeEntry>): void {
    const now = Date.now();
    const ttlMs = options.getSmtcUnsubscribeMs();
    if (ttlMs === options.unsubscribeNeverValue) return;

    detectedSourceRuntime.forEach((entry, sourceAppId) => {
      if (now - entry.updatedAt > ttlMs) {
        detectedSourceRuntime.delete(sourceAppId);
      }
    });

    sessionRuntime.forEach((entry, sourceAppId) => {
      if (now - entry.updatedAt > ttlMs) {
        sessionRuntime.delete(sourceAppId);
        if (sourceAppId === pendingSourceSwitchId) {
          pendingSourceSwitchId = '';
          pendingSourceSwitchEntry = null;
        }
        if (sourceAppId === currentDeviceId) {
          currentDeviceId = '';
        }
      }
    });
  }

  function initWorker(): void {
    try {
      const sessionRuntime = new Map<string, SmtcSessionRuntimeEntry>();
      smtcSessionRuntime = sessionRuntime;

      const emitCurrentSession = (): void => {
        const mainWindow = options.getMainWindow();
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const currentEntry = currentDeviceId ? sessionRuntime.get(currentDeviceId) : undefined;
        if (currentEntry?.hasTitle) {
          mainWindow.webContents.send('nowplaying:info', currentEntry.payload);
        } else {
          mainWindow.webContents.send('nowplaying:info', null);
        }
      };

      const emitSourceSwitchRequest = (sourceAppId: string, title: string, artist: string): void => {
        const mainWindow = options.getMainWindow();
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.webContents.send('media:source-switch-request', { sourceAppId, title, artist });
      };

      const workerPath = join(__dirname, 'smtcWorker.js');
      smtcWorker = new Worker(workerPath);

      smtcWorker.on('message', (msg: {
        type: string;
        sourceAppId?: string;
        session?: {
          media: { title: string; artist: string; albumTitle: string; thumbnail: string | null } | null;
          playback: { playbackStatus: number; playbackType: number } | null;
          timeline: { position: number; duration: number } | null;
        };
        sources?: Array<{ sourceAppId: string; isPlaying: boolean; hasTitle: boolean; thumbnail: string | null }>;
      }) => {
        if (msg.type === 'detect-sources-result') {
          if (pendingDetectResolve) {
            pendingDetectResolve(msg.sources ?? []);
            pendingDetectResolve = null;
          }
          return;
        }

        const mainWindow = options.getMainWindow();
        if (!mainWindow || mainWindow.isDestroyed()) return;

        if (msg.type === 'session-removed') {
          if (msg.sourceAppId) {
            detectedSourceRuntime.delete(msg.sourceAppId);
            sessionRuntime.delete(msg.sourceAppId);
            if (msg.sourceAppId === pendingSourceSwitchId) {
              pendingSourceSwitchId = '';
              pendingSourceSwitchEntry = null;
            }
          }
          if (msg.sourceAppId === currentDeviceId) {
            currentDeviceId = '';
            emitCurrentSession();
          }
          return;
        }

        if (msg.type !== 'session-update') return;

        const { sourceAppId = '', session } = msg;
        const { media, playback, timeline } = session ?? {};
        const now = Date.now();

        if (now - lastSmtcCleanupAt >= options.cleanupIntervalMs) {
          cleanupStaleSmtcRuntime(sessionRuntime);
          lastSmtcCleanupAt = now;
        }

        if (sourceAppId) {
          detectedSourceRuntime.set(sourceAppId, {
            isPlaying: (playback?.playbackStatus ?? 0) === 4,
            hasTitle: Boolean(media?.title),
            updatedAt: now,
          });
        }

        const sourceAppIdLower = sourceAppId.toLowerCase();
        if (!options.getWhitelist().some((name) => sourceAppIdLower.includes(name.toLowerCase()))) return;

        const hasTitle = Boolean(media?.title);
        const isPlaying = (playback?.playbackStatus ?? 0) === 4;

        const payload = {
          title: media?.title ?? '',
          artist: media?.artist ?? '',
          album: media?.albumTitle ?? '',
          duration_ms: Math.round((timeline?.duration ?? 0) * 1000),
          position_ms: Math.round((timeline?.position ?? 0) * 1000),
          isPlaying,
          thumbnail: media?.thumbnail ?? null,
          canFastForward: false,
          canSkip: false,
          canLike: false,
          canChangeVolume: false,
          canSetOutput: false,
          deviceId: sourceAppId,
        };

        const prevEntry = sessionRuntime.get(sourceAppId);
        let playStartedAt = prevEntry?.playStartedAt ?? 0;
        if (isPlaying) {
          if (!prevEntry?.isPlaying || playStartedAt <= 0) {
            playStartedAt = Date.now();
          }
        } else {
          playStartedAt = 0;
        }

        sessionRuntime.set(sourceAppId, {
          payload,
          hasTitle,
          isPlaying,
          playStartedAt,
          updatedAt: now,
        });

        if (!currentDeviceId) {
          if (isPlaying && hasTitle) {
            currentDeviceId = sourceAppId;
            emitCurrentSession();
          }
          return;
        }

        if (sourceAppId === currentDeviceId) {
          emitCurrentSession();
          if (!isPlaying && !hasTitle) {
            currentDeviceId = '';
          }
          return;
        }

        if (isPlaying && hasTitle) {
          const lockedEntry = sessionRuntime.get(currentDeviceId);
          if (lockedEntry?.isPlaying) {
            if (pendingSourceSwitchId === sourceAppId) {
              pendingSourceSwitchEntry = sessionRuntime.get(sourceAppId) ?? null;
              return;
            }
            pendingSourceSwitchId = sourceAppId;
            pendingSourceSwitchEntry = sessionRuntime.get(sourceAppId) ?? null;
            emitSourceSwitchRequest(sourceAppId, payload.title, payload.artist);
          } else {
            currentDeviceId = sourceAppId;
            emitCurrentSession();
          }
        }
      });

      smtcWorker.on('error', (err) => {
        console.error('[SMTC] Worker error:', err);
      });

      smtcWorker.on('exit', (code) => {
        if (code !== 0) console.error('[SMTC] Worker exited with code:', code);
      });
    } catch (err) {
      console.error('[SMTC] Worker init error:', err);
    }
  }

  function requestFreshSources(): Promise<Array<{ sourceAppId: string; isPlaying: boolean; hasTitle: boolean; thumbnail: string | null }>> {
    if (!smtcWorker) return Promise.resolve([]);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        pendingDetectResolve = null;
        resolve([]);
      }, 3000);

      pendingDetectResolve = (sources) => {
        clearTimeout(timeout);
        const now = Date.now();
        for (const s of sources) {
          detectedSourceRuntime.set(s.sourceAppId, {
            isPlaying: s.isPlaying,
            hasTitle: s.hasTitle,
            updatedAt: now,
          });
        }
        resolve(sources);
      };

      smtcWorker!.postMessage({ type: 'detect-sources' });
    });
  }

  function pickDetectedSourceAppIdAsync(): Promise<string> {
    const syncResult = pickDetectedSourceAppId();
    if (syncResult) return Promise.resolve(syncResult);
    return requestFreshSources().then(() => pickDetectedSourceAppId());
  }

  function detectAllSources(): Promise<Array<{ sourceAppId: string; isPlaying: boolean; hasTitle: boolean; thumbnail: string | null }>> {
    return requestFreshSources();
  }

  function cleanupWorker(): void {
    if (pendingDetectResolve) {
      pendingDetectResolve([]);
      pendingDetectResolve = null;
    }
    if (smtcWorker) {
      smtcWorker.terminate();
      smtcWorker = null;
    }
    detectedSourceRuntime.clear();
    smtcSessionRuntime?.clear();
    smtcSessionRuntime = null;
    pendingSourceSwitchId = '';
    pendingSourceSwitchEntry = null;
    currentDeviceId = '';
    lastSmtcCleanupAt = 0;
  }

  return {
    initWorker,
    cleanupWorker,
    isWhitelisted,
    pickDetectedSourceAppId: pickDetectedSourceAppIdAsync,
    detectAllSources,
    getPendingSourceSwitchId: () => pendingSourceSwitchId,
    setPendingSourceSwitchId: (id) => {
      pendingSourceSwitchId = id;
    },
    getPendingSourceSwitchEntry: () => pendingSourceSwitchEntry,
    clearPendingSourceSwitchEntry: () => {
      pendingSourceSwitchEntry = null;
    },
    getCurrentDeviceId: () => currentDeviceId,
    setCurrentDeviceId: (id) => {
      currentDeviceId = id;
    },
    getSmtcSessionRuntime: () => smtcSessionRuntime,
  };
}
