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
 * @file useUpdateSettingsState.test.ts
 * @description 更新设置真实状态、更新流程、存储校验、事件订阅与卸载回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useUpdateSettingsState from '../useUpdateSettingsState';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './settingsCoverageHarness';
import type * as UserApi from '../../../../../../../api/user/userAccountApi';

const io = vi.hoisted(() => {
  vi.stubGlobal('window', { location: { hostname: 'app' } });
  return { resolve: vi.fn<typeof UserApi.fetchUpdateSourceUrl>() };
});
vi.mock('../../../../../../../api/user/userAccountApi', () => ({ fetchUpdateSourceUrl: io.resolve }));
vi.mock('../../../../../../../i18n', () => ({ getLanguage: () => 'en-US' }));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));

type Options = Parameters<typeof useUpdateSettingsState>[0];
const t = vi.fn<(key: string) => string>((key) => key);
const api = {
  storeRead: vi.fn<Window['api']['storeRead']>(),
  storeWrite: vi.fn<Window['api']['storeWrite']>(),
  updaterCheck: vi.fn<Window['api']['updaterCheck']>(),
  updaterDownload: vi.fn<Window['api']['updaterDownload']>(),
  updaterInstall: vi.fn<Window['api']['updaterInstall']>(),
  guideReset: vi.fn<Window['api']['guideReset']>(),
  onUpdaterProgress: vi.fn<Window['api']['onUpdaterProgress']>(),
  onUpdaterAvailable: vi.fn<Window['api']['onUpdaterAvailable']>()
};
const unsubscribeProgress = vi.fn<() => void>();
const unsubscribeAvailable = vi.fn<() => void>();
let isProUser = true;
let sessionToken: string | null = 'session';

/**
 * 渲染真实 Hook 并保留公开操作产生的状态。
 * @returns 当前更新状态和公开操作。
 */
function view() {
  return renderWithHooks(() => useUpdateSettingsState({
    isProUser, sessionToken, t: t as unknown as Options['t']
  }));
}

/**
 * 等待真实存储与订阅回调并提交下一轮 effect。
 * @returns 完成异步更新。
 */
async function commit(): Promise<void> {
  view();
  runEffects();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  view();
  runEffects();
}

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  isProUser = true;
  sessionToken = 'session';
  api.storeRead.mockReset().mockResolvedValue(undefined);
  api.storeWrite.mockReset().mockResolvedValue(true);
  api.updaterCheck.mockReset().mockResolvedValue({ available: false });
  api.updaterDownload.mockReset().mockResolvedValue(true);
  api.updaterInstall.mockReset().mockResolvedValue(true);
  api.guideReset.mockReset().mockResolvedValue(true);
  api.onUpdaterProgress.mockReset().mockReturnValue(unsubscribeProgress);
  api.onUpdaterAvailable.mockReset().mockReturnValue(unsubscribeAvailable);
  io.resolve.mockReset().mockResolvedValue({ ok: true, code: 200, message: '', data: { url: 'https://updates/package' } });
  vi.stubGlobal('window', { api });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});

