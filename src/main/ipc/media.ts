import { BrowserWindow, ipcMain } from 'electron';

interface MediaSessionRuntimeEntry {
  payload: unknown;
  hasTitle: boolean;
}

interface RegisterMediaIpcHandlersOptions {
  getMainWindow: () => BrowserWindow | null;
  sendMediaVirtualKey: (vkCode: number) => void;
  isWhitelisted: () => boolean;
  getPendingSourceSwitchId: () => string;
  setPendingSourceSwitchId: (id: string) => void;
  getPendingSourceSwitchEntry: () => unknown;
  clearPendingSourceSwitchEntry: () => void;
  getCurrentDeviceId: () => string;
  setCurrentDeviceId: (id: string) => void;
  getSmtcSessionRuntime: () => Map<string, MediaSessionRuntimeEntry> | null;
}

export function registerMediaIpcHandlers(options: RegisterMediaIpcHandlersOptions): void {
  ipcMain.handle('media:play-pause', () => {
    options.sendMediaVirtualKey(0xB3);
  });

  ipcMain.handle('media:next', () => {
    if (!options.isWhitelisted()) return;
    options.sendMediaVirtualKey(0xB0);
  });

  ipcMain.handle('media:prev', () => {
    if (!options.isWhitelisted()) return;
    options.sendMediaVirtualKey(0xB1);
  });

  ipcMain.handle('media:accept-source-switch', () => {
    const pendingSourceSwitchId = options.getPendingSourceSwitchId();
    const pendingSourceSwitchEntry = options.getPendingSourceSwitchEntry();
    if (pendingSourceSwitchId && pendingSourceSwitchEntry) {
      options.setCurrentDeviceId(pendingSourceSwitchId);
      options.setPendingSourceSwitchId('');
      options.clearPendingSourceSwitchEntry();
      const mainWindow = options.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        const entry = options.getSmtcSessionRuntime()?.get(options.getCurrentDeviceId());
        if (entry?.hasTitle) {
          mainWindow.webContents.send('nowplaying:info', entry.payload);
        }
      }
    }
  });

  ipcMain.handle('media:reject-source-switch', () => {
    options.setPendingSourceSwitchId('');
    options.clearPendingSourceSwitchEntry();
  });

  ipcMain.handle('media:seek', (_event, _positionMs: number) => {
    // SMTCMonitor 暂不支持 seek 操作
  });

  ipcMain.handle('media:get-volume', () => 0.5);

  ipcMain.handle('media:set-volume', (_event, _volume: number) => {
    // SMTCMonitor 暂不支持设置音量
  });
}
