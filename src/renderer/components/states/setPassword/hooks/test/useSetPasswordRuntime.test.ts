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
 * @file useSetPasswordRuntime.test.ts
 * @description 真实 OAuth 设置密码验证、请求防重、会话持久化与导航测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createIslandSlice } from '../../../../../store/slices/islandSlice';
import { deferred, renderHook, resetHook, settleHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import type { IslandSlice } from '../../../../../store/types';
import type { UserAccountLoginData, UserAccountResult } from '../../../../../api/user/userAccountApi.types';
const api = vi.hoisted(() => ({
  submit: vi.fn<typeof import('../../../../../api/user/userAccountApi.oauth').oauthSetPassword>()
}));
vi.mock('../../../../../api/user/userAccountApi.oauth', () => ({
  oauthSetPassword: api.submit
}));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
let hook: typeof import('../useSetPassword');
let store: ReturnType<ReturnType<typeof createStore<IslandSlice>>>;
const storage = new Map<string, string>();
const write = vi.fn<(key: string, value: unknown) => Promise<void>>();
/** 执行真实密码 Hook。
 * @returns 公开状态
 */
function run() {
  return renderHook(hook.useSetPassword);
}
/** 输入合法密码表单，保持公开 Setter 数据流。
 * @returns 更新后状态
 */
function fill() {
  const state = run();
  state.setUsername('  user_1  ');
  state.setPassword('Password123');
  state.setConfirmPassword('Password123');
  return run();
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  storage.clear();
  write.mockResolvedValue(undefined);
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  };
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    localStorage,
    location: {
      pathname: '/DynamicIsland.html'
    },
    api: {
      storeWrite: write,
      setIslandSize: vi.fn(),
      setIslandShape: vi.fn()
    }
  }));
  store = createStore<IslandSlice>()(createIslandSlice);
  store.setState({
    state: 'setPassword',
    setPasswordContext: {
      tempToken: 'temporary',
      suggestedUsername: 'suggested',
      email: 'mail@example.com'
    }
  });
  const facade = Object.assign(() => store.getState(), {
    setState: store.setState,
    getState: store.getState
  });
  vi.doMock('../../../../../store/slices', () => ({
    default: facade
  }));
  api.submit.mockResolvedValue({
    ok: false,
    code: 400,
    message: 'server denied'
  });
  hook = await import('../useSetPassword');
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('useSetPassword true OAuth form and store flow', () => {
  it('initial username comes from real context and visibility setters are public', () => {
    expect(run()).toMatchObject({
      username: 'suggested',
      email: 'mail@example.com',
      passwordVisible: false,
      confirmPasswordVisible: false
    });
    run().setPasswordVisible(true);
    run().setConfirmPasswordVisible(true);
    expect(run()).toMatchObject({
      passwordVisible: true,
      confirmPasswordVisible: true
    });
  });
  it('missing suggested username initializes empty without hidden form input', () => {
    store.setState({
      setPasswordContext: {
        tempToken: 'temporary',
        suggestedUsername: '',
        email: ''
      }
    });
    expect(run().username).toBe('');
  });
  it.each([{
    username: ' ',
    password: 'Password123',
    confirm: 'Password123',
    key: 'usernameRequired'
  }, {
    username: '!',
    password: 'Password123',
    confirm: 'Password123',
    key: 'usernameInvalid'
  }, {
    username: 'user_1',
    password: '',
    confirm: '',
    key: 'passwordRequired'
  }, {
    username: 'user_1',
    password: '123',
    confirm: '123',
    key: 'passwordTooShort'
  }, {
    username: 'user_1',
    password: 'Password123',
    confirm: 'different',
    key: 'passwordMismatch'
  }])('invalid form $key prevents network request', async (row) => {
    const state = run();
    state.setUsername(row.username);
    state.setPassword(row.password);
    state.setConfirmPassword(row.confirm);
    await run().handleSubmit();
    expect(run().feedback).toEqual({
      type: 'error',
      text: `settings.user.feedback.${  row.key}`
    });
    expect(api.submit).not.toHaveBeenCalled();
  });
  it('pending submission blocks a second click and clears pending state on API error', async () => {
    const pending = deferred<UserAccountResult<UserAccountLoginData>>();
    api.submit.mockReturnValue(pending.promise);
    const first = fill().handleSubmit();
    expect(run().submitting).toBe(true);
    await run().handleSubmit();
    expect(api.submit).toHaveBeenCalledOnce();
    pending.resolve({
      ok: false,
      code: 400,
      message: 'server denied'
    });
    await first;
    expect(run()).toMatchObject({
      submitting: false,
      feedback: {
        type: 'error',
        text: 'server denied'
      }
    });
  });
  it.each([false, true])('failed or empty-data response ok=%s uses fallback when message is empty', async (ok) => {
    api.submit.mockResolvedValue({
      ok,
      code: 400,
      message: ''
    });
    await fill().handleSubmit();
    expect(run().feedback).toEqual({
      type: 'error',
      text: 'settings.user.feedback.operationFailed'
    });
    expect(store.getState().state).toBe('setPassword');
  });
  it.each(['mail@example.com', ''])('success persists actual token and navigates settings with email %s', async (email) => {
    store.setState({
      authReturnState: 'idle',
      setPasswordContext: {
        email,
        tempToken: 'temporary',
        suggestedUsername: 'suggested'
      }
    });
    api.submit.mockResolvedValue({
      ok: true,
      code: 200,
      message: 'ok',
      data: {
        token: 'registered-token'
      } as UserAccountLoginData
    });
    await fill().handleSubmit();
    await settleHook();
    expect(api.submit).toHaveBeenCalledWith('temporary', 'user_1', 'Password123', email || undefined);
    expect([...storage.values()]).toContain('registered-token');
    expect(write).toHaveBeenCalled();
    expect(store.getState()).toMatchObject({
      state: 'maxExpand',
      maxExpandTab: 'settings',
      authReturnState: null
    });
    expect(run().feedback).toEqual({
      type: 'success',
      text: 'settings.user.feedback.registerSuccess'
    });
  });
});
