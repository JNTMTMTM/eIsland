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
 * @file app.test.ts
 * @description 本地工具安全容量、Bing结果解析及设置广播映射契约测试。
 * @author 鸡哥
 */
import { describe, expect, it } from 'vitest';
import { MAX_LOCAL_FILE_READ_BYTES, MAX_LOCAL_CMD_OUTPUT_BYTES, BING_SEARCH_URL_TEMPLATE, BING_SEARCH_FALLBACK_URL_TEMPLATE, BING_RESULT_BLOCK_PATTERN, BING_TITLE_LINK_PATTERN, BING_SNIPPET_PATTERN, BING_USER_AGENT, ISLAND_SETTINGS_REGISTRY, ISLAND_SETTING_BROADCAST_CHANNELS } from '../app';

describe('本地工具及搜索配置', () => {
  it('限制文件和命令输出各1MiB，搜索地址可编码关键词', () => {
    expect(MAX_LOCAL_FILE_READ_BYTES).toBe(1024 * 1024);
    expect(MAX_LOCAL_CMD_OUTPUT_BYTES).toBe(1024 * 1024);
    [BING_SEARCH_URL_TEMPLATE, BING_SEARCH_FALLBACK_URL_TEMPLATE].forEach((template) => {
      const url = new URL(template.replace('%s', encodeURIComponent('a & 中文')));
      expect(url.protocol).toBe('https:');
      expect(url.searchParams.get('q')).toBe('a & 中文');
    });
    expect(BING_USER_AGENT).toContain('Windows NT 10.0');
  });

  it('解析多个搜索结果且忽略广告，标题和摘要支持嵌套标签', () => {
    const result = '<li class="b_algo"><h2><a href="https://one">One <b>title</b></a></h2><p class="b_lineclamp2">Text</p></li>';
    const html = `<li class="ad">Advertisement</li>${result}${result}`;
    const blocks = [...html.matchAll(BING_RESULT_BLOCK_PATTERN)];
    expect(blocks).toHaveLength(2);
    expect(blocks[0][1].match(BING_TITLE_LINK_PATTERN)?.slice(1)).toEqual(['https://one', 'One <b>title</b>']);
    expect(blocks[0][1].match(BING_SNIPPET_PATTERN)?.[1]).toBe('Text');
    expect('<h2>missing link</h2>'.match(BING_TITLE_LINK_PATTERN)).toBeNull();
  });

  it('注册表键唯一，广播映射均指向已注册设置', () => {
    const keys = ISLAND_SETTINGS_REGISTRY.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    ISLAND_SETTINGS_REGISTRY.forEach((entry) => {
      expect(['string', 'number', 'boolean', 'array', 'object']).toContain(entry.type);
      expect(entry.description).not.toBe('');
    });
    expect(ISLAND_SETTING_BROADCAST_CHANNELS['theme-mode']).toBe('theme:mode');
    Object.entries(ISLAND_SETTING_BROADCAST_CHANNELS).forEach(([key, channel]) => {
      expect(keys).toContain(key);
      expect(channel).toMatch(/^(theme|island):/);
    });
  });
});
