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
 * @file initialization.test.ts
 * @description 真实国际化入口资源初始化、存储语言优先级、桥接语言更新及持久化失败回归。
 * @author 鸡哥
 */

import i18next from 'i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getItem = vi.fn<(key: string) => string | null>();
const setItem = vi.fn<(key: string, value: string) => void>();
const storeWrite = vi.fn<(key: string, value: unknown) => Promise<void>>();
const onSettingsChanged = vi.fn<(callback: (channel: string, value: unknown) => void) => void>();

beforeEach(() => {
  vi.resetModules();
  getItem.mockReset().mockReturnValue(null);
  setItem.mockReset();
  storeWrite.mockReset().mockResolvedValue(undefined);
  onSettingsChanged.mockReset();
  vi.stubGlobal('localStorage', { getItem, setItem });
  vi.stubGlobal('navigator', { language: 'en-GB' });
  vi.stubGlobal('window', { api: { storeWrite, onSettingsChanged } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('real internationalization entry initialization', () => {
  it.each([['zh-CN', 'zh-CN'], ['en-US', 'en-US'], ['zh-HK', 'zh-TW'], ['zh-MO', 'zh-TW'], ['zh-Hant', 'zh-TW'], ['ja-JP', 'ja-JP'], ['unknown', 'zh-CN']])('uses persisted locale %s before the browser locale', async (raw, expected) => {
    getItem.mockReturnValue(raw);
    const { default: i18n, getLanguage } = await import('../index');
    expect(getLanguage()).toBe(expected);
    expect(i18n.language).toBe(expected);
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.hasResourceBundle('zh-CN', 'translation')).toBe(true);
    expect(i18n.hasResourceBundle('en-US', 'translation')).toBe(true);
    expect(i18n.hasResourceBundle('zh-TW', 'translation')).toBe(true);
    expect(i18n.hasResourceBundle('ja-JP', 'translation')).toBe(true);
    expect(getItem).toHaveBeenCalledWith('i18n-language');
  });
  it.each([null, ''])('uses the browser language when persisted locale is %j', async (raw) => {
    getItem.mockReturnValue(raw);
    const { getLanguage } = await import('../index');
    expect(getLanguage()).toBe('en-US');
  });
  it('falls back to the browser after a denied local storage read', async () => {
    getItem.mockImplementation(() => { throw new Error('storage denied'); });
    vi.stubGlobal('navigator', { language: 'ja-Hira' });
    const { getLanguage } = await import('../index');
    expect(getLanguage()).toBe('ja-JP');
  });
  it('consumes a rejected library initialization Promise', async () => {
    const init = vi.spyOn(i18next, 'init').mockRejectedValueOnce(new Error('initialization'));
    await import('../index');
    await Promise.resolve();
    expect(init).toHaveBeenCalled();
    expect(onSettingsChanged).toHaveBeenCalledOnce();
  });
});

describe('actual language change and settings bridge callback', () => {
  it('normalizes a valid settings language event and persists the actual new language', async () => {
    const { getLanguage } = await import('../index');
    onSettingsChanged.mock.calls[0][0]('i18n:language', 'zh-Hant');
    await Promise.resolve();
    await Promise.resolve();
    expect(getLanguage()).toBe('zh-TW');
    expect(setItem).toHaveBeenCalledWith('i18n-language', 'zh-TW');
    expect(storeWrite).toHaveBeenCalledWith('i18n-language', 'zh-TW');
  });
  it('ignores unrelated channels and non-string language payloads', async () => {
    const { getLanguage } = await import('../index');
    const [[callback]] = onSettingsChanged.mock.calls;
    callback('another:setting', 'ja');
    callback('i18n:language', null);
    callback('i18n:language', 42);
    expect(getLanguage()).toBe('en-US');
    expect(setItem).not.toHaveBeenCalled();
    expect(storeWrite).not.toHaveBeenCalled();
  });
  it.each([{}, { api: {} }])('initializes and changes languages without optional preload bridges %j', async (windowValue) => {
    vi.stubGlobal('window', windowValue);
    const { setLanguage, getLanguage } = await import('../index');
    await setLanguage('ja-JP');
    expect(getLanguage()).toBe('ja-JP');
    expect(setItem).toHaveBeenCalledWith('i18n-language', 'ja-JP');
    expect(onSettingsChanged).not.toHaveBeenCalled();
  });
  it('preserves the changed language when both persistence destinations fail', async () => {
    setItem.mockImplementation(() => { throw new Error('quota'); });
    storeWrite.mockRejectedValue(new Error('bridge'));
    const { setLanguage, getLanguage } = await import('../index');
    await setLanguage('zh-TW');
    expect(getLanguage()).toBe('zh-TW');
    expect(storeWrite).toHaveBeenCalledWith('i18n-language', 'zh-TW');
  });
  it('does not persist when the library rejects a language change', async () => {
    const { setLanguage } = await import('../index');
    vi.spyOn(i18next, 'changeLanguage').mockRejectedValueOnce(new Error('change language'));
    await expect(setLanguage('ja-JP')).rejects.toThrow('change language');
    expect(setItem).not.toHaveBeenCalled();
    expect(storeWrite).not.toHaveBeenCalled();
  });
});
