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
 * @file TranslationTab.tsx
 * @description Expanded 状态翻译页面组件。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { TRANSLATE_LANGUAGES, TRANSLATE_TARGET_LANGUAGES } from '../../../../maxExpand/components/tools/config/translateToolConfig';
import { useTranslateTool } from '../../../../maxExpand/components/tools/hooks/useTranslateTool';
import { TranslationLangSelect } from './TranslationLangSelect';
import type { ReactElement } from 'react';

/**
 * Expanded 翻译页面
 * @returns 翻译工作区
 */
export function TranslationTab(): ReactElement {
  const { t } = useTranslation();
  const {
    sourceLang,
    targetLang,
    sourceText,
    resultText,
    translating,
    setSourceLang,
    setTargetLang,
    setSourceText,
    handleSwapLanguages,
    handleTranslate,
    handleCopyResult,
    handleClearAll,
  } = useTranslateTool();

  return (
    <div className="translation-tab expand-tab-panel">
      <div className="translation-workspace">
        <section className="translation-pane translation-pane-source">
          <div className="translation-pane-toolbar">
            <div className="translation-language-block">
              <TranslationLangSelect options={TRANSLATE_LANGUAGES} value={sourceLang} onChange={setSourceLang} />
            </div>
          </div>
          <textarea
            className="translation-editor-textarea"
            placeholder={t('maxExpand.toolbox.translate.inputPlaceholder')}
            value={sourceText}
            onWheelCapture={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
            onChange={(event) => setSourceText(event.target.value)}
          />
        </section>

        <div className="translation-center-actions">
          <button
            className="translation-swap-btn"
            type="button"
            onClick={handleSwapLanguages}
            disabled={sourceLang === 'auto'}
            title={t('maxExpand.toolbox.translate.swap')}
            aria-label={t('maxExpand.toolbox.translate.swap')}
          >
            <img className="translation-action-icon" src={SvgIcon.SWITCHING} alt="" draggable={false} />
          </button>
          <button
            className="translation-primary-btn"
            type="button"
            disabled={!sourceText.trim() || translating}
            onClick={handleTranslate}
            title={translating
              ? t('maxExpand.toolbox.translate.translating')
              : t('maxExpand.toolbox.translate.translateBtn')}
            aria-label={translating
              ? t('maxExpand.toolbox.translate.translating')
              : t('maxExpand.toolbox.translate.translateBtn')}
          >
            <img className="translation-action-icon" src={SvgIcon.LANGUAGE} alt="" draggable={false} />
          </button>
          <button
            className="translation-secondary-btn"
            type="button"
            disabled={!sourceText && !resultText}
            onClick={handleClearAll}
            title={t('maxExpand.toolbox.translate.clear')}
            aria-label={t('maxExpand.toolbox.translate.clear')}
          >
            <img className="translation-action-icon" src={SvgIcon.CANCEL} alt="" draggable={false} />
          </button>
          <button
            className="translation-copy-btn"
            type="button"
            disabled={!resultText}
            onClick={handleCopyResult}
            title={t('maxExpand.toolbox.translate.copy')}
            aria-label={t('maxExpand.toolbox.translate.copy')}
          >
            <img className="translation-action-icon" src={SvgIcon.COPY} alt="" draggable={false} />
          </button>
        </div>

        <section className="translation-pane translation-pane-result">
          <div className="translation-pane-toolbar">
            <div className="translation-language-block">
              <TranslationLangSelect options={TRANSLATE_TARGET_LANGUAGES} value={targetLang} onChange={setTargetLang} />
            </div>
          </div>
          <textarea
            className="translation-editor-textarea translation-editor-textarea-result"
            placeholder={t('maxExpand.toolbox.translate.outputPlaceholder')}
            value={resultText}
            onWheelCapture={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
            readOnly
          />
        </section>
      </div>
    </div>
  );
}
