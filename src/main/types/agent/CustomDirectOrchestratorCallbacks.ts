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
 * @file CustomDirectOrchestratorCallbacks.ts
 * @description 自定义 API 直连编排器回调类型定义
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import type { CustomDirectEvent } from './CustomDirectEvent';
import type { AgentLocalToolRequest } from './AgentLocalToolRequest';
import type { AgentLocalToolResult } from './AgentLocalToolResult';

/** 自定义 API 直连编排器回调 */
export interface CustomDirectOrchestratorCallbacks {
  /** 事件回调 */
  onEvent: (event: CustomDirectEvent) => void;
  /** 执行本地工具 */
  executeLocalTool: (request: AgentLocalToolRequest) => Promise<AgentLocalToolResult>;
}
