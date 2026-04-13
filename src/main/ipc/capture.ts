import { app, clipboard, dialog, ipcMain, nativeImage, type BrowserWindow } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';

interface RegisterCaptureIpcHandlersOptions {
  getCaptureWindow: () => BrowserWindow | null;
  closeCaptureWindow: () => void;
}

export function registerCaptureIpcHandlers(options: RegisterCaptureIpcHandlersOptions): void {
  ipcMain.on('capture-complete', (_event, { dataURL }: { dataURL: string }) => {
    try {
      const image = nativeImage.createFromDataURL(dataURL);
      clipboard.writeImage(image);
    } catch (err) {
      console.error('[Screenshot] copy error:', err);
    }
    options.closeCaptureWindow();
  });

  ipcMain.on('capture-save', async (_event, { dataURL }: { dataURL: string }) => {
    const captureWindow = options.getCaptureWindow();
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.hide();
    }
    try {
      const image = nativeImage.createFromDataURL(dataURL);
      const pngBuffer = image.toPNG();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const result = await dialog.showSaveDialog({
        title: '保存截图',
        defaultPath: join(app.getPath('pictures'), `eIsland_screenshot_${timestamp}.png`),
        filters: [{ name: 'PNG', extensions: ['png'] }],
      });
      if (!result.canceled && result.filePath) {
        writeFileSync(result.filePath, pngBuffer);
      }
    } catch (err) {
      console.error('[Screenshot] save error:', err);
    }
    options.closeCaptureWindow();
  });

  ipcMain.on('capture-cancel', () => {
    options.closeCaptureWindow();
  });
}
