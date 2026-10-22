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
 * @file AgentLocalToolRequest.ts
 * @description Agent 本地工具请求类型定义
 * @author 鸡哥
 */

/** Agent 本地工具请求 */
export interface AgentLocalToolRequest {
  /** 云端调用 ID，用于重复投递时复用同一次执行结果。 */
  requestId?: unknown;
  /** 工具名称 */
  tool?: unknown;
  /** 工具参数 */
  arguments?: unknown;
  /** 工作空间列表 */
  workspaces?: unknown;
}
