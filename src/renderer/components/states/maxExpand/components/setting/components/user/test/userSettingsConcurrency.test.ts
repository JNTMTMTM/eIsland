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
 * @file userSettingsConcurrency.test.ts
 * @description 用户中心真实等待状态、跨页互斥、竞态结果和历史动作guard回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { bootUser, cleanupUser, clickUser, fillInputs, mocks, navigateUser, profile, renderUser, settleUser, setupUser, transport } from './userSettingsFixture';
const order = {
  outTradeNo: 'order-1',
  productCode: 'PRO_MONTH',
  amountFen: 1500,
  status: 'PAYING',
  payUrl: 'https://pay'
};
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
const ocr = {
  id: 1,
  sourceUrl: 'https://host/source.jpg',
  recognizedText: 'Text',
  createdAt: ''
};
const question = {
  resultId: 1,
  questionnaire: {
    id: 10,
    title: 'Survey',
    description: '',
    questions: []
  },
  answers: {},
  submittedAt: '',
  rewardProDays: 2,
  rewardProExpireAt: null
};
/**
 * 建立可控制完成时机的叶服务 Promise。
 * @returns 等待值和完成函数。
 */
function deferred() {
  let resolve: (value: unknown) => void = () => undefined;
  const promise = new Promise<unknown>((done) => {
    resolve = done;
  });
  return {
    promise,
    resolve
  };
}
/**
 * 获取可见真实按钮；允许在执行前检查忙碌状态。
 * @param key - 按钮翻译键。
 * @returns 对应实际按钮。
 */
