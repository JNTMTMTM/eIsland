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
 * @file RegisterStoreIpcHandlersOptions.ts
 * @description 存储模块 IPC 处理器注册选项类型定义
 * @author 鸡哥
 */

/** 存储模块 IPC 处理器注册选项 */
export interface RegisterStoreIpcHandlersOptions {
  /** 存储目录路径 */
  storeDir: string;
  /** 写入成功后的回调，供主进程同步依赖该键的原生界面 */
  onWrite?: (key: string) => void;
}
