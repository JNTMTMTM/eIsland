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
 * @file log.ts
 * @description 日志相关 IPC 处理模块
 * @description 处理来自渲染进程的日志写入请求
 * @author 鸡哥
 */

import { ipcMain } from 'electron';

type MainLogWriter = (level: 'info' | 'warn' | 'error', message: string) => void;

interface RegisterLogIpcHandlersOptions {
  writeMainLog: MainLogWriter;
}

/**
 * 注册日志相关 IPC 处理器
 * @description 注册日志写入的 IPC 事件处理器
 * @param options - 配置选项，包含日志写入函数
 */
export function registerLogIpcHandlers(options: RegisterLogIpcHandlersOptions): void {
  ipcMain.on('log:write', (_event, level: string, message: string) => {
    options.writeMainLog(level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'info', message);
  });
}
