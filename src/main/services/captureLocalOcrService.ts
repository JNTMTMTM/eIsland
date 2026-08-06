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
 * @file captureLocalOcrService.ts
 * @description 使用 Tesseract.js 在本机识别截图文字，不上传图片。
 * @author 鸡哥
 */

import { createWorker, type Worker } from 'tesseract.js';

export type CaptureLocalOcrResult = {
  success: boolean;
  text?: string;
  code?: string;
  message?: string;
};

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const [metadata, encoded = ''] = dataUrl.split(',', 2);
  if (!/^data:image\/(?:png|jpeg|bmp|gif|tiff|webp);base64$/i.test(metadata) || !encoded) {
    return null;
  }
  const buffer = Buffer.from(encoded, 'base64');
  return buffer.length > 0 ? buffer : null;
}

/**
 * 使用中英文模型在本机识别截图文字。
 * @param dataUrl - 待识别图片的 data URL。
 * @param signal - 截图窗口关闭时用于中止识别的信号。
 * @returns 本地 OCR 识别结果。
 */
export async function recognizeCaptureTextLocally(
  dataUrl: string,
  signal: AbortSignal,
): Promise<CaptureLocalOcrResult> {
  const image = dataUrlToBuffer(dataUrl);
  if (!image) {
    return { success: false, code: 'invalidData', message: '无效的截图数据' };
  }

  let worker: Worker | null = null;
  let terminated = false;
  const terminate = async (): Promise<void> => {
    if (!worker || terminated) return;
    terminated = true;
    await worker.terminate();
  };
  const abort = (): void => {
    void terminate();
  };
  signal.addEventListener('abort', abort, { once: true });

  try {
    if (signal.aborted) {
      return { success: false, code: 'ocrTimeout', message: '文字识别请求已取消' };
    }
    worker = await createWorker('eng+chi_sim');
    if (signal.aborted) {
      return { success: false, code: 'ocrTimeout', message: '文字识别请求已取消' };
    }
    const result = await worker.recognize(image);
    return {
      success: true,
      text: typeof result.data.text === 'string' ? result.data.text.trim() : '',
    };
  } catch (error) {
    if (signal.aborted) {
      return { success: false, code: 'ocrTimeout', message: '文字识别请求已取消' };
    }
    return {
      success: false,
      code: 'ocrFailed',
      message: error instanceof Error ? error.message : '本地文字识别失败',
    };
  } finally {
    signal.removeEventListener('abort', abort);
    await terminate().catch(() => {});
  }
}