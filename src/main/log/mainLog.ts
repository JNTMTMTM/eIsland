import { app } from 'electron';
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

export type MainLogLevel = 'info' | 'warn' | 'error';

export function ensureLogsDir(): string {
  const logDir = join(app.getPath('userData'), 'logs');
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

export function clearLogsCacheFiles(): { success: boolean; freedBytes: number; fileCount: number } {
  try {
    const logDir = ensureLogsDir();
    const files = readdirSync(logDir);
    let freedBytes = 0;
    let fileCount = 0;
    files.forEach((file) => {
      const filePath = join(logDir, file);
      try {
        const stat = statSync(filePath);
        if (stat.isFile()) {
          unlinkSync(filePath);
          freedBytes += stat.size;
          fileCount += 1;
        }
      } catch {
      }
    });
    return { success: true, freedBytes, fileCount };
  } catch {
    return { success: false, freedBytes: 0, fileCount: 0 };
  }
}

export function createSessionMainLogger(): (level: MainLogLevel, message: string) => void {
  const logDir = ensureLogsDir();
  const sessionStart = new Date();
  const pad2 = (n: number): string => String(n).padStart(2, '0');
  const sessionLogFileName = `${sessionStart.getFullYear()}-${pad2(sessionStart.getMonth() + 1)}-${pad2(sessionStart.getDate())}_${pad2(sessionStart.getHours())}-${pad2(sessionStart.getMinutes())}-${pad2(sessionStart.getSeconds())}_${sessionStart.getTime()}.log`;
  const sessionLogFile = join(logDir, sessionLogFileName);

  return (level: MainLogLevel, message: string): void => {
    try {
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      const time = now.toISOString().slice(11, 23);
      const line = `[${date} ${time}] [${level.toUpperCase()}] ${message}\n`;
      appendFileSync(sessionLogFile, line, 'utf-8');
    } catch {
    }
  };
}
