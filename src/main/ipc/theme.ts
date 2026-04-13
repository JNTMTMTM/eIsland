import { ipcMain } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface RegisterThemeIpcHandlersOptions {
  storeDir: string;
  themeModeStoreKey: string;
}

export function registerThemeIpcHandlers(options: RegisterThemeIpcHandlersOptions): void {
  ipcMain.handle('theme:mode:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.themeModeStoreKey}.json`);
      if (!existsSync(filePath)) return 'dark';
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return data === 'dark' || data === 'light' || data === 'system' ? data : 'dark';
    } catch {
      return 'dark';
    }
  });

  ipcMain.handle('theme:mode:set', (_event, mode: string) => {
    try {
      const safe = mode === 'dark' || mode === 'light' || mode === 'system' ? mode : 'dark';
      const filePath = join(options.storeDir, `${options.themeModeStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(safe, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[Theme] persist error:', err);
      return false;
    }
  });
}
