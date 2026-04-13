import { app, BrowserWindow } from 'electron';

interface RegisterAppLifecycleHandlersOptions {
  getMainWindow: () => BrowserWindow | null;
  onWillQuit: () => void;
  onWindowAllClosed: () => void;
}

export function registerAppLifecycleHandlers(options: RegisterAppLifecycleHandlersOptions): void {
  app.on('second-instance', () => {
    const mainWindow = options.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.on('will-quit', () => {
    options.onWillQuit();
  });

  app.on('window-all-closed', () => {
    options.onWindowAllClosed();
  });
}
