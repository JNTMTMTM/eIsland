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
 * @file useTranslateTool.test.ts
 * @description 翻译 Hook 真实会话与网络接口、语言交换、加载守卫、错误反馈和剪贴板测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTranslateTool } from '../useTranslateTool';
import { renderWithHooks, resetLifecycle } from '../../../setting/hooks/test/settingsCoverageHarness';

const translate = vi.hoisted(() => {
  vi.stubGlobal('window', { location: { hostname: 'app' } });
  return vi.fn<(key: string) => string>((key) => key);
});
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));

const netFetch = vi.fn<Window['api']['netFetch']>();
const getItem = vi.fn<Storage['getItem']>();
const writeText = vi.fn<(text: string) => Promise<void>>();

/**
 * 求值真实 Hook，保留公开输入状态。
 * @returns 当前翻译状态和操作。
 */
function view() {
  return renderWithHooks(useTranslateTool);
}

/**
 * 等待真实 fetchTranslate 的异步反馈。
 * @returns 回调队列处理完成。
 */
async function settle(): Promise<void> {
  await Array.from({ length: 12 }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
}

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  getItem.mockReturnValue('token');
  netFetch.mockResolvedValue({ ok: true, status: 200, body: JSON.stringify({ code: 200, data: { targetText: 'Hello', source: 'zh', target: 'en', requestId: 'id' } }) });
  writeText.mockResolvedValue(undefined);
  vi.stubGlobal('window', { api: { netFetch }, location: { hostname: 'app' } });
  vi.stubGlobal('localStorage', { getItem });
  vi.stubGlobal('navigator', { clipboard: { writeText } });
});
afterEach(() => vi.unstubAllGlobals());

describe('useTranslateTool real session and API', () => {
  it('ignores empty input and automatic-language swaps or copying an empty result', () => {
    const current = view();
    expect(current.sourceLang).toBe('auto');
    expect(current.targetLang).toBe('en');
    current.handleSwapLanguages();
    current.handleCopyResult();
    current.setSourceText(' ');
    view().handleTranslate();
    expect(netFetch).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(view().sourceLang).toBe('auto');
  });

  it.each(['absent', 'denied'])('requires login when local token is %s', (reason) => {
    if (reason === 'absent') getItem.mockReturnValue(null);
    else getItem.mockImplementation(() => { throw new Error('denied'); });
    view().setSourceText('你好');
    view().handleTranslate();
    expect(view().resultText).toBe('maxExpand.toolbox.translate.loginRequired');
    expect(view().translating).toBe(false);
    expect(netFetch).not.toHaveBeenCalled();
  });

  it('uses real request parameters, suppresses repeated submits, swaps text/languages and clears', async () => {
    let resolve!: (value: Awaited<ReturnType<Window['api']['netFetch']>>) => void;
    netFetch.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    view().setSourceLang('zh');
    view().setTargetLang('en');
    view().setSourceText(' 你好 ');
    view().handleTranslate();
    expect(view().translating).toBe(true);
    view().handleTranslate();
    expect(netFetch).toHaveBeenCalledTimes(1);
    expect(netFetch).toHaveBeenCalledWith('https://server.pyisland.com/api/v1/toolbox/translate', expect.objectContaining({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify({ text: ' 你好 ', source: 'zh', target: 'en' })
    }));
    resolve({ ok: true, status: 200, body: JSON.stringify({ code: 200, data: { targetText: 'Hello' } }) });
    await settle();
    expect(view().resultText).toBe('Hello');
    expect(view().translating).toBe(false);
    view().handleCopyResult();
    expect(writeText).toHaveBeenCalledWith('Hello');
    view().handleSwapLanguages();
    expect(view()).toMatchObject({ sourceLang: 'en', targetLang: 'zh', sourceText: 'Hello', resultText: ' 你好 ' });
    writeText.mockRejectedValueOnce(new Error('clipboard denied'));
    view().handleCopyResult();
    await settle();
    view().handleClearAll();
    expect(view()).toMatchObject({ sourceText: '', resultText: '' });
  });

  it.each([
    { code: 500, message: 'Service unavailable' },
    { code: 200 },
    { code: 500, message: '' }
  ])('shows real API failure message for %j', async (payload) => {
    netFetch.mockResolvedValueOnce({ ok: true, status: 200, body: JSON.stringify(payload) });
    view().setSourceText('hello');
    view().handleTranslate();
    await settle();
    expect(view().resultText).toBe(payload.message ?? '翻译失败');
    expect(view().translating).toBe(false);
  });

  it('finishes loading when native networking rejects', async () => {
    netFetch.mockRejectedValueOnce(new Error('offline'));
    view().setSourceText('hello');
    view().handleTranslate();
    await settle();
    expect(view().resultText).toBe('网络请求失败');
    expect(view().translating).toBe(false);
  });
});
