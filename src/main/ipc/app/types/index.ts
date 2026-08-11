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
 * @description app IPC 模块类型定义导出
 * @author 鸡哥
 */

// Agent
export type { AgentLocalToolRequest } from '../../../types/agent/AgentLocalToolRequest';

// Download
export type { RegisterDownloadIpcHandlersOptions } from './RegisterDownloadIpcHandlersOptions';
export type { DownloadStartPayload } from './DownloadStartPayload';

// Updater
export type { UpdateSourceKey } from './UpdateSourceKey';
export type { RegisterUpdaterIpcHandlersOptions } from './RegisterUpdaterIpcHandlersOptions';

// Format factory
export type { ExtractVideoTrackOptions } from './ExtractVideoTrackOptions';
export type { ExtractVideoTrackResult } from './ExtractVideoTrackResult';

// Log
export type { MainLogWriter } from './MainLogWriter';
export type { RegisterLogIpcHandlersOptions } from './RegisterLogIpcHandlersOptions';

// Net
export type { RegisterNetIpcHandlersOptions } from './RegisterNetIpcHandlersOptions';

// Image compression
export type { ImageCompressionStartPayload } from './ImageCompressionStartPayload';
export type { ImageCompressionTaskResult } from './ImageCompressionTaskResult';
export type { ImageCompressionStartResult } from './ImageCompressionStartResult';

// Store
export type { RegisterStoreIpcHandlersOptions } from './RegisterStoreIpcHandlersOptions';

// Mail
export type { RegisterMailIpcHandlersOptions } from './RegisterMailIpcHandlersOptions';
export type { MailAccountConfig } from './MailAccountConfig';
export type { MailInboxItem } from './MailInboxItem';
export type { MailInboxCacheStore } from './MailInboxCacheStore';

// File search
export type { LocalFileSearchItem } from './LocalFileSearchItem';
export type { LocalFileSearchOptions } from './LocalFileSearchOptions';
