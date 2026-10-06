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
 * @file userSettingsBoundary.test.ts
 * @description 用户中心旧本地数据、迟到定时器、缺ref及异步预览边界回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { runEffects } from '../../app/components/test/themeHookHarness';
import { bootUser, cleanupUser, clickUser, mocks, navigateUser, profile, renderUser, settleUser, setupUser, transport } from './userSettingsFixture';
const image = {
  id: 1,
  taskId: 'task-1',
  status: 'SUCCEEDED',
  sourceLanguage: 'auto',
  targetLanguage: 'zh',
  sourceUrl: 'https://host/source.png',
  resultUrl: 'https://host/result.webp',
  createdAt: ''
};
beforeEach(setupUser);
afterEach(cleanupUser);
describe('用户中心兼容和迟到事件边界', () => {
  it('旧本地资料缺少性别、邮箱和用户名仍可显示头像与默认信息', async () => {
    mocks.profile = {
      ...profile,
      gender: undefined,
      username: undefined,
      email: undefined,
      avatar: 'avatar-url',
      balanceFen: undefined
    } as unknown as typeof profile;
    mocks.api.fetchUserProfile.mockResolvedValue({
      ok: false,
      message: 'offline'
    });
    await bootUser();
    expect(textContent(renderUser())).toContain('—');
    expect(textContent(renderUser())).toContain('settings.user.gender.undisclosed');
    expect(textContent(renderUser())).toContain('¥0.00');
    expect(elementProps(findElement(renderUser(), (node) => node.type === 'img' && elementProps(node).src === 'avatar-url')).alt).toBe('');
    await navigateUser('edit');
    expect(textContent(renderUser())).toContain('offline');
    await clickUser('settings.user.actions.cancelChanges');
  });
  it('空用户名使用问号占位，语言缺省回退，编辑和密码页显示资料错误', async () => {
    mocks.profile = {
      ...profile,
      username: ''
    };
    mocks.language = '';
    mocks.api.fetchUserProfile.mockResolvedValue({
      ok: false
    });
    await bootUser();
    expect(textContent(renderUser())).toContain('?');
    await navigateUser('edit');
    expect(elementProps(findElement(renderUser(), (node) => node.type === 'input' && elementProps(node).type === 'date')).lang).toBe('zh-CN');
    expect(textContent(renderUser())).toContain('settings.user.feedback.loadFailed');
    await navigateUser('password');
    expect(textContent(renderUser())).toContain('settings.user.feedback.loadFailed');
    await clickUser('settings.user.actions.changePassword');
    await clickUser('settings.user.actions.cancelChanges');
    expect(textContent(renderUser())).not.toContain('settings.user.feedback.emailCodeRequired');
  });
  it('无本地资料首次失败后，专用刷新按钮恢复资料', async () => {
    mocks.profile = null;
    mocks.api.fetchUserProfile.mockResolvedValue({
      ok: false
    });
    await bootUser();
    mocks.api.fetchUserProfile.mockResolvedValue({
      ok: true,
      data: profile
    });
    await clickUser('settings.user.actions.refresh');
    expect(textContent(renderUser())).toContain('reader');
    expect(mocks.writeToken).toHaveBeenCalledWith('fresh-token');
  });
  it('无绑定预览元素时跳过wheel监听，关闭预览恢复图片卡片', async () => {
    mocks.api.fetchImageTranslationHistory.mockResolvedValue({
      ok: true,
      data: {
        items: [image],
        page: 1,
        total: 1,
        totalPages: 1
      }
    });
    await bootUser('image-translation');
    invoke(findElement(renderUser(), (node) => node.type === 'button' && elementProps(node).className === 'settings-user-image-translation-image-wrap'), 'onClick');
    renderUser();
    runEffects();
    const preview = findElement(renderUser(), (node) => String(elementProps(node).className).startsWith('settings-user-image-translation-preview'));
    invoke(preview, 'onClick', {});
    expect(elements(renderUser()).some((node) => node.type === 'button' && elementProps(node).className === 'settings-user-image-translation-image-wrap')).toBe(true);
  });
  it('翻译结果下载过程中显示等待状态并阻止第二次下载', async () => {
    mocks.api.fetchImageTranslationHistory.mockResolvedValue({
      ok: true,
      data: {
        items: [image],
        page: 1,
        total: 1,
        totalPages: 1
      }
    });
    await bootUser('image-translation');
    let resolve: ((value: string | null) => void) | undefined;
    transport.downloadPickSavePath.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    invoke(findElement(renderUser(), (node) => node.type === 'button' && textContent(node) === 'settings.user.imageTranslation.actions.downloadResult'), 'onClick');
    const pending = findElement(renderUser(), (node) => node.type === 'button' && textContent(node) === 'settings.user.imageTranslation.actions.downloading');
    expect(elementProps(pending).disabled).toBe(true);
    invoke(pending, 'onClick');
    expect(transport.downloadPickSavePath).toHaveBeenCalledOnce();
    resolve?.(null);
    await settleUser();
  });
  it('空状态订单不触发已付款资料刷新', async () => {
    mocks.api.fetchUserPaymentOrders.mockResolvedValue({
      ok: true,
      data: {
        items: [{
          outTradeNo: 'order',
          status: '',
          productCode: 'PRO_MONTH',
          amountFen: 0
        }],
        page: 1,
        total: 1,
        totalPages: 1
      }
    });
    await bootUser('orders');
    expect(mocks.api.fetchUserProfile).toHaveBeenCalledOnce();
    expect(textContent(renderUser())).toContain('settings.user.payment.status.unknown');
  });
  it.each([true, false])('抹除排队回调处理当前预览匹配=%s', async (matching) => {
    mocks.api.fetchImageTranslationHistory.mockResolvedValue({
      ok: true,
      data: {
        items: [image, {
          ...image,
          taskId: 'task-2'
        }],
        page: 1,
        total: 2,
        totalPages: 1
      }
    });
    await bootUser('image-translation');
    const first = findElement(renderUser(), (node) => node.type === 'article' && node.key === 'task-1');
    const remove = findElement(matching ? first : findElement(renderUser(), (node) => node.type === 'article' && node.key === 'task-2'), (node) => node.type === 'button' && textContent(node) === 'settings.user.imageTranslation.actions.remove');
    invoke(findElement(first, (node) => node.type === 'button' && elementProps(node).className === 'settings-user-image-translation-image-wrap'), 'onClick');
    expect(elements(renderUser()).some((node) => String(elementProps(node).className).startsWith('settings-user-image-translation-preview'))).toBe(true);
    invoke(remove, 'onClick');
    await settleUser();
    expect(mocks.api.deleteImageTranslationHistory).toHaveBeenCalledWith('opaque', matching ? 'task-1' : 'task-2');
  });
  it('问卷页同样转发待填写提醒', async () => {
    mocks.reminder.questionnaire = {
      id: 1
    };
    await bootUser('questionnaire');
    const banner = findElement(renderUser(), (node) => 'onDismiss' in elementProps(node));
    invoke(banner, 'onOpen');
    expect(mocks.store.setQuestionnaire).toHaveBeenCalledOnce();
  });
  it.each(['password', 'account'] as const)('%s取消后已排队的冷却回调不会变为负数', async (page) => {
    vi.useFakeTimers();
    const schedule = vi.spyOn(globalThis, 'setTimeout');
    await bootUser(page);
    if (page === 'account') await clickUser('settings.user.actions.unregister');
    mocks.api.sendUserEmailCode.mockResolvedValue({
      ok: true,
      data: {
        retryAfterSeconds: 2
      }
    });
    await clickUser('settings.user.actions.sendCode');
    renderUser();
    runEffects();
    const queued = schedule.mock.calls.find(([, delay]) => delay === 1000)?.[0];
    await clickUser(page === 'account' ? 'settings.user.actions.cancel' : 'settings.user.actions.cancelChanges');
    renderUser();
    runEffects();
    if (typeof queued !== 'function') throw new Error('真实冷却effect没有排队回调');
    queued();
    if (page === 'account') await clickUser('settings.user.actions.unregister');
    expect(textContent(renderUser())).toContain('settings.user.actions.sendCode');
    expect(textContent(renderUser())).not.toContain('settings.user.actions.sendCodeCooldown');
  });
});
