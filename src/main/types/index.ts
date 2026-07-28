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
 * @description 主进程类型定义导出
 * @author 鸡哥
 */

// Config types
export type { IslandPositionOffset } from './config/IslandPositionOffset';

// Core types
export type { ChunkInfo } from './core/ChunkInfo';
export type { DownloadTaskSnapshot, DownloadTaskStatus } from './core/DownloadTaskSnapshot';
export type { StartDownloadOptions } from './core/StartDownloadOptions';

// Agent types
export type { AgentLocalToolRequest } from './agent/AgentLocalToolRequest';
export type { AgentLocalToolResult } from './agent/AgentLocalToolResult';
export type { CustomDirectEvent, CustomDirectEventType } from './agent/CustomDirectEvent';
export type { CustomDirectOrchestratorCallbacks } from './agent/CustomDirectOrchestratorCallbacks';
export type { CustomDirectOrchestratorRequest } from './agent/CustomDirectOrchestratorRequest';
export type { OllamaChatMessage } from './agent/OllamaChatMessage';
export type { OllamaChatRequest } from './agent/OllamaChatRequest';
export type { OllamaEvent, OllamaEventType } from './agent/OllamaEvent';
export type { OllamaOrchestratorCallbacks } from './agent/OllamaOrchestratorCallbacks';
export type { OllamaOrchestratorRequest } from './agent/OllamaOrchestratorRequest';
export type { OllamaStreamCallbacks } from './agent/OllamaStreamCallbacks';
export type { OllamaStreamChunk } from './agent/OllamaStreamChunk';
export type { OllamaStreamChoice } from './agent/OllamaStreamChoice';
export type { OllamaStreamDelta } from './agent/OllamaStreamDelta';
export type { OpenAIChatMessage } from './agent/OpenAIChatMessage';
export type { OpenAIChatRequest } from './agent/OpenAIChatRequest';
export type { OpenAIStreamCallbacks } from './agent/OpenAIStreamCallbacks';
export type { OpenAIStreamChunk } from './agent/OpenAIStreamChunk';
export type { OpenAIStreamChoice } from './agent/OpenAIStreamChoice';
export type { OpenAIStreamDelta } from './agent/OpenAIStreamDelta';

// System types
export type { ClaudeCodeHeatmapDailyCount, ClaudeCodeHeatmapDaily } from './system/ClaudeCodeHeatmapDailyCount';
export type { ClaudeCodeHookEvent, ClaudeCodeHookEventKind } from './system/ClaudeCodeHookEvent';
export type { ClaudeCodeHookEventDetailItem } from './system/ClaudeCodeHookEventDetailItem';
export type { ClaudeCodeSessionSnapshot, ClaudeCodeSessionPhase } from './system/ClaudeCodeSessionSnapshot';
export type { ClaudeCodeStatusService, ClaudeSettingsMutationResult, PermissionDecision } from './system/ClaudeCodeStatusService';
export type { ClaudeCodeStatusSnapshot } from './system/ClaudeCodeStatusSnapshot';
export type { CodexStatusService, CodexMonitorMutationResult } from './system/CodexStatusService';
export type { RunningProcessInfo } from './system/RunningProcessInfo';
export type { RunningWindowInfo } from './system/RunningWindowInfo';
