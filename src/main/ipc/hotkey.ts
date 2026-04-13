import { ipcMain } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';

interface RegisterHotkeyIpcHandlersOptions {
  storeDir: string;
  hideHotkeyStoreKey: string;
  quitHotkeyStoreKey: string;
  nextSongHotkeyStoreKey: string;
  playPauseSongHotkeyStoreKey: string;
  resetPositionHotkeyStoreKey: string;
  getCurrentHideHotkey: () => string;
  getCurrentQuitHotkey: () => string;
  getCurrentScreenshotHotkey: () => string;
  getCurrentNextSongHotkey: () => string;
  getCurrentPlayPauseSongHotkey: () => string;
  getCurrentResetPositionHotkey: () => string;
  readHideHotkeyConfig: () => string;
  readQuitHotkeyConfig: () => string;
  readScreenshotHotkeyConfig: () => string;
  readNextSongHotkeyConfig: () => string;
  readPlayPauseSongHotkeyConfig: () => string;
  readResetPositionHotkeyConfig: () => string;
  registerHideHotkey: (accelerator: string) => boolean;
  registerQuitHotkey: (accelerator: string) => boolean;
  registerNextSongHotkey: (accelerator: string) => boolean;
  registerPlayPauseSongHotkey: (accelerator: string) => boolean;
  registerResetPositionHotkey: (accelerator: string) => boolean;
  suspendIslandHotkeys: () => void;
  resumeIslandHotkeys: () => void;
}

function currentOrStored(current: () => string, stored: () => string): string {
  return current() || stored();
}

