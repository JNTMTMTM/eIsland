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
 * @file userAccountApi.translation.ts
 * @description 当前用户图片翻译与 OCR 历史接口。
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

export interface OcrHistoryItem {
  id: number;
  username: string;
  sourceUrl: string;
  recognizedText: string;
  providerRequestId: string | null;
  createdAt: string;
}

export interface OcrHistoryPage {
  items: OcrHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * 删除指定的图片翻译记录
 * @param token - 用户认证令牌
 * @param taskId - 要删除的翻译任务 ID
 * @returns 删除结果
 */
export function deleteImageTranslationHistory(
  token: string,
  taskId: string,
): Promise<UserAccountResult<void>> {
  return request<void>(`/v1/toolbox/image-translations/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
    auth: token,
  });
}

/**
 * 获取图片翻译历史记录（分页）
 * @param token - 用户认证令牌
 * @param page - 页码，默认 1
 * @param pageSize - 每页数量，默认 5，最大 100
 * @returns 分页的历史记录
 */
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

/**
 * 获取 OCR 历史记录（分页）
 * @param token - 用户认证令牌
 * @param page - 页码，默认 1
 * @param pageSize - 每页数量，默认 5，最大 100
 * @returns 分页的 OCR 历史记录
 */
export function fetchOcrHistory(
  token: string,
  page = 1,
  pageSize = 5,
): Promise<UserAccountResult<OcrHistoryPage>> {
  const normalizedPage = Math.max(1, Math.floor(Number(page) || 1));
  const normalizedPageSize = Math.max(1, Math.min(Math.floor(Number(pageSize) || 5), 100));
  return request<OcrHistoryPage>(
    `/v1/toolbox/ocr/history?page=${normalizedPage}&pageSize=${normalizedPageSize}`,
    {
      method: 'GET',
      auth: token,
    },
  );
}
