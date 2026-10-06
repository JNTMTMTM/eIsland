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
 * @file markdownSiteLinkRuntime.test.tsx
 * @description 网站链接真实元信息 API、缓存、取消、标点净化和原生打开交互测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byClass, elements, find, invoke, text } from '../../../../../test/tree';
import { createHookReactMock, deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import type { NetFetchOptions, NetFetchResult } from '../../../../../../../../preload/types';
let Component: typeof import('../MarkdownSiteLink').MarkdownSiteLink;
const fetch = vi.fn<(url: string, options?: NetFetchOptions) => Promise<NetFetchResult>>();
const open = vi.fn<(url: string) => Promise<void>>();
/** 读取真实链接组件。
 * @param href - Markdown目标
 * @param patch - 实际链接属性
 * @returns 元素树
 */
function run(href: string, patch: Partial<Parameters<typeof Component>[0]> = {}) {
  return find(renderHook(Component, {
    href,
    children: 'site',
    ...patch
  }), (node) => node.type === 'a');
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  fetch.mockResolvedValue({
    ok: true,
    status: 200,
    body: '<title>  Actual &amp; site  </title>'
  });
  open.mockResolvedValue();
  vi.stubGlobal('window', {
    api: {
      netFetch: fetch,
      clipboardOpenUrl: open
    }
  });
  vi.doMock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));
  ({
    MarkdownSiteLink: Component
  } = await import('../MarkdownSiteLink'));
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('MarkdownSiteLink actual metadata and leaf protocol', () => {
  it.each(['mailto:test@example.test', '', '   ', '.!?，。；！？'] as const)('non-http %s returns plain link and never contacts native network', (href) => {
    const click = vi.fn();
    const tree = run(href, {
      target: '_self',
      rel: 'author',
      onClick: click
    });
    flushHookEffects();
    expect(tree.props).toMatchObject({
      href,
      target: '_self',
      rel: 'author',
      onClick: click
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(text(tree)).toBe('site');
  });
  it.each(['https://example.test/path((inside))', 'https://example.test/path))).！？', 'http://example.test/a'] as const)('actual %s punctuation and balanced parentheses retain correct navigation', async (href) => {
    const tree = run(href);
    flushHookEffects();
    await settleHook();
    const expected = href.includes('path)))') ? 'https://example.test/path' : href;
    expect(tree.props.title).toBe(expected);
    const event = new Event('click', {
      cancelable: true
    });
    invoke(tree, 'onClick', event);
    await settleHook();
    expect(open).toHaveBeenCalledWith(expected);
    expect(event.defaultPrevented).toBe(true);
    expect(fetch).toHaveBeenCalledWith(expected, {
      method: 'GET',
      timeoutMs: 4500,
      headers: {
        Accept: 'text/html,application/xhtml+xml'
      }
    });
  });
  it('real title parser and favicon build a cached card that avoids another native request on remount', async () => {
    run('https://cache.test/page');
    flushHookEffects();
    await settleHook();
    expect(text(run('https://cache.test/page'))).toContain('Actual & site');
    expect(byClass(run('https://cache.test/page'), 'max-expand-chat-site-link-icon').props.src).toBe('https://cache.test/favicon.ico');
    unmountHook();
    resetHook();
    run('https://cache.test/page');
    flushHookEffects();
    await settleHook();
    expect(text(run('https://cache.test/page'))).toContain('Actual & site');
    expect(fetch).toHaveBeenCalledOnce();
  });
  it.each(['blank', 'failed', 'rejected'] as const)('real metadata %s remains hostname fallback and caches the result', async (kind) => {
    if (kind === 'rejected') fetch.mockRejectedValue(new Error('offline'));else {
      fetch.mockResolvedValue({
        ok: kind === 'blank',
        status: kind === 'blank' ? 200 : 500,
        body: kind === 'blank' ? '<title> </title>' : 'unavailable'
      });
    }
    run('https://fallback.test');
    flushHookEffects();
    await settleHook();
    expect(text(run('https://fallback.test'))).toContain('fallback.test');
    unmountHook();
    resetHook();
    run('https://fallback.test');
    flushHookEffects();
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('late native title after unmount cannot populate component or shared cache', async () => {
    const pending = deferred<NetFetchResult>();
    fetch.mockReturnValue(pending.promise);
    run('https://late.test');
    flushHookEffects();
    unmountHook();
    pending.resolve({
      ok: true,
      status: 200,
      body: '<title>late</title>'
    });
    await settleHook();
    resetHook();
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: '<title>fresh</title>'
    });
    run('https://late.test');
    flushHookEffects();
    await settleHook();
    expect(text(run('https://late.test'))).toContain('fresh');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('invalid HTTP URL uses real metadata failure and favicon text without a hostname', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      body: ''
    });
    run('https://');
    flushHookEffects();
    await settleHook();
    expect(byClass(run('https://'), 'max-expand-chat-site-link-icon-fallback').props.children).toBe('H');
    expect(elements(run('https://')).some((node) => node.props.className === 'max-expand-chat-site-link-host')).toBe(false);
  });
  it('caller cancellation is respected and native open rejection remains contained', async () => {
    const click = vi.fn<(event: React.MouseEvent<HTMLAnchorElement>) => void>((event) => {
      event.preventDefault();
    });
    let tree = run('https://open.test', {
      onClick: click
    });
    const cancelled = new Event('click', {
      cancelable: true
    });
    invoke(tree, 'onClick', cancelled);
    expect(click).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
    open.mockRejectedValue(new Error('native'));
    tree = run('https://open.test');
    invoke(tree, 'onClick', new Event('click', {
      cancelable: true
    }));
    await settleHook();
    expect(open).toHaveBeenCalledWith('https://open.test');
  });
  it('default attributes and a public non-HTTP to HTTP prop transition use old empty metadata until the effect loads', async () => {
    const initial = run('mailto:first@test');
    flushHookEffects();
    expect(initial.props).toMatchObject({
      target: '_blank',
      rel: 'noopener noreferrer'
    });
    const next = run('https://transition.test');
    expect(byClass(next, 'max-expand-chat-site-link-title').props.children).toBe('https://transition.test');
    expect(byClass(next, 'max-expand-chat-site-link-icon-fallback').props.children).toBe('H');
    flushHookEffects();
    await settleHook();
    expect(text(run('https://transition.test'))).toContain('Actual & site');
  });
});
