import { BrowserWindow, ipcMain, screen } from 'electron';

interface WindowIpcSizeOptions {
  expandedWidth: number;
  expandedHeight: number;
  notificationWidth: number;
  notificationHeight: number;
  lyricsWidth: number;
  lyricsHeight: number;
  expandedFullWidth: number;
  expandedFullHeight: number;
  settingsWidth: number;
  settingsHeight: number;
  islandWidth: number;
  islandHeight: number;
}

interface RegisterWindowIpcHandlersOptions {
  getMainWindow: () => BrowserWindow | null;
  getInitialCenterX: () => number;
  setHiddenByAutoHideProcess: (hidden: boolean) => void;
  getIslandPositionOffset: () => { x: number; y: number };
  sanitizeIslandPositionOffset: (offset: { x?: number; y?: number }) => { x: number; y: number };
  applyIslandPositionOffset: (offset: { x: number; y: number }) => void;
  writeIslandPositionOffsetConfig: (offset: { x: number; y: number }) => boolean;
  sizes: WindowIpcSizeOptions;
}

export function registerWindowIpcHandlers(options: RegisterWindowIpcHandlersOptions): void {
  const withWindow = (fn: (win: BrowserWindow) => void): void => {
    const win = options.getMainWindow();
    if (!win) return;
    fn(win);
  };

  ipcMain.on('window:enable-mouse-passthrough', () => {
    withWindow((win) => {
      win.setIgnoreMouseEvents(true, { forward: true });
    });
  });

  ipcMain.on('window:disable-mouse-passthrough', () => {
    withWindow((win) => {
      win.setIgnoreMouseEvents(false);
    });
  });

  ipcMain.on('window:expand', () => {
    withWindow((win) => {
      win.setBounds({
        x: Math.round(options.getInitialCenterX() - options.sizes.expandedWidth / 2),
        y: win.getBounds().y,
        width: options.sizes.expandedWidth,
        height: options.sizes.expandedHeight,
      });
    });
  });

  ipcMain.on('window:expand-notification', () => {
    withWindow((win) => {
      win.setBounds({
        x: Math.round(options.getInitialCenterX() - options.sizes.notificationWidth / 2),
        y: win.getBounds().y,
        width: options.sizes.notificationWidth,
        height: options.sizes.notificationHeight,
      });
    });
  });

  ipcMain.on('window:expand-lyrics', () => {
    withWindow((win) => {
      win.setBounds({
        x: Math.round(options.getInitialCenterX() - options.sizes.lyricsWidth / 2),
        y: win.getBounds().y,
        width: options.sizes.lyricsWidth,
        height: options.sizes.lyricsHeight,
      });
    });
  });

  ipcMain.on('window:expand-full', () => {
    withWindow((win) => {
      win.setBounds({
        x: Math.round(options.getInitialCenterX() - options.sizes.expandedFullWidth / 2),
        y: win.getBounds().y,
        width: options.sizes.expandedFullWidth,
        height: options.sizes.expandedFullHeight,
      });
    });
  });

  ipcMain.on('window:expand-settings', () => {
    withWindow((win) => {
      win.setBounds({
        x: Math.round(options.getInitialCenterX() - options.sizes.settingsWidth / 2),
        y: win.getBounds().y,
        width: options.sizes.settingsWidth,
        height: options.sizes.settingsHeight,
      });
    });
  });

  ipcMain.on('window:collapse', () => {
    withWindow((win) => {
      win.setBounds({
        x: Math.round(options.getInitialCenterX() - options.sizes.islandWidth / 2),
        y: win.getBounds().y,
        width: options.sizes.islandWidth,
        height: options.sizes.islandHeight,
      });
    });
  });

  ipcMain.on('window:hide', () => {
    withWindow((win) => {
      options.setHiddenByAutoHideProcess(false);
      win.hide();
    });
  });

  ipcMain.handle('window:get-mouse-position', () => {
    const point = screen.getCursorScreenPoint();
    return { x: point.x, y: point.y };
  });

  ipcMain.handle('window:get-bounds', () => {
    const win = options.getMainWindow();
    if (win) {
      return win.getBounds();
    }
    return null;
  });

  ipcMain.handle('window:island-position:get', () => {
    return { ...options.getIslandPositionOffset() };
  });

  ipcMain.handle('window:island-position:set', (_event, offset: { x?: number; y?: number }) => {
    const nextOffset = options.sanitizeIslandPositionOffset(offset);
    options.applyIslandPositionOffset(nextOffset);
    return options.writeIslandPositionOffsetConfig(nextOffset);
  });
}
