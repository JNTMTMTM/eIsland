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
 * @description 预加载类型聚合门面的公共导出身份及跨模块基础值契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Point, Bounds, IslandDisplayInfo, SearchLocalFilesOptions, SearchLocalFileResult, ComputeFileHashResult, SaveTextFilePayload, SaveTextFileResult, SaveImageAsResult, ResolveShortcutResult, PerformanceHardwareSelection, PerformanceHardwareOption, PerformanceHardwareOptions, PerformanceSnapshot, RunningProcessInfo, RunningWindowInfo, MusicProviderAuthState, MusicProviderAuthStatus, MusicProviderId, MusicProviderQrCodeResult, QishuiBusinessApi, QishuiBusinessRequestOptions, QishuiBusinessStatus, QishuiLyricsResult, QishuiSong, QishuiSongsResult, QishuiSongUrlResult, NowPlayingInfo, SmtcSourceInfo, DetectSourceAppIdResult, SmtcTimeline, SmtcTimestampResult, SourceSwitchRequestData, ExecuteAgentLocalToolRequest, ExecuteAgentLocalToolResult, OllamaChatRequest, CustomDirectChatRequest, ChatEvent, ChatStartResult, ChatAbortResult, ClaudeCodeHookEventDetailItem, ClaudeCodeHookEvent, ClaudeCodeSessionSnapshot, ClaudeCodeStatusSnapshot, ClaudeCodeHookMutationResult, CodexStatusSnapshot, CodexMonitorMutationResult, ImageCompressionTask, ImageCompressionStartPayload, ImageCompressionStartResult, DownloadTask, DownloadStartPayload, DownloadStartResult, ExtractVideoTrackOptions, ExtractVideoTrackResult, PickVideoForExtractResult, NetFetchOptions, NetFetchResult, MailInboxItem, MailInboxResult, UpdaterCheckResult, UpdaterProgress, UpdaterDownloadedData, UpdaterAvailableData, UpdaterNotAvailableData, UpdaterStartupAutoCheckRequestData, ClipboardUrlsDetectedData, ExternalAgentData, NavOrderPayload, SetWallpaperPayload } from '../index';
