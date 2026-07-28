/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 */

/**
 * @file CaptureTranslatePanel.tsx
 * @description 图片翻译任务状态、结果图片与译文展示面板。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { Check, Copy, Languages, LoaderCircle, X } from 'lucide-react';
import useIslandStore from '../../../../store/isLandStore';

/** 图片翻译结果面板。 */
export function CaptureTranslatePanel(): ReactElement {
  const { captureTranslate, setIdle } = useIslandStore();
  const isLoading = captureTranslate.status === 'submitting' || captureTranslate.status === 'processing';

  const copyText = (): void => {
    if (!captureTranslate.translatedText) return;
    navigator.clipboard.writeText(captureTranslate.translatedText).catch(() => {});
  };

  return (
    <section className="capture-translate-panel">
      <header className="capture-translate-header">
        <div className="capture-translate-title">
          <span className="capture-translate-title-icon"><Languages size={18} /></span>
          <div>
            <strong>图片翻译</strong>
            <span>{isLoading ? '正在识别并翻译图片内容' : '翻译图片与文本结果'}</span>
          </div>
        </div>
        <button type="button" className="capture-translate-icon-button" onClick={() => setIdle(true)} aria-label="关闭">
          <X size={17} />
        </button>
      </header>

      <div className="capture-translate-body">
        <div className="capture-translate-image-card">
          <span className="capture-translate-card-label">{captureTranslate.translatedImage ? '翻译图片' : '原始截图'}</span>
          <img
            src={captureTranslate.translatedImage ?? captureTranslate.originalImage}
            alt={captureTranslate.translatedImage ? '翻译后的图片' : '待翻译截图'}
          />
          {isLoading ? (
            <div className="capture-translate-loading-mask">
              <LoaderCircle size={28} className="capture-translate-spinner" />
              <span>{captureTranslate.status === 'submitting' ? '正在提交任务' : '服务端处理中'}</span>
            </div>
          ) : null}
        </div>

        <div className="capture-translate-text-card">
          <div className="capture-translate-text-header">
            <span>翻译文本</span>
            {captureTranslate.translatedText ? (
              <button type="button" className="capture-translate-copy-button" onClick={copyText}>
                <Copy size={14} />复制
              </button>
            ) : null}
          </div>

          <div className={`capture-translate-text-content is-${captureTranslate.status}`}>
            {captureTranslate.status === 'succeeded' ? (
              captureTranslate.translatedText
                ? <pre>{captureTranslate.translatedText}</pre>
                : <div className="capture-translate-feedback"><Check size={18} />图片翻译完成，服务端未返回独立文本</div>
            ) : null}
            {isLoading ? <div className="capture-translate-feedback"><LoaderCircle size={18} className="capture-translate-spinner" />正在提取翻译文本…</div> : null}
            {captureTranslate.status === 'failed' ? <div className="capture-translate-error">{captureTranslate.errorMessage}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}