import { ipcMain } from 'electron';
import { exec } from 'child_process';

export function registerSystemIpcHandlers(): void {
  ipcMain.on('system:open-task-manager', () => {
    try {
      if (process.platform === 'win32') {
        exec('taskmgr');
      }
    } catch (err) {
      console.error('[System] open-task-manager error:', err);
    }
  });
}
