import { app, ipcMain } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface RegisterIslandIpcHandlersOptions {
  storeDir: string;
  islandOpacityStoreKey: string;
  expandMouseleaveIdleStoreKey: string;
  maxExpandMouseleaveIdleStoreKey: string;
  autostartModeStoreKey: string;
  navOrderStoreKey: string;
}

export function registerIslandIpcHandlers(options: RegisterIslandIpcHandlersOptions): void {
  ipcMain.handle('island:opacity:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.islandOpacityStoreKey}.json`);
      if (!existsSync(filePath)) return 100;
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      const val = typeof data === 'number' ? data : 100;
      return Math.max(10, Math.min(100, Math.round(val)));
    } catch {
      return 100;
    }
  });

  ipcMain.handle('island:opacity:set', (_event, opacity: number) => {
    try {
      const safe = Math.max(10, Math.min(100, Math.round(opacity)));
      const filePath = join(options.storeDir, `${options.islandOpacityStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(safe, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[Opacity] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('island:expand-mouseleave-idle:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.expandMouseleaveIdleStoreKey}.json`);
      if (!existsSync(filePath)) return false;
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return typeof data === 'boolean' ? data : false;
    } catch {
      return false;
    }
  });

  ipcMain.handle('island:expand-mouseleave-idle:set', (_event, enabled: boolean) => {
    try {
      const filePath = join(options.storeDir, `${options.expandMouseleaveIdleStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(enabled, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[ExpandMouseleaveIdle] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('island:maxexpand-mouseleave-idle:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.maxExpandMouseleaveIdleStoreKey}.json`);
      if (!existsSync(filePath)) return false;
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return typeof data === 'boolean' ? data : false;
    } catch {
      return false;
    }
  });

  ipcMain.handle('island:maxexpand-mouseleave-idle:set', (_event, enabled: boolean) => {
    try {
      const filePath = join(options.storeDir, `${options.maxExpandMouseleaveIdleStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(enabled, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[MaxExpandMouseleaveIdle] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('island:autostart:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.autostartModeStoreKey}.json`);
      if (!existsSync(filePath)) return 'disabled';
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return ['disabled', 'enabled', 'high-priority'].includes(data) ? data : 'disabled';
    } catch {
      return 'disabled';
    }
  });

  ipcMain.handle('island:autostart:set', (_event, mode: string) => {
    try {
      const safeMode = ['disabled', 'enabled', 'high-priority'].includes(mode) ? mode : 'disabled';
      const filePath = join(options.storeDir, `${options.autostartModeStoreKey}.json`);
      writeFileSync(filePath, JSON.stringify(safeMode, null, 2), 'utf-8');

      if (safeMode === 'disabled') {
        app.setLoginItemSettings({ openAtLogin: false });
      } else {
        app.setLoginItemSettings({
          openAtLogin: true,
          args: safeMode === 'high-priority' ? ['--high-priority'] : [],
        });
      }
      return true;
    } catch (err) {
      console.error('[Autostart] persist error:', err);
      return false;
    }
  });

  ipcMain.handle('island:nav-order:get', () => {
    try {
      const filePath = join(options.storeDir, `${options.navOrderStoreKey}.json`);
      if (!existsSync(filePath)) return { visibleOrder: [], hiddenOrder: [] };
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);

      if (Array.isArray(data)) {
        return {
          visibleOrder: data.filter((v: unknown) => typeof v === 'string'),
          hiddenOrder: [],
        };
      }

      const visibleRaw = (data as Record<string, unknown>)?.visibleOrder;
      const hiddenRaw = (data as Record<string, unknown>)?.hiddenOrder;
      return {
        visibleOrder: Array.isArray(visibleRaw) ? visibleRaw.filter((v: unknown) => typeof v === 'string') : [],
        hiddenOrder: Array.isArray(hiddenRaw) ? hiddenRaw.filter((v: unknown) => typeof v === 'string') : [],
      };
    } catch {
      return { visibleOrder: [], hiddenOrder: [] };
    }
  });

  ipcMain.handle('island:nav-order:set', (_event, payload: { visibleOrder?: string[]; hiddenOrder?: string[] }) => {
    try {
      const filePath = join(options.storeDir, `${options.navOrderStoreKey}.json`);
      const visibleOrder = Array.isArray(payload?.visibleOrder) ? payload.visibleOrder.filter((v: unknown) => typeof v === 'string') : [];
      const hiddenOrder = Array.isArray(payload?.hiddenOrder) ? payload.hiddenOrder.filter((v: unknown) => typeof v === 'string') : [];
      const safe = { visibleOrder, hiddenOrder };
      writeFileSync(filePath, JSON.stringify(safe, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[NavOrder] persist error:', err);
      return false;
    }
  });
}
