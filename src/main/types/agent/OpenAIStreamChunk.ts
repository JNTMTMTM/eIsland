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
 * @file OpenAIStreamChunk.ts
 * @description OpenAI 流式响应块类型定义
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import type { OpenAIStreamChoice } from './OpenAIStreamChoice';

/** OpenAI 流式响应块 */
export interface OpenAIStreamChunk {
  /** 响应 ID */
  id?: string;
  /** 对象类型 */
  object?: string;
  /** 模型名称 */
  model?: string;
  /** 选项列表 */
  choices: OpenAIStreamChoice[];
  /** 使用情况 */
  usage?: {
    /** 提示 token 数 */
    prompt_tokens?: number;
    /** 完成 token 数 */
    completion_tokens?: number;
    /** 总 token 数 */
    total_tokens?: number;
  };
}
