import { BrowserWindow } from 'electron';
import type { AppUpdater, UpdateInfo } from 'electron-updater';

interface InitUpdaterServiceOptions {
  updater: AppUpdater;
  getMainWindow: () => BrowserWindow | null;
  getAppPath: () => string;
  isPackaged: () => boolean;
  autoCheckDelayMs?: number;
}

export function initUpdaterService(options: InitUpdaterServiceOptions): void {
  const { updater } = options;

  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowPrerelease = false;
  updater.forceDevUpdateConfig = true;
  updater.logger = console;

  console.log('[Updater] initialized, allowPrerelease=true, forceDevUpdateConfig=true');
  console.log('[Updater] appPath:', options.getAppPath());
  console.log('[Updater] isPackaged:', options.isPackaged());

  const emitToRenderer = (channel: string, payload: unknown): void => {
    const mainWindow = options.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send(channel, payload);
  };

  updater.on('checking-for-update', () => {
    console.log('[Updater] checking-for-update...');
  });

  updater.on('update-available', (info: UpdateInfo) => {
    console.log('[Updater] update-available:', info.version);
    emitToRenderer('updater:update-available', {
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
    });
  });

  updater.on('update-not-available', (info: UpdateInfo) => {
    console.log('[Updater] update-not-available, current:', info.version);
  });

  updater.on('download-progress', (progress) => {
    console.log(`[Updater] download-progress: ${progress.percent.toFixed(1)}%  ${(progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s  ${progress.transferred}/${progress.total}`);
    emitToRenderer('updater:download-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  updater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('[Updater] update-downloaded:', info.version);
    emitToRenderer('updater:update-downloaded', { version: info.version });
  });

  updater.on('error', (err) => {
    console.error('[Updater] error:', err.message);
  });

  setTimeout(() => {
    console.log('[Updater] auto-checking for updates on startup...');
    updater.checkForUpdates().catch((err) => {
      console.error('[Updater] auto-check error:', err);
    });
  }, options.autoCheckDelayMs ?? 5000);
}