function button(key: string) {
  return findElement(renderUser(), (node) => node.type === 'button' && textContent(node).includes(key));
}
beforeEach(setupUser);
afterEach(cleanupUser);
describe('异步并发和guard', () => {
  it('刷新资料等待期间抑制第二次令牌刷新', async () => {
    await bootUser();
    const pending = deferred();
    mocks.api.fetchUserProfile.mockReturnValue(pending.promise);
    await clickUser('settings.user.actions.refresh');
    expect(mocks.api.refreshUserToken).toHaveBeenCalledOnce();
    await clickUser('settings.user.actions.refresh');
    expect(mocks.api.refreshUserToken).toHaveBeenCalledOnce();
    pending.resolve({
      ok: true,
      data: profile
    });
    await settleUser();
  });
  it('保存资料与修改密码跨页互斥，同时抑制验证码发送', async () => {
    await bootUser('password');
    await clickUser('settings.user.actions.changePassword');
    await navigateUser('edit');
    await clickUser('settings.user.actions.cancelChanges');
    const pending = deferred();
    mocks.api.updateUserProfile.mockReturnValue(pending.promise);
    invoke(button('settings.user.actions.saveProfile'), 'onClick');
    expect(textContent(renderUser())).toContain('settings.user.actions.saving');
    invoke(button('settings.user.actions.saving'), 'onClick');
    expect(mocks.api.updateUserProfile).toHaveBeenCalledOnce();
    await navigateUser('password');
    fillInputs(['123456', 'Password123', 'Password123']);
    await clickUser('settings.user.actions.changePassword');
    await clickUser('settings.user.actions.sendCode');
    expect(mocks.api.updateUserPassword).not.toHaveBeenCalled();
    expect(mocks.api.sendUserEmailCode).not.toHaveBeenCalled();
    await navigateUser('account');
    await clickUser('settings.user.actions.unregister');
    await clickUser('settings.user.actions.sendCode');
    expect(mocks.api.sendUserEmailCode).not.toHaveBeenCalled();
    pending.resolve({
      ok: true
    });
    await settleUser();
  });
  it('修改密码等待时阻止重复修改及跨页资料保存', async () => {
    await bootUser('password');
    fillInputs(['123456', 'Password123', 'Password123']);
    const pending = deferred();
    mocks.api.updateUserPassword.mockReturnValue(pending.promise);
    invoke(button('settings.user.actions.changePassword'), 'onClick');
    expect(textContent(renderUser())).toContain('settings.user.actions.changingPassword');
    invoke(button('settings.user.actions.changingPassword'), 'onClick');
    await clickUser('settings.user.actions.sendCode');
    await navigateUser('edit');
    await clickUser('settings.user.actions.saveProfile');
    await navigateUser('account');
    await clickUser('settings.user.actions.unregister');
    await clickUser('settings.user.actions.sendCode');
    expect(mocks.api.updateUserPassword).toHaveBeenCalledOnce();
    expect(mocks.api.updateUserProfile).not.toHaveBeenCalled();
    expect(mocks.api.sendUserEmailCode).not.toHaveBeenCalled();
    pending.resolve({
      ok: true
    });
    await settleUser();
  });
  it.each(['password', 'account'] as const)('%s滑块等待时阻止再次发送', async (page) => {
    await bootUser(page);
    if (page === 'account') await clickUser('settings.user.actions.unregister');
    const pending = deferred();
    mocks.captcha.mockReturnValue(pending.promise);
    invoke(button('settings.user.actions.sendCode'), 'onClick');
    expect(textContent(renderUser())).toContain('settings.user.feedback.emailCodeSending');
    invoke(button('settings.user.feedback.emailCodeSending'), 'onClick');
    expect(mocks.captcha).toHaveBeenCalledOnce();
    pending.resolve(null);
    await settleUser();
  });
  it('注销等待期间抑制重复请求及发送验证码', async () => {
    await bootUser('account');
    await clickUser('settings.user.actions.unregister');
    fillInputs(['123456', 'Password123']);
    const pending = deferred();
    mocks.api.unregisterUser.mockReturnValue(pending.promise);
    invoke(button('settings.user.actions.confirmUnregister'), 'onClick');
    expect(textContent(renderUser())).toContain('settings.user.actions.unregistering');
    invoke(button('settings.user.actions.unregistering'), 'onClick');
    await clickUser('settings.user.actions.sendCode');
    expect(mocks.api.unregisterUser).toHaveBeenCalledOnce();
    expect(mocks.api.sendUserEmailCode).not.toHaveBeenCalled();
    pending.resolve({
      ok: true
    });
    await settleUser();
  });
  it('头像请求处理中登出，迟到结果不复活资料', async () => {
    await bootUser('edit');
    const pending = deferred();
    mocks.api.uploadUserAvatar.mockReturnValue(pending.promise);
    invoke(findElement(renderUser(), (node) => node.type === 'input' && elementProps(node).type === 'file'), 'onChange', {
      target: {
        files: [{
          size: 1,
          type: 'image/png'
        }],
        value: 'selected'
      }
    });
    await settleUser();
    expect(textContent(renderUser())).toContain('settings.user.actions.uploading');
    await navigateUser('account');
    await clickUser('settings.user.actions.logout');
    mocks.writeProfile.mockClear();
    pending.resolve('new-avatar');
    await settleUser();
    expect(mocks.writeProfile).not.toHaveBeenCalled();
    expect(textContent(renderUser())).toContain('settings.user.auth.gotoLogin');
  });
  it('订单关闭中禁止重复操作，并保护空订单号', async () => {
    mocks.api.fetchUserPaymentOrders.mockResolvedValue({
      ok: true,
      data: {
        items: [order, {
          ...order,
          outTradeNo: ''
        }],
        page: 1,
        total: 2,
        totalPages: 1
      }
    });
    await bootUser('orders');
    const buttons = elements(renderUser()).filter((node) => node.type === 'button' && textContent(node) === 'settings.user.orders.actions.closeOrder');
    const emptyOrder = findElement(renderUser(), (node) => node.key === '' && String(elementProps(node).className).includes('settings-user-order-item-card'));
    expect(textContent(emptyOrder)).not.toContain('settings.user.orders.actions.closing');
    invoke(findElement(emptyOrder, (node) => node.type === 'button' && textContent(node) === 'settings.user.orders.actions.closeOrder'), 'onClick');
    expect(mocks.api.closeUserPaymentOrder).not.toHaveBeenCalled();
    const pending = deferred();
    mocks.api.closeUserPaymentOrder.mockReturnValue(pending.promise);
    invoke(buttons[0], 'onClick');
    expect(textContent(renderUser())).toContain('settings.user.orders.actions.closing');
    invoke(button('settings.user.orders.actions.closing'), 'onClick');
    expect(mocks.api.closeUserPaymentOrder).toHaveBeenCalledOnce();
    pending.resolve({
      ok: true
    });
    await settleUser();
  });
  it.each(['download', 'copy', 'remove'] as const)('OCR操作%s期间互斥所有记录操作', async (mode) => {
    mocks.api.fetchOcrHistory.mockResolvedValue({
      ok: true,
      data: {
        items: [ocr],
        page: 1,
        total: 1,
        totalPages: 1
      }
    });
    await bootUser('ocr-history');
    const pending = deferred();
    if (mode === 'download') transport.downloadPickSavePath.mockReturnValue(pending.promise as Promise<string | null>);
    if (mode === 'copy') transport.copy.mockReturnValue(pending.promise as Promise<void>);
    if (mode === 'remove') mocks.api.deleteOcrHistory.mockReturnValue(pending.promise);
    const key = {
      download: 'downloadSource',
      copy: 'copyText',
      remove: 'remove'
    }[mode];
    invoke(button(`settings.user.ocrHistory.actions.${key}`), 'onClick');
    expect(textContent(renderUser())).toContain(`settings.user.ocrHistory.actions.${{
      download: 'downloading',
      copy: 'copying',
      remove: 'removing'
    }[mode]}`);
    elements(renderUser()).filter((node) => node.type === 'button' && elementProps(node).disabled === true && String(elementProps(node).className).includes('settings-hotkey-btn')).forEach((node) => {
      invoke(node, 'onClick');
    });
    expect(transport.downloadPickSavePath).toHaveBeenCalledTimes(mode === 'download' ? 1 : 0);
    expect(transport.copy).toHaveBeenCalledTimes(mode === 'copy' ? 1 : 0);
    expect(mocks.api.deleteOcrHistory).toHaveBeenCalledTimes(mode === 'remove' ? 1 : 0);
    pending.resolve(mode === 'remove' ? {
      ok: true
    } : null);
    await settleUser();
  });
  it('翻译下载期间阻止重复下载和抹除，空结果不下载', async () => {
    mocks.api.fetchImageTranslationHistory.mockResolvedValue({
      ok: true,
      data: {
        items: [image, {
          ...image,
          taskId: 'empty',
          sourceUrl: '',
          resultUrl: null
        }],
        page: 1,
        total: 2,
        totalPages: 1
      }
    });
    await bootUser('image-translation');
    const empty = findElement(renderUser(), (node) => node.type === 'article' && node.key === 'empty');
    elements(empty).filter((node) => node.type === 'button' && textContent(node).includes('settings.user.imageTranslation.actions.download')).forEach((node) => {
      invoke(node, 'onClick');
    });
    expect(transport.downloadPickSavePath).not.toHaveBeenCalled();
    const pending = deferred();
    transport.downloadPickSavePath.mockReturnValue(pending.promise as Promise<string | null>);
    invoke(button('settings.user.imageTranslation.actions.downloadSource'), 'onClick');
    invoke(button('settings.user.imageTranslation.actions.downloading'), 'onClick');
    invoke(button('settings.user.imageTranslation.actions.remove'), 'onClick');
    expect(transport.downloadPickSavePath).toHaveBeenCalledOnce();
    expect(mocks.api.deleteImageTranslationHistory).not.toHaveBeenCalled();
    pending.resolve(null);
    await settleUser();
  });
  it('翻译抹除期间阻止重复抹除并渲染禁用按钮', async () => {
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
    const pending = deferred();
    mocks.api.deleteImageTranslationHistory.mockReturnValue(pending.promise);
    invoke(button('settings.user.imageTranslation.actions.remove'), 'onClick');
    expect(textContent(renderUser())).toContain('settings.user.imageTranslation.actions.removing');
    invoke(button('settings.user.imageTranslation.actions.removing'), 'onClick');
    expect(mocks.api.deleteImageTranslationHistory).toHaveBeenCalledOnce();
    expect(elementProps(button('settings.user.imageTranslation.actions.downloadSource')).disabled).toBe(true);
    pending.resolve({
      ok: true
    });
    await settleUser();
  });
  it('OAuth加载失败、取消及解除互斥', async () => {
    mocks.api.fetchOAuthBindings.mockResolvedValue({
      ok: false
    });
    await bootUser('oauth');
    expect(textContent(renderUser())).toContain('settings.user.oauth.empty');
    await navigateUser('info');
    const loading = deferred();
    mocks.api.fetchOAuthBindings.mockReturnValue(loading.promise);
    await navigateUser('oauth');
    expect(textContent(renderUser())).toContain('settings.user.oauth.loading');
    await navigateUser('info');
    loading.resolve({
      ok: true,
      data: [{
        id: 1,
        provider: 'github'
      }]
    });
    await settleUser();
    mocks.api.fetchOAuthBindings.mockResolvedValue({
      ok: true,
      data: [{
        id: 1,
        provider: 'github'
      }, {
        id: 2,
        provider: 'gitee'
      }]
    });
    await navigateUser('oauth');
    const pending = deferred();
    mocks.api.unbindOAuth.mockReturnValue(pending.promise);
    invoke(button('settings.user.oauth.actions.unbind'), 'onClick');
    expect(textContent(renderUser())).toContain('settings.user.oauth.actions.unbinding');
    invoke(button('settings.user.oauth.actions.unbinding'), 'onClick');
    invoke(button('settings.user.oauth.actions.unbind'), 'onClick');
    expect(mocks.api.unbindOAuth).toHaveBeenCalledOnce();
    pending.resolve({
      ok: true
    });
    await settleUser();
  });
  it('问卷加载中、详情/确认状态刷新保留及抹除互斥', async () => {
    const load = deferred();
    mocks.api.fetchQuestionnaireHistory.mockReturnValue(load.promise);
    await bootUser('questionnaire');
    expect(textContent(renderUser())).toContain('settings.user.questionnaire.loading');
    load.resolve({
      ok: true,
      data: [question, {
        ...question,
        resultId: 2
      }]
    });
    await settleUser();
    await clickUser('settings.user.questionnaire.viewDetails');
    await clickUser('settings.user.questionnaire.erase');
    await navigateUser('info');
    mocks.api.fetchQuestionnaireHistory.mockResolvedValue({
      ok: true,
      data: [question, {
        ...question,
        resultId: 2
      }]
    });
    await navigateUser('questionnaire');
    expect(textContent(renderUser())).toContain('settings.user.questionnaire.hideDetails');
    expect(textContent(renderUser())).toContain('settings.user.questionnaire.confirmErase');
    const pending = deferred();
    mocks.api.deleteQuestionnaireHistory.mockReturnValue(pending.promise);
    invoke(button('settings.user.questionnaire.confirmErase'), 'onClick');
    expect(textContent(renderUser())).toContain('settings.user.questionnaire.erasing');
    invoke(button('settings.user.questionnaire.erasing'), 'onClick');
    expect(mocks.api.deleteQuestionnaireHistory).toHaveBeenCalledOnce();
    pending.resolve({
      ok: true
    });
    await settleUser();
    expect(textContent(renderUser())).not.toContain('settings.user.questionnaire.hideDetails');
  });
});
