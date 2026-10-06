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
import type { AgentLocalToolRequest as DirectAgentLocalToolRequest } from '../../../../types/agent/AgentLocalToolRequest';
import type { RegisterDownloadIpcHandlersOptions as DirectRegisterDownloadIpcHandlersOptions } from '../RegisterDownloadIpcHandlersOptions';
import type { DownloadStartPayload as DirectDownloadStartPayload } from '../DownloadStartPayload';
import type { UpdateSourceKey as DirectUpdateSourceKey } from '../UpdateSourceKey';
import type { RegisterUpdaterIpcHandlersOptions as DirectRegisterUpdaterIpcHandlersOptions } from '../RegisterUpdaterIpcHandlersOptions';
import type { ExtractVideoTrackOptions as DirectExtractVideoTrackOptions } from '../ExtractVideoTrackOptions';
import type { ExtractVideoTrackResult as DirectExtractVideoTrackResult } from '../ExtractVideoTrackResult';
import type { MainLogWriter as DirectMainLogWriter } from '../MainLogWriter';
import type { RegisterLogIpcHandlersOptions as DirectRegisterLogIpcHandlersOptions } from '../RegisterLogIpcHandlersOptions';
import type { RegisterNetIpcHandlersOptions as DirectRegisterNetIpcHandlersOptions } from '../RegisterNetIpcHandlersOptions';
import type { ImageCompressionStartPayload as DirectImageCompressionStartPayload } from '../ImageCompressionStartPayload';
import type { ImageCompressionTaskResult as DirectImageCompressionTaskResult } from '../ImageCompressionTaskResult';
import type { ImageCompressionStartResult as DirectImageCompressionStartResult } from '../ImageCompressionStartResult';
import type { RegisterStoreIpcHandlersOptions as DirectRegisterStoreIpcHandlersOptions } from '../RegisterStoreIpcHandlersOptions';
import type { RegisterMailIpcHandlersOptions as DirectRegisterMailIpcHandlersOptions } from '../RegisterMailIpcHandlersOptions';
import type { MailAccountConfig as DirectMailAccountConfig } from '../MailAccountConfig';
import type { MailInboxItem as DirectMailInboxItem } from '../MailInboxItem';
import type { MailInboxCacheStore as DirectMailInboxCacheStore } from '../MailInboxCacheStore';
import type { LocalFileSearchItem as DirectLocalFileSearchItem } from '../LocalFileSearchItem';
import type { LocalFileSearchOptions as DirectLocalFileSearchOptions } from '../LocalFileSearchOptions';

describe('公共类型导出契约', () => {
  it('所有门面类型与对应定义保持一致', () => {
    expectTypeOf<PublicTypes.AgentLocalToolRequest>().toEqualTypeOf<DirectAgentLocalToolRequest>();
    expectTypeOf<PublicTypes.RegisterDownloadIpcHandlersOptions>().toEqualTypeOf<DirectRegisterDownloadIpcHandlersOptions>();
    expectTypeOf<PublicTypes.DownloadStartPayload>().toEqualTypeOf<DirectDownloadStartPayload>();
    expectTypeOf<PublicTypes.UpdateSourceKey>().toEqualTypeOf<DirectUpdateSourceKey>();
    expectTypeOf<PublicTypes.RegisterUpdaterIpcHandlersOptions>().toEqualTypeOf<DirectRegisterUpdaterIpcHandlersOptions>();
    expectTypeOf<PublicTypes.ExtractVideoTrackOptions>().toEqualTypeOf<DirectExtractVideoTrackOptions>();
    expectTypeOf<PublicTypes.ExtractVideoTrackResult>().toEqualTypeOf<DirectExtractVideoTrackResult>();
    expectTypeOf<PublicTypes.MainLogWriter>().toEqualTypeOf<DirectMainLogWriter>();
    expectTypeOf<PublicTypes.RegisterLogIpcHandlersOptions>().toEqualTypeOf<DirectRegisterLogIpcHandlersOptions>();
    expectTypeOf<PublicTypes.RegisterNetIpcHandlersOptions>().toEqualTypeOf<DirectRegisterNetIpcHandlersOptions>();
    expectTypeOf<PublicTypes.ImageCompressionStartPayload>().toEqualTypeOf<DirectImageCompressionStartPayload>();
    expectTypeOf<PublicTypes.ImageCompressionTaskResult>().toEqualTypeOf<DirectImageCompressionTaskResult>();
    expectTypeOf<PublicTypes.ImageCompressionStartResult>().toEqualTypeOf<DirectImageCompressionStartResult>();
    expectTypeOf<PublicTypes.RegisterStoreIpcHandlersOptions>().toEqualTypeOf<DirectRegisterStoreIpcHandlersOptions>();
    expectTypeOf<PublicTypes.RegisterMailIpcHandlersOptions>().toEqualTypeOf<DirectRegisterMailIpcHandlersOptions>();
    expectTypeOf<PublicTypes.MailAccountConfig>().toEqualTypeOf<DirectMailAccountConfig>();
    expectTypeOf<PublicTypes.MailInboxItem>().toEqualTypeOf<DirectMailInboxItem>();
    expectTypeOf<PublicTypes.MailInboxCacheStore>().toEqualTypeOf<DirectMailInboxCacheStore>();
    expectTypeOf<PublicTypes.LocalFileSearchItem>().toEqualTypeOf<DirectLocalFileSearchItem>();
    expectTypeOf<PublicTypes.LocalFileSearchOptions>().toEqualTypeOf<DirectLocalFileSearchOptions>();
  });
});

describe('应用IPC门面的合法使用与参数边界', () => {
  it('固定搜索参数与日志回调的门面使用契约', () => {
    const options: PublicTypes.LocalFileSearchOptions = { matchMode: 'exact', matchScope: 'path', extensions: ['md'], includeHidden: false };
    expectTypeOf(options).toEqualTypeOf<{ limit?: number; maxDepth?: number; includeDirectories?: boolean; includeFiles?: boolean; includeHidden?: boolean; caseSensitive?: boolean; matchMode?: 'contains' | 'startsWith' | 'endsWith' | 'exact'; matchScope?: 'name' | 'path'; extensions?: string[]; excludeDirs?: string[] }>();
    const logger: PublicTypes.MainLogWriter = () => {};
    expectTypeOf(logger).toEqualTypeOf<(level: 'info' | 'warn' | 'error', message: string) => void>();
    // @ts-expect-error 搜索范围只允许名称或完整路径。
    options.matchScope = 'content';
    // @ts-expect-error 日志等级不得采用未声明的debug状态。
    logger('debug', 'fixture');
  });
});
