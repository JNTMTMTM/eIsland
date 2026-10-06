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
 * @file urlParserSettingsInteractions.test.ts
 * @description URL 设置实际域名规范化、输入错误、黑名单和静音持久化回滚回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UrlParserSettingsPage } from '../UrlParserSettingsPage';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle } from './themeHookHarness';
import type { ComponentProps } from 'react';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./themeHookHarness')).lifecycleHooks
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));
const api = {
  clipboardUrlBlacklistSet: vi.fn<(value: string[]) => Promise<void>>(),
  clipboardUrlMonitorSet: vi.fn<(value: boolean) => Promise<void>>(),
  clipboardUrlDetectModeSet: vi.fn<(value: string) => Promise<void>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>()
};
const setItem = vi.fn<(key: string, value: string) => void>();
let props: ComponentProps<typeof UrlParserSettingsPage>;
/**
 * 重绘真实 URL 设置组件。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => UrlParserSettingsPage(props));
}
/**
 * 等待服务写入和回滚队列。
 * @returns 当前服务队列完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/**
 * 编辑实际域名输入框。
 * @param value - 用户输入。
 * @returns 无返回值。
 */
function draft(value: string): void {
  invoke(findElement(render(), (node) => elementProps(node).type === 'text'), 'onChange', {
    target: {
      value
    }
  });
}
/**
 * 点击实际添加按钮。
 * @returns 无返回值。
 */
