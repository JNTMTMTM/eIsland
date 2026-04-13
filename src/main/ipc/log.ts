import { ipcMain } from 'electron';

type MainLogWriter = (level: 'info' | 'warn' | 'error', message: string) => void;

interface RegisterLogIpcHandlersOptions {
  writeMainLog: MainLogWriter;
}

export function registerLogIpcHandlers(options: RegisterLogIpcHandlersOptions): void {
  ipcMain.on('log:write', (_event, level: string, message: string) => {
    options.writeMainLog(level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'info', message);
  });
}
