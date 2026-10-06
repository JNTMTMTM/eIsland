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
 * @file urlFavoritesUtils.test.ts
 * @description 收藏工具真实解析、格式正规化、导出和持久化边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { escapeHtmlText, mergeFavorites, normalizeFolder, normalizeUrl, parseHtmlBookmarks, parseImportedFavorites, parseJsonFavorites, persistFavorites, sanitizeFavorites, serializeFavoritesToHtml, serializeFavoritesToJson } from '../urlFavoritesUtils';
import type { UrlFavoriteItem } from '../../types/urlFavoritesTypes';
const write = vi.fn<Window['api']['storeWrite']>();
const setItem = vi.fn<(key: string, value: string) => void>();
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  vi.clearAllMocks();
  write.mockResolvedValue(true);
  setItem.mockImplementation(() => undefined);
  vi.stubGlobal('window', { api: { storeWrite: write } });
  vi.stubGlobal('localStorage', { setItem });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
/** 构造合法公开收藏数据。
 * @param extra - 要覆盖的公开字段。
 * @returns 收藏项。
 */
function row(extra: Partial<UrlFavoriteItem> = {}): UrlFavoriteItem {
  return { id: 1, url: 'https://example.com', title: 'Example', note: '', folder: '', createdAt: 1, ...extra };
}
describe('收藏真实工具边界', () => {
  it('URL 和文件夹输入按公开规则去空白并提供字符串回退', () => {
    expect(normalizeUrl(' ')).toBe('');
    expect(normalizeUrl(' example.com ')).toBe('https://example.com');
    expect(normalizeUrl(' HTTP://example.com ')).toBe('HTTP://example.com');
    expect(normalizeFolder(' Work ')).toBe('Work');
    expect(normalizeFolder(1)).toBe('');
  });
  it('格式坏项丢弃，缺失元信息回退，零时间及ID作为合法值保留', () => {
    expect(sanitizeFavorites({})).toEqual([]);
    expect(sanitizeFavorites([{ url: 1 }, { url: ' ' }, { url: 'example.com', title: 1, note: false, folder: 1, createdAt: Infinity, id: NaN }, { url: 'https://two.com', title: ' Two ', note: ' custom ', folder: ' Work ', createdAt: 0, id: 0 }])).toEqual([
      { id: 1000, url: 'https://example.com', title: 'https://example.com', note: '', folder: '', createdAt: 1000 },
      { id: 0, url: 'https://two.com', title: 'Two', note: 'custom', folder: 'Work', createdAt: 0 },
    ]);
    expect(sanitizeFavorites([{ url: 'example.com', title: 'Named' }])[0].note).toBe('Named');
    expect(sanitizeFavorites([{ url: 'example.com', title: 'https://example.com', note: '' }])[0].note).toBe('');
  });
  it.each([null, false, 1, {}, { items: {} }, { items: null }])('无效 JSON 外壳 %s 回退空列表', (value) => {
    expect(parseJsonFavorites(JSON.stringify(value))).toEqual([]);
  });
  it('JSON 数组与 items 外壳都执行真实过滤，坏 JSON 原始异常供导入调用方处理', () => {
    const items = [row({ note: 'Example' })];
    expect(parseJsonFavorites(JSON.stringify(items))).toEqual(items);
    expect(parseImportedFavorites(JSON.stringify({ items }), 'json')).toEqual(items);
    expect(() => parseJsonFavorites('{')).toThrow(SyntaxError);
  });
  it('HTML 原生叶锚点的有效添加日期、缺失日期与目录都进入真实解析', () => {
    const anchors = [
      { getAttribute: (key: string) => {
        if (key.toLowerCase() === 'href') {
          return 'https://one.com';
        }
        return key.toLowerCase() === 'add_date' ? '2' : null;
      }, textContent: ' First ', closest: () => ({ previousElementSibling: { textContent: ' Work ' } }) },
      { getAttribute: (key: string) => key.toLowerCase() === 'href' ? 'https://two.com' : null, textContent: '', closest: () => null },
    ];
    class ParserLeaf {
      /** 模拟浏览器从本次固定 HTML 提供的原生锚点查询。
       * @param content - 原始 HTML 文本。
       * @param kind - 浏览器解析类型。
       * @returns 仅含浏览器查询能力的文档叶。
       */
      parseFromString(content: string, kind: string) {
        expect(content).toBe('<a href="https://one.com" add_date="2">First</a><a href="https://two.com"></a>');
        expect(kind).toBe('text/html');
        return {
          querySelectorAll: (selector: string) => {
            expect(selector).toBe('a[href]');
            return anchors;
          },
        };
      }
    }
    vi.stubGlobal('DOMParser', ParserLeaf);
    const content = '<a href="https://one.com" add_date="2">First</a><a href="https://two.com"></a>';
    const result = parseImportedFavorites(content, 'html');
    expect(result).toEqual([
      { id: 2000, url: 'https://one.com', title: 'First', note: 'First', folder: 'Work', createdAt: 2000 },
      { id: 1001, url: 'https://two.com', title: 'https://two.com', note: '', folder: '', createdAt: 1001 },
    ]);
    expect(parseHtmlBookmarks(content)).toEqual(result);
  });
  it('导入合并按大小写去重，补齐零时间而保留已有顺序', () => {
    const current = [row()];
    expect(mergeFavorites(current, [row({ url: 'https://EXAMPLE.com' }), row({ url: 'https://new.com', folder: ' Work ', createdAt: 0 }), row({ url: 'https://NEW.com' })])).toEqual([
      row({ id: 1000, url: 'https://new.com', folder: 'Work', createdAt: 1000 }), ...current,
    ]);
  });
  it('JSON 导出提供来源和时间，HTML 导出转义属性、目录及备注并回退标题', () => {
    expect(escapeHtmlText('&"<>')).toBe('&amp;&quot;&lt;&gt;');
    const items = [row({ url: 'https://example.com?a=1&b=2', title: '', note: '<note>', createdAt: 2000 }), row({ id: 2, folder: ' Work ', title: 'Named' }), row({ id: 3, folder: 'Work', title: 'https://example.com' })];
    expect(JSON.parse(serializeFavoritesToJson(items))).toEqual({ items, source: 'eIsland', exportedAt: '1970-01-01T00:00:01.000Z' });
    const html = serializeFavoritesToHtml(items, 'Default');
    expect(html).toContain('HREF="https://example.com?a=1&amp;b=2" ADD_DATE="2"');
    expect(html).toContain('&lt;note&gt;');
    expect(html).toContain('>Named</A>');
    expect(html).toContain('>https://example.com</A>');
    expect(html).toContain('>Default</H3>');
    expect(html.match(/>Work<\/H3>/g)).toHaveLength(1);
    expect(serializeFavoritesToHtml([], 'Default')).toContain('<DL><p>');
  });
  it('本地持久化和主进程写入各自失败仍结束调用', async () => {
    setItem.mockImplementation(() => {
      throw new Error('quota');
    });
    write.mockRejectedValue(new Error('IPC'));
    persistFavorites([]);
    await Promise.resolve();
    await Promise.resolve();
    expect(write).toHaveBeenCalledWith('url-favorites', []);
  });
  it('混合旧数组忽略 null 与非对象条目，保留有效收藏及既有正规化语义', () => {
    const valid = row({ note: 'Example' });
    expect(sanitizeFavorites([null, false, 0, 'bad', undefined, [], valid, null])).toEqual([valid]);
    expect(parseJsonFavorites(JSON.stringify([null, valid, false]))).toEqual([valid]);
    expect(sanitizeFavorites([null, false, 1, 'bad', []])).toEqual([]);
  });
});
