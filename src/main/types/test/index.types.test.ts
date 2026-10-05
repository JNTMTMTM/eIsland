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
 * @file index.types.test.ts
 * @description 验证公共类型门面的每个导出都保留原定义身份，防止漏导出和错误映射。
 * @author 鸡哥
 */

import { describe, expectTypeOf, it } from 'vitest';
import type * as PublicTypes from '../index';
import type { IslandPositionOffset as DirectIslandPositionOffset } from '../config/IslandPositionOffset';
import type { ChunkInfo as DirectChunkInfo } from '../core/ChunkInfo';
import type { DownloadTaskSnapshot as DirectDownloadTaskSnapshot, DownloadTaskStatus as DirectDownloadTaskStatus } from '../core/DownloadTaskSnapshot';
import type { StartDownloadOptions as DirectStartDownloadOptions } from '../core/StartDownloadOptions';
import type { AgentLocalToolRequest as DirectAgentLocalToolRequest } from '../agent/AgentLocalToolRequest';
import type { AgentLocalToolResult as DirectAgentLocalToolResult } from '../agent/AgentLocalToolResult';
import type { CustomDirectEvent as DirectCustomDirectEvent, CustomDirectEventType as DirectCustomDirectEventType } from '../agent/CustomDirectEvent';
import type { CustomDirectOrchestratorCallbacks as DirectCustomDirectOrchestratorCallbacks } from '../agent/CustomDirectOrchestratorCallbacks';
import type { CustomDirectOrchestratorRequest as DirectCustomDirectOrchestratorRequest } from '../agent/CustomDirectOrchestratorRequest';
import type { OllamaChatMessage as DirectOllamaChatMessage } from '../agent/OllamaChatMessage';
import type { OllamaChatRequest as DirectOllamaChatRequest } from '../agent/OllamaChatRequest';
import type { OllamaEvent as DirectOllamaEvent, OllamaEventType as DirectOllamaEventType } from '../agent/OllamaEvent';
import type { OllamaOrchestratorCallbacks as DirectOllamaOrchestratorCallbacks } from '../agent/OllamaOrchestratorCallbacks';
import type { OllamaOrchestratorRequest as DirectOllamaOrchestratorRequest } from '../agent/OllamaOrchestratorRequest';
import type { OllamaStreamCallbacks as DirectOllamaStreamCallbacks } from '../agent/OllamaStreamCallbacks';
import type { OllamaStreamChunk as DirectOllamaStreamChunk } from '../agent/OllamaStreamChunk';
import type { OllamaStreamChoice as DirectOllamaStreamChoice } from '../agent/OllamaStreamChoice';
import type { OllamaStreamDelta as DirectOllamaStreamDelta } from '../agent/OllamaStreamDelta';
import type { OpenAIChatMessage as DirectOpenAIChatMessage } from '../agent/OpenAIChatMessage';
import type { OpenAIChatRequest as DirectOpenAIChatRequest } from '../agent/OpenAIChatRequest';
import type { OpenAIStreamCallbacks as DirectOpenAIStreamCallbacks } from '../agent/OpenAIStreamCallbacks';
import type { OpenAIStreamChunk as DirectOpenAIStreamChunk } from '../agent/OpenAIStreamChunk';
import type { OpenAIStreamChoice as DirectOpenAIStreamChoice } from '../agent/OpenAIStreamChoice';
import type { OpenAIStreamDelta as DirectOpenAIStreamDelta } from '../agent/OpenAIStreamDelta';
import type { ClaudeCodeHeatmapDailyCount as DirectClaudeCodeHeatmapDailyCount, ClaudeCodeHeatmapDaily as DirectClaudeCodeHeatmapDaily } from '../system/ClaudeCodeHeatmapDailyCount';
import type { ClaudeCodeHookEvent as DirectClaudeCodeHookEvent, ClaudeCodeHookEventKind as DirectClaudeCodeHookEventKind } from '../system/ClaudeCodeHookEvent';
import type { ClaudeCodeHookEventDetailItem as DirectClaudeCodeHookEventDetailItem } from '../system/ClaudeCodeHookEventDetailItem';
import type { ClaudeCodeSessionSnapshot as DirectClaudeCodeSessionSnapshot, ClaudeCodeSessionPhase as DirectClaudeCodeSessionPhase } from '../system/ClaudeCodeSessionSnapshot';
import type { ClaudeCodeStatusService as DirectClaudeCodeStatusService, ClaudeSettingsMutationResult as DirectClaudeSettingsMutationResult, PermissionDecision as DirectPermissionDecision } from '../system/ClaudeCodeStatusService';
import type { ClaudeCodeStatusSnapshot as DirectClaudeCodeStatusSnapshot } from '../system/ClaudeCodeStatusSnapshot';
import type { CodexStatusService as DirectCodexStatusService, CodexMonitorMutationResult as DirectCodexMonitorMutationResult } from '../system/CodexStatusService';
import type { RunningProcessInfo as DirectRunningProcessInfo } from '../system/RunningProcessInfo';
import type { RunningWindowInfo as DirectRunningWindowInfo } from '../system/RunningWindowInfo';

