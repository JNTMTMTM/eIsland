import { BrowserWindow, screen, shell } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';

interface WindowSizeOptions {
  islandWidth: number;
  islandHeight: number;
}

interface CreateMainWindowServiceOptions {
  getMainWindow: () => BrowserWindow | null;
  setMainWindow: (window: BrowserWindow | null) => void;
  getIslandPositionOffset: () => { x: number; y: number };
  setIslandPositionOffset: (offset: { x: number; y: number }) => void;
  sanitizeIslandPositionOffset: (offset: { x?: number; y?: number }) => { x: number; y: number };
  sizes: WindowSizeOptions;
}

interface MainWindowService {
  createWindow: () => void;
  getInitialCenterX: () => number;
  applyIslandPositionOffset: (offset: { x: number; y: number }) => void;
}

export function createMainWindowService(options: CreateMainWindowServiceOptions): MainWindowService {
  let initialCenterX = 0;

  function getInitialIslandBounds(): Electron.Rectangle {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x: workX, y: workY, width: workWidth, height: workHeight } = primaryDisplay.workArea;
    const centeredX = Math.round(workX + (workWidth - options.sizes.islandWidth) / 2);
    const minX = workX;
    const maxX = workX + Math.max(0, workWidth - options.sizes.islandWidth);
    const minY = workY;
    const maxY = workY + Math.max(0, workHeight - options.sizes.islandHeight);
    const offset = options.getIslandPositionOffset();
    const x = Math.max(minX, Math.min(maxX, centeredX + offset.x));
    const y = Math.max(minY, Math.min(maxY, Math.round(workY + offset.y)));
    return {
      x,
      y,
      width: options.sizes.islandWidth,
      height: options.sizes.islandHeight,
    };
  }

  function applyIslandPositionOffset(offset: { x: number; y: number }): void {
    const normalized = options.sanitizeIslandPositionOffset(offset);
    options.setIslandPositionOffset(normalized);

    const nextBaseBounds = getInitialIslandBounds();
    initialCenterX = nextBaseBounds.x + options.sizes.islandWidth / 2;

    const mainWindow = options.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:island-position:changed', {
        ...normalized,
      });
    }

    if (!mainWindow || mainWindow.isDestroyed()) return;
    const bounds = mainWindow.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x: workX, y: workY, width: workWidth, height: workHeight } = primaryDisplay.workArea;
    const targetX = Math.round(initialCenterX - bounds.width / 2);
    const minX = workX;
    const maxX = workX + Math.max(0, workWidth - bounds.width);
    const minY = workY;
    const maxY = workY + Math.max(0, workHeight - bounds.height);

    mainWindow.setBounds({
      x: Math.max(minX, Math.min(maxX, targetX)),
      y: Math.max(minY, Math.min(maxY, nextBaseBounds.y)),
      width: bounds.width,
      height: bounds.height,
    });
  }

  function createWindow(): void {
    const initialBounds = getInitialIslandBounds();
    initialCenterX = initialBounds.x + options.sizes.islandWidth / 2;

    const mainWindow = new BrowserWindow({
      width: options.sizes.islandWidth,
      height: options.sizes.islandHeight,
      x: initialBounds.x,
      y: initialBounds.y,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      icon: is.dev
        ? join(__dirname, '../../resources/icon/eisland_256x256.ico')
        : join(process.resourcesPath, 'icon/eisland_256x256.ico'),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false,
        enableWebSQL: false,
        v8CacheOptions: 'bypassHeatCheck',
      },
    });

    options.setMainWindow(mainWindow);

    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setBounds(initialBounds, false);

    mainWindow.on('ready-to-show', () => {
      mainWindow.setBounds(initialBounds, false);
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    });

    mainWindow.on('blur', () => {
      mainWindow.setBackgroundColor('#00000000');
      mainWindow.webContents.executeJavaScript(`
        document.body.style.background = 'transparent';
        document.documentElement.style.background = 'transparent';
      `);
    });

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
  }

  return {
    createWindow,
    getInitialCenterX: () => initialCenterX,
    applyIslandPositionOffset,
  };
}
