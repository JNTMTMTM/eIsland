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
 * @file authHookHarness.ts
 * @description 认证 Hook 私有浏览器叶边界，保留真实 API、滑块流程与局部 Hook 状态。
 * @author 鸡哥
 */

import { vi } from 'vitest';
import { resetLifecycle, renderWithHooks, runEffects, unmountHooks } from '../../../../components/test/contentLifecycleHarness';
import type { ReactElement } from 'react';
export { renderWithHooks, runEffects, unmountHooks };
interface NetworkReply { code: number; message?: string; data?: unknown }
interface ModalProps { onConfirm: (value: number) => void; onCancel: () => void }
export const responses: NetworkReply[] = [];
export const storage = new Map<string, string>();
export const modal = { props: null as ModalProps | null, failure: null as unknown };
export const api = {
  netFetch: vi.fn((url: string, init?: { body?: string }) => {
    void url; void init;
    return Promise.resolve({
      ok: true, status: 200, body: JSON.stringify(responses.shift() ?? { code: 200, data: { enabled: false } }),
    });
  }),
  updaterVersion: vi.fn(() => Promise.resolve('1.0.0')),
  storeRead: vi.fn(() => Promise.resolve<unknown>('integrated')),
  storeWrite: vi.fn(() => Promise.resolve()),
  clipboardOpenUrl: vi.fn(() => Promise.resolve()),
  expandWindowSettings: vi.fn(), disableMousePassthrough: vi.fn(),
  collapseWindow: vi.fn(), enableMousePassthrough: vi.fn(),
};
export const modalRoot = {
  render: vi.fn((element: ReactElement<ModalProps>) => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- DOM/原生叶边界可抛出任意值，验证 Hook 的非 Error 处理。
    if (modal.failure !== null) throw modal.failure;
    modal.props = element.props;
  }),
  unmount: vi.fn(),
};
export const browser = Object.assign(new EventTarget(), {
  api,
  location: { hostname: 'localhost', pathname: '/DynamicIsland.html' },
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  localStorage: {
    getItem: (key: string): string | null => storage.get(key) ?? null,
    setItem: (key: string, value: string): void => { storage.set(key, value); },
    removeItem: (key: string): void => { storage.delete(key); },
  },
});
/**
 * 重建当前场景的浏览器叶边界与本地状态。
 * @returns 无返回值。
 */
export function resetBrowser(): void {
  resetLifecycle();
  vi.clearAllMocks();
  responses.length = 0;
  storage.clear();
  modal.props = null;
  modal.failure = null;
  Object.defineProperty(browser, 'location', { configurable: true, writable: true, value: { hostname: 'localhost', pathname: '/DynamicIsland.html' } });
  browser.setTimeout = globalThis.setTimeout;
  browser.clearTimeout = globalThis.clearTimeout;
  vi.stubGlobal('window', browser);
  vi.stubGlobal('localStorage', browser.localStorage);
  vi.stubGlobal('document', {
    createElement: () => ({ remove: vi.fn() }),
    querySelector: () => ({ appendChild: vi.fn() }),
  });
}
/**
 * 让真实请求客户端的版本解析和异步响应完成。
 * @returns 微任务等待结果。
 */
export async function settle(): Promise<void> {
  // eslint-disable-next-line no-await-in-loop -- 顺序排空真实 API 链的微任务，不能并行代替先后执行。
  for (let index = 0; index < 20; index += 1) await Promise.resolve();
}
/**
 * 按顺序准备真实滑块配置、挑战及后续请求结果。
 * @param reply - 邮箱验证码请求结果。
 * @returns 无返回值。
 */
export function builtinCaptcha(reply: NetworkReply): void {
  responses.push({ code: 200, data: { enabled: true, provider: 'builtin' } },
    { code: 200, data: { challengeId: 'challenge', captchaSign: 'signature' } }, reply);
}
