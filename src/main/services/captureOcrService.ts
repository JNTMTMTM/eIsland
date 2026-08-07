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
 */

/**
 * @file captureOcrService.ts
 * @description 主进程截图 OCR 客户端，通过 eIsland 服务端转发阿里云文字识别请求。
 * @author 鸡哥
 */

import { app, nativeImage } from 'electron';
import { randomUUID } from 'crypto';

const API_BASE = process.env.NODE_ENV === 'development'
  ? 'https://test.server.pyisland.com/api'
  : 'https://server.pyisland.com/api';
const REQUEST_TIMEOUT_MS = 30000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIN_IMAGE_SIDE = 15;
const MAX_IMAGE_SIDE = 8192;
const MAX_ASPECT_RATIO = 50;

export type CaptureOcrResult = {
  success: boolean;
  text?: string;
  requestId?: string;
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
  };
}

function dataUrlToImage(dataUrl: string): { blob: Blob; bytes: number; width: number; height: number } | null {
  const [metadata, encoded = ''] = dataUrl.split(',', 2);
  const mimeType = metadata.match(/^data:(image\/(?:png|jpeg|bmp|gif|tiff|webp));base64$/i)?.[1];
  if (!mimeType || !encoded) return null;
  const buffer = Buffer.from(encoded, 'base64');
  const size = nativeImage.createFromBuffer(buffer).getSize();
  return {
    blob: new Blob([buffer], { type: mimeType.toLowerCase() }),
    bytes: buffer.length,
    width: size.width,
    height: size.height,
  };
}

function hasSupportedDimensions(width: number, height: number): boolean {
  if (width < MIN_IMAGE_SIDE || height < MIN_IMAGE_SIDE) return false;
  if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) return false;
  return Math.max(width / height, height / width) < MAX_ASPECT_RATIO;
}

/**
 * 提交截图并返回识别文本。
 * @param token - 登录用户 token。
 * @param dataUrl - PNG 等支持格式的图片 data URL。
 * @param signal - 截图窗口关闭时用于中止请求的信号。
 * @returns OCR 识别结果。
 */
export async function recognizeCaptureText(
  token: string,
  dataUrl: string,
  signal: AbortSignal,
): Promise<CaptureOcrResult> {
  if (!token.trim()) {
    return { success: false, code: 'ocrLoginRequired', message: '请先登录后再使用文字识别' };
  }
  const image = dataUrlToImage(dataUrl);
  if (!image) {
    return { success: false, code: 'invalidData', message: '无效的截图数据' };
  }
  if (image.bytes > MAX_IMAGE_BYTES) {
    return { success: false, code: 'imageTooLarge', message: '截图不能超过 10MB' };
  }
  if (!hasSupportedDimensions(image.width, image.height)) {
    return { success: false, code: 'invalidImageDimensions', message: '截图尺寸不符合 OCR 要求' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abort = (): void => controller.abort();
  if (signal.aborted) controller.abort();
  signal.addEventListener('abort', abort, { once: true });

  try {
    const formData = new FormData();
    formData.append('image', image.blob, 'capture.png');
    const response = await fetch(`${API_BASE}/v1/toolbox/ocr`, {
      method: 'POST',
      headers: buildHeaders(token),
      body: formData,
      signal: controller.signal,
    });
    const payload = await response.json() as {
      code?: number;
      message?: string;
      errorCode?: string;
      data?: { text?: string; requestId?: string };
    };
    if (response.ok && payload.code === 200 && payload.data) {
      return {
        success: true,
        text: typeof payload.data.text === 'string' ? payload.data.text : '',
        requestId: payload.data.requestId,
      };
    }
    return {
      success: false,
      code: payload.errorCode ?? 'ocrFailed',
      message: payload.message ?? `HTTP ${response.status}`,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, code: 'ocrTimeout', message: '文字识别请求已取消或超时' };
    }
    return {
      success: false,
      code: 'ocrFailed',
      message: error instanceof Error ? error.message : '文字识别失败',
    };
  } finally {
    clearTimeout(timeoutId);
    signal.removeEventListener('abort', abort);
  }
}