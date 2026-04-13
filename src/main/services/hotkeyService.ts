import { app, BrowserWindow, globalShortcut } from 'electron';

interface CreateHotkeyServiceOptions {
  getMainWindow: () => BrowserWindow | null;
  setHiddenByAutoHideProcess: (hidden: boolean) => void;
  readHideHotkeyConfig: () => string;
  readQuitHotkeyConfig: () => string;
  readScreenshotHotkeyConfig: () => string;
  readNextSongHotkeyConfig: () => string;
  readPlayPauseSongHotkeyConfig: () => string;
  readResetPositionHotkeyConfig: () => string;
  onScreenshotHotkey: () => void;
  onNextSongHotkey: () => void;
  onPlayPauseSongHotkey: () => void;
  onResetPositionHotkey: () => void;
}

interface HotkeyService {
  getCurrentHideHotkey: () => string;
  getCurrentQuitHotkey: () => string;
  getCurrentScreenshotHotkey: () => string;
  getCurrentNextSongHotkey: () => string;
  getCurrentPlayPauseSongHotkey: () => string;
  getCurrentResetPositionHotkey: () => string;
  registerHideHotkey: (accelerator: string) => boolean;
  registerQuitHotkey: (accelerator: string) => boolean;
  registerScreenshotHotkey: (accelerator: string) => boolean;
  registerNextSongHotkey: (accelerator: string) => boolean;
  registerPlayPauseSongHotkey: (accelerator: string) => boolean;
  registerResetPositionHotkey: (accelerator: string) => boolean;
  suspendIslandHotkeys: () => void;
  resumeIslandHotkeys: () => void;
}

export function createHotkeyService(options: CreateHotkeyServiceOptions): HotkeyService {
  let currentHideHotkey = '';
  let currentQuitHotkey = '';
  let currentScreenshotHotkey = '';
  let currentNextSongHotkey = '';
  let currentPlayPauseSongHotkey = '';
  let currentResetPositionHotkey = '';

  function registerHideHotkey(accelerator: string): boolean {
    const previousHotkey = currentHideHotkey || options.readHideHotkeyConfig();
    if (previousHotkey) {
      try {
        globalShortcut.unregister(previousHotkey);
      } catch {
        // ignore
      }
    }

    currentHideHotkey = '';
    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        const mainWindow = options.getMainWindow();
        if (!mainWindow || mainWindow.isDestroyed()) return;

        options.setHiddenByAutoHideProcess(false);
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
      });

      if (success) {
        currentHideHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[Hotkey] register error:', err);
      return false;
    }
  }

  function registerQuitHotkey(accelerator: string): boolean {
    if (currentQuitHotkey) {
      try {
        globalShortcut.unregister(currentQuitHotkey);
      } catch {
        // ignore
      }
      currentQuitHotkey = '';
    }

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        app.quit();
      });

      if (success) {
        currentQuitHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[QuitHotkey] register error:', err);
      return false;
    }
  }

  function registerScreenshotHotkey(accelerator: string): boolean {
    if (currentScreenshotHotkey) {
      try {
        globalShortcut.unregister(currentScreenshotHotkey);
      } catch {
        // ignore
      }
      currentScreenshotHotkey = '';
    }

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        options.onScreenshotHotkey();
      });

      if (success) {
        currentScreenshotHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[ScreenshotHotkey] register error:', err);
      return false;
    }
  }

  function registerNextSongHotkey(accelerator: string): boolean {
    if (currentNextSongHotkey) {
      try {
        globalShortcut.unregister(currentNextSongHotkey);
      } catch {
        // ignore
      }
      currentNextSongHotkey = '';
    }

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        options.onNextSongHotkey();
      });

      if (success) {
        currentNextSongHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[NextSongHotkey] register error:', err);
      return false;
    }
  }

  function registerPlayPauseSongHotkey(accelerator: string): boolean {
    if (currentPlayPauseSongHotkey) {
      try {
        globalShortcut.unregister(currentPlayPauseSongHotkey);
      } catch {
        // ignore
      }
      currentPlayPauseSongHotkey = '';
    }

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        options.onPlayPauseSongHotkey();
      });

      if (success) {
        currentPlayPauseSongHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[PlayPauseSongHotkey] register error:', err);
      return false;
    }
  }

  function registerResetPositionHotkey(accelerator: string): boolean {
    if (currentResetPositionHotkey) {
      try {
        globalShortcut.unregister(currentResetPositionHotkey);
      } catch {
        // ignore
      }
      currentResetPositionHotkey = '';
    }

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        options.onResetPositionHotkey();
      });

      if (success) {
        currentResetPositionHotkey = accelerator;
      }
      return success;
    } catch (err) {
      console.error('[ResetPositionHotkey] register error:', err);
      return false;
    }
  }

  function suspendIslandHotkeys(): void {
    const hideHotkey = currentHideHotkey || options.readHideHotkeyConfig();
    const quitHotkey = currentQuitHotkey || options.readQuitHotkeyConfig();
    const screenshotHotkey = currentScreenshotHotkey || options.readScreenshotHotkeyConfig();
    const nextSongHotkey = currentNextSongHotkey || options.readNextSongHotkeyConfig();
    const playPauseSongHotkey =
      currentPlayPauseSongHotkey || options.readPlayPauseSongHotkeyConfig();
    const resetPositionHotkey =
      currentResetPositionHotkey || options.readResetPositionHotkeyConfig();

    [
      hideHotkey,
      quitHotkey,
      screenshotHotkey,
      nextSongHotkey,
      playPauseSongHotkey,
      resetPositionHotkey,
    ].forEach((hotkey) => {
      if (!hotkey) return;
      try {
        globalShortcut.unregister(hotkey);
      } catch {
        // ignore
      }
    });
  }

  function resumeIslandHotkeys(): void {
    const hideHotkey = currentHideHotkey || options.readHideHotkeyConfig();
    const quitHotkey = currentQuitHotkey || options.readQuitHotkeyConfig();
    const screenshotHotkey = currentScreenshotHotkey || options.readScreenshotHotkeyConfig();
    const nextSongHotkey = currentNextSongHotkey || options.readNextSongHotkeyConfig();
    const playPauseSongHotkey =
      currentPlayPauseSongHotkey || options.readPlayPauseSongHotkeyConfig();
    const resetPositionHotkey =
      currentResetPositionHotkey || options.readResetPositionHotkeyConfig();

    if (hideHotkey) registerHideHotkey(hideHotkey);
    if (quitHotkey) registerQuitHotkey(quitHotkey);
    if (screenshotHotkey) registerScreenshotHotkey(screenshotHotkey);
    if (nextSongHotkey) registerNextSongHotkey(nextSongHotkey);
    if (playPauseSongHotkey) registerPlayPauseSongHotkey(playPauseSongHotkey);
    if (resetPositionHotkey) registerResetPositionHotkey(resetPositionHotkey);
  }

  return {
    getCurrentHideHotkey: () => currentHideHotkey,
    getCurrentQuitHotkey: () => currentQuitHotkey,
    getCurrentScreenshotHotkey: () => currentScreenshotHotkey,
    getCurrentNextSongHotkey: () => currentNextSongHotkey,
    getCurrentPlayPauseSongHotkey: () => currentPlayPauseSongHotkey,
    getCurrentResetPositionHotkey: () => currentResetPositionHotkey,
    registerHideHotkey,
    registerQuitHotkey,
    registerScreenshotHotkey,
    registerNextSongHotkey,
    registerPlayPauseSongHotkey,
    registerResetPositionHotkey,
    suspendIslandHotkeys,
    resumeIslandHotkeys,
  };
}