describe('公共类型导出契约', () => {
  it('所有门面类型与对应定义保持一致', () => {
    expectTypeOf<PublicTypes.IslandPositionOffset>().toEqualTypeOf<DirectIslandPositionOffset>();
    expectTypeOf<PublicTypes.ChunkInfo>().toEqualTypeOf<DirectChunkInfo>();
    expectTypeOf<PublicTypes.DownloadTaskSnapshot>().toEqualTypeOf<DirectDownloadTaskSnapshot>();
    expectTypeOf<PublicTypes.DownloadTaskStatus>().toEqualTypeOf<DirectDownloadTaskStatus>();
    expectTypeOf<PublicTypes.StartDownloadOptions>().toEqualTypeOf<DirectStartDownloadOptions>();
    expectTypeOf<PublicTypes.AgentLocalToolRequest>().toEqualTypeOf<DirectAgentLocalToolRequest>();
    expectTypeOf<PublicTypes.AgentLocalToolResult>().toEqualTypeOf<DirectAgentLocalToolResult>();
    expectTypeOf<PublicTypes.CustomDirectEvent>().toEqualTypeOf<DirectCustomDirectEvent>();
    expectTypeOf<PublicTypes.CustomDirectEventType>().toEqualTypeOf<DirectCustomDirectEventType>();
    expectTypeOf<PublicTypes.CustomDirectOrchestratorCallbacks>().toEqualTypeOf<DirectCustomDirectOrchestratorCallbacks>();
    expectTypeOf<PublicTypes.CustomDirectOrchestratorRequest>().toEqualTypeOf<DirectCustomDirectOrchestratorRequest>();
    expectTypeOf<PublicTypes.OllamaChatMessage>().toEqualTypeOf<DirectOllamaChatMessage>();
    expectTypeOf<PublicTypes.OllamaChatRequest>().toEqualTypeOf<DirectOllamaChatRequest>();
    expectTypeOf<PublicTypes.OllamaEvent>().toEqualTypeOf<DirectOllamaEvent>();
    expectTypeOf<PublicTypes.OllamaEventType>().toEqualTypeOf<DirectOllamaEventType>();
    expectTypeOf<PublicTypes.OllamaOrchestratorCallbacks>().toEqualTypeOf<DirectOllamaOrchestratorCallbacks>();
    expectTypeOf<PublicTypes.OllamaOrchestratorRequest>().toEqualTypeOf<DirectOllamaOrchestratorRequest>();
    expectTypeOf<PublicTypes.OllamaStreamCallbacks>().toEqualTypeOf<DirectOllamaStreamCallbacks>();
    expectTypeOf<PublicTypes.OllamaStreamChunk>().toEqualTypeOf<DirectOllamaStreamChunk>();
    expectTypeOf<PublicTypes.OllamaStreamChoice>().toEqualTypeOf<DirectOllamaStreamChoice>();
    expectTypeOf<PublicTypes.OllamaStreamDelta>().toEqualTypeOf<DirectOllamaStreamDelta>();
    expectTypeOf<PublicTypes.OpenAIChatMessage>().toEqualTypeOf<DirectOpenAIChatMessage>();
    expectTypeOf<PublicTypes.OpenAIChatRequest>().toEqualTypeOf<DirectOpenAIChatRequest>();
    expectTypeOf<PublicTypes.OpenAIStreamCallbacks>().toEqualTypeOf<DirectOpenAIStreamCallbacks>();
    expectTypeOf<PublicTypes.OpenAIStreamChunk>().toEqualTypeOf<DirectOpenAIStreamChunk>();
    expectTypeOf<PublicTypes.OpenAIStreamChoice>().toEqualTypeOf<DirectOpenAIStreamChoice>();
    expectTypeOf<PublicTypes.OpenAIStreamDelta>().toEqualTypeOf<DirectOpenAIStreamDelta>();
    expectTypeOf<PublicTypes.ClaudeCodeHeatmapDailyCount>().toEqualTypeOf<DirectClaudeCodeHeatmapDailyCount>();
    expectTypeOf<PublicTypes.ClaudeCodeHeatmapDaily>().toEqualTypeOf<DirectClaudeCodeHeatmapDaily>();
    expectTypeOf<PublicTypes.ClaudeCodeHookEvent>().toEqualTypeOf<DirectClaudeCodeHookEvent>();
    expectTypeOf<PublicTypes.ClaudeCodeHookEventKind>().toEqualTypeOf<DirectClaudeCodeHookEventKind>();
    expectTypeOf<PublicTypes.ClaudeCodeHookEventDetailItem>().toEqualTypeOf<DirectClaudeCodeHookEventDetailItem>();
    expectTypeOf<PublicTypes.ClaudeCodeSessionSnapshot>().toEqualTypeOf<DirectClaudeCodeSessionSnapshot>();
    expectTypeOf<PublicTypes.ClaudeCodeSessionPhase>().toEqualTypeOf<DirectClaudeCodeSessionPhase>();
    expectTypeOf<PublicTypes.ClaudeCodeStatusService>().toEqualTypeOf<DirectClaudeCodeStatusService>();
    expectTypeOf<PublicTypes.ClaudeSettingsMutationResult>().toEqualTypeOf<DirectClaudeSettingsMutationResult>();
    expectTypeOf<PublicTypes.PermissionDecision>().toEqualTypeOf<DirectPermissionDecision>();
    expectTypeOf<PublicTypes.ClaudeCodeStatusSnapshot>().toEqualTypeOf<DirectClaudeCodeStatusSnapshot>();
    expectTypeOf<PublicTypes.CodexStatusService>().toEqualTypeOf<DirectCodexStatusService>();
    expectTypeOf<PublicTypes.CodexMonitorMutationResult>().toEqualTypeOf<DirectCodexMonitorMutationResult>();
    expectTypeOf<PublicTypes.RunningProcessInfo>().toEqualTypeOf<DirectRunningProcessInfo>();
    expectTypeOf<PublicTypes.RunningWindowInfo>().toEqualTypeOf<DirectRunningWindowInfo>();
  });
});

describe('主进程门面的合法使用与状态边界', () => {
  it('通过门面构造完整窗口和最小下载配置', () => {
    const fixture: PublicTypes.RunningWindowInfo = { id: '42', title: 'Editor', processName: 'Code.exe', processPath: null, processId: null, iconDataUrl: null };
    expectTypeOf(fixture).toEqualTypeOf<{ id: string; title: string; processName: string; processPath: string | null; processId: number | null; iconDataUrl: string | null }>();
    const download: PublicTypes.StartDownloadOptions = { url: 'https://example.com/fixture', defaultDir: 'C:/fixture' };
    expectTypeOf(download).toEqualTypeOf<{ url: string; defaultDir: string; savePath?: string; threads?: number }>();
    // @ts-expect-error 会话阶段必须采用协议中的四种状态。
    const invalidPhase: PublicTypes.ClaudeCodeSessionPhase = 'busy';
    void invalidPhase;
    // @ts-expect-error 下载线程数必须是数值，门面不得将其放宽到字符串。
    download.threads = 'two';
  });
});
