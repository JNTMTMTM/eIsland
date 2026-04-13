import { app, BrowserWindow, desktopCapturer, screen } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { is } from '@electron-toolkit/utils';

interface CreateCaptureWindowServiceOptions {
  getMainWindow: () => BrowserWindow | null;
}

interface CaptureWindowService {
  getCaptureWindow: () => BrowserWindow | null;
  closeCaptureWindow: () => void;
  startRegionScreenshot: () => Promise<void>;
}

export function createCaptureWindowService(options: CreateCaptureWindowServiceOptions): CaptureWindowService {
  let captureWindow: BrowserWindow | null = null;
  let isStartingCaptureWindow = false;

  function getCaptureHtmlPath(): string {
    if (is.dev) {
      const candidates = [
        join(process.cwd(), 'resources', 'capture.html'),
        join(app.getAppPath(), 'resources', 'capture.html'),
        join(__dirname, '../../../resources/capture.html'),
      ];

      return candidates.find((c) => existsSync(c)) ?? candidates[0];
    }
    return join(process.resourcesPath, 'capture.html');
  }

  function closeCaptureWindow(): void {
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.close();
    }
  }

  async function waitForMainWindowHidden(timeoutMs: number = 80): Promise<void> {
    const targetWindow = options.getMainWindow();
    if (!targetWindow || targetWindow.isDestroyed() || !targetWindow.isVisible()) {
      return;
    }

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (!targetWindow.isDestroyed()) {
          targetWindow.removeListener('hide', finish);
        }
        resolve();
      };

      targetWindow.once('hide', finish);
      targetWindow.hide();
      setTimeout(finish, timeoutMs);
    });
  }

  async function startRegionScreenshot(): Promise<void> {
    if (captureWindow || isStartingCaptureWindow) return;
    isStartingCaptureWindow = true;

    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: sw, height: sh } = primaryDisplay.size;
      const sf = primaryDisplay.scaleFactor || 1;

      await waitForMainWindowHidden();

      const sourcesPromise = desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: Math.round(sw * sf), height: Math.round(sh * sf) },
      });

      captureWindow = new BrowserWindow({
        width: sw,
        height: sh,
        x: primaryDisplay.bounds.x,
        y: primaryDisplay.bounds.y,
        show: false,
        fullscreen: true,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        movable: false,
        hasShadow: false,
        skipTaskbar: true,
        backgroundColor: '#00000000',
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
      });

      captureWindow.setAlwaysOnTop(true, 'screen-saver');

      captureWindow.on('closed', () => {
        captureWindow = null;
        const mainWindow = options.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
      });

      const pageLoadPromise = captureWindow.loadFile(getCaptureHtmlPath());

      const sources = await sourcesPromise;
      if (sources.length === 0) {
        closeCaptureWindow();
        const mainWindow = options.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
        return;
      }

      const screenshot = sources[0].thumbnail;
      const imageBytes = screenshot.toPNG();

      await pageLoadPromise;

      if (captureWindow && !captureWindow.isDestroyed()) {
        captureWindow.webContents.send('capture-image', {
          imageBytes,
          display: primaryDisplay,
          scaleFactor: sf,
        });
        captureWindow.show();
        captureWindow.focus();
      }
    } catch (err) {
      console.error('[Screenshot] start error:', err);
      if (captureWindow && !captureWindow.isDestroyed()) {
        captureWindow.destroy();
      }
      captureWindow = null;
      const mainWindow = options.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    } finally {
      isStartingCaptureWindow = false;
    }
  }

  return {
    getCaptureWindow: () => captureWindow,
    closeCaptureWindow,
    startRegionScreenshot,
  };
}
