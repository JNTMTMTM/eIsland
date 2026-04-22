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
 * @file index.ts
 * @description 日志工具，同时输出到控制台和文件
 * @author 鸡哥
 */

function formatArg(a: unknown): string {
  if (a instanceof Error) return `${a.message}\n${a.stack ?? ''}`;
  if (typeof a === 'string') return a;
  try { return JSON.stringify(a); } catch { return String(a); }
}

function write(level: string, ...args: unknown[]): void {
  const message = args.map(formatArg).join(' ');
  try {
    window.api.logWrite(level, message);
  } catch { /* preload 未就绪时静默忽略 */ }
}

export const logger = {
  info(...args: unknown[]): void {
    console.log(...args);
    write('info', ...args);
  },
  warn(...args: unknown[]): void {
    console.warn(...args);
    write('warn', ...args);
  },
  error(...args: unknown[]): void {
    console.error(...args);
    write('error', ...args);
  },
};
