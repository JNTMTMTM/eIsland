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
 * @file imageTranslationApi.ts
 * @description 图片翻译任务提交与查询客户端。
 * @author 鸡哥
 */

import { buildUploadHeaders, USER_ACCOUNT_API_BASE } from '../user/userAccountApi.client';
import type { ImageTranslationApiResult, ImageTranslationTask } from './types/ImageTranslationTask';

export type { ImageTranslationApiResult, ImageTranslationTask };

const REQUEST_TIMEOUT_MS = 30000;

function dataUrlToFile(dataUrl: string): File {
  const [metadata, encoded = ''] = dataUrl.split(',', 2);
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? 'image/png';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const extension = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
  return new File([bytes], `capture-translate.${extension}`, { type: mimeType });
}

async function parseResponse(response: Response): Promise<ImageTranslationApiResult> {
  try {
    const payload = await response.json() as {
      code?: number;
      message?: string;
      data?: ImageTranslationTask;
    };
    if (response.ok && payload.data) {
      return { success: true, data: payload.data };
    }
    return { success: false, message: payload.message ?? `HTTP ${response.status}` };
  } catch {
    return { success: false, message: response.ok ? '响应解析失败' : `HTTP ${response.status}` };
  }
}

/** 提交截图图片翻译任务。 */
export async function submitImageTranslation(
  token: string,
  dataUrl: string,
  targetLanguage: string,
  signal?: AbortSignal,
): Promise<ImageTranslationApiResult> {
  const formData = new FormData();
  formData.append('file', dataUrlToFile(dataUrl));
  formData.append('sourceLanguage', 'auto');
  formData.append('targetLanguage', targetLanguage);
  const headers = await buildUploadHeaders(token);
  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const abort = (): void => timeoutController.abort();
  if (signal?.aborted) timeoutController.abort();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    const response = await fetch(`${USER_ACCOUNT_API_BASE}/v1/toolbox/image-translations`, {
      method: 'POST',
      headers,
      body: formData,
      signal: timeoutController.signal,
    });
    return await parseResponse(response);
  } catch (error) {
    return {
      success: false,
      message: error instanceof DOMException && error.name === 'AbortError' ? '图片翻译请求已取消或超时' : '网络请求失败',
    };
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abort);
  }
}

/** 查询图片翻译任务。 */
export async function fetchImageTranslationTask(
  token: string,
  taskId: string,
  signal?: AbortSignal,
): Promise<ImageTranslationApiResult> {
  const headers = await buildUploadHeaders(token);
  try {
    const response = await fetch(
      `${USER_ACCOUNT_API_BASE}/v1/toolbox/image-translations/${encodeURIComponent(taskId)}`,
      { method: 'GET', headers, signal },
    );
    return await parseResponse(response);
  } catch (error) {
    return {
      success: false,
      message: error instanceof DOMException && error.name === 'AbortError' ? '图片翻译请求已取消' : '网络请求失败',
    };
  }
}