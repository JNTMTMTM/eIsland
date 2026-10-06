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
 * @file useSettingsMusic.test.ts
 * @description 音乐来源检测等待互斥、白名单去重及 SMTC 保存失败与边界回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsMusic } from '../useSettingsMusic';
import { renderWithHooks, resetLifecycle } from './settingsCoverageHarness';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
const api = {
  musicDetectSourceAppId: vi.fn<() => Promise<unknown>>(),
  musicWhitelistSet: vi.fn<(...args: unknown[]) => Promise<void>>(),
  musicSmtcUnsubscribeMsSet: vi.fn<(ms: number) => Promise<boolean>>()
};
const t = vi.fn<(key: string, values?: Record<string, unknown>) => string>((key) => key);
/**
 * 重复执行实际音乐配置 Hook。
 * @returns 实际状态和服务操作。
 */
function render() {
  return renderWithHooks(() => useSettingsMusic({
    t: t as unknown as Parameters<typeof useSettingsMusic>[0]['t']
  }));
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  t.mockImplementation((key) => key);
  api.musicWhitelistSet.mockResolvedValue(undefined);
  api.musicSmtcUnsubscribeMsSet.mockResolvedValue(true);
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('音乐来源和白名单', () => {
  it.each([{
    ok: true,
    sources: [{
      sourceAppId: 'player',
      isPlaying: true,
      hasTitle: true,
      thumbnail: null
    }]
  }, {
    ok: true,
    sources: []
  }, {
    ok: false,
    sources: [{
      sourceAppId: 'player'
    }]
  }])('检测响应%o仅接受成功非空来源', async (result) => {
    api.musicDetectSourceAppId.mockResolvedValue(result);
    await render().handleDetectSourceAppId();
    expect(render().detectingSourceAppId).toBe(false);
    expect(render().detectedSources).toEqual(result.ok ? result.sources : []);
  });
  it('检测等待时第二次调用被忽略，失败清空旧来源恢复busy', async () => {
    let reject: (error: Error) => void = () => undefined;
    api.musicDetectSourceAppId.mockReturnValue(new Promise((resolve, fail) => {
      void resolve;
      reject = fail;
    }));
    render().setDetectedSources([{
      sourceAppId: 'previous',
      isPlaying: false,
      hasTitle: false,
      thumbnail: null
    }]);
    const pending = render().handleDetectSourceAppId();
    expect(render().detectingSourceAppId).toBe(true);
    await render().handleDetectSourceAppId();
    expect(api.musicDetectSourceAppId).toHaveBeenCalledOnce();
    expect(render().detectedSources).toEqual([]);
    reject(new Error('offline'));
    await pending;
    expect(render().detectingSourceAppId).toBe(false);
  });
  it('空白不添加，大小写重复清空草稿提示，新条目trim后保存', async () => {
    render().setWhitelist(['Player.exe']);
    render().setWhitelistDraft(' ');
    render().handleAddWhitelist();
    expect(api.musicWhitelistSet).not.toHaveBeenCalled();
    render().setWhitelistDraft(' PLAYER.EXE ');
    render().handleAddWhitelist();
    expect(render().whitelistInputError).toBe('settings.music.whitelist.alreadyExists');
    expect(render().whitelistDraft).toBe('');
    expect(api.musicWhitelistSet).not.toHaveBeenCalled();
    api.musicWhitelistSet.mockRejectedValue(new Error('write'));
    render().setWhitelistDraft(' NewPlayer.exe ');
    render().handleAddWhitelist();
    await Promise.resolve();
    await Promise.resolve();
    expect(render().whitelist).toEqual(['Player.exe', 'NewPlayer.exe']);
    expect(render().whitelistInputError).toBe('');
    expect(api.musicWhitelistSet).toHaveBeenCalledWith(['Player.exe', 'NewPlayer.exe']);
  });
});
describe('SMTC设置保存', () => {
  it.each(['999', 'invalid', 'Infinity'])('无效时间%s不发请求', async (value) => {
    render().setMusicSmtcNeverUnsubscribe(false);
    render().setMusicSmtcUnsubscribeInput(value);
    await render().saveMusicSmtcUnsubscribeConfig();
    expect(api.musicSmtcUnsubscribeMsSet).not.toHaveBeenCalled();
    expect(render().musicSmtcConfigMessage?.text).toBe('settings.music.smtc.invalidMsValue');
  });
  it.each([true, false])('永不取消订阅=%s成功保存', async (never) => {
    render().setMusicSmtcNeverUnsubscribe(never);
    render().setMusicSmtcUnsubscribeInput(' 1234.5 ');
    await render().saveMusicSmtcUnsubscribeConfig();
    expect(api.musicSmtcUnsubscribeMsSet).toHaveBeenCalledWith(never ? 0 : 1234.5);
    expect(render().musicSmtcConfigMessage?.text).toBe(never ? 'settings.music.smtc.savedNeverUnsubscribe' : 'settings.music.smtc.savedAutoUnsubscribe');
    if (!never) {expect(t).toHaveBeenCalledWith('settings.music.smtc.savedAutoUnsubscribe', expect.objectContaining({
      ms: 1235
    }));}
  });
  it('保存返回false提示失败，Promise拒绝保留外层错误契约', async () => {
    api.musicSmtcUnsubscribeMsSet.mockResolvedValue(false);
    await render().saveMusicSmtcUnsubscribeConfig();
    expect(render().musicSmtcConfigMessage?.type).toBe('error');
    api.musicSmtcUnsubscribeMsSet.mockRejectedValue(new Error('backend'));
    await expect(render().saveMusicSmtcUnsubscribeConfig()).rejects.toThrow('backend');
  });
});
