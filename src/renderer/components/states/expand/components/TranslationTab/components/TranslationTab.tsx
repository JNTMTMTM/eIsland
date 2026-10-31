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

import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../utils/SvgIcon';
import { resolveCountryIcon } from '../../../../utils/SvgIcon/country-icon';
import { TRANSLATE_LANGUAGES, TRANSLATE_TARGET_LANGUAGES } from '../../maxExpand/components/tools/config/translateToolConfig';
import { useTranslateTool } from '../../maxExpand/components/tools/hooks/useTranslateTool';

interface TranslationLanguageOption {
  code: string;
  labelKey: string;
}

function TranslationLangSelect({
  options,
  value,
  onChange,
}: {
  options: readonly TranslationLanguageOption[];
  value: string;
  onChange: (code: string) => void;
}): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.code === value);
  const selectedFlag = resolveCountryIcon(value);
  const selectedIcon = selectedFlag ?? (value === 'auto' ? SvgIcon.AI : undefined);

  useEffect(() => {
    if (!open || !wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const containerRect = wrapperRef.current.closest('.translation-tab')?.getBoundingClientRect();
    const containerBottom = containerRect?.bottom ?? window.innerHeight;
    const availableHeight = Math.max(80, containerBottom - rect.bottom - 8);
    const preferredHeight = options.length * 30 + 8;
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(preferredHeight, availableHeight),
    });
  }, [open, options.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="translation-lang-dropdown" ref={wrapperRef}>
      <button
        className="translation-lang-dropdown-trigger"
        type="button"
        aria-label={t('expanded.translation.languageAria')}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {selectedIcon ? (
          <img
            className={selectedFlag ? 'translation-lang-flag no-filter' : 'translation-lang-ai-icon'}
            src={selectedIcon}
            alt=""
            draggable={false}
          />
        ) : (
          <span className="translation-lang-flag-placeholder" />
        )}
        <span className="translation-lang-dropdown-label">
          {selected ? t(selected.labelKey) : value}
        </span>
        <span className="translation-lang-dropdown-arrow">▾</span>
      </button>
      {open && createPortal(
        <div className="translation-lang-dropdown-menu" ref={menuRef} style={menuStyle}>
          {options.map((lang) => {
            const flag = resolveCountryIcon(lang.code);
            const icon = flag ?? (lang.code === 'auto' ? SvgIcon.AI : undefined);
            return (
              <button
                key={lang.code}
                className={`translation-lang-dropdown-item ${lang.code === value ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  onChange(lang.code);
                  setOpen(false);
                }}
              >
                {icon ? (
                  <img
                    className={flag ? 'translation-lang-flag no-filter' : 'translation-lang-ai-icon'}
                    src={icon}
                    alt=""
                    draggable={false}
                  />
                ) : (
                  <span className="translation-lang-flag-placeholder" />
                )}
                <span>{t(lang.labelKey)}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

/** Expanded 翻译页面 */
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