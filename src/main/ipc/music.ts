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
 * @file music.ts
 * @description 音乐相关 IPC 处理模块
 * @description 处理播放器白名单、歌词设置和 SMTC 配置的 IPC 请求
 * @author 鸡哥
 */

import { ipcMain } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

interface RegisterMusicIpcHandlersOptions {
  storeDir: string;
  whitelistStoreKey: string;
  lyricsSourceStoreKey: string;
  lyricsKaraokeStoreKey: string;
  lyricsClockStoreKey: string;
  smtcUnsubscribeStoreKey: string;
  defaultLyricsKaraoke: boolean;
  defaultLyricsClock: boolean;
  getWhitelist: () => string[];
  setWhitelist: (list: string[]) => void;
  readLyricsSourceConfig: () => string;
  getSmtcUnsubscribeMs: () => number;
  setSmtcUnsubscribeMs: (value: number) => void;
  sanitizeSmtcUnsubscribeMs: (value: unknown) => number;
  detectAllSources: () => Promise<Array<{ sourceAppId: string; isPlaying: boolean; hasTitle: boolean }>>;
}

/**
 * 注册音乐相关 IPC 处理器
 * @description 注册白名单、歌词源、歌词效果和 SMTC 设置的 IPC 事件处理器
 * @param options - 配置选项，包含存储目录、键名和配置管理函数
 */
export function registerMusicIpcHandlers(options: RegisterMusicIpcHandlersOptions): void {
  ipcMain.handle('music:whitelist:get', () => {
    return options.getWhitelist();
  });

  ipcMain.handle('music:whitelist:set', (_event, list: string[]) => {
    try {
      options.setWhitelist(list);
      const filePath = join(options.storeDir, `${options.whitelistStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[Whitelist] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('music:lyrics-source:get', () => {
    return options.readLyricsSourceConfig();
  });

  ipcMain.handle('music:lyrics-source:set', (_event, source: string) => {
    try {
      const filePath = join(options.storeDir, `${options.lyricsSourceStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(source, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[LyricsSource] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('music:lyrics-karaoke:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.lyricsKaraokeStoreKey}.json`);
      if (!existsSync(filePath)) return options.defaultLyricsKaraoke;
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return typeof data === 'boolean' ? data : options.defaultLyricsKaraoke;
    } catch {
      return options.defaultLyricsKaraoke;
    }
  });

  ipcMain.handle('music:lyrics-karaoke:set', (_event, enabled: boolean) => {
    try {
      const filePath = join(options.storeDir, `${options.lyricsKaraokeStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(enabled, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[LyricsKaraoke] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('music:lyrics-clock:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.lyricsClockStoreKey}.json`);
      if (!existsSync(filePath)) return options.defaultLyricsClock;
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return typeof data === 'boolean' ? data : options.defaultLyricsClock;
    } catch {
      return options.defaultLyricsClock;
    }
  });

  ipcMain.handle('music:lyrics-clock:set', (_event, enabled: boolean) => {
    try {
      const filePath = join(options.storeDir, `${options.lyricsClockStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(enabled, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[LyricsClock] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('music:smtc-unsubscribe-ms:get', () => {
    return options.getSmtcUnsubscribeMs();
  });

  ipcMain.handle('music:smtc-unsubscribe-ms:set', (_event, valueMs: number) => {
    try {
      const next = options.sanitizeSmtcUnsubscribeMs(valueMs);
      options.setSmtcUnsubscribeMs(next);
      const filePath = join(options.storeDir, `${options.smtcUnsubscribeStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[SMTCUnsubscribe] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('music:detect-source-app-id', async () => {
    try {
      const sources = await options.detectAllSources();
      if (!sources.length) {
        return { ok: false, sources: [], message: '当前无播放程序' };
      }
      return { ok: true, sources, message: '' };
    } catch (error) {
      console.error('[Music] detect sources failed:', error);
      return { ok: false, sources: [], message: '读取会话异常' };
    }
  });
}
