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

import type { Worker } from 'tesseract.js';

export type CaptureLocalOcrResult = {
  success: boolean;
  text?: string;
  code?: string;
  message?: string;
};

/** 初始化中的 worker 也必须共享，否则并发请求会重复加载中英文模型。 */
interface WorkerSlot {
  promise: Promise<Worker>;
  activeJobs: number;
  retire: boolean;
  disposal?: Promise<void>;
}

let cachedWorker: WorkerSlot | null = null;
const activeRequests = new Set<AbortController>();
let idleTimer: ReturnType<typeof setTimeout> | null = null;

/** 保留短时间连续识别的复用机会，空闲一分钟即释放模型内存。 */
const WORKER_IDLE_TIMEOUT_MS = 60 * 1000;

/**
 * 获取或创建 Tesseract 单例 worker。
 * 首次调用时初始化，后续调用直接复用。
 * @returns 包含共享初始化 Promise 和活动任务计数的 worker 槽位。
 */
function getWorker(): WorkerSlot {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  cachedWorker ??= {
    promise: import('tesseract.js').then(({ createWorker }) => createWorker('eng+chi_sim')),
    activeJobs: 0,
    retire: false,
  };
  cachedWorker.activeJobs += 1;
  return cachedWorker;
}

/**
 * 仅在最后一个识别任务结束后开始空闲倒计时。
 * @param slot - 等待空闲释放的 worker 槽位。
 */
function scheduleIdleDispose(slot: WorkerSlot): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    void resetWorker(slot);
  }, WORKER_IDLE_TIMEOUT_MS);
  // 允许 Node 在 app 退出前不因该定时器而阻塞
  if (idleTimer.unref) idleTimer.unref();
}

/**
 * 重置单例 worker（worker 出错或空闲超时后调用，下次请求会重新创建）。
 * @param slot - 待释放的 worker 槽位，默认当前缓存槽位。
 * @returns worker 初始化结束并完成释放后兑现的 Promise。
 */
async function resetWorker(slot = cachedWorker): Promise<void> {
  if (!slot) return;
  if (cachedWorker === slot) {
    cachedWorker = null;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }
  // 取消可能发生在模型初始化期间；初始化完成后仍必须释放该 worker。
  slot.disposal ??= slot.promise.then((worker) => worker.terminate()).then(() => {}, () => {});
  await slot.disposal;
}

/** 应用退出时清理 worker。 */
export async function disposeLocalOcrWorker(): Promise<void> {
  activeRequests.forEach((controller) => controller.abort());
  await resetWorker();
}

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
  if (signal.aborted) {
    return { success: false, code: 'ocrTimeout', message: '文字识别请求已取消' };
  }

  const image = dataUrlToBuffer(dataUrl);
  if (!image) {
    return { success: false, code: 'invalidData', message: '无效的截图数据' };
  }

  const controller = new AbortController();
  const abort = (): void => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  activeRequests.add(controller);
  const slot = getWorker();
  let cancel: () => void = () => {};
  const canceled = new Promise<never>((_resolve, reject) => {
    cancel = () => reject(new DOMException('Aborted', 'AbortError'));
    controller.signal.addEventListener('abort', cancel, { once: true });
  });

  try {
    const worker = await Promise.race([slot.promise, canceled]);
    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    // Tesseract 的 terminate 不会拒绝正在等待的 recognize promise，必须主动结束等待。
    const result = await Promise.race([worker.recognize(image), canceled]);
    return {
      success: true,
      text: typeof result.data.text === 'string' ? result.data.text.trim() : '',
    };
  } catch (error) {
    slot.retire = true;
    if (controller.signal.aborted) {
      return { success: false, code: 'ocrTimeout', message: '文字识别请求已取消' };
    }
    return {
      success: false,
      code: 'ocrFailed',
      message: error instanceof Error ? error.message : '本地文字识别失败',
    };
  } finally {
    signal.removeEventListener('abort', abort);
    controller.signal.removeEventListener('abort', cancel);
    activeRequests.delete(controller);
    slot.activeJobs -= 1;
    if (slot.activeJobs === 0) {
      if (slot.retire) void resetWorker(slot);
      else if (cachedWorker === slot) scheduleIdleDispose(slot);
    }
  }
}
