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
 * @file userSettingsAccount.test.ts
 * @description 用户中心账号会话、资料头像、密码验证码和注销真实异步交互回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { runEffects, unmountHooks } from '../../app/components/test/themeHookHarness';
import { bootUser, cleanupUser, clickUser, fillInputs, inputUser, mocks, profile, renderUser, settleUser, setupUser } from './userSettingsFixture';
beforeEach(setupUser);
afterEach(cleanupUser);
describe('登录资料生命周期', () => {
  it('未登录清理价格并允许登录注册，订阅同步及卸载', async () => {
    mocks.token = null;
    mocks.profile = null;
    await bootUser();
    await clickUser('settings.user.auth.gotoLogin');
    await clickUser('settings.user.auth.gotoRegister');
    expect(mocks.store.setLogin).toHaveBeenCalledOnce();
    expect(mocks.store.setRegister).toHaveBeenCalledOnce();
    expect(mocks.api.fetchUserProfile).not.toHaveBeenCalled();
    mocks.token = 'second';
    mocks.profile = {
      ...profile
    };
    mocks.listener?.();
    expect(textContent(renderUser())).toContain('reader');
    unmountHooks();
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });
  it.each([401, 4011, 500])('首次读取资料失败code=%s显示错误或退出', async (code) => {
    mocks.profile = null;
    mocks.api.fetchUserProfile.mockResolvedValue({
      code,
      ok: false
    });
    await bootUser();
    expect(textContent(renderUser())).toContain(code === 500 ? 'settings.user.feedback.loadFailed' : 'settings.user.auth.gotoLogin');
    expect(mocks.clear).toHaveBeenCalledTimes(code === 500 ? 0 : 1);
  });
  it('无本地资料时显示加载，然后远端返回资料', async () => {
    mocks.profile = null;
    let resolve: ((value: unknown) => void) | undefined;
    mocks.api.fetchUserProfile.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    renderUser();
    runEffects();
    expect(textContent(renderUser())).toContain('settings.user.feedback.loadingProfile');
    resolve?.({
      ok: true,
      data: profile
    });
    await settleUser();
    expect(textContent(renderUser())).toContain('reader');
  });
  it.each([{
    refresh: {
      ok: false,
      code: 401
    },
    remote: true,
    loggedOut: true
  }, {
    refresh: {
      ok: false,
      code: 4011
    },
    remote: true,
    loggedOut: true
  }, {
    refresh: {
      ok: false,
      code: 500
    },
    remote: true,
    loggedOut: false
  }, {
    refresh: {
      ok: true,
      data: {}
    },
    remote: false,
    loggedOut: false
  }, {
    refresh: {
      ok: true,
      data: {
        token: 'new-token'
      }
    },
    remote: true,
    loggedOut: false
  }, {
    refresh: {
      ok: true,
      data: {
        token: 'new-token'
      }
    },
    remote: false,
    loggedOut: false
  }])('刷新令牌和资料组合 $refresh / $remote', async ({
    refresh: refresh,
    remote: remote,
    loggedOut: loggedOut
  }) => {
    await bootUser();
    mocks.api.refreshUserToken.mockResolvedValue(refresh);
    mocks.api.fetchUserProfile.mockResolvedValue(remote ? {
      ok: true,
      data: profile
    } : {
      ok: false,
      message: 'remote failed'
    });
    await clickUser('settings.user.actions.refresh');
    expect(textContent(renderUser())).toContain(loggedOut ? 'settings.user.auth.gotoLogin' : {
      true: 'settings.user.feedback.refreshSuccess',
      false: 'settings.user.feedback.refreshFailed'
    }[String(remote) as 'true' | 'false']);
    if (refresh.data && 'token' in refresh.data) expect(mocks.writeToken).toHaveBeenCalledWith('new-token');
  });
  it.each(['male', 'female', 'custom', 'undisclosed'] as const)('展示性别%s及完整/缺省资料', async (genderValue) => {
    mocks.profile = {
      ...profile,
      gender: genderValue,
      genderCustom: genderValue === 'custom' ? 'Custom gender' : null,
      avatar: 'avatar-url',
      birthday: '2000-01-02',
      proExpireAt: '2099-01-01T00:00:00'
    };
    mocks.api.fetchUserProfile.mockResolvedValue({
      ok: true,
      data: mocks.profile
    });
    await bootUser();
    expect(textContent(renderUser())).toContain(`settings.user.gender.${genderValue}`);
    expect(elements(renderUser()).some((node) => node.type === 'img' && elementProps(node).src === 'avatar-url')).toBe(true);
    invoke(findElement(renderUser(), (node) => elementProps(node)['aria-label'] === 'settings.user.card.expandHeatmap'), 'onClick');
    expect(String(elementProps(findElement(renderUser(), (node) => String(elementProps(node).className).includes('settings-user-info-heatmap'))).className)).toContain('--open');
    invoke(findElement(renderUser(), (node) => elementProps(node)['aria-label'] === 'settings.user.card.collapseHeatmap'), 'onClick');
  });
  it.each([{
    payload: {
      role: ' ROLE_ADMIN '
    }
  }, {
    payload: {
      role: '',
      authorities: [null, '', 'ROLE_USER']
    }
  }, {
    payload: {
      authority: 'ROLE_DEVELOPER'
    }
  }, {
    payload: {}
  }])('解析令牌角色 $payload', async ({
    payload: payload
  }) => {
    mocks.token = `Bearer h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;
    await bootUser();
    expect(String(elementProps(findElement(renderUser(), (node) => String(elementProps(node).className).startsWith('settings-user-info-summary-card'))).className)).not.toContain('--pro');
  });
  it.each(['h..s', 'h.not-json.s'])('非法JWT%s安全回退', async (token) => {
    mocks.token = token;
    await bootUser();
    expect(textContent(renderUser())).toContain('reader');
  });
});
describe('资料编辑、头像上传与保存', () => {
  it('自定义性别/生日输入保存及取消，非法生日阻止请求', async () => {
    await bootUser('edit');
    await clickUser('settings.user.gender.custom');
    inputUser('settings.user.fields.genderCustom', '  Custom  ');
    inputUser('settings.user.fields.birthday', 'bad');
    await clickUser('settings.user.actions.saveProfile');
    expect(mocks.api.updateUserProfile).not.toHaveBeenCalled();
    expect(textContent(renderUser())).toContain('settings.user.feedback.birthdayInvalid');
    inputUser('settings.user.fields.birthday', '2000-01-02');
    await clickUser('settings.user.actions.saveProfile');
    expect(mocks.api.updateUserProfile).toHaveBeenCalledWith('opaque', {
      avatar: null,
      gender: 'custom',
      genderCustom: 'Custom',
      birthday: '2000-01-02'
    });
    expect(textContent(renderUser())).toContain('settings.user.feedback.saveSuccess');
    await clickUser('settings.user.actions.cancelChanges');
    expect(textContent(renderUser())).not.toContain('settings.user.feedback.saveSuccess');
    ['male', 'female', 'undisclosed'].forEach((gender) => {
      invoke(findElement(renderUser(), (node) => node.type === 'button' && textContent(node) === `settings.user.gender.${gender}`), 'onClick');
    });
  });
  it.each([401, 4011, 500])('保存资料失败code=%s并恢复可提交状态', async (code) => {
    await bootUser('edit');
    mocks.api.updateUserProfile.mockResolvedValue({
      code,
      ok: false
    });
    await clickUser('settings.user.actions.saveProfile');
    expect(textContent(renderUser())).toContain(code === 500 ? 'settings.user.feedback.saveFailed' : 'settings.user.auth.gotoLogin');
  });
  it.each([{
    file: null,
    expected: null
  }, {
    file: {
      size: 5242881,
      type: 'image/png'
    },
    expected: 'avatarTooLarge'
  }, {
    file: {
      size: 123,
      type: 'text/plain'
    },
    expected: 'avatarNotImage'
  }])('头像文件校验 $expected', async ({
    file: file,
    expected: expected
  }) => {
    await bootUser('edit');
    const event = {
      target: {
        files: file ? [file] : null,
        value: 'selected'
      }
    };
    invoke(findElement(renderUser(), (node) => node.type === 'input' && elementProps(node).type === 'file'), 'onChange', event);
    await settleUser();
    expect(event.target.value).toBe('');
    expect(mocks.api.uploadUserAvatar).not.toHaveBeenCalled();
    if (expected) expect(textContent(renderUser())).toContain(`settings.user.feedback.${expected}`);
  });
  it.each([{
    mode: 'success',
    expected: 'avatarUploaded'
  }, {
    mode: 'cancel',
    expected: null
  }, {
    mode: 'no-token',
    expected: 'needLogin'
  }, {
    mode: 'no-account',
    expected: 'needLogin'
  }, {
    mode: 'unauthorized',
    expected: 'gotoLogin'
  }, {
    mode: 'save-failed',
    expected: 'saveFailed'
  }, {
    mode: 'upload-error',
    expected: 'upload denied'
  }, {
    mode: 'upload-string',
    expected: 'avatarUploadFailed'
  }, {
    mode: 'rate-429',
    expected: 'avatarUploadTooFrequent'
  }, {
    mode: 'rate-cn',
    expected: 'avatarUploadTooFrequent'
  }, {
    mode: 'rate-en',
    expected: 'avatarUploadTooFrequent'
  }])('头像异步流程$mode', async ({
    mode: mode,
    expected: expected
  }) => {
    await bootUser('edit');
    if (mode === 'no-token') mocks.token = null;
    if (mode === 'no-account') {
      mocks.profile = {
        ...profile,
        username: '',
        email: ''
      };
      mocks.listener?.();
    }
    if (mode === 'cancel') mocks.captcha.mockResolvedValue(null);
    if (mode === 'unauthorized') {
      mocks.api.updateUserProfile.mockResolvedValue({
        ok: false,
        code: 4011
      });
    }
    if (mode === 'save-failed') {
      mocks.api.updateUserProfile.mockResolvedValue({
        ok: false
      });
    }
    if (mode.startsWith('upload-')) mocks.api.uploadUserAvatar.mockRejectedValue(mode === 'upload-string' ? 'failure' : new Error('upload denied'));
    if (mode.startsWith('rate-')) {
      mocks.api.uploadUserAvatar.mockRejectedValue(new Error({
        'rate-429': '429',
        'rate-cn': '上传过于频繁',
        'rate-en': 'too frequent'
      }[mode as 'rate-429' | 'rate-cn' | 'rate-en']));
    }
    if (mode === 'success') mocks.api.uploadUserAvatar.mockResolvedValue('new-avatar-url');
    const node = findElement(renderUser(), (entry) => entry.type === 'input' && elementProps(entry).type === 'file');
    const ref = elementProps(node).ref as {
      current: {
        click: () => void;
      } | null;
    };
    const select = vi.fn();
    ref.current = {
      click: select
    };
    await clickUser('settings.user.actions.chooseAvatar');
    expect(select).toHaveBeenCalledOnce();
    invoke(node, 'onChange', {
      target: {
        files: [{
          size: 5242880,
          type: 'image/png'
        }],
        value: 'selected'
      }
    });
    await settleUser();
    if (expected) expect(textContent(renderUser())).toContain(expected);
    if (mode === 'success') {
      expect(mocks.writeProfile).toHaveBeenCalledWith(expect.objectContaining({
        avatar: 'new-avatar-url'
      }));
    }
  });
});
describe('密码与注销验证码/账号操作', () => {
  it.each([401, 4011, 500, 200])('修改密码响应%s', async (code) => {
    await bootUser('password');
    fillInputs([' 123456 ', 'Password123', 'Password123']);
    mocks.api.updateUserPassword.mockResolvedValue({
      code,
      ok: code === 200
    });
    await clickUser('settings.user.actions.changePassword');
    expect(mocks.api.updateUserPassword).toHaveBeenCalledWith('opaque', {
      password: 'Password123',
      emailCode: '123456'
    });
    expect(textContent(renderUser())).toContain({
      200: 'settings.user.feedback.passwordChangeSuccess',
      500: 'settings.user.feedback.saveFailed'
    }[code as 200 | 500] ?? 'settings.user.auth.gotoLogin');
  });
  it('密码可见性和取消编辑同时复原三个字段', async () => {
    await bootUser('password');
    fillInputs(['123456', 'Password123', 'Password123']);
    elements(renderUser()).filter((node) => elementProps(node)['aria-label'] === 'settings.user.actions.showPassword').forEach((node) => {
      invoke(node, 'onClick');
    });
    expect(elements(renderUser()).filter((node) => node.type === 'input').every((node) => elementProps(node).type === 'text')).toBe(true);
    await clickUser('settings.user.actions.cancelChanges');
    expect(elements(renderUser()).filter((node) => node.type === 'input').every((node) => elementProps(node).value === '')).toBe(true);
  });
  it.each(['password', 'account'] as const)('%s验证码成功、冷却和清理', async (page) => {
    vi.useFakeTimers();
    await bootUser(page);
    if (page === 'account') await clickUser('settings.user.actions.unregister');
    mocks.api.sendUserEmailCode.mockResolvedValue({
      ok: true,
      data: {
        retryAfterSeconds: 2
      }
    });
    await clickUser('settings.user.actions.sendCode');
    expect(mocks.api.sendUserEmailCode).toHaveBeenCalledWith('reader@example.com', page === 'password' ? 'RESET_PASSWORD' : 'UNREGISTER', {
      ticket: 'ticket',
      randstr: 'rand',
      sign: 'sign'
    });
    await clickUser('settings.user.actions.sendCodeCooldown');
    expect(mocks.api.sendUserEmailCode).toHaveBeenCalledOnce();
    renderUser();
    runEffects();
    vi.advanceTimersByTime(1000);
    renderUser();
    runEffects();
    vi.advanceTimersByTime(1000);
    expect(textContent(renderUser())).toContain('settings.user.actions.sendCode');
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['password', 'account'] as const)('%s验证码缺省冷却、负值和0返回的默认冷却', async (page) => {
    await bootUser(page);
    if (page === 'account') await clickUser('settings.user.actions.unregister');
    mocks.api.sendUserEmailCode.mockResolvedValue({
      ok: true,
      data: {
        retryAfterSeconds: -1
      }
    });
    await clickUser('settings.user.actions.sendCode');
    expect(textContent(renderUser())).toContain('settings.user.feedback.emailCodeSent');
    mocks.api.sendUserEmailCode.mockResolvedValue({
      ok: true
    });
    await clickUser('settings.user.actions.sendCode');
    expect(textContent(renderUser())).toContain('settings.user.actions.sendCodeCooldown');
  });
  it.each(['password', 'account'] as const)('%s验证码的无效邮箱、验证码取消、Error和非Error失败及后端失败', async (page) => {
    await bootUser(page);
    if (page === 'account') await clickUser('settings.user.actions.unregister');
    mocks.profile = {
      ...profile,
      email: ''
    };
    mocks.listener?.();
    await clickUser('settings.user.actions.sendCode');
    expect(textContent(renderUser())).toContain('settings.user.feedback.emailInvalid');
    mocks.profile = {
      ...profile
    };
    mocks.listener?.();
    mocks.captcha.mockResolvedValue(null);
    await clickUser('settings.user.actions.sendCode');
    expect(textContent(renderUser())).toContain('settings.user.feedback.captchaCancelled');
    mocks.captcha.mockRejectedValue(new Error('captcha failed'));
    await clickUser('settings.user.actions.sendCode');
    expect(textContent(renderUser())).toContain('captcha failed');
    mocks.captcha.mockRejectedValue('unknown');
    await clickUser('settings.user.actions.sendCode');
    expect(textContent(renderUser())).toContain('settings.user.feedback.emailCodeSendFailed');
    mocks.captcha.mockResolvedValue({
      ticket: 'ticket',
      randstr: 'rand',
      sign: 'sign'
    });
    mocks.api.sendUserEmailCode.mockResolvedValue({
      ok: false
    });
    await clickUser('settings.user.actions.sendCode');
    expect(textContent(renderUser())).toContain('settings.user.feedback.emailCodeSendFailed');
  });
  it.each([401, 4011, 500, 200])('注销响应%s、空字段和显示密码', async (code) => {
    await bootUser('account');
    await clickUser('settings.user.actions.unregister');
    await clickUser('settings.user.actions.confirmUnregister');
    expect(mocks.api.unregisterUser).not.toHaveBeenCalled();
    fillInputs(['', 'Password123']);
    await clickUser('settings.user.actions.confirmUnregister');
    expect(textContent(renderUser())).toContain('settings.user.feedback.emailCodeRequired');
    invoke(findElement(renderUser(), (node) => elementProps(node)['aria-label'] === 'settings.user.actions.showPassword'), 'onClick');
    expect(elements(renderUser()).filter((node) => node.type === 'input').every((node) => elementProps(node).type === 'text')).toBe(true);
    fillInputs([' 123456 ', 'Password123']);
    mocks.api.unregisterUser.mockResolvedValue({
      code,
      ok: code === 200
    });
    await clickUser('settings.user.actions.confirmUnregister');
    expect(mocks.api.unregisterUser).toHaveBeenCalledWith('opaque', 'Password123', '123456');
    expect(textContent(renderUser())).toContain(code === 500 ? 'settings.user.feedback.operationFailed' : 'settings.user.auth.gotoLogin');
  });
  it.each([true, false])('本地先登出并忽略网络失败=%s', async (fails) => {
    await bootUser('account');
    if (fails) mocks.api.logoutUser.mockRejectedValue(new Error('offline'));
    await clickUser('settings.user.actions.logout');
    expect(mocks.clear).toHaveBeenCalledOnce();
    expect(mocks.api.logoutUser).toHaveBeenCalledWith('opaque');
    expect(textContent(renderUser())).toContain('settings.user.auth.gotoLogin');
  });
});
