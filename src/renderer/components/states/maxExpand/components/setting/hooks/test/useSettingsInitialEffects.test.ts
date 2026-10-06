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
 * @file useSettingsInitialEffects.test.ts
 * @description 网络节点规范化、邮件账户兼容迁移、偏好读取和持久化生命周期回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsInitialEffects } from '../useSettingsInitialEffects';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './settingsCoverageHarness';
const storage = vi.hoisted(() => ({
  loadNetworkConfig: vi.fn(),
  saveNetworkConfig: vi.fn()
}));
vi.mock('../../../../../../../store/utils/storage', async (original) => ({
  ...(await original<typeof import('../../../../../../../store/utils/storage')>()),
  ...storage
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
type Options = Parameters<typeof useSettingsInitialEffects>[0];
const setters = {
  setNetworkTimeoutMs: vi.fn(),
  setCustomTimeoutInput: vi.fn(),
  setStaticAssetNode: vi.fn(),
  setMailAccounts: vi.fn<Options['setMailAccounts']>(),
  setActiveMailAccountId: vi.fn(),
  setMailConfigLoaded: vi.fn(),
  setMailFetchLimit: vi.fn()
};
const values = new Map<string, unknown>();
const api = {
  storeRead: vi.fn<(key: string) => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>()
};
let options: Options;
const account = {
  id: 'mail-1',
  label: 'Work',
  emailAddress: 'reader@example.com',
  imapHost: 'imap.example.com',
  imapPort: '143',
  imapSecure: false,
  authUser: 'reader',
  authSecret: 'secret'
};
/**
 * 执行实际初始化 effect。
 * @returns 无返回值。
 */
function mount(): void {
  renderWithHooks(() => useSettingsInitialEffects(options));
  runEffects();
}
/**
 * 等待账户迁移的连续异步读取。
 * @returns Promise 回调处理完毕。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  values.clear();
  values.set('mail-accounts-config', [account]);
  values.set('mail-fetch-limit', 15);
  storage.loadNetworkConfig.mockReturnValue({
    timeoutMs: 6500,
    staticAssetNode: 'oss'
  });
  options = {
    ...setters,
    isProUser: true,
    mailConfigLoaded: false,
    mailAccounts: [account],
    mailFetchLimit: 20,
    staticAssetNode: 'r2',
    networkTimeoutMs: 6500
  };
  api.storeRead.mockImplementation((key) => Promise.resolve(values.get(key)));
  api.storeWrite.mockResolvedValue(undefined);
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});
describe('网络和邮件初始化', () => {
  it('所有账户字段保留且网络秒数、节点和邮件限制接线正确', async () => {
    mount();
    await settle();
    expect(setters.setNetworkTimeoutMs).toHaveBeenCalledWith(6500);
    expect(setters.setCustomTimeoutInput).toHaveBeenCalledWith('6.5');
    expect(setters.setStaticAssetNode).toHaveBeenCalledWith('oss');
    expect(setters.setMailAccounts).toHaveBeenCalledWith([account]);
    expect(setters.setActiveMailAccountId).toHaveBeenCalledWith('mail-1');
    expect(setters.setMailConfigLoaded).toHaveBeenCalledWith(true);
    expect(setters.setMailFetchLimit).toHaveBeenCalledWith(15);
    expect(api.storeWrite).not.toHaveBeenCalled();
  });
  it('新账户字段非法时使用安全缺省和新生成id', async () => {
    values.set('mail-accounts-config', [{
      id: 42,
      label: 42,
      emailAddress: false,
      imapHost: null,
      imapPort: 993,
      imapSecure: null,
      authUser: 42,
      authSecret: 42
    }, {
      id: ''
    }]);
    mount();
    await settle();
    expect(setters.setMailAccounts).toHaveBeenCalledWith([expect.objectContaining({
      label: '',
      emailAddress: '',
      imapHost: '',
      imapPort: '993',
      imapSecure: true,
      authUser: '',
      authSecret: ''
    }), expect.objectContaining({})]);
    const [[actualAccounts]] = setters.setMailAccounts.mock.calls;
    expect(Array.isArray(actualAccounts)).toBe(true);
    if (Array.isArray(actualAccounts)) {actualAccounts.forEach(({
      id
    }) => {
      expect(id).toBeTypeOf('string');
      expect(id.length).toBeGreaterThan(0);
    });}
  });
  it.each([null, [], 42])('新配置%o回退兼容旧邮件账户', async (raw) => {
    values.set('mail-accounts-config', raw);
    values.set('mail-account-config', account);
    mount();
    await settle();
    expect(setters.setMailAccounts).toHaveBeenCalledWith([expect.objectContaining({
      emailAddress: account.emailAddress,
      imapHost: account.imapHost,
      imapPort: account.imapPort,
      imapSecure: account.imapSecure,
      authUser: account.authUser,
      authSecret: account.authSecret,
      label: 'reader@example.com'
    })]);
  });
  it('旧邮件账户其他字段无效使用缺省，保留有效服务器', async () => {
    values.set('mail-accounts-config', []);
    values.set('mail-account-config', {
      imapHost: 'imap.example.com',
      emailAddress: 42,
      imapPort: 42,
      imapSecure: 42,
      authUser: 42,
      authSecret: 42
    });
    mount();
    await settle();
    expect(setters.setMailAccounts).toHaveBeenCalledWith([expect.objectContaining({
      label: '',
      emailAddress: '',
      imapHost: 'imap.example.com',
      imapPort: '993',
      imapSecure: true,
      authUser: '',
      authSecret: ''
    })]);
  });
  it.each([null, 'invalid', [], {
    imapHost: 42
  }, {
    imapHost: '   '
  }])('旧配置%o没有有效服务器时仍完成加载', async (raw) => {
    values.set('mail-accounts-config', []);
    values.set('mail-account-config', raw);
    mount();
    await settle();
    expect(setters.setMailAccounts).not.toHaveBeenCalled();
    expect(setters.setMailConfigLoaded).toHaveBeenCalledWith(true);
  });
  it('账户读取失败仍完成加载，邮件限制读取失败不覆盖默认', async () => {
    api.storeRead.mockRejectedValue(new Error('read failed'));
    mount();
    await settle();
    expect(setters.setMailConfigLoaded).toHaveBeenCalledWith(true);
    expect(setters.setMailFetchLimit).not.toHaveBeenCalled();
  });
  it.each(['first', 'legacy', 'rejected'])('卸载取消%s读取结果', async (stage) => {
    let resolve: (value: unknown) => void = () => undefined;
    let reject: (error: Error) => void = () => undefined;
    const pending = new Promise((done, fail) => {
      resolve = done;
      reject = fail;
    });
    api.storeRead.mockImplementation((key) => {
      if (key === 'mail-fetch-limit') return Promise.resolve(15);
      if (stage === 'legacy' && key === 'mail-accounts-config') return Promise.resolve([]);
      return pending;
    });
    mount();
    await settle();
    unmountHooks();
    if (stage === 'rejected') reject(new Error('late'));else resolve(stage === 'first' ? [account] : account);
    await settle();
    expect(setters.setMailAccounts).not.toHaveBeenCalled();
    expect(setters.setMailConfigLoaded).not.toHaveBeenCalled();
  });
});
describe('偏好持久化及会员限制', () => {
  it.each([0, 31, '12', NaN])('无效邮件限制%o保留默认', async (value) => {
    values.set('mail-fetch-limit', value);
    mount();
    await settle();
    expect(setters.setMailFetchLimit).not.toHaveBeenCalled();
  });
  it('加载完毕后保存当前账户和限制，失败被隔离', async () => {
    options.mailConfigLoaded = true;
    api.storeWrite.mockRejectedValue(new Error('write failed'));
    mount();
    await settle();
    expect(api.storeWrite).toHaveBeenCalledWith('mail-accounts-config', [account]);
    expect(api.storeWrite).toHaveBeenCalledWith('mail-fetch-limit', 20);
  });
  it('降为普通账号后PRO节点回退r2并保存网络配置', async () => {
    options.isProUser = false;
    options.staticAssetNode = 'oss';
    mount();
    await settle();
    expect(setters.setStaticAssetNode).toHaveBeenCalledWith('r2');
    expect(storage.saveNetworkConfig).toHaveBeenCalledWith({
      timeoutMs: 6500,
      staticAssetNode: 'r2'
    });
  });
});
