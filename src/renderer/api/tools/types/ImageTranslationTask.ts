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
 * @file ImageTranslationTask.ts
 * @description 图片翻译服务端任务及客户端结果类型。
 * @author 鸡哥
 */

/** 图片翻译任务状态。 */
export type ImageTranslationTaskStatus = 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';

/** 服务端图片翻译任务。 */
export interface ImageTranslationTask {
  taskId: string;
  status: ImageTranslationTaskStatus;
  sourceLanguage: string;
  targetLanguage: string;
  sourceUrl: string | null;
  resultUrl: string | null;
  ocrResult: unknown;
  translationResult: unknown;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface ImageTranslationApiResult {
  success: boolean;
  message?: string;
  data?: ImageTranslationTask;
}