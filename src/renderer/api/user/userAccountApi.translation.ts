/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file userAccountApi.translation.ts
 * @description 当前用户图片翻译历史接口。
 * @author 鸡哥
 */

import { request } from './userAccountApi.client';
import type { UserAccountResult } from './userAccountApi.types';

export interface ImageTranslationHistoryItem {
  id: number;
  taskId: string;
  username: string;
  mode: string;
  status: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceUrl: string;
  resultUrl: string | null;
  ocrResult: string | null;
  translationResult: string | null;
  providerTaskId: string | null;
  providerRequestId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export interface ImageTranslationHistoryPage {
  items: ImageTranslationHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function fetchImageTranslationHistory(
  token: string,
  page = 1,
  pageSize = 5,
): Promise<UserAccountResult<ImageTranslationHistoryPage>> {
  const normalizedPage = Math.max(1, Math.floor(Number(page) || 1));
  const normalizedPageSize = Math.max(1, Math.min(Math.floor(Number(pageSize) || 5), 100));
  return request<ImageTranslationHistoryPage>(
    `/v1/toolbox/image-translations/history?page=${normalizedPage}&pageSize=${normalizedPageSize}`,
    {
      method: 'GET',
      auth: token,
    },
  );
}