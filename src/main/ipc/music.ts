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
  detectSourceAppId: () => string;
}

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
      const sourceAppId = options.detectSourceAppId().trim();
      if (!sourceAppId) {
        return { ok: false, sourceAppId: null, message: '获取失败：当前无播放程序' };
      }
      return { ok: true, sourceAppId, message: '获取成功' };
    } catch (error) {
      console.error('[Music] detect source app id failed:', error);
      return { ok: false, sourceAppId: null, message: '获取失败：读取会话异常' };
    }
  });
}
