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
 * @file useLanguageSelectRuntime.test.ts
 * @description 验证引导语言Hook真实选择状态、i18n切换、持久化及原生预览失败处理。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle } from '../../../../test/contentLifecycleHarness';
import { hookMocks } from '../../../../../test/elementHarness';
import i18n, { getLanguage } from '../../../../../../i18n';
import { useLanguageSelect } from '../useLanguageSelect';

vi.hoisted(() => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' }, api: {} }));
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal('navigator', { language: 'zh-CN' });
});
vi.mock('react', async (load) => ({ ...await load<typeof import('react')>(), ...hookMocks, ...lifecycleHooks }));
const settingsPreview = vi.fn<(channel: string, value: unknown) => Promise<void>>();
const storeWrite = vi.fn<(key: string, value: unknown) => Promise<void>>();

/** 求值真实选择 Hook。
 * @returns 当前语言和真实选择回调。
 */
function render() { return renderWithHooks(useLanguageSelect); }
/** 顺序结算真实语言切换和持久化 Promise。
 * @returns 无返回值。
 */
async function settle(): Promise<void> {
  // eslint-disable-next-line no-await-in-loop -- 逐轮推进实际异步语言切换、持久化及catch回调。
  for (let index = 0; index < 10; index++) await Promise.resolve();
}

describe('引导语言选择真实状态与持久化', () => {
  beforeEach(async () => {
    resetLifecycle();
    settingsPreview.mockReset().mockResolvedValue();
    storeWrite.mockReset().mockResolvedValue();
    vi.stubGlobal('window', { api: { settingsPreview, storeWrite } });
    await i18n.changeLanguage('zh-CN');
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('初始语言来自真实i18n，选中英语更新状态、真实翻译语言和IPC', async () => {
    expect(render().selected).toBe('zh-CN');
    render().handleSelect('en-US');
    expect(render().selected).toBe('en-US');
    await settle();
    expect(getLanguage()).toBe('en-US');
    expect(storeWrite).toHaveBeenCalledExactlyOnceWith('i18n-language', 'en-US');
    expect(settingsPreview).toHaveBeenCalledExactlyOnceWith('i18n:language', 'en-US');
  });

  it('原生预览IPC拒绝被处理，应用语言仍实际切换', async () => {
    settingsPreview.mockRejectedValueOnce(new Error('preview unavailable'));
    render().handleSelect('ja-JP');
    await settle();
    expect(render().selected).toBe('ja-JP');
    expect(getLanguage()).toBe('ja-JP');
    expect(storeWrite).toHaveBeenCalledWith('i18n-language', 'ja-JP');
  });

  it('第三方语言引擎拒绝被处理，不伪造setLanguage返回', async () => {
    vi.spyOn(i18n, 'changeLanguage').mockRejectedValueOnce(new Error('language backend unavailable'));
    render().handleSelect('zh-TW');
    await settle();
    expect(render().selected).toBe('zh-TW');
    expect(getLanguage()).toBe('zh-CN');
    expect(storeWrite).not.toHaveBeenCalled();
    expect(settingsPreview).toHaveBeenCalledExactlyOnceWith('i18n:language', 'zh-TW');
  });
});
