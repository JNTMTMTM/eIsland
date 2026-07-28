/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 */

/**
 * @file useCaptureTranslateBridge.ts
 * @description 截图翻译 IPC 订阅与异步任务状态机桥接 Hook。
 * @author 鸡哥
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/isLandStore';
import { fetchImageTranslationTask, submitImageTranslation } from '../../../../api/tools/imageTranslationApi';
import { readLocalToken } from '../../../../utils/userAccount';
import { extractTranslatedText } from '../utils';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_COUNT = 80;

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      window.clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

/** 接收截图窗口事件，驱动图片翻译状态机。 */
export function useCaptureTranslateBridge(): void {
  const { i18n } = useTranslation();

  useEffect(() => {
    let activeController: AbortController | null = null;
    const unsubscribe = window.api.onCaptureTranslateRequest((dataUrl) => {
      activeController?.abort();
      const requestController = new AbortController();
      activeController = requestController;
      const token = readLocalToken();
      const store = useIslandStore.getState();
      if (!token) {
        store.setCaptureTranslate({
          status: 'failed',
          originalImage: dataUrl,
          taskId: null,
          translatedImage: null,
          translatedText: '',
          errorMessage: '请先登录 Pro 账号后再使用图片翻译',
        });
        return;
      }

      const targetLanguage = i18n.resolvedLanguage?.startsWith('zh') ? 'zh' : 'en';
      store.setCaptureTranslate({
        status: 'submitting',
        originalImage: dataUrl,
        taskId: null,
        translatedImage: null,
        translatedText: '',
        errorMessage: '',
      });

      void (async () => {
        const submitted = await submitImageTranslation(token, dataUrl, targetLanguage, requestController.signal);
        if (!submitted.success || !submitted.data) {
          useIslandStore.getState().updateCaptureTranslate({
            status: 'failed',
            errorMessage: submitted.message ?? '图片翻译任务提交失败',
          });
          return;
        }

        const taskId = submitted.data.taskId;
        useIslandStore.getState().updateCaptureTranslate({ status: 'processing', taskId });

        for (let count = 0; count < MAX_POLL_COUNT; count += 1) {
          await delay(POLL_INTERVAL_MS, requestController.signal);
          const result = await fetchImageTranslationTask(token, taskId, requestController.signal);
          if (!result.success || !result.data) {
            if (count < 2) continue;
            useIslandStore.getState().updateCaptureTranslate({
              status: 'failed',
              errorMessage: result.message ?? '查询图片翻译任务失败',
            });
            return;
          }

          const task = result.data;
          if (task.status === 'SUCCEEDED') {
            useIslandStore.getState().updateCaptureTranslate({
              status: 'succeeded',
              translatedImage: task.resultUrl,
              translatedText: extractTranslatedText(task.translationResult),
              errorMessage: '',
            });
            return;
          }
          if (task.status === 'FAILED') {
            useIslandStore.getState().updateCaptureTranslate({
              status: 'failed',
              errorMessage: task.errorMessage ?? '图片翻译失败',
            });
            return;
          }
        }

        useIslandStore.getState().updateCaptureTranslate({
          status: 'failed',
          errorMessage: '图片翻译等待超时，请稍后重试',
        });
      })().catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        useIslandStore.getState().updateCaptureTranslate({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : '图片翻译失败',
        });
      });
    });

    return () => {
      activeController?.abort();
      unsubscribe();
    };
  }, [i18n.resolvedLanguage]);
}