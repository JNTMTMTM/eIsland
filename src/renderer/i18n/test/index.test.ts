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
 * @file index.test.ts
 * @description i18n 模块单元测试 — 覆盖 normalizeLanguage 经由 getLanguage / setLanguage 的行为
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Stub browser globals — must run before any module import via        */
/*  vi.hoisted(), which executes before ES module hoisting kicks in.   */
/* ------------------------------------------------------------------ */

const { localStorageMock } = vi.hoisted(() => {
  const store: Record<string, string> = {};

  Object.defineProperty(globalThis, 'window', {
    value: {
      api: { onSettingsChanged: vi.fn(), storeWrite: vi.fn().mockResolvedValue(true) },
      location: { pathname: '/index.html' },
    },
    configurable: true,
  });

  Object.defineProperty(globalThis, 'navigator', {
    value: { language: 'zh-CN' },
    configurable: true,
  });

  const localStorageMock = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => {
      store[key] = val;
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });

  return { localStorageMock };
});

/* ------------------------------------------------------------------ */
/*  Mock i18next: prevent .use().init() side effect, expose .language  */
/* ------------------------------------------------------------------ */

let currentLanguage = 'zh-CN';

vi.mock('i18next', () => {
  const mock = {
    get language() {
      return currentLanguage;
    },
    changeLanguage: vi.fn((lng: string) => {
      currentLanguage = lng;
      return Promise.resolve(lng);
    }),
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue(undefined),
  };
  return { default: mock };
});

vi.mock('react-i18next', () => ({
  initReactI18next: {},
}));

/* ------------------------------------------------------------------ */
/*  Import after mocks are in place                                    */
/* ------------------------------------------------------------------ */

import { getLanguage, setLanguage, type AppLanguage } from '../index';

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('i18n normalizeLanguage (tested via getLanguage / setLanguage)', () => {
  beforeEach(() => {
    currentLanguage = 'zh-CN';
    localStorageMock.clear();
    localStorageMock.setItem.mockClear();
    localStorageMock.getItem.mockClear();
    (window.api.storeWrite as ReturnType<typeof vi.fn>).mockClear();
  });

  describe('getLanguage — returns normalized language from i18n.language', () => {
    it('returns zh-CN when i18n.language is zh-CN', () => {
      currentLanguage = 'zh-CN';
      expect(getLanguage()).toBe('zh-CN');
    });

    it('returns en-US when i18n.language is en-US', () => {
      currentLanguage = 'en-US';
      expect(getLanguage()).toBe('en-US');
    });

    it('normalizes "zh" to zh-CN', () => {
      currentLanguage = 'zh';
      expect(getLanguage()).toBe('zh-CN');
    });

    it('normalizes "en" to en-US', () => {
      currentLanguage = 'en';
      expect(getLanguage()).toBe('en-US');
    });

    it('normalizes "zh-Hans" to zh-CN', () => {
      currentLanguage = 'zh-Hans';
      expect(getLanguage()).toBe('zh-CN');
    });

    it('preserves "zh-TW"', () => {
      currentLanguage = 'zh-TW';
      expect(getLanguage()).toBe('zh-TW');
    });

    it.each(['ja', 'ja-JP'])('normalizes "%s" to ja-JP', (language) => {
      currentLanguage = language;
      expect(getLanguage()).toBe('ja-JP');
    });

    it('normalizes "en-GB" to en-US (en- prefix)', () => {
      currentLanguage = 'en-GB';
      expect(getLanguage()).toBe('en-US');
    });

    it('returns zh-CN (default) for unknown locale', () => {
      currentLanguage = 'fr-FR';
      expect(getLanguage()).toBe('zh-CN');
    });

    it('returns zh-CN (default) for empty string', () => {
      currentLanguage = '';
      expect(getLanguage()).toBe('zh-CN');
    });
  });

  describe('setLanguage — normalizes then persists', () => {
    it('persists zh-CN to localStorage and storeWrite', async () => {
      await setLanguage('zh-CN');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('i18n-language', 'zh-CN');
      expect(window.api.storeWrite).toHaveBeenCalledWith('i18n-language', 'zh-CN');
    });

    it('persists en-US to localStorage and storeWrite', async () => {
      await setLanguage('en-US');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('i18n-language', 'en-US');
      expect(window.api.storeWrite).toHaveBeenCalledWith('i18n-language', 'en-US');
    });

    it('normalizes unsupported locale before persisting', async () => {
      await setLanguage('fr-FR' as AppLanguage);
      expect(window.api.storeWrite).toHaveBeenCalledWith('i18n-language', 'zh-CN');
    });

    it('switches to Japanese and persists it', async () => {
      await setLanguage('ja-JP');
      expect(getLanguage()).toBe('ja-JP');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('i18n-language', 'ja-JP');
      expect(window.api.storeWrite).toHaveBeenCalledWith('i18n-language', 'ja-JP');
    });
  });
});