function add(): void {
  invoke(findElement(render(), (node) => node.type === 'button' && textContent(node) === 'settings.app.urlParser.addDomain'), 'onClick');
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  props = {
    clipboardUrlMonitorEnabled: true,
    setClipboardUrlMonitorEnabled: vi.fn(),
    clipboardUrlDetectMode: 'https-only',
    setClipboardUrlDetectMode: vi.fn(),
    clipboardUrlBlacklist: [],
    setClipboardUrlBlacklist: vi.fn(),
    clipboardUrlSuppressInFavorites: false,
    setClipboardUrlSuppressInFavorites: vi.fn()
  };
  vi.mocked(props.setClipboardUrlBlacklist).mockImplementation((value) => {
    props.clipboardUrlBlacklist = value;
  });
  vi.mocked(props.setClipboardUrlSuppressInFavorites).mockImplementation((value) => {
    props.clipboardUrlSuppressInFavorites = value;
  });
  [api.clipboardUrlBlacklistSet, api.clipboardUrlMonitorSet, api.clipboardUrlDetectModeSet, api.storeWrite].forEach((mock) => {
    mock.mockResolvedValue(undefined);
  });
  vi.stubGlobal('window', {
    api
  });
  vi.stubGlobal('localStorage', {
    setItem
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('真实域名输入和黑名单', () => {
  it.each(['', ' ', 'https://[', 'file:///path'])('非法输入%s不持久化，编辑移除错误', (value) => {
    draft(value);
    add();
    expect(textContent(render())).toContain('settings.app.urlParser.errors.invalidDomain');
    expect(api.clipboardUrlBlacklistSet).not.toHaveBeenCalled();
    draft('example.com');
    expect(textContent(render())).not.toContain('settings.app.urlParser.errors.invalidDomain');
  });
  it.each([{
    value: 'Example.COM.',
    domain: 'example.com'
  }, {
    value: ' HTTPS://Example.COM./path ',
    domain: 'example.com'
  }])('$value规范化为$domain并清空草稿', ({
    value,
    domain
  }) => {
    draft(value);
    add();
    expect(api.clipboardUrlBlacklistSet).toHaveBeenCalledWith([domain]);
    expect(props.clipboardUrlBlacklist).toEqual([domain]);
    expect(elementProps(findElement(render(), (node) => elementProps(node).type === 'text')).value).toBe('');
  });
  it('已存在域名禁止重复添加，非Enter键不触发添加', () => {
    props.clipboardUrlBlacklist = ['example.com'];
    draft('EXAMPLE.COM');
    const preventDefault = vi.fn();
    invoke(findElement(render(), (node) => elementProps(node).type === 'text'), 'onKeyDown', {
      preventDefault,
      key: 'Escape'
    });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(api.clipboardUrlBlacklistSet).not.toHaveBeenCalled();
    invoke(findElement(render(), (node) => elementProps(node).type === 'text'), 'onKeyDown', {
      preventDefault,
      key: 'Enter'
    });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(textContent(render())).toContain('settings.app.urlParser.errors.domainExists');
    expect(api.clipboardUrlBlacklistSet).not.toHaveBeenCalled();
  });
  it('新增持久化拒绝回滚原列表并显示失败', async () => {
    props.clipboardUrlBlacklist = ['existing.com'];
    api.clipboardUrlBlacklistSet.mockRejectedValue(new Error('offline'));
    draft('example.com');
    add();
    expect(props.clipboardUrlBlacklist).toEqual(['existing.com', 'example.com']);
    await settle();
    expect(props.clipboardUrlBlacklist).toEqual(['existing.com']);
    expect(textContent(render())).toContain('settings.app.urlParser.errors.saveFailed');
  });
  it.each([true, false])('删除持久化失败=%s保留或回滚其它域名', async (failure) => {
    props.clipboardUrlBlacklist = ['first.com', 'second.com'];
    if (failure) api.clipboardUrlBlacklistSet.mockRejectedValue(new Error('offline'));
    invoke(findElement(render(), (node) => elementProps(node).className === 'settings-hide-selected-item'), 'onClick');
    expect(api.clipboardUrlBlacklistSet).toHaveBeenCalledWith(['second.com']);
    await settle();
    expect(props.clipboardUrlBlacklist).toEqual(failure ? ['first.com', 'second.com'] : ['second.com']);
    expect(textContent(render()).includes('settings.app.urlParser.errors.saveFailed')).toBe(failure);
  });
});
describe('真实识别与通知持久化', () => {
  it.each([true, false])('监听与识别模式写入失败=%s回滚监听并保留模式服务契约', async (failure) => {
    if (failure) {
      api.clipboardUrlMonitorSet.mockRejectedValue(new Error('offline'));
      api.clipboardUrlDetectModeSet.mockRejectedValue(new Error('offline'));
    }
    const [monitor] = elements(render()).filter((node) => elementProps(node).type === 'checkbox');
    invoke(monitor, 'onChange', {
      target: {
        checked: false
      }
    });
    expect(props.setClipboardUrlMonitorEnabled).toHaveBeenCalledWith(false);
    elements(render()).filter((node) => node.type === 'button' && String(elementProps(node).className).startsWith('settings-lyrics-source-btn')).forEach((node) => {
      invoke(node, 'onClick');
    });
    expect(api.clipboardUrlDetectModeSet.mock.calls.map(([mode]) => mode)).toEqual(['https-only', 'http-https', 'domain-only']);
    expect(props.setClipboardUrlDetectMode).toHaveBeenCalledTimes(3);
    await settle();
    expect(props.setClipboardUrlMonitorEnabled).toHaveBeenCalledTimes(failure ? 2 : 1);
    if (failure) expect(props.setClipboardUrlMonitorEnabled).toHaveBeenLastCalledWith(true);
  });
  it.each([{
    previous: true,
    failure: true,
    storageFailure: false
  }, {
    previous: false,
    failure: true,
    storageFailure: false
  }, {
    previous: true,
    failure: false,
    storageFailure: false
  }, {
    previous: false,
    failure: false,
    storageFailure: false
  }, {
    previous: true,
    failure: true,
    storageFailure: true
  }])('收藏静音$previous写入失败=$failure本地缓存失败=$storageFailure', async ({
    previous,
    failure,
    storageFailure
  }) => {
    props.clipboardUrlSuppressInFavorites = previous;
    if (failure) api.storeWrite.mockRejectedValue(new Error('offline'));
    if (storageFailure) {
      setItem.mockImplementation(() => {
        throw new Error('quota');
      });
    }
    const [, suppress] = elements(render()).filter((node) => elementProps(node).type === 'checkbox');
    invoke(suppress, 'onChange', {
      target: {
        checked: !previous
      }
    });
    expect(props.clipboardUrlSuppressInFavorites).toBe(!previous);
    expect(setItem).toHaveBeenCalledWith('clipboard-url-suppress-in-url-favorites', previous ? '0' : '1');
    await settle();
    expect(props.clipboardUrlSuppressInFavorites).toBe(failure ? previous : !previous);
    if (failure) expect(setItem).toHaveBeenLastCalledWith('clipboard-url-suppress-in-url-favorites', previous ? '1' : '0');
  });
});
