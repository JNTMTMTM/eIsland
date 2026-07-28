/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 */

/**
 * @file CaptureTranslatePanel.tsx
 * @description 图片翻译原图与译图对比面板。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { Languages, LoaderCircle, X } from 'lucide-react';
import useIslandStore from '../../../../store/isLandStore';

/** 图片翻译结果面板。 */
export function CaptureTranslatePanel(): ReactElement {
  const { captureTranslate, setIdle } = useIslandStore();
  const isLoading = captureTranslate.status === 'submitting' || captureTranslate.status === 'processing';

  return (
    <section className="capture-translate-panel">
      <header className="capture-translate-header">
        <div className="capture-translate-title">
          <span className="capture-translate-title-icon"><Languages size={18} /></span>
          <div>
            <strong>图片翻译</strong>
            <span>{isLoading ? '正在识别并翻译图片内容' : '原图与翻译结果对比'}</span>
          </div>
        </div>
        <button type="button" className="capture-translate-icon-button" onClick={() => setIdle(true)} aria-label="关闭">
          <X size={17} />
        </button>
      </header>

      <div className="capture-translate-body">
        <div className="capture-translate-image-card">
          <span className="capture-translate-card-label">原始图片</span>
          <img src={captureTranslate.originalImage} alt="原始截图" />
        </div>

        <div className="capture-translate-image-card is-result">
          <span className="capture-translate-card-label">翻译图片</span>
          {captureTranslate.translatedImage ? (
            <img src={captureTranslate.translatedImage} alt="翻译后的图片" />
          ) : (
            <div className={`capture-translate-result-placeholder is-${captureTranslate.status}`}>
              {isLoading ? (
                <>
                  <LoaderCircle size={30} className="capture-translate-spinner" />
                  <span>{captureTranslate.status === 'submitting' ? '正在提交翻译任务' : '服务端正在生成翻译图片'}</span>
                </>
              ) : null}
              {captureTranslate.status === 'failed' ? (
                <span className="capture-translate-error">{captureTranslate.errorMessage}</span>
              ) : null}
              {captureTranslate.status === 'succeeded' ? <span>服务端未返回翻译图片</span> : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}