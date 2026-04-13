import { ipcMain } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';

interface RegisterScreenshotHotkeyIpcHandlersOptions {
  storeDir: string;
  screenshotHotkeyStoreKey: string;
  getCurrentScreenshotHotkey: () => string;
  readScreenshotHotkeyConfig: () => string;
  getReservedHotkeys: () => string[];
  registerScreenshotHotkey: (accelerator: string) => boolean;
}

export function registerScreenshotHotkeyIpcHandlers(options: RegisterScreenshotHotkeyIpcHandlersOptions): void {
  ipcMain.handle('screenshot-hotkey:get', () => {
    return options.getCurrentScreenshotHotkey() || options.readScreenshotHotkeyConfig();
  });

  ipcMain.handle('screenshot-hotkey:set', (_event, accelerator: string) => {
    const reserved = options.getReservedHotkeys();
    if (accelerator && reserved.some((key) => key && key === accelerator)) {
      return false;
    }

    const success = options.registerScreenshotHotkey(accelerator);
    if (success) {
      const filePath = join(options.storeDir, `${options.screenshotHotkeyStoreKey}.json`);
      try {
        writeFileSync(filePath, JSON.stringify(accelerator, null, 2), 'utf-8');
      } catch (err) {
        console.error('[ScreenshotHotkey] persist error:', err);
      }
    }
    return success;
  });
}
