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
 * @file OllamaOrchestratorRequest.ts
 * @description Ollama 编排器请求类型定义
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

/** Ollama 编排器请求 */
export interface OllamaOrchestratorRequest {
  /** 模型名称 */
  model: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** 用户消息 */
  userMessage: string;
  /** 上下文信息 */
  context?: string;
  /** 基础 URL */
  baseUrl?: string;
  /** 温度参数 */
  temperature?: number;
  /** 中止信号 */
  signal?: AbortSignal;
}
