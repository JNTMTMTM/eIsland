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
 * @file userSettingsHistory.test.ts
 * @description 订单、OCR与图片翻译历史、OAuth解绑和问卷历史真实异步操作回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { elementProps, elements, findElement, textContent } from '../../../../../../../test/elementHarness';
import { runEffects } from '../../app/components/test/themeHookHarness';
import { bootUser, cleanupUser, clickUser, mocks, navigateUser, renderUser, settleUser, setupUser, transport } from './userSettingsFixture';
const order = {
  outTradeNo: 'order-1',
  productCode: 'PRO_MONTH',
  amountFen: 1500,
  currency: 'CNY',
  status: 'PAYING',
  channel: 'WECHAT',
  payUrl: ' https://payment/checkout ',
  qrCodeUrl: '',
  createdAt: '2026-01-01T00:00:00',
  paidAt: '',
  expireAt: ''
};
const image = {
  id: 1,
  taskId: 'abcdef12345',
  username: 'reader',
  mode: 'image',
  status: 'SUCCEEDED',
  sourceLanguage: 'auto',
  targetLanguage: 'zh',
  sourceUrl: 'https://host/source.PNG',
  resultUrl: 'https://host/result.webp',
  createdAt: '2026-01-01T00:00:00',
  errorMessage: ''
};
const ocr = {
  id: 1,
  username: 'reader',
  sourceUrl: 'https://host/source.JPEG',
  recognizedText: 'recognized text',
  providerRequestId: null,
  createdAt: '2026-01-01T00:00:00'
};
const questionnaire = {
  resultId: 1,
  questionnaire: {
    id: 10,
    title: 'Survey title',
    description: 'Description',
    questions: [{
      id: 'q1',
      title: 'Question',
      type: 'text',
      required: false,
      options: []
    }]
  },
  answers: {
    q1: 'Answer'
  },
  submittedAt: '2026-01-01T00:00:00',
  rewardProDays: 2,
  rewardProExpireAt: '2026-01-03'
};
const histories = [{
  page: 'orders',
  api: 'fetchUserPaymentOrders',
  item: order,
  prefix: 'orders',
  error: 'settings.user.orders.feedback.loadFailed'
}, {
  page: 'image-translation',
  api: 'fetchImageTranslationHistory',
  item: image,
  prefix: 'imageTranslation',
  error: 'settings.user.imageTranslation.loadFailed'
}, {
  page: 'ocr-history',
  api: 'fetchOcrHistory',
  item: ocr,
  prefix: 'ocrHistory',
  error: 'settings.user.ocrHistory.loadFailed'
}] as const;
beforeEach(setupUser);
afterEach(cleanupUser);
describe('分页历史读取失败和渲染', () => {
  describe.each(histories)('$page', ({
    page: page,
    api: api,
    item: item,
    prefix: prefix,
    error: error
  }) => {
    it.each([401, 4011, 500])('读取失败code=%s', async (code) => {
      mocks.api[api].mockResolvedValue({
        code,
        ok: false
      });
      await bootUser(page);
      expect(textContent(renderUser())).toContain(code === 500 ? error : 'settings.user.auth.gotoLogin');
    });
    it.each([null, {}, {
      items: null
    }])('缺失数据%s安全显示错误', async (data) => {
      mocks.api[api].mockResolvedValue({
        data,
        ok: true
      });
      await bootUser(page);
      expect(textContent(renderUser())).toContain(error);
    });
    it('加载中展示spinner，读取成功后按页翻页并夹紧边界', async () => {
      let resolve: ((value: unknown) => void) | undefined;
      mocks.api[api].mockReturnValue(new Promise((done) => {
        resolve = done;
      }));
      const pending = bootUser(page);
      await settleUser();
      expect(textContent(renderUser())).toContain(`settings.user.${prefix}.loading`);
      resolve?.({
        ok: true,
        data: {
          items: [item],
          page: 2,
          total: 15,
          totalPages: 3
        }
      });
      await pending;
      mocks.api[api].mockImplementation((token, requestedPage) => {
        void token;
        return Promise.resolve({
          ok: true,
          data: {
            items: [item],
            page: Number(requestedPage),
            total: 15,
            totalPages: 3
          }
        });
      });
      const navKey = prefix === 'orders' ? prefix : prefix;
      await clickUser(`settings.user.${navKey}.pagination.next`);
      renderUser();
      runEffects();
      await settleUser();
      expect(mocks.api[api]).toHaveBeenLastCalledWith('opaque', 3, 5);
      await clickUser(`settings.user.${navKey}.pagination.previous`);
      renderUser();
      runEffects();
      await settleUser();
      expect(mocks.api[api]).toHaveBeenLastCalledWith('opaque', 2, 5);
    });
  });
});
describe('订单显示、继续支付与关闭', () => {
  it('所有状态、产品、时间、金额和订单号缺省渲染', async () => {
    const statuses = ['PAYING', 'SUCCESS', 'CLOSED', 'FAILED', '', 'OTHER'];
    mocks.api.fetchUserPaymentOrders.mockResolvedValue({
      ok: true,
      data: {
        items: statuses.map((statusValue, index) => ({
          ...order,
          outTradeNo: index === 4 ? '' : `order-${index}`,
          status: statusValue,
          productCode: ['PRO_MONTH', 'AGENT_RECHARGE', '', 'UNKNOWN'][index % 4],
          amountFen: index === 4 ? null : 1500,
          paidAt: index === 1 ? '2026-01-01T01:00:00' : null
        })),
        page: 1,
        total: 6,
        totalPages: 1
      }
    });
    await bootUser('orders');
    const text = textContent(renderUser());
    ['paying', 'success', 'closed', 'failed', 'unknown'].forEach((status) => {
      expect(text).toContain(`settings.user.payment.status.${status}`);
    });
    expect(text).toContain('¥15.00');
    expect(mocks.api.fetchUserProfile).toHaveBeenCalledTimes(2);
  });
  it.each(['pay', 'qr', 'missing', 'reject'])('继续支付%s', async (mode) => {
    mocks.api.fetchUserPaymentOrders.mockResolvedValue({
      ok: true,
      data: {
        items: [{
          ...order,
          payUrl: mode === 'pay' || mode === 'reject' ? ' https://pay ' : '',
          qrCodeUrl: mode === 'qr' ? ' https://qr ' : ''
        }],
        page: 1,
        total: 1,
        totalPages: 1
      }
    });
    await bootUser('orders');
    if (mode === 'reject') transport.clipboardOpenUrl.mockRejectedValue(new Error('open failed'));
    await clickUser('settings.user.orders.actions.continuePay');
    if (mode === 'missing' || mode === 'reject') expect(textContent(renderUser())).toContain(mode === 'missing' ? 'settings.user.payment.payUrlMissing' : 'settings.user.payment.openPayFailed');else expect(transport.clipboardOpenUrl).toHaveBeenCalledWith(mode === 'pay' ? 'https://pay' : 'https://qr');
  });
  it.each([401, 4011, 500, 200])('关闭订单code=%s', async (code) => {
    mocks.api.fetchUserPaymentOrders.mockResolvedValue({
      ok: true,
      data: {
        items: [order, {
          ...order,
          outTradeNo: 'other'
        }],
        page: 1,
        total: 2,
        totalPages: 1
      }
    });
    await bootUser('orders');
    mocks.api.closeUserPaymentOrder.mockResolvedValue({
      code,
      ok: code === 200
    });
    await clickUser('settings.user.orders.actions.closeOrder');
    expect(mocks.api.closeUserPaymentOrder).toHaveBeenCalledWith('opaque', 'order-1');
    if (code !== 200) expect(textContent(renderUser())).toContain(code === 500 ? 'settings.user.orders.feedback.closeFailed' : 'settings.user.auth.gotoLogin');else expect(mocks.api.fetchUserPaymentOrders).toHaveBeenCalledTimes(2);
    if (code === 200) {
      await clickUser('settings.user.orders.actions.refresh');
      expect(mocks.api.fetchUserPaymentOrders).toHaveBeenCalledTimes(3);
    }
  });
  it('关闭后一页最后订单回到上一页', async () => {
    mocks.api.fetchUserPaymentOrders.mockResolvedValue({
      ok: true,
      data: {
        items: [order],
        page: 2,
        total: 6,
        totalPages: 2
      }
    });
    await bootUser('orders');
    await clickUser('settings.user.orders.actions.closeOrder');
    expect(elementProps(findElement(renderUser(), (node) => node.type === 'button' && textContent(node) === 'settings.user.orders.pagination.previous')).disabled).toBe(true);
  });
});
describe('OCR和图片翻译下载/复制/抹除', () => {
  it.each(['ocr-history', 'image-translation'] as const)('%s下载成功、取消、缺省后缀及各失败', async (page) => {
    const isOcr = page === 'ocr-history';
    const api = isOcr ? 'fetchOcrHistory' : 'fetchImageTranslationHistory';
    const base = isOcr ? ocr : image;
    const prefix = isOcr ? 'ocrHistory' : 'imageTranslation';
    mocks.api[api].mockResolvedValue({
      ok: true,
      data: {
        items: [base],
        page: 1,
        total: 1,
        totalPages: 1
      }
    });
    await bootUser(page);
    await clickUser(`settings.user.${prefix}.actions.downloadSource`);
    expect(transport.downloadPickSavePath).toHaveBeenCalledWith(isOcr ? 'ocr-1-source.jpeg' : 'image-translation-abcdef12-source.png');
    expect(transport.downloadStart).toHaveBeenCalledWith({
      url: base.sourceUrl,
      savePath: 'C:/download/image.jpg',
      threads: 4
    });
    expect(textContent(renderUser())).toContain(`settings.user.${prefix}.actions.downloadStarted`);
    transport.downloadPickSavePath.mockResolvedValue(null);
    transport.downloadStart.mockClear();
    await clickUser(`settings.user.${prefix}.actions.downloadSource`);
    expect(transport.downloadStart).not.toHaveBeenCalled();
    transport.downloadPickSavePath.mockResolvedValue('C:/download/image.jpg');
    transport.downloadStart.mockResolvedValue({
      ok: false
    });
    await clickUser(`settings.user.${prefix}.actions.downloadSource`);
    expect(textContent(renderUser())).toContain(`settings.user.${prefix}.actions.downloadFailed`);
    transport.downloadStart.mockResolvedValue({
      ok: false,
      message: 'backend failure'
    });
    await clickUser(`settings.user.${prefix}.actions.downloadSource`);
    expect(textContent(renderUser())).toContain('backend failure');
    transport.downloadPickSavePath.mockRejectedValue(new Error('dialog'));
    await clickUser(`settings.user.${prefix}.actions.downloadSource`);
    expect(textContent(renderUser())).toContain(`settings.user.${prefix}.actions.downloadFailed`);
  });
  it.each(['https://host/no-extension', 'invalid-url', 'https://host/source.WEBP'])('OCR下载名称%s', async (sourceUrlValue) => {
    mocks.api.fetchOcrHistory.mockResolvedValue({
      ok: true,
      data: {
        items: [{
          ...ocr,
          sourceUrl: sourceUrlValue
        }],
        page: 1,
        total: 1,
        totalPages: 1
      }
    });
    await bootUser('ocr-history');
    await clickUser('settings.user.ocrHistory.actions.downloadSource');
    expect(transport.downloadPickSavePath).toHaveBeenCalledWith(sourceUrlValue.endsWith('WEBP') ? 'ocr-1-source.webp' : 'ocr-1-source.jpg');
  });
  it.each(['https://host/no-extension', 'invalid-url', 'https://host/source.JPG'])('翻译结果下载名称%s', async (resultUrlValue) => {
    mocks.api.fetchImageTranslationHistory.mockResolvedValue({
      ok: true,
      data: {
        items: [{
          ...image,
          resultUrl: resultUrlValue
        }],
        page: 1,
        total: 1,
        totalPages: 1
      }
    });
    await bootUser('image-translation');
    await clickUser('settings.user.imageTranslation.actions.downloadResult');
    expect(transport.downloadPickSavePath).toHaveBeenCalledWith(resultUrlValue.endsWith('JPG') ? 'image-translation-abcdef12-result.jpg' : 'image-translation-abcdef12-result.jpg');
  });
  it('OCR复制成功、失败、无文本/源图时拒绝动作', async () => {
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
    await clickUser('settings.user.ocrHistory.actions.copyText');
    expect(transport.copy).toHaveBeenCalledWith(ocr.recognizedText);
    expect(textContent(renderUser())).toContain('settings.user.ocrHistory.actions.copySuccess');
    transport.copy.mockRejectedValue(new Error('denied'));
    await clickUser('settings.user.ocrHistory.actions.copyText');
    expect(textContent(renderUser())).toContain('settings.user.ocrHistory.actions.copyFailed');
    mocks.api.fetchOcrHistory.mockResolvedValue({
      ok: true,
      data: {
        items: [{
          ...ocr,
          recognizedText: '',
          sourceUrl: ''
        }],
        page: 1,
        total: 1,
        totalPages: 1
      }
    });
    await navigateUser('info');
    await navigateUser('ocr-history');
    transport.copy.mockClear();
    transport.downloadPickSavePath.mockClear();
    await clickUser('settings.user.ocrHistory.actions.copyText');
    await clickUser('settings.user.ocrHistory.actions.downloadSource');
    expect(transport.copy).not.toHaveBeenCalled();
    expect(transport.downloadPickSavePath).not.toHaveBeenCalled();
    expect(textContent(renderUser())).toContain('settings.user.ocrHistory.emptyText');
  });
  describe.each([{
    page: 'ocr-history',
    api: 'fetchOcrHistory',
    remove: 'deleteOcrHistory',
    item: ocr,
    prefix: 'ocrHistory'
  }, {
    page: 'image-translation',
    api: 'fetchImageTranslationHistory',
    remove: 'deleteImageTranslationHistory',
    item: image,
    prefix: 'imageTranslation'
  }] as const)('$page抹除', ({
    page: page,
    api: api,
    remove: remove,
    item: item,
    prefix: prefix
  }) => {
    it.each([401, 4011, 500, 200])('抹除响应%s', async (code) => {
      mocks.api[api].mockResolvedValue({
        ok: true,
        data: {
          items: [item],
          page: 1,
          total: 1,
          totalPages: 1
        }
      });
      await bootUser(page);
      mocks.api[remove].mockResolvedValue({
        code,
        ok: code === 200
      });
      await clickUser(`settings.user.${prefix}.actions.remove`);
      if (code !== 200) expect(textContent(renderUser())).toContain(code === 500 ? `settings.user.${prefix}.actions.removeFailed` : 'settings.user.auth.gotoLogin');else expect(mocks.api[api]).toHaveBeenCalledTimes(2);
    });
    it('抹除末页唯一记录后减页', async () => {
      mocks.api[api].mockResolvedValue({
        ok: true,
        data: {
          items: [item],
          page: 2,
          total: 6,
          totalPages: 2
        }
      });
      await bootUser(page);
      await clickUser(`settings.user.${prefix}.actions.remove`);
      expect(elementProps(findElement(renderUser(), (node) => node.type === 'button' && textContent(node) === `settings.user.${prefix}.pagination.previous`)).disabled).toBe(true);
    });
  });
});
describe('第三方绑定和问卷记录', () => {
  it('各平台显示、空昵称ID及绑定成功/失败处理', async () => {
    mocks.api.fetchOAuthBindings.mockResolvedValue({
      ok: true,
      data: ['github', 'microsoft', 'wechat', 'gitee', 'kook', 'other'].map((provider, index) => ({
        provider,
        id: index + 1,
        providerUsername: index ? 'bound user' : null,
        providerUserId: index ? 'external-id' : null,
        createdAt: index ? '2026-01-01T00:00:00' : ''
      }))
    });
    await bootUser('oauth');
    ['GitHub', 'Microsoft', 'Gitee', 'KOOK', 'other'].forEach((label) => {
      expect(textContent(renderUser())).toContain(label);
    });
    await clickUser('settings.user.oauth.actions.unbind');
    expect(mocks.api.unbindOAuth).toHaveBeenCalledWith('opaque', 1);
    expect(textContent(renderUser())).not.toContain('GitHub');
  });
  it.each([401, 4011, 500])('解除绑定失败%s', async (code) => {
    mocks.api.fetchOAuthBindings.mockResolvedValue({
      ok: true,
      data: [{
        id: 1,
        provider: 'github'
      }]
    });
    await bootUser('oauth');
    mocks.api.unbindOAuth.mockResolvedValue({
      code,
      ok: false
    });
    await clickUser('settings.user.oauth.actions.unbind');
    expect(textContent(renderUser())).toContain(code === 500 ? 'settings.user.oauth.feedback.unbindFailed' : 'settings.user.auth.gotoLogin');
  });
  it.each([401, 4011, 500])('问卷历史读取失败%s', async (code) => {
    mocks.api.fetchQuestionnaireHistory.mockResolvedValue({
      code,
      ok: false
    });
    await bootUser('questionnaire');
    expect(textContent(renderUser())).toContain(code === 500 ? 'settings.user.questionnaire.loadFailed' : 'settings.user.auth.gotoLogin');
  });
  it('问卷展开收起、奖励/无奖励、取消和确认抹除', async () => {
    mocks.api.fetchQuestionnaireHistory.mockResolvedValue({
      ok: true,
      data: [questionnaire, {
        ...questionnaire,
        resultId: 2,
        questionnaire: {
          ...questionnaire.questionnaire,
          description: ''
        },
        rewardProDays: 0,
        rewardProExpireAt: null
      }]
    });
    await bootUser('questionnaire');
    expect(textContent(renderUser())).toContain('Description');
    expect(textContent(renderUser())).toContain('settings.user.questionnaire.noReward');
    await clickUser('settings.user.questionnaire.viewDetails');
    expect(elementProps(findElement(renderUser(), (node) => node.type === 'button' && textContent(node) === 'settings.user.questionnaire.hideDetails'))['aria-expanded']).toBe(true);
    await clickUser('settings.user.questionnaire.hideDetails');
    await clickUser('settings.user.questionnaire.erase');
    await clickUser('settings.user.questionnaire.cancelErase');
    await clickUser('settings.user.questionnaire.erase');
    await clickUser('settings.user.questionnaire.confirmErase');
    expect(mocks.api.deleteQuestionnaireHistory).toHaveBeenCalledWith('opaque', 1, 10);
    expect(mocks.reminder.reload).toHaveBeenCalledOnce();
    expect(textContent(renderUser())).toContain('settings.user.questionnaire.eraseSuccess');
    expect(elements(renderUser()).some((node) => node.type === 'article' && node.key === '1')).toBe(false);
  });
  it.each([401, 4011, 500])('问卷抹除失败%s', async (code) => {
    mocks.api.fetchQuestionnaireHistory.mockResolvedValue({
      ok: true,
      data: [questionnaire]
    });
    await bootUser('questionnaire');
    mocks.api.deleteQuestionnaireHistory.mockResolvedValue({
      code,
      ok: false
    });
    await clickUser('settings.user.questionnaire.erase');
    await clickUser('settings.user.questionnaire.confirmErase');
    expect(textContent(renderUser())).toContain(code === 500 ? 'settings.user.questionnaire.eraseFailed' : 'settings.user.auth.gotoLogin');
  });
});