describe('Update settings persistence and sources', () => {
  it.each(['github', 'tencent-cos', 'aliyun-oss', 'esa-cdn', 'cloudflare-r2', 'unknown'])('selects source %s and persists its public normalized value', async (value) => {
    const expected = value === 'unknown' ? 'cloudflare-r2' : value;
    view().handleUpdateSourceChange(value);
    expect(view().updateSource).toBe(expected);
    expect(api.storeWrite).toHaveBeenCalledWith('update-source', expected);
    expect(view().currentSourceLabel).toBeTruthy();
    await Promise.resolve();
  });

  it('rejects a paid source for a non-PRO account and downgrades a publicly restored paid source', async () => {
    isProUser = false;
    view().handleUpdateSourceChange('aliyun-oss');
    expect(view().updateStatus).toBe('error');
    expect(view().updateError).toBe('settings.update.proOnlyError');
    expect(api.storeWrite).not.toHaveBeenCalled();
    view().setUpdateSource('tencent-cos');
    api.storeWrite.mockRejectedValue(new Error('storage offline'));
    await commit();
    expect(view().updateSource).toBe('cloudflare-r2');
    expect(api.storeWrite).toHaveBeenCalledWith('update-source', 'cloudflare-r2');
  });

  it('keeps source labels meaningful for a damaged value supplied through the public setter', () => {
    view().setUpdateSource('damaged-runtime-source' as unknown as ReturnType<typeof view>['updateSource']);
    expect(view().currentSourceLabel).toBe('damaged-runtime-source');
  });

  it.each([
    { source: 'github', prompt: false, mode: 'always' },
    { source: 'invalid', prompt: 'false', mode: 'invalid' },
    { source: 'esa-cdn', prompt: true, mode: 'version-update-only' }
  ])('restores source $source and validates saved settings', async ({ source, prompt, mode }) => {
    api.storeRead.mockImplementation((key) => {
      if (key === 'update-source') return Promise.resolve(source);
      if (key === 'update-auto-prompt-enabled') return Promise.resolve(prompt);
      return Promise.resolve(mode);
    });
    await commit();
    expect(view().updateSource).toBe(source === 'invalid' ? 'cloudflare-r2' : source);
    expect(view().updateAutoPromptEnabled).toBe(typeof prompt === 'boolean' ? prompt : true);
    expect(view().announcementShowMode).toBe(mode === 'always' ? 'always' : 'version-update-only');
  });

  it('keeps defaults when reads fail and absorbs rejected preference writes', async () => {
    api.storeRead.mockRejectedValue(new Error('storage unavailable'));
    api.storeWrite.mockRejectedValue(new Error('write unavailable'));
    await commit();
    expect(view().updateSource).toBe('esa-cdn');
    view().handleUpdateSourceChange('github');
    view().handleUpdateAutoPromptEnabledChange(false);
    view().handleAnnouncementShowModeChange('always');
    await commit();
    expect(view().updateSource).toBe('github');
    expect(view().updateAutoPromptEnabled).toBe(false);
    expect(view().announcementShowMode).toBe('always');
  });

  it('ignores every pending read after unmount', async () => {
    let resolve: ((value: unknown) => void) | undefined;
    const pending = new Promise<unknown>((done) => { resolve = done; });
    api.storeRead.mockReturnValue(pending);
    view();
    runEffects();
    unmountHooks();
    resolve?.('github');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(view().updateSource).toBe('esa-cdn');
    expect(view().updateAutoPromptEnabled).toBe(true);
    expect(view().announcementShowMode).toBe('version-update-only');
  });
});

