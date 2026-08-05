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
 * @file ScreenshotSettingsPage.tsx
 * @description 设置页面 - 软件设置截图设置子界面
 * @author 鸡哥
 */

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../../../utils/SvgIcon';
import { resolveCountryIcon } from '../../../../../../../../utils/SvgIcon/country-icon';
import { TRANSLATE_LANGUAGES, TRANSLATE_TARGET_LANGUAGES } from '../../../../tools/config/translateToolConfig';
import {
  SCREENSHOT_TRANSLATE_SOURCE_LANG_STORE_KEY,
  SCREENSHOT_TRANSLATE_TARGET_LANG_STORE_KEY,
  SCREENSHOT_ENGINE_STORE_KEY,
} from '../../../config/settingsTabConfig';

/** 翻译语言选项 */
interface LangOption {
  readonly code: string;
  readonly labelKey: string;
}

/**
 * 翻译语言下拉选择器
 * @param options - 可选语言列表
 * @param value - 当前选中的语言代码
 * @param onChange - 语言变更回调
 */
function TranslateLangDropdown({
  options,
  value,
  onChange,
}: {
  options: readonly LangOption[];
  value: string;
  onChange: (code: string) => void;
}): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selected = options.find((o) => o.code === value);
  const selectedFlag = resolveCountryIcon(value);
  const selectedIcon = selectedFlag ?? (value === 'auto' ? SvgIcon.AI : undefined);

  return (
    <div className="translate-lang-dropdown" ref={wrapperRef}>
      <button
        type="button"
        className="translate-lang-dropdown-trigger"
        onClick={() => setOpen((prev) => !prev)}
      >
        {selectedIcon ? (
          <img
            className={selectedFlag ? 'translate-lang-flag no-filter' : 'translate-lang-ai-icon'}
            src={selectedIcon}
            alt=""
            draggable={false}
          />
        ) : (
          <span className="translate-lang-flag-placeholder" />
        )}
        <span className="translate-lang-dropdown-label">
          {selected ? t(selected.labelKey) : value}
        </span>
        <span className="translate-lang-dropdown-arrow">▾</span>
      </button>
      {open && (
        <div className="translate-lang-dropdown-menu">
          {options.map((lang) => {
            const flag = resolveCountryIcon(lang.code);
            const icon = flag ?? (lang.code === 'auto' ? SvgIcon.AI : undefined);
            return (
              <button
                key={lang.code}
                type="button"
                className={`translate-lang-dropdown-item ${lang.code === value ? 'active' : ''}`}
                onClick={() => {
                  onChange(lang.code);
                  setOpen(false);
                }}
              >
                {icon ? (
                  <img
                    className={flag ? 'translate-lang-flag no-filter' : 'translate-lang-ai-icon'}
                    src={icon}
                    alt=""
                    draggable={false}
                  />
                ) : (
                  <span className="translate-lang-flag-placeholder" />
                )}
                <span>{t(lang.labelKey)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 渲染截图设置页面
 * @returns 截图设置页面
 */
export function ScreenshotSettingsPage(): ReactElement {
  const { t } = useTranslation();
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [screenshotEngine, setScreenshotEngine] = useState<'plugin' | 'js'>('plugin');

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(SCREENSHOT_TRANSLATE_SOURCE_LANG_STORE_KEY).then((value) => {
      if (cancelled || typeof value !== 'string') return;
      setSourceLang(value);
    }).catch(() => {});
    window.api.storeRead(SCREENSHOT_TRANSLATE_TARGET_LANG_STORE_KEY).then((value) => {
      if (cancelled || typeof value !== 'string') return;
      setTargetLang(value);
    }).catch(() => {});
    window.api.storeRead(SCREENSHOT_ENGINE_STORE_KEY).then((value) => {
      if (cancelled) return;
      setScreenshotEngine(value === 'js' ? 'js' : 'plugin');
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSourceLangChange = (code: string): void => {
    setSourceLang(code);
    void window.api.storeWrite(SCREENSHOT_TRANSLATE_SOURCE_LANG_STORE_KEY, code);
  };

  const handleTargetLangChange = (code: string): void => {
    setTargetLang(code);
    void window.api.storeWrite(SCREENSHOT_TRANSLATE_TARGET_LANG_STORE_KEY, code);
  };

  const handleScreenshotEngineChange = (engine: 'plugin' | 'js'): void => {
    setScreenshotEngine(engine);
    void window.api.storeWrite(SCREENSHOT_ENGINE_STORE_KEY, engine);
  };

  return (
    <div className="settings-screenshot-page-panel">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">
              {t('settings.app.screenshotSettings.engineTitle', { defaultValue: '截图引擎' })}
            </div>
            <div className="settings-card-subtitle">
              {t('settings.app.screenshotSettings.engineHint', { defaultValue: '选择截图使用的引擎。插件模式支持多显示器截图，JS 模式兼容性更好。' })}
            </div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="radio"
                name="screenshot-engine"
                checked={screenshotEngine === 'plugin'}
                onChange={() => { handleScreenshotEngineChange('plugin'); }}
              />
              {t('settings.app.screenshotSettings.enginePlugin', { defaultValue: '插件模式' })}
            </label>
            <label className="settings-card-check">
              <input
                type="radio"
                name="screenshot-engine"
                checked={screenshotEngine === 'js'}
                onChange={() => { handleScreenshotEngineChange('js'); }}
              />
              {t('settings.app.screenshotSettings.engineJs', { defaultValue: 'JS 模式' })}
            </label>
          </div>
        </div>
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">
              {t('settings.app.screenshotSettings.translateTitle', { defaultValue: '截图翻译语言' })}
            </div>
            <div className="settings-card-subtitle">
              {t('settings.app.screenshotSettings.translateHint', { defaultValue: '配置截图翻译的源语言和目标语言。' })}
            </div>
          </div>
          <div className="settings-card-body">
            <div className="translate-lang-row">
              <TranslateLangDropdown
                options={TRANSLATE_LANGUAGES}
                value={sourceLang}
                onChange={handleSourceLangChange}
              />
              <button
                className="translate-swap-btn"
                type="button"
                onClick={() => {
                  if (sourceLang === 'auto') return;
                  const nextSource = targetLang;
                  const nextTarget = sourceLang;
                  handleSourceLangChange(nextSource);
                  handleTargetLangChange(nextTarget);
                }}
                disabled={sourceLang === 'auto'}
                title={t('maxExpand.toolbox.translate.swap')}
              >
                <img className="translate-swap-icon" src={SvgIcon.SWITCHING} alt="" draggable={false} />
              </button>
              <TranslateLangDropdown
                options={TRANSLATE_TARGET_LANGUAGES}
                value={targetLang}
                onChange={handleTargetLangChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
