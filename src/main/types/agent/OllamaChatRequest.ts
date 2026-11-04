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
 * @file OllamaChatRequest.ts
 * @description Ollama 聊天请求类型定义
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import type { OllamaChatMessage } from './OllamaChatMessage';

/** Ollama 聊天请求 */
export interface OllamaChatRequest {
  /** 模型名称 */
  model: string;
  /** 消息列表 */
  messages: OllamaChatMessage[];
  /** 是否流式输出 */
  stream?: boolean;
  /** 温度参数 */
  temperature?: number;
  /** top_p 参数 */
  top_p?: number;
  /** 最大 token 数 */
  max_tokens?: number;
  /** 基础 URL */
  baseUrl?: string;
  /** 中止信号 */
  signal?: AbortSignal;
}