function persistHotkey(storeDir: string, key: string, accelerator: string, label: string): void {
  const filePath = join(storeDir, `${key}.json`);
  try {
    writeFileSync(filePath, JSON.stringify(accelerator, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[${label}] persist error:`, err);
  }
}

export function registerHotkeyIpcHandlers(options: RegisterHotkeyIpcHandlersOptions): void {
  ipcMain.handle('hotkey:get', () => {
    return currentOrStored(options.getCurrentHideHotkey, options.readHideHotkeyConfig);
  });

  ipcMain.handle('hotkey:set', (_event, accelerator: string) => {
    const currentQuit = currentOrStored(options.getCurrentQuitHotkey, options.readQuitHotkeyConfig);
    const currentSS = currentOrStored(options.getCurrentScreenshotHotkey, options.readScreenshotHotkeyConfig);
    const currentNextSong = currentOrStored(options.getCurrentNextSongHotkey, options.readNextSongHotkeyConfig);
    const currentPlayPauseSong = currentOrStored(options.getCurrentPlayPauseSongHotkey, options.readPlayPauseSongHotkeyConfig);
    const currentResetPos = currentOrStored(options.getCurrentResetPositionHotkey, options.readResetPositionHotkeyConfig);

    if (accelerator && ((currentQuit && accelerator === currentQuit)
      || (currentSS && accelerator === currentSS)
      || (currentNextSong && accelerator === currentNextSong)
      || (currentPlayPauseSong && accelerator === currentPlayPauseSong)
      || (currentResetPos && accelerator === currentResetPos))) {
      return false;
    }

    const success = options.registerHideHotkey(accelerator);
    if (success) {
      persistHotkey(options.storeDir, options.hideHotkeyStoreKey, accelerator, 'Hotkey');
    }
    return success;
  });

  ipcMain.handle('next-song-hotkey:get', () => {
    return currentOrStored(options.getCurrentNextSongHotkey, options.readNextSongHotkeyConfig);
  });

  ipcMain.handle('next-song-hotkey:set', (_event, accelerator: string) => {
    const currentHide = currentOrStored(options.getCurrentHideHotkey, options.readHideHotkeyConfig);
    const currentQuit = currentOrStored(options.getCurrentQuitHotkey, options.readQuitHotkeyConfig);
    const currentSS = currentOrStored(options.getCurrentScreenshotHotkey, options.readScreenshotHotkeyConfig);
    const currentResetPos = currentOrStored(options.getCurrentResetPositionHotkey, options.readResetPositionHotkeyConfig);
    const currentPlayPauseSong = currentOrStored(options.getCurrentPlayPauseSongHotkey, options.readPlayPauseSongHotkeyConfig);

    if (accelerator && ((currentHide && accelerator === currentHide)
      || (currentQuit && accelerator === currentQuit)
      || (currentSS && accelerator === currentSS)
      || (currentResetPos && accelerator === currentResetPos)
      || (currentPlayPauseSong && accelerator === currentPlayPauseSong))) {
      return false;
    }

    const success = options.registerNextSongHotkey(accelerator);
    if (success) {
      persistHotkey(options.storeDir, options.nextSongHotkeyStoreKey, accelerator, 'NextSongHotkey');
    }
    return success;
  });

  ipcMain.handle('play-pause-song-hotkey:get', () => {
    return currentOrStored(options.getCurrentPlayPauseSongHotkey, options.readPlayPauseSongHotkeyConfig);
  });

  ipcMain.handle('play-pause-song-hotkey:set', (_event, accelerator: string) => {
    const currentHide = currentOrStored(options.getCurrentHideHotkey, options.readHideHotkeyConfig);
    const currentQuit = currentOrStored(options.getCurrentQuitHotkey, options.readQuitHotkeyConfig);
    const currentSS = currentOrStored(options.getCurrentScreenshotHotkey, options.readScreenshotHotkeyConfig);
    const currentResetPos = currentOrStored(options.getCurrentResetPositionHotkey, options.readResetPositionHotkeyConfig);
    const currentNextSong = currentOrStored(options.getCurrentNextSongHotkey, options.readNextSongHotkeyConfig);

    if (accelerator && ((currentHide && accelerator === currentHide)
      || (currentQuit && accelerator === currentQuit)
      || (currentSS && accelerator === currentSS)
      || (currentResetPos && accelerator === currentResetPos)
      || (currentNextSong && accelerator === currentNextSong))) {
      return false;
    }

    const success = options.registerPlayPauseSongHotkey(accelerator);
    if (success) {
      persistHotkey(options.storeDir, options.playPauseSongHotkeyStoreKey, accelerator, 'PlayPauseSongHotkey');
    }
    return success;
  });

  ipcMain.handle('reset-position-hotkey:get', () => {
    return currentOrStored(options.getCurrentResetPositionHotkey, options.readResetPositionHotkeyConfig);
  });

  ipcMain.handle('reset-position-hotkey:set', (_event, accelerator: string) => {
    const currentHide = currentOrStored(options.getCurrentHideHotkey, options.readHideHotkeyConfig);
    const currentQuit = currentOrStored(options.getCurrentQuitHotkey, options.readQuitHotkeyConfig);
    const currentSS = currentOrStored(options.getCurrentScreenshotHotkey, options.readScreenshotHotkeyConfig);
    const currentNextSong = currentOrStored(options.getCurrentNextSongHotkey, options.readNextSongHotkeyConfig);
    const currentPlayPauseSong = currentOrStored(options.getCurrentPlayPauseSongHotkey, options.readPlayPauseSongHotkeyConfig);

    if (accelerator && ((currentHide && accelerator === currentHide)
      || (currentQuit && accelerator === currentQuit)
      || (currentSS && accelerator === currentSS)
      || (currentNextSong && accelerator === currentNextSong)
      || (currentPlayPauseSong && accelerator === currentPlayPauseSong))) {
      return false;
    }

    const success = options.registerResetPositionHotkey(accelerator);
    if (success) {
      persistHotkey(options.storeDir, options.resetPositionHotkeyStoreKey, accelerator, 'ResetPositionHotkey');
    }
    return success;
  });

  ipcMain.handle('quit-hotkey:get', () => {
    return currentOrStored(options.getCurrentQuitHotkey, options.readQuitHotkeyConfig);
  });

  ipcMain.handle('quit-hotkey:set', (_event, accelerator: string) => {
    const currentHide = currentOrStored(options.getCurrentHideHotkey, options.readHideHotkeyConfig);
    const currentSS = currentOrStored(options.getCurrentScreenshotHotkey, options.readScreenshotHotkeyConfig);
    const currentNextSong = currentOrStored(options.getCurrentNextSongHotkey, options.readNextSongHotkeyConfig);
    const currentPlayPauseSong = currentOrStored(options.getCurrentPlayPauseSongHotkey, options.readPlayPauseSongHotkeyConfig);
    const currentResetPos = currentOrStored(options.getCurrentResetPositionHotkey, options.readResetPositionHotkeyConfig);

    if (accelerator && ((currentHide && accelerator === currentHide)
      || (currentSS && accelerator === currentSS)
      || (currentNextSong && accelerator === currentNextSong)
      || (currentPlayPauseSong && accelerator === currentPlayPauseSong)
      || (currentResetPos && accelerator === currentResetPos))) {
      return false;
    }

    const success = options.registerQuitHotkey(accelerator);
    if (success) {
      persistHotkey(options.storeDir, options.quitHotkeyStoreKey, accelerator, 'QuitHotkey');
    }
    return success;
  });

  ipcMain.handle('hotkey:suspend', () => {
    options.suspendIslandHotkeys();
    return true;
  });

  ipcMain.handle('hotkey:resume', () => {
    options.resumeIslandHotkeys();
    return true;
  });
}
