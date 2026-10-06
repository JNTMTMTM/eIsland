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
 * @file markdownSiteLink.test.tsx
 * @description MarkdownSiteLink 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, nodes, value, trigger, text, flushEffects } from '../../../../test/componentHarness';
import { MarkdownSiteLink as Component } from '../MarkdownSiteLink';
const api = vi.hoisted(() => ({ fetchWebsiteTitle: vi.fn<(...args: unknown[]) => Promise<string>>().mockResolvedValue('') }));
vi.mock('../../../../../../../api/site/siteMetaApi', () => ({ ...api, getWebsiteHostname: (url: string) => new URL(url).hostname, getWebsiteFaviconUrl: () => '' }));
describe('MarkdownSiteLink', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it('preserves non-http link attributes and the caller handler', () => {
    const onClick = vi.fn();
    const tree = render(Component, {
      onClick,
      href: 'mailto:a@b.com',
      children: 'mail',
      target: '_self',
      rel: 'author'
    });
    expect(value(tree, 'a', 'href')).toBe('mailto:a@b.com');
    expect(value(tree, 'a', 'target')).toBe('_self');
    expect(value(tree, 'a', 'rel')).toBe('author');
    expect(value(tree, 'a', 'onClick')).toBe(onClick);
    expect(nodes(tree, '.max-expand-chat-site-link')).toHaveLength(0);
  });
  it('sanitizes punctuation and unmatched parentheses and respects caller cancellation', () => {
    const clipboardOpenUrl = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('window', { api: { clipboardOpenUrl } });
    const tree = render(Component, { href: ' https://open.example/path). ', children: 'open' });
    expect(value(tree, 'a', 'title')).toBe('https://open.example/path');
    const event = { defaultPrevented: false, preventDefault: vi.fn() };
    trigger(tree, 'a', 'onClick', event);
    expect(clipboardOpenUrl).toHaveBeenCalledWith('https://open.example/path');
    expect(event.preventDefault).toHaveBeenCalledOnce();
    trigger(tree, 'a', 'onClick', { defaultPrevented: true, preventDefault: vi.fn() });
    expect(clipboardOpenUrl).toHaveBeenCalledOnce();
  });
  it('loads metadata, falls back for blank titles, and cancels stale requests', async () => {
    api.fetchWebsiteTitle.mockResolvedValueOnce(' Site title ');
    expect(render(Component, { href: 'https://title.example', children: 'x' })).toBeDefined();
    void flushEffects(); await Promise.resolve();
    expect(text(render(Component, { href: 'https://title.example', children: 'x' }))).toContain('Site title');
    api.fetchWebsiteTitle.mockResolvedValueOnce('late');
    expect(render(Component, { href: 'https://cancel.example', children: 'x' })).toBeDefined();
    void flushEffects().forEach((cleanup) => cleanup());
    await Promise.resolve();
    expect(text(render(Component, { href: 'https://cancel.example', children: 'x' }))).not.toContain('late');
  });
  it('retains a hostname fallback when metadata loading fails', async () => {
    api.fetchWebsiteTitle.mockRejectedValueOnce(new Error('offline'));
    expect(render(Component, { href: 'https://offline.example', children: 'x' })).toBeDefined();
    flushEffects(); await Promise.resolve(); await Promise.resolve();
    expect(text(render(Component, { href: 'https://offline.example', children: 'x' }))).toContain('offline.example');
  });
});
