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
 * @file imageTranslationService.ts
 * @description 主进程图片翻译任务客户端，负责提交、轮询并返回可直接绘制的译图。
 * @author 鸡哥
 */

import { app } from 'electron';
import { randomUUID } from 'crypto';

const API_BASE = process.env.NODE_ENV === 'development'
  ? 'https://test.server.pyisland.com/api'
  : 'https://server.pyisland.com/api';
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_COUNT = 80;
const REQUEST_TIMEOUT_MS = 30000;

type ImageTranslationTask = {
  taskId: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  resultUrl?: string | null;
  errorMessage?: string | null;
};

type ApiResult = {
  success: boolean;
  data?: ImageTranslationTask;
  message?: string;
};

/** 图片翻译错误码，由渲染进程映射为本地化文案。 */
export const IMAGE_TRANSLATE_ERROR = {
  LOGIN_REQUIRED: 'loginRequired',
  INVALID_DATA: 'invalidData',
  SUBMIT_FAILED: 'submitFailed',
  QUERY_FAILED: 'queryFailed',
  TRANSLATION_FAILED: 'translationFailed',
  NO_RESULT_URL: 'noResultUrl',
  TIMEOUT: 'timeout',
  ABORTED: 'aborted',
} as const;

export type CaptureTranslationResult = {
  success: boolean;
  translatedImage?: string;
  code?: string;
  message?: string;
};

function buildHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'X-App-Name': 'eisland',
    'X-Client-Version': app.getVersion(),
    'X-Timestamp': String(Date.now()),
    'X-Nonce': randomUUID(),
    'X-Static-Asset-Node': 'r2',
  };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [metadata, encoded = ''] = dataUrl.split(',', 2);
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? 'image/png';
  return new Blob([Buffer.from(encoded, 'base64')], { type: mimeType });
}

async function parseApiResponse(response: Response): Promise<ApiResult> {
  try {
    const payload = await response.json() as {
      message?: string;
      data?: ImageTranslationTask;
    };
    if (response.ok && payload.data) return { success: true, data: payload.data };
    return { success: false, message: payload.message ?? `HTTP ${response.status}` };
  } catch {
    return { success: false, message: response.ok ? '响应解析失败' : `HTTP ${response.status}` };
  }
}

async function requestWithTimeout(url: string, init: RequestInit, signal: AbortSignal): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const abort = (): void => timeoutController.abort();
  if (signal.aborted) timeoutController.abort();
  signal.addEventListener('abort', abort, { once: true });
  try {
    return await fetch(url, { ...init, signal: timeoutController.signal });
  } finally {
    clearTimeout(timeoutId);
    signal.removeEventListener('abort', abort);
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

async function downloadAsDataUrl(url: string, signal: AbortSignal): Promise<string> {
  if (url.startsWith('data:image/')) return url;
  const response = await requestWithTimeout(url, { method: 'GET' }, signal);
  if (!response.ok) throw new Error(`下载翻译图片失败: HTTP ${response.status}`);
  const mimeType = response.headers.get('content-type')?.split(';')[0] || 'image/png';
  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:${mimeType};base64,${bytes.toString('base64')}`;
}

/** 提交图片翻译并等待最终译图。 */
export async function translateCaptureImage(
  token: string,
  dataUrl: string,
  sourceLanguage: string,
  targetLanguage: string,
  signal: AbortSignal,
): Promise<CaptureTranslationResult> {
  if (!token.trim()) return { success: false, code: IMAGE_TRANSLATE_ERROR.LOGIN_REQUIRED, message: '请先登录 Pro 账号后再使用图片翻译' };
  if (!dataUrl.startsWith('data:image/')) return { success: false, code: IMAGE_TRANSLATE_ERROR.INVALID_DATA, message: '无效的截图数据' };

  try {
    const formData = new FormData();
    formData.append('file', dataUrlToBlob(dataUrl), 'capture-translate.png');
    formData.append('sourceLanguage', sourceLanguage || 'auto');
    formData.append('targetLanguage', targetLanguage || 'zh');

    const submitted = await parseApiResponse(await requestWithTimeout(
      `${API_BASE}/v1/toolbox/image-translations`,
      { method: 'POST', headers: buildHeaders(token), body: formData },
      signal,
    ));
    if (!submitted.success || !submitted.data?.taskId) {
      return { success: false, code: IMAGE_TRANSLATE_ERROR.SUBMIT_FAILED, message: submitted.message ?? '图片翻译任务提交失败' };
    }

    for (let count = 0; count < MAX_POLL_COUNT; count += 1) {
      await delay(POLL_INTERVAL_MS, signal);
      const result = await parseApiResponse(await requestWithTimeout(
        `${API_BASE}/v1/toolbox/image-translations/${encodeURIComponent(submitted.data.taskId)}`,
        { method: 'GET', headers: buildHeaders(token) },
        signal,
      ));
      if (!result.success || !result.data) {
        if (count < 2) continue;
        return { success: false, code: IMAGE_TRANSLATE_ERROR.QUERY_FAILED, message: result.message ?? '查询图片翻译任务失败' };
      }
      if (result.data.status === 'FAILED') {
        return { success: false, code: IMAGE_TRANSLATE_ERROR.TRANSLATION_FAILED, message: result.data.errorMessage ?? '图片翻译失败' };
      }
      if (result.data.status === 'SUCCEEDED') {
        if (!result.data.resultUrl) return { success: false, code: IMAGE_TRANSLATE_ERROR.NO_RESULT_URL, message: '服务端未返回翻译图片' };
        return {
          success: true,
          translatedImage: await downloadAsDataUrl(result.data.resultUrl, signal),
        };
      }
    }

    return { success: false, code: IMAGE_TRANSLATE_ERROR.TIMEOUT, message: '图片翻译等待超时，请稍后重试' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, code: IMAGE_TRANSLATE_ERROR.ABORTED, message: '图片翻译请求已取消或超时' };
    }
    return { success: false, code: IMAGE_TRANSLATE_ERROR.TRANSLATION_FAILED, message: error instanceof Error ? error.message : '图片翻译失败' };
  }
}
