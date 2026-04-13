import { ipcMain } from 'electron';
import type { AppUpdater } from 'electron-updater';

interface RegisterUpdaterIpcHandlersOptions {
  updater: AppUpdater;
  getVersion: () => string;
  isPackaged: () => boolean;
}

export function registerUpdaterIpcHandlers(options: RegisterUpdaterIpcHandlersOptions): void {
  ipcMain.handle('updater:check', async () => {
    try {
      const current = options.getVersion();
      console.log('[Updater:check] currentVersion:', current);
      console.log('[Updater:check] app.isPackaged:', options.isPackaged());
      console.log('[Updater:check] calling checkForUpdates...');
      const result = await options.updater.checkForUpdates();
      console.log('[Updater:check] result:', JSON.stringify(result?.updateInfo ?? null));
      if (!result || !result.updateInfo) {
        console.log('[Updater:check] no updateInfo returned');
        return { available: false };
      }
      const latest = result.updateInfo.version;
      console.log(`[Updater:check] latest=${latest} current=${current} available=${latest !== current}`);
      return {
        available: latest !== current,
        version: latest,
        releaseNotes: result.updateInfo.releaseNotes || '',
        currentVersion: current,
      };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error('[Updater:check] ERROR:', e.message);
      console.error('[Updater:check] stack:', e.stack);
      return { available: false, error: e.message };
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      console.log('[Updater:download] step 1 - checkForUpdates...');
      const checkResult = await options.updater.checkForUpdates();
      console.log('[Updater:download] checkResult:', JSON.stringify(checkResult?.updateInfo ?? null));
      if (!checkResult || !checkResult.updateInfo) {
        console.error('[Updater:download] checkForUpdates returned no info, aborting download');
        return false;
      }
      console.log('[Updater:download] step 2 - downloadUpdate...');
      await options.updater.downloadUpdate();
      console.log('[Updater:download] download finished successfully');
      return true;
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error('[Updater:download] ERROR:', e.message);
      console.error('[Updater:download] stack:', e.stack);
      return false;
    }
  });

  ipcMain.handle('updater:install', () => {
    options.updater.quitAndInstall(false, true);
    return true;
  });

  ipcMain.handle('updater:version', () => {
    return options.getVersion();
  });
}
