import { ipcMain } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';

interface RegisterMusicIpcHandlersOptions {
  storeDir: string;
  whitelistStoreKey: string;
  lyricsSourceStoreKey: string;
  getWhitelist: () => string[];
  setWhitelist: (list: string[]) => void;
  readLyricsSourceConfig: () => string;
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
}
