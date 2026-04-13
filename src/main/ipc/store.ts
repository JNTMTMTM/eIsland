import { ipcMain } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface RegisterStoreIpcHandlersOptions {
  storeDir: string;
}

export function registerStoreIpcHandlers(options: RegisterStoreIpcHandlersOptions): void {
  ipcMain.handle('store:read', (_event, key: string) => {
    try {
      const filePath = join(options.storeDir, `${key}.json`);
      if (!existsSync(filePath)) return null;
      const raw = readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[Store] read '${key}' error:`, err);
      return null;
    }
  });

  ipcMain.handle('store:write', (_event, key: string, data: unknown) => {
    try {
      const filePath = join(options.storeDir, `${key}.json`);
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`[Store] write '${key}' error:`, err);
      return false;
    }
  });
}
