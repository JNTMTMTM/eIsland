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
 * @file i18n/index.ts
 * @description 国际化初始化：加载语言资源、检测语言、提供运行时切换能力
 * @author 鸡哥
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from '../../../i18n/zh-CN.json';
import enUS from '../../../i18n/en-US.json';

const I18N_LANGUAGE_STORE_KEY = 'i18n-language';
const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function normalizeLanguage(raw: string | null | undefined): AppLanguage {
  if (!raw) return 'zh-CN';
  if (raw === 'zh' || raw === 'zh-CN' || raw === 'zh-Hans' || raw.startsWith('zh-')) return 'zh-CN';
  if (raw === 'en' || raw === 'en-US' || raw.startsWith('en-')) return 'en-US';
  return 'zh-CN';
}

function getStoredLanguage(): AppLanguage | null {
  try {
    const raw = localStorage.getItem(I18N_LANGUAGE_STORE_KEY);
    if (!raw) return null;
    const normalized = normalizeLanguage(raw);
    if ((SUPPORTED_LANGUAGES as readonly string[]).includes(normalized)) {
      return normalized;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 获取当前生效的应用语言。
 */
export function getLanguage(): AppLanguage {
  return normalizeLanguage(i18n.language);
}

function getInitialLanguage(): AppLanguage {
  const stored = getStoredLanguage();
  if (stored) return stored;
  return normalizeLanguage(navigator.language);
}

/**
 * 设置应用语言并持久化到本地存储。
 */
export async function setLanguage(language: AppLanguage): Promise<void> {
  const safeLanguage = normalizeLanguage(language);
  await i18n.changeLanguage(safeLanguage);
  try {
    localStorage.setItem(I18N_LANGUAGE_STORE_KEY, safeLanguage);
  } catch {
    // ignore storage errors
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': {
        translation: zhCN,
      },
      'en-US': {
        translation: enUS,
      },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })
  .catch(() => {});

window.api?.onSettingsChanged?.((channel: string, value: unknown) => {
  if (channel === 'i18n:language' && typeof value === 'string') {
    void setLanguage(normalizeLanguage(value));
  }
});

export default i18n;