describe('Update settings request and updater events', () => {
  it('resolves paid URLs, bypasses public URLs and validates the PRO session', async () => {
    await expect(view().resolveUpdateSourceUrl('github')).resolves.toBeUndefined();
    await expect(view().resolveUpdateSourceUrl('aliyun-oss')).resolves.toBe('https://updates/package');
    expect(io.resolve).toHaveBeenCalledWith('session', 'aliyun-oss');
    isProUser = false;
    await expect(view().resolveUpdateSourceUrl('tencent-cos')).rejects.toThrow('settings.update.proOnlyError');
    isProUser = true;
    sessionToken = null;
    await expect(view().resolveUpdateSourceUrl('tencent-cos')).rejects.toThrow('settings.update.proOnlyNeedLogin');
  });

  it.each([
    { ok: false, code: 500, message: 'server rejected' },
    { ok: true, code: 200, message: '', data: { url: '' } },
    { ok: true, code: 200, message: '' }
  ])('rejects unusable update source responses', async (result) => {
    io.resolve.mockResolvedValue(result);
    await expect(view().resolveUpdateSourceUrl('tencent-cos')).rejects.toThrow(result.message || 'settings.update.sourceResolveFailed');
  });

  it.each([
    { result: { available: false, error: 'offline' }, status: 'error', version: '' },
    { result: { available: true, version: '2.0' }, status: 'available', version: '2.0' },
    { result: { available: true, version: '' }, status: 'latest', version: '' },
    { result: { available: false }, status: 'latest', version: '' }
  ])('handles updater check outcome $status', async ({ result, status, version }) => {
    api.updaterCheck.mockResolvedValue(result);
    view().setUpdateSource('github');
    await view().handleCheckUpdate();
    expect(api.updaterCheck).toHaveBeenCalledWith('github', undefined);
    expect(view().updateStatus).toBe(status);
    expect(view().updateVersion).toBe(version);
    expect(view().downloadProgress).toBeNull();
  });

  it.each([new Error('connection lost'), 'connection lost'])('reports check and download exceptions %s', async (error) => {
    api.updaterCheck.mockRejectedValue(error);
    api.updaterDownload.mockRejectedValue(error);
    await view().handleCheckUpdate();
    expect(view().updateError).toBe('检查更新失败: connection lost');
    await view().handleDownloadUpdate();
    expect(view().updateStatus).toBe('error');
    expect(view().updateError).toBe('下载失败: connection lost');
  });

  it.each([true, false])('handles download success %s', async (success) => {
    api.updaterDownload.mockResolvedValue(success);
    view().setUpdateSource('tencent-cos');
    await view().handleDownloadUpdate();
    expect(api.updaterDownload).toHaveBeenCalledWith('tencent-cos', 'https://updates/package');
    expect(view().updateStatus).toBe(success ? 'ready' : 'error');
    if (!success) expect(view().updateError).toBe('下载失败，请稍后重试');
  });

  it('subscribes to real updater callbacks, keeps an active download and respects disabled prompting', async () => {
    await commit();
    const [[progress]] = api.onUpdaterProgress.mock.calls;
    progress({ percent: 50, transferred: 5, total: 10, bytesPerSecond: 2 });
    expect(view().updateStatus).toBe('downloading');
    progress({ percent: 60, transferred: 6, total: 10, bytesPerSecond: 2 });
    expect(view().downloadProgress?.percent).toBe(60);
    const [[available]] = api.onUpdaterAvailable.mock.calls;
    available({ version: '3.0', releaseNotes: '' });
    expect(view().updateStatus).toBe('downloading');
    view().setUpdateStatus('ready');
    available({ version: '3.1', releaseNotes: '' });
    expect(view().updateStatus).toBe('ready');
    view().setUpdateStatus('latest');
    available({ version: '3.2', releaseNotes: '' });
    expect(view().updateStatus).toBe('available');
    expect(view().updateVersion).toBe('3.2');
    view().handleUpdateAutoPromptEnabledChange(false);
    await commit();
    const [latest] = api.onUpdaterAvailable.mock.calls.at(-1) ?? [];
    latest?.({ version: '4.0', releaseNotes: '' });
    expect(view().updateVersion).toBe('3.2');
    expect(unsubscribeAvailable).toHaveBeenCalled();
    unmountHooks();
    expect(unsubscribeProgress).toHaveBeenCalledOnce();
  });

  it('cleans up safely when optional event bridges are absent', async () => {
    vi.stubGlobal('window', { api: { ...api, onUpdaterProgress: undefined, onUpdaterAvailable: undefined } });
    await commit();
    unmountHooks();
    expect(unsubscribeProgress).not.toHaveBeenCalled();
    expect(unsubscribeAvailable).not.toHaveBeenCalled();
  });

  it('absorbs install errors and handles every guide reset outcome', async () => {
    api.updaterInstall.mockRejectedValue(new Error('installer unavailable'));
    view().handleInstallUpdate();
    await Promise.resolve();
    await view().handleResetGuide();
    expect(view().guideResetStatus).toBe('success');
    api.guideReset.mockResolvedValue(false);
    await view().handleResetGuide();
    expect(view().guideResetStatus).toBe('error');
    api.guideReset.mockRejectedValue(new Error('reset failed'));
    await view().handleResetGuide();
    expect(view().guideResetStatus).toBe('error');
  });
});
