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
 * @file OpenAIStreamCallbacks.ts
 * @description OpenAI 流式响应回调类型定义
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import type { OpenAIStreamChunk } from './OpenAIStreamChunk';

/** OpenAI 流式响应回调 */
export interface OpenAIStreamCallbacks {
  /** 接收增量文本回调 */
  onChunk?: (text: string) => void;
  /** 接收推理内容回调（仅部分模型支持） */
  onThinkChunk?: (text: string) => void;
  /** 流式完成回调 */
  onDone?: (fullText: string, usage?: OpenAIStreamChunk['usage']) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}
