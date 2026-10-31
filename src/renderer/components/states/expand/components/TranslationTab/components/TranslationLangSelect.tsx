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
 * @file TranslationLangSelect.tsx
 * @description Expanded 翻译页带国旗图标的语言下拉，菜单通过 portal 挂载到 body。
 * @author 鸡哥
 */

import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTranslationLangSelect } from '../hooks/useTranslationLangSelect';
import { resolveLanguageIcon } from '../utils/translationUtils';
import type { ReactElement } from 'react';
import type { TranslationLangSelectProps } from '../types/translationTypes';

/**
 * 语言下拉选择器。
 * @param props - 组件入参
 * @param props.options - 可选语言
 * @param props.value - 当前语言代码
 * @param props.onChange - 选择回调
 * @returns 下拉元素
 */
export function TranslationLangSelect({
  options,
  value,
  onChange,
}: TranslationLangSelectProps): ReactElement {
  const { t } = useTranslation();
  const { open, setOpen, menuStyle, wrapperRef, menuRef } = useTranslationLangSelect(options.length);
  const selected = options.find((option) => option.code === value);
  const { flag: selectedFlag, icon: selectedIcon } = resolveLanguageIcon(value);

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
            const { flag, icon } = resolveLanguageIcon(lang.code);
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
