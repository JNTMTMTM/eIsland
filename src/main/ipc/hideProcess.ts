import { ipcMain } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';

interface RegisterHideProcessIpcHandlersOptions {
  storeDir: string;
  hideProcessListStoreKey: string;
  getConfiguredHideProcessList: () => string[];
  setConfiguredHideProcessList: (list: string[]) => void;
  getAutoHideProcessList: () => string[];
  setAutoHideProcessList: (list: string[]) => void;
  sanitizeProcessNameList: (list: string[]) => string[];
  normalizeProcessName: (name: string) => string;
  checkAutoHideProcessList: () => Promise<void>;
}

export function registerHideProcessIpcHandlers(options: RegisterHideProcessIpcHandlersOptions): void {
  ipcMain.handle('hide-process-list:get', () => {
    return options.getConfiguredHideProcessList();
  });

  ipcMain.handle('hide-process-list:set', async (_event, list: string[]) => {
    try {
      const next = options.sanitizeProcessNameList(Array.isArray(list) ? list : []);
      const nextNormalized = new Set(next.map(options.normalizeProcessName));

      const currentRuntime = options.getAutoHideProcessList();
      const nextRuntime = currentRuntime.filter((name) => nextNormalized.has(options.normalizeProcessName(name)));
      options.setAutoHideProcessList(nextRuntime);

      options.setConfiguredHideProcessList(next);
      const filePath = join(options.storeDir, `${options.hideProcessListStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf-8');

      if (process.platform === 'win32') {
        await options.checkAutoHideProcessList().catch(() => {});
      }

      return true;
    } catch (err) {
      console.error('[HideProcessList] persist error:', err);
      return false;
    }
  });
}
