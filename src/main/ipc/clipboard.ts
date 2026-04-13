import { ipcMain, shell } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';
import {
  normalizeClipboardUrlBlacklistDomain,
  normalizeClipboardUrlDetectMode,
  sanitizeClipboardUrlBlacklist,
  type ClipboardUrlDetectMode,
} from '../utils/clipboardUrl';

interface RegisterClipboardIpcHandlersOptions {
  storeDir: string;
  monitorEnabledStoreKey: string;
  detectModeStoreKey: string;
  blacklistStoreKey: string;
  defaultDetectMode: ClipboardUrlDetectMode;
  getMonitorEnabled: () => boolean;
  setMonitorEnabled: (enabled: boolean) => void;
  getDetectMode: () => ClipboardUrlDetectMode;
  setDetectMode: (mode: ClipboardUrlDetectMode) => void;
  getBlacklist: () => string[];
  setBlacklist: (list: string[]) => void;
  startWatcher: () => void;
  stopWatcher: () => void;
}

export function registerClipboardIpcHandlers(options: RegisterClipboardIpcHandlersOptions): void {
  ipcMain.handle('clipboard:url-blacklist:get', () => {
    return options.getBlacklist();
  });

  ipcMain.handle('clipboard:url-blacklist:set', (_event, list: string[]) => {
    try {
      const next = sanitizeClipboardUrlBlacklist(list);
      const filePath = join(options.storeDir, `${options.blacklistStoreKey}.json`);
      options.setBlacklist(next);
      writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[ClipboardUrlBlacklist] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('clipboard:url-blacklist:add-domain', (_event, domain: string) => {
    try {
      const normalized = normalizeClipboardUrlBlacklistDomain(domain);
      if (!normalized) return false;
      const current = options.getBlacklist();
      const alreadyExists = current.some((item) => item === normalized);
      const next = alreadyExists ? current : [...current, normalized];
      const filePath = join(options.storeDir, `${options.blacklistStoreKey}.json`);
      options.setBlacklist(next);
      writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[ClipboardUrlBlacklist] add domain error:', err);
      return false;
    }
  });

  ipcMain.handle('clipboard:url-detect-mode:get', () => {
    return options.getDetectMode();
  });

  ipcMain.handle('clipboard:url-detect-mode:set', (_event, mode: ClipboardUrlDetectMode) => {
    try {
      const filePath = join(options.storeDir, `${options.detectModeStoreKey}.json`);
      const normalized = normalizeClipboardUrlDetectMode(mode) || options.defaultDetectMode;
      options.setDetectMode(normalized);
      writeFileSync(filePath, JSON.stringify(normalized, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[ClipboardUrlDetectMode] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('clipboard:url-monitor:get', () => {
    return options.getMonitorEnabled();
  });

  ipcMain.handle('clipboard:url-monitor:set', (_event, enabled: boolean) => {
    try {
      const next = Boolean(enabled);
      const filePath = join(options.storeDir, `${options.monitorEnabledStoreKey}.json`);
      options.setMonitorEnabled(next);
      writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf-8');
      if (next) {
        options.startWatcher();
      } else {
        options.stopWatcher();
      }
      return true;
    } catch (err) {
      console.error('[ClipboardUrlMonitor] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('clipboard:open-url', (_event, url: string) => {
    try {
      shell.openExternal(url);
      return true;
    } catch {
      return false;
    }
  });
}
