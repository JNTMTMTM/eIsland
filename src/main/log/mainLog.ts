/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file mainLog.ts
 * @description 主进程日志模块
 * @description 提供日志目录管理、日志清理和会话日志记录功能
 * @author 鸡哥
 */

import { app } from 'electron';
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

export type MainLogLevel = 'info' | 'warn' | 'error';

/**
 * 确保日志目录存在
 * @description 创建日志目录（如不存在），返回目录路径
 * @returns 日志目录绝对路径
 */
export function ensureLogsDir(): string {
  const logDir = join(app.getPath('userData'), 'logs');
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

/**
 * 清理日志缓存文件
 * @description 删除日志目录下的所有文件，释放磁盘空间
 * @returns 清理结果，包含是否成功、释放字节数和删除文件数
 */
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

/**
 * 创建会话日志记录器
 * @description 创建一个新的会话日志文件，返回日志写入函数
 * @returns 日志写入函数，接受日志级别和消息
 */
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
