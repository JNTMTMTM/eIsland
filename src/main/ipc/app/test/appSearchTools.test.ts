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
 * @file appSearchTools.test.ts
 * @description 验证真实 Bing 搜索解析、跳转解码、去重及 HTTP 失败回退。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BING_RESULT_BLOCK_PATTERN } from '../config/app';
import { cleanupHarness, resetHarness, tool, errorContaining } from './appHarness';

beforeEach(resetHarness);
afterEach(cleanupHarness);

/**
 * 为真实 Bing 解析提供最小 HTTP 边界。
 * @param html - 服务端 HTML 正文。
 * @returns 记录 HTTP 调用的模拟。
 */
function serve(html: string): ReturnType<typeof vi.fn<() => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>>> {
  const fetchBoundary = vi.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(html) }));
  vi.stubGlobal('fetch', fetchBoundary);
  return fetchBoundary;
}
/**
 * 构造 Bing 结果的服务端 HTML。
 * @param href - 原始跳转地址。
 * @param title - 原始标题。
 * @param snippet - 原始摘要，可省略。
 * @returns 结果列表项。
 */
function block(href: string, title: string, snippet?: string): string {
  return `<li class="b_algo"><h2><a href="${  href  }">${  title  }</a></h2>${  snippet === undefined ? '' : `<p class="b_caption">${  snippet  }</p>`  }</li>`;
}

describe('real Bing result parsing through local web search', () => {
  it('decodes prefixed Bing redirects, strips fragments and removes duplicate URLs', async () => {
    const target = 'https://fixture.example/path#fragment';
    const encoded = Buffer.from(target).toString('base64');
    const fetchBoundary = serve(block(`/ck/a?u=a1${  encoded}`, '<b>Fixture &amp; Title</b>', '&quot;quoted&quot; &#39;one&#39; &lt;tag&gt;') + block(`/ck/a?u=${  encoded}`, 'Duplicate') + block('https://other.example/', 'Other'));
    expect(await tool('web.search', { query: 'fixture', limit: 2 })).toMatchObject({ success: true, result: { count: 2, results: [
      { title: 'Fixture & Title', url: 'https://fixture.example/path', snippet: '"quoted" \'one\' <tag>' },
      { title: 'Other', url: 'https://other.example/', snippet: '' },
    ] } });
    expect(fetchBoundary).toHaveBeenCalledOnce();
  });
  it('decodes redirects without the optional prefix and adds a missing HTTPS scheme', async () => {
    serve(block(`/ck/a?u=${  Buffer.from('fixture.example/path').toString('base64')}`, 'Fixture'));
    expect(await tool('web.search', { query: 'fixture', limit: 1 })).toMatchObject({ success: true, result: { results: [{ url: 'https://fixture.example/path' }] } });
  });
  it.each(['', '!!!', Buffer.from('https://[').toString('base64')])('retains the Bing redirect when decoded data %s is empty or invalid', async (encoded) => {
    serve(block(`/ck/a?u=${  encoded}`, 'Fixture'));
    expect(await tool('web.search', { query: 'fixture', limit: 1 })).toMatchObject({ success: true, result: { results: [{ url: `https://www.bing.com/ck/a?u=${  encoded}` }] } });
  });
  it('keeps the original redirect if the native decode boundary throws', async () => {
    const encoded = Buffer.from('https://fixture.example/').toString('base64');
    serve(block(`/ck/a?u=${  encoded}`, 'Fixture'));
    vi.spyOn(Buffer, 'from').mockImplementationOnce(() => { throw new Error('native decode unavailable'); });
    expect(await tool('web.search', { query: 'fixture', limit: 1 })).toMatchObject({ success: true, result: { results: [{ url: `https://www.bing.com/ck/a?u=${  encoded}` }] } });
  });
  it('uses the URL for a blank title and ignores empty, malformed and unresolved blocks', async () => {
    serve(`<li class="b_algo"> </li><li class="b_algo"><p>No heading</p></li>${  block(' ', 'Missing URL')  }${block('https://[', 'Invalid URL')  }${block('https://fixture.example/', '', '')}`);
    expect(await tool('web.search', { query: 'fixture', limit: 1 })).toMatchObject({ success: true, result: { count: 1, results: [{ title: 'https://fixture.example/', url: 'https://fixture.example/', snippet: '' }] } });
  });
  it('tries the second provider after an unsuccessful HTTP response', async () => {
    const fetchBoundary = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(block('https://fixture.example/', 'Fixture')) });
    vi.stubGlobal('fetch', fetchBoundary);
    expect(await tool('web.search', { q: 'fixture', limit: 1 })).toMatchObject({ success: true, result: { query: 'fixture', count: 1 } });
    expect(fetchBoundary).toHaveBeenCalledTimes(2);
  });
  it('reports no results when both providers return blank HTML', async () => {
    const fetchBoundary = serve(' ');
    expect(await tool('web.search', { query: 'fixture' })).toMatchObject({ success: false, error: 'web.search 无结果: fixture' });
    expect(fetchBoundary).toHaveBeenCalledTimes(2);
  });
  it('reports an absent query before fetching', async () => {
    const fetchBoundary = serve('');
    expect(await tool('web.search', {})).toMatchObject({ success: false, error: errorContaining('需要 query') });
    expect(fetchBoundary).not.toHaveBeenCalled();
  });
});

describe('native HTML parser failure normalization', () => {
  it.each([new Error('parser unavailable'), 'parser unavailable'])('records the native parser failure %s after both provider attempts', async (failure) => {
    const fetchBoundary = serve(block('https://fixture.example/', 'Fixture'));
    vi.spyOn(BING_RESULT_BLOCK_PATTERN, 'exec').mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- 验证公开错误响应对非 Error 叶依赖异常的归一化契约
      throw failure;
    });
    expect(await tool('web.search', { query: 'fixture' })).toMatchObject({ success: false, error: 'web.search 无结果: fixture (parser unavailable)' });
    expect(fetchBoundary).toHaveBeenCalledTimes(2);
  });
});
