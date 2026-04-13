import { ipcMain } from 'electron';
import { exec } from 'child_process';

interface RunningProcessInfo {
  name: string;
  iconDataUrl: string | null;
}

interface RegisterSystemIpcHandlersOptions {
  queryRunningNonSystemProcessNames: () => Promise<string[]>;
  queryRunningNonSystemProcessesWithIcons: () => Promise<RunningProcessInfo[]>;
}

export function registerSystemIpcHandlers(options: RegisterSystemIpcHandlersOptions): void {
  ipcMain.on('system:open-task-manager', () => {
    try {
      if (process.platform === 'win32') {
        exec('taskmgr');
      }
    } catch (err) {
      console.error('[System] open-task-manager error:', err);
    }
  });

  ipcMain.handle('system:running-processes:get', async () => {
    if (process.platform !== 'win32') return [];
    return options.queryRunningNonSystemProcessNames();
  });

  ipcMain.handle('system:running-processes:with-icons:get', async () => {
    if (process.platform !== 'win32') return [];
    return options.queryRunningNonSystemProcessesWithIcons();
  });
}
