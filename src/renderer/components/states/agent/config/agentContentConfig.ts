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
 * @file agentContentConfig.ts
 * @description Agent 内容区状态配置与常量定义。
 * @author 鸡哥
 */

export type AgentPhase = 'connecting' | 'thinking' | 'toolCalling' | 'answering' | 'done' | 'error';

export const PHASE_IMAGE: Record<AgentPhase, string> = {
  connecting: '../image/AGENT_DEFAULT.png',
  thinking: '../image/AGENT_THINKING.png',
  toolCalling: '../image/AGENT_TOOL_CALLING.png',
  answering: '../image/AGENT_FINAL_ANSWER.png',
  done: '../image/AGENT_FINAL_ANSWER.png',
  error: '../image/AGENT_CONFUSE.png',
};

export const PHASE_LABEL: Record<AgentPhase, string> = {
  connecting: '正在连接…',
  thinking: '正在思考…',
  toolCalling: '正在调用工具…',
  answering: '正在回答…',
  done: '回答完成',
  error: '出错了',
};

export const AGENT_MODE_STORAGE_KEY = 'eIsland_agentMode';
export const VALID_AGENT_MODES = new Set(['mihtnelis', 'r1pxc', 'edoc']);

export const INLINE_PROMPT_HINT = '[快问快答模式] 请用简洁精炼的语言回答，输出不超过3句话，避免冗长解释和列表。直接给出核心结论。思考过程(thinking)也请尽量精简，不要输出冗长的推理链，控制在几句话以内。';