import type { Point as OriginalPoint, Bounds as OriginalBounds } from '../common';
import type { IslandDisplayInfo as OriginalIslandDisplayInfo } from '../window';
import type { SearchLocalFilesOptions as OriginalSearchLocalFilesOptions, SearchLocalFileResult as OriginalSearchLocalFileResult, ComputeFileHashResult as OriginalComputeFileHashResult, SaveTextFilePayload as OriginalSaveTextFilePayload, SaveTextFileResult as OriginalSaveTextFileResult, SaveImageAsResult as OriginalSaveImageAsResult, ResolveShortcutResult as OriginalResolveShortcutResult } from '../file';
import type { PerformanceHardwareSelection as OriginalPerformanceHardwareSelection, PerformanceHardwareOption as OriginalPerformanceHardwareOption, PerformanceHardwareOptions as OriginalPerformanceHardwareOptions, PerformanceSnapshot as OriginalPerformanceSnapshot } from '../performance';
import type { RunningProcessInfo as OriginalRunningProcessInfo, RunningWindowInfo as OriginalRunningWindowInfo } from '../process';
import type { MusicProviderAuthState as OriginalMusicProviderAuthState, MusicProviderAuthStatus as OriginalMusicProviderAuthStatus, MusicProviderId as OriginalMusicProviderId, MusicProviderQrCodeResult as OriginalMusicProviderQrCodeResult, QishuiBusinessApi as OriginalQishuiBusinessApi, QishuiBusinessRequestOptions as OriginalQishuiBusinessRequestOptions, QishuiBusinessStatus as OriginalQishuiBusinessStatus, QishuiLyricsResult as OriginalQishuiLyricsResult, QishuiSong as OriginalQishuiSong, QishuiSongsResult as OriginalQishuiSongsResult, QishuiSongUrlResult as OriginalQishuiSongUrlResult, NowPlayingInfo as OriginalNowPlayingInfo, SmtcSourceInfo as OriginalSmtcSourceInfo, DetectSourceAppIdResult as OriginalDetectSourceAppIdResult, SmtcTimeline as OriginalSmtcTimeline, SmtcTimestampResult as OriginalSmtcTimestampResult, SourceSwitchRequestData as OriginalSourceSwitchRequestData } from '../media';
import type { ExecuteAgentLocalToolRequest as OriginalExecuteAgentLocalToolRequest, ExecuteAgentLocalToolResult as OriginalExecuteAgentLocalToolResult, OllamaChatRequest as OriginalOllamaChatRequest, CustomDirectChatRequest as OriginalCustomDirectChatRequest, ChatEvent as OriginalChatEvent, ChatStartResult as OriginalChatStartResult, ChatAbortResult as OriginalChatAbortResult } from '../agent';
import type { ClaudeCodeHookEventDetailItem as OriginalClaudeCodeHookEventDetailItem, ClaudeCodeHookEvent as OriginalClaudeCodeHookEvent, ClaudeCodeSessionSnapshot as OriginalClaudeCodeSessionSnapshot, ClaudeCodeStatusSnapshot as OriginalClaudeCodeStatusSnapshot, ClaudeCodeHookMutationResult as OriginalClaudeCodeHookMutationResult } from '../claudeCode';
import type { CodexStatusSnapshot as OriginalCodexStatusSnapshot, CodexMonitorMutationResult as OriginalCodexMonitorMutationResult } from '../codex';
import type { ImageCompressionTask as OriginalImageCompressionTask, ImageCompressionStartPayload as OriginalImageCompressionStartPayload, ImageCompressionStartResult as OriginalImageCompressionStartResult } from '../imageCompression';
import type { DownloadTask as OriginalDownloadTask, DownloadStartPayload as OriginalDownloadStartPayload, DownloadStartResult as OriginalDownloadStartResult } from '../download';
import type { ExtractVideoTrackOptions as OriginalExtractVideoTrackOptions, ExtractVideoTrackResult as OriginalExtractVideoTrackResult, PickVideoForExtractResult as OriginalPickVideoForExtractResult } from '../formatFactory';
import type { NetFetchOptions as OriginalNetFetchOptions, NetFetchResult as OriginalNetFetchResult } from '../net';
import type { MailInboxItem as OriginalMailInboxItem, MailInboxResult as OriginalMailInboxResult } from '../mail';
import type { UpdaterCheckResult as OriginalUpdaterCheckResult, UpdaterProgress as OriginalUpdaterProgress, UpdaterDownloadedData as OriginalUpdaterDownloadedData, UpdaterAvailableData as OriginalUpdaterAvailableData, UpdaterNotAvailableData as OriginalUpdaterNotAvailableData, UpdaterStartupAutoCheckRequestData as OriginalUpdaterStartupAutoCheckRequestData } from '../updater';
import type { ClipboardUrlsDetectedData as OriginalClipboardUrlsDetectedData, ExternalAgentData as OriginalExternalAgentData } from '../clipboard';
import type { NavOrderPayload as OriginalNavOrderPayload } from '../navigation';
import type { SetWallpaperPayload as OriginalSetWallpaperPayload } from '../settings';
describe('preload type barrel', () => {
  it('preserves each explicitly published type identity', () => {
    expectTypeOf<Point>().toEqualTypeOf<OriginalPoint>();
    expectTypeOf<Bounds>().toEqualTypeOf<OriginalBounds>();
    expectTypeOf<IslandDisplayInfo>().toEqualTypeOf<OriginalIslandDisplayInfo>();
    expectTypeOf<SearchLocalFilesOptions>().toEqualTypeOf<OriginalSearchLocalFilesOptions>();
    expectTypeOf<SearchLocalFileResult>().toEqualTypeOf<OriginalSearchLocalFileResult>();
    expectTypeOf<ComputeFileHashResult>().toEqualTypeOf<OriginalComputeFileHashResult>();
    expectTypeOf<SaveTextFilePayload>().toEqualTypeOf<OriginalSaveTextFilePayload>();
    expectTypeOf<SaveTextFileResult>().toEqualTypeOf<OriginalSaveTextFileResult>();
    expectTypeOf<SaveImageAsResult>().toEqualTypeOf<OriginalSaveImageAsResult>();
    expectTypeOf<ResolveShortcutResult>().toEqualTypeOf<OriginalResolveShortcutResult>();
    expectTypeOf<PerformanceHardwareSelection>().toEqualTypeOf<OriginalPerformanceHardwareSelection>();
    expectTypeOf<PerformanceHardwareOption>().toEqualTypeOf<OriginalPerformanceHardwareOption>();
    expectTypeOf<PerformanceHardwareOptions>().toEqualTypeOf<OriginalPerformanceHardwareOptions>();
    expectTypeOf<PerformanceSnapshot>().toEqualTypeOf<OriginalPerformanceSnapshot>();
    expectTypeOf<RunningProcessInfo>().toEqualTypeOf<OriginalRunningProcessInfo>();
    expectTypeOf<RunningWindowInfo>().toEqualTypeOf<OriginalRunningWindowInfo>();
    expectTypeOf<MusicProviderAuthState>().toEqualTypeOf<OriginalMusicProviderAuthState>();
    expectTypeOf<MusicProviderAuthStatus>().toEqualTypeOf<OriginalMusicProviderAuthStatus>();
    expectTypeOf<MusicProviderId>().toEqualTypeOf<OriginalMusicProviderId>();
    expectTypeOf<MusicProviderQrCodeResult>().toEqualTypeOf<OriginalMusicProviderQrCodeResult>();
    expectTypeOf<QishuiBusinessApi>().toEqualTypeOf<OriginalQishuiBusinessApi>();
    expectTypeOf<QishuiBusinessRequestOptions>().toEqualTypeOf<OriginalQishuiBusinessRequestOptions>();
    expectTypeOf<QishuiBusinessStatus>().toEqualTypeOf<OriginalQishuiBusinessStatus>();
    expectTypeOf<QishuiLyricsResult>().toEqualTypeOf<OriginalQishuiLyricsResult>();
    expectTypeOf<QishuiSong>().toEqualTypeOf<OriginalQishuiSong>();
    expectTypeOf<QishuiSongsResult>().toEqualTypeOf<OriginalQishuiSongsResult>();
    expectTypeOf<QishuiSongUrlResult>().toEqualTypeOf<OriginalQishuiSongUrlResult>();
    expectTypeOf<NowPlayingInfo>().toEqualTypeOf<OriginalNowPlayingInfo>();
    expectTypeOf<SmtcSourceInfo>().toEqualTypeOf<OriginalSmtcSourceInfo>();
    expectTypeOf<DetectSourceAppIdResult>().toEqualTypeOf<OriginalDetectSourceAppIdResult>();
    expectTypeOf<SmtcTimeline>().toEqualTypeOf<OriginalSmtcTimeline>();
    expectTypeOf<SmtcTimestampResult>().toEqualTypeOf<OriginalSmtcTimestampResult>();
    expectTypeOf<SourceSwitchRequestData>().toEqualTypeOf<OriginalSourceSwitchRequestData>();
    expectTypeOf<ExecuteAgentLocalToolRequest>().toEqualTypeOf<OriginalExecuteAgentLocalToolRequest>();
    expectTypeOf<ExecuteAgentLocalToolResult>().toEqualTypeOf<OriginalExecuteAgentLocalToolResult>();
    expectTypeOf<OllamaChatRequest>().toEqualTypeOf<OriginalOllamaChatRequest>();
    expectTypeOf<CustomDirectChatRequest>().toEqualTypeOf<OriginalCustomDirectChatRequest>();
    expectTypeOf<ChatEvent>().toEqualTypeOf<OriginalChatEvent>();
    expectTypeOf<ChatStartResult>().toEqualTypeOf<OriginalChatStartResult>();
    expectTypeOf<ChatAbortResult>().toEqualTypeOf<OriginalChatAbortResult>();
    expectTypeOf<ClaudeCodeHookEventDetailItem>().toEqualTypeOf<OriginalClaudeCodeHookEventDetailItem>();
    expectTypeOf<ClaudeCodeHookEvent>().toEqualTypeOf<OriginalClaudeCodeHookEvent>();
    expectTypeOf<ClaudeCodeSessionSnapshot>().toEqualTypeOf<OriginalClaudeCodeSessionSnapshot>();
    expectTypeOf<ClaudeCodeStatusSnapshot>().toEqualTypeOf<OriginalClaudeCodeStatusSnapshot>();
    expectTypeOf<ClaudeCodeHookMutationResult>().toEqualTypeOf<OriginalClaudeCodeHookMutationResult>();
    expectTypeOf<CodexStatusSnapshot>().toEqualTypeOf<OriginalCodexStatusSnapshot>();
    expectTypeOf<CodexMonitorMutationResult>().toEqualTypeOf<OriginalCodexMonitorMutationResult>();
    expectTypeOf<ImageCompressionTask>().toEqualTypeOf<OriginalImageCompressionTask>();
    expectTypeOf<ImageCompressionStartPayload>().toEqualTypeOf<OriginalImageCompressionStartPayload>();
    expectTypeOf<ImageCompressionStartResult>().toEqualTypeOf<OriginalImageCompressionStartResult>();
    expectTypeOf<DownloadTask>().toEqualTypeOf<OriginalDownloadTask>();
    expectTypeOf<DownloadStartPayload>().toEqualTypeOf<OriginalDownloadStartPayload>();
    expectTypeOf<DownloadStartResult>().toEqualTypeOf<OriginalDownloadStartResult>();
    expectTypeOf<ExtractVideoTrackOptions>().toEqualTypeOf<OriginalExtractVideoTrackOptions>();
    expectTypeOf<ExtractVideoTrackResult>().toEqualTypeOf<OriginalExtractVideoTrackResult>();
    expectTypeOf<PickVideoForExtractResult>().toEqualTypeOf<OriginalPickVideoForExtractResult>();
    expectTypeOf<NetFetchOptions>().toEqualTypeOf<OriginalNetFetchOptions>();
    expectTypeOf<NetFetchResult>().toEqualTypeOf<OriginalNetFetchResult>();
    expectTypeOf<MailInboxItem>().toEqualTypeOf<OriginalMailInboxItem>();
    expectTypeOf<MailInboxResult>().toEqualTypeOf<OriginalMailInboxResult>();
    expectTypeOf<UpdaterCheckResult>().toEqualTypeOf<OriginalUpdaterCheckResult>();
    expectTypeOf<UpdaterProgress>().toEqualTypeOf<OriginalUpdaterProgress>();
    expectTypeOf<UpdaterDownloadedData>().toEqualTypeOf<OriginalUpdaterDownloadedData>();
    expectTypeOf<UpdaterAvailableData>().toEqualTypeOf<OriginalUpdaterAvailableData>();
    expectTypeOf<UpdaterNotAvailableData>().toEqualTypeOf<OriginalUpdaterNotAvailableData>();
    expectTypeOf<UpdaterStartupAutoCheckRequestData>().toEqualTypeOf<OriginalUpdaterStartupAutoCheckRequestData>();
    expectTypeOf<ClipboardUrlsDetectedData>().toEqualTypeOf<OriginalClipboardUrlsDetectedData>();
    expectTypeOf<ExternalAgentData>().toEqualTypeOf<OriginalExternalAgentData>();
    expectTypeOf<NavOrderPayload>().toEqualTypeOf<OriginalNavOrderPayload>();
    expectTypeOf<SetWallpaperPayload>().toEqualTypeOf<OriginalSetWallpaperPayload>();
    const point: Point = { x: 1, y: 2 };
    const event: ChatEvent = { type: 'token', payload: { text: 'hello' } };
    expect(point).toEqual({ x: 1, y: 2 });
    // @ts-expect-error 门面坐标保持数字字段契约。
    const invalid: Point['x'] = 'left';
    expect(invalid).toBe('left');
    expect(event.payload).toEqual({ text: 'hello' });
  });
});
