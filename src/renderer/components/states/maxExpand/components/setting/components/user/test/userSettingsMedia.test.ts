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
 * @file userSettingsMedia.test.ts
 * @description 用户订阅充值、导航状态及图片预览真实缩放拖动生命周期回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { runEffects, unmountHooks } from '../../app/components/test/themeHookHarness';
import { bootUser, cleanupUser, clickUser, mocks, navigateUser, profile, renderUser, settleUser, setupUser } from './userSettingsFixture';
const image = {
  id: 1,
  taskId: 'abcdef12345',
  username: 'reader',
  status: 'SUCCEEDED',
  sourceLanguage: 'auto',
  targetLanguage: 'zh',
  sourceUrl: 'https://host/source.png',
  resultUrl: 'https://host/result.webp',
  createdAt: '2026-01-01T00:00:00',
  errorMessage: ''
};
beforeEach(setupUser);
afterEach(cleanupUser);
describe('订阅价格、充值余额和金额输入', () => {
  it.each([{
    value: {
      amountYuan: ' 15.90 ',
      billingCycle: 'MONTH',
      freeDesc: ' Free desc ',
      proDesc: ' Pro desc ',
      freeFeatures: ['Free', '', 3],
      proFeatures: ['Pro', '  ', null]
    },
    expected: '¥15.90 / settings.user.pro.billingCycle.month'
  }, {
    value: {
      amountFen: 1590,
      billingCycle: 'YEAR',
      freeDesc: 42,
      proDesc: null,
      freeFeatures: 42,
      proFeatures: null
    },
    expected: '¥15.90 / YEAR'
  }, {
    value: {
      amountYuan: '',
      amountFen: 1500,
      billingCycle: ''
    },
    expected: '¥15.00'
  }, {
    value: {
      amountYuan: 42,
      amountFen: 'invalid',
      billingCycle: ''
    },
    expected: 'settings.user.pro.pro.priceUnavailable'
  }, {
    value: {
      amountYuan: '15',
      billingCycle: null
    },
    expected: '¥15'
  }])('格式化价格和计划权益 $expected', async ({
    value: value,
    expected: expected
  }) => {
    mocks.api.fetchProMonthPricing.mockResolvedValue({
      ok: true,
      data: value
    });
    await bootUser('pro');
    expect(textContent(renderUser())).toContain(expected);
    await clickUser('settings.user.actions.buyPro');
    expect(mocks.store.setPayment).toHaveBeenCalledWith();
  });
  it('Pro角色展示会员徽标和续费入口', async () => {
    const pro = {
      ...profile,
      role: ' ROLE_PRO '
    };
    mocks.profile = pro;
    mocks.api.fetchUserProfile.mockResolvedValue({
      ok: true,
      data: pro
    });
    await bootUser('pro');
    await clickUser('settings.user.actions.renewPro');
    expect(mocks.store.setPayment).toHaveBeenCalledOnce();
    await navigateUser('info');
    expect(String(elementProps(findElement(renderUser(), (node) => String(elementProps(node).className).startsWith('settings-user-info-summary-card'))).className)).toContain('--pro');
  });
  it('JWT Pro角色同样展示会员摘要', async () => {
    mocks.token = `h.${Buffer.from('{"role":"pro"}').toString('base64url')}.s`;
    await bootUser();
    expect(String(elementProps(findElement(renderUser(), (node) => String(elementProps(node).className).startsWith('settings-user-info-summary-card'))).className)).toContain('--pro');
  });
  it('价格读取中显示加载，卸载后忽略迟到结果', async () => {
    let resolve: ((value: unknown) => void) | undefined;
    mocks.api.fetchProMonthPricing.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    await bootUser('pro');
    expect(textContent(renderUser())).toContain('settings.user.pro.pro.priceLoading');
    unmountHooks();
    resolve?.({
      ok: true,
      data: {
        amountYuan: '10',
        billingCycle: 'MONTH'
      }
    });
    await settleUser();
    expect(textContent(renderUser())).not.toContain('¥10');
  });
  it.each([true, false])('余额读取成功=%s和自定义充值输入', async (ok) => {
    mocks.api.fetchAgentBalance.mockResolvedValue({
      ok,
      data: ok ? {
        balanceYuan: '19.99'
      } : undefined
    });
    await bootUser('recharge');
    expect(textContent(renderUser()).includes('¥19.99')).toBe(ok);
    const input = findElement(renderUser(), (node) => node.type === 'input');
    ['', '-1', 'not-a-number', '0', '12.345'].forEach((value) => {
      invoke(input, 'onChange', {
        target: {
          value
        }
      });
      const submit = findElement(renderUser(), (node) => node.type === 'button' && String(elementProps(node).className) === 'settings-user-primary-btn');
      invoke(submit, 'onClick');
      expect(elementProps(submit).disabled).toBe(value !== '12.345');
    });
    expect(mocks.store.setPayment).toHaveBeenCalledOnce();
    expect(mocks.store.setPayment).toHaveBeenCalledWith({
      type: 'recharge',
      amountFen: 1235
    });
    await [1, 10, 30, 50, 100].reduce(async (previous, amount) => {
      await previous;
      invoke(findElement(renderUser(), (node) => node.type === 'button' && node.key === String(amount)), 'onClick');
      await clickUser('settings.user.recharge.confirm');
      expect(mocks.store.setPayment).toHaveBeenLastCalledWith({
        type: 'recharge',
        amountFen: amount * 100
      });
      invoke(findElement(renderUser(), (node) => node.type === 'button' && node.key === String(amount)), 'onClick');
      expect(textContent(renderUser())).toContain('settings.user.recharge.selectAmount');
    }, Promise.resolve());
  });
  it('余额卸载后不应用迟到数据', async () => {
    let resolve: ((value: unknown) => void) | undefined;
    mocks.api.fetchAgentBalance.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    await bootUser('recharge');
    unmountHooks();
    resolve?.({
      ok: true,
      data: {
        balanceYuan: '99.99'
      }
    });
    await settleUser();
    expect(textContent(renderUser())).not.toContain('99.99');
  });
});
describe('导航和图片翻译状态', () => {
  it('摘要所有导航卡片和展开导航执行实际回调', async () => {
    await bootUser();
    const tree = renderUser();
    const cards = elements(tree).filter((node) => node.type === 'button' && String(elementProps(node).className).startsWith('settings-index-card') && !textContent(node).includes('settings.user.actions.refresh'));
    const expected = ['pro', 'recharge', 'orders', 'edit', 'edit', 'password', 'oauth', 'ocr-history', 'image-translation', 'questionnaire', 'account'];
    cards.forEach((node, index) => {
      invoke(node, 'onClick');
      expect(elementProps(findElement(renderUser(), (entry) => 'activePage' in elementProps(entry))).activePage).toBe(expected[index]);
    });
    const toggle = findElement(renderUser(), (node) => 'onToggle' in elementProps(node));
    invoke(toggle, 'onToggle');
    expect(elementProps(findElement(renderUser(), (node) => 'onToggle' in elementProps(node))).expanded).toBe(true);
    invoke(findElement(renderUser(), (node) => 'onToggle' in elementProps(node)), 'onToggle');
    expect(elementProps(findElement(renderUser(), (node) => 'onToggle' in elementProps(node))).expanded).toBe(false);
  });
  it('显示通知问卷入口并转发打开和关闭', async () => {
    mocks.reminder.questionnaire = {
      id: 1
    };
    mocks.reminder.count = 2;
    await bootUser();
    const banner = findElement(renderUser(), (node) => 'onDismiss' in elementProps(node));
    invoke(banner, 'onOpen');
    invoke(banner, 'onDismiss');
    expect(mocks.store.setQuestionnaire).toHaveBeenCalledOnce();
    expect(mocks.reminder.dismiss).toHaveBeenCalledOnce();
  });
  it('所有翻译状态、无结果、错误、空语言和未知语言回退', async () => {
    const values = ['SUCCEEDED', 'FAILED', 'PROCESSING', 'QUEUED', '', '@@@'];
    mocks.api.fetchImageTranslationHistory.mockResolvedValue({
      ok: true,
      data: {
        items: values.map((statusValue, index) => ({
          ...image,
          taskId: String(index),
          status: statusValue,
          sourceLanguage: ['', 'unknown-language'][index] ?? 'en',
          targetLanguage: ['', 'unknown-language'][index] ?? 'auto',
          resultUrl: index % 2 ? null : '  ',
          errorMessage: index === 1 ? 'task failed' : ''
        })),
        page: 1,
        total: 6,
        totalPages: 2
      }
    });
    await bootUser('image-translation');
    const text = textContent(renderUser());
    ['succeeded', 'failed', 'processing', 'queued', 'unknown'].forEach((status) => {
      expect(text).toContain(`settings.user.imageTranslation.status.${status}`);
    });
    expect(text).toContain('settings.user.imageTranslation.resultUnavailable');
    expect(text).toContain('settings.user.imageTranslation.resultPending');
    expect(text).toContain('task failed');
  });
});
describe('图片预览缩放、拖动和清理', () => {
  it('真实wheel注册、缩放夹紧、拖动边界及所有指针退出分支', async () => {
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
    const source = findElement(renderUser(), (node) => node.type === 'button' && String(elementProps(node).className) === 'settings-user-image-translation-image-wrap');
    invoke(source, 'onClick');
    const preview = () => findElement(renderUser(), (node) => String(elementProps(node).className).startsWith('settings-user-image-translation-preview'));
    const listeners = new Map<string, (event: unknown) => void>();
    const set = vi.fn();
    const release = vi.fn();
    let captured = false;
    const target = {
      clientWidth: 200,
      clientHeight: 100,
      setPointerCapture: set,
      hasPointerCapture: () => captured,
      releasePointerCapture: release,
      addEventListener: vi.fn((name: string, callback: (event: unknown) => void) => {
        listeners.set(name, callback);
      }),
      removeEventListener: vi.fn((name: string) => {
        listeners.delete(name);
      })
    };
    const ref = elementProps(preview()).ref as {
      current: typeof target | null;
    };
    ref.current = target;
    runEffects();
    const stop = vi.fn();
    const prevent = vi.fn();
    const event = (pointerId = 1, clientX = 10, clientY = 10, button = 0) => ({
      pointerId,
      clientX,
      clientY,
      button,
      currentTarget: target,
      preventDefault: prevent,
      stopPropagation: stop
    });
    invoke(preview(), 'onPointerMove', event());
    invoke(preview(), 'onPointerUp', event());
    invoke(preview(), 'onPointerCancel', event());
    invoke(preview(), 'onPointerDown', event(1, 10, 10, 1));
    expect(set).not.toHaveBeenCalled();
    listeners.get('wheel')?.({
      deltaY: -10000,
      preventDefault: prevent,
      stopPropagation: stop
    });
    renderUser();
    runEffects();
    expect(String(elementProps(findElement(preview(), (node) => node.type === 'img')).style && (elementProps(findElement(preview(), (node) => node.type === 'img')).style as {
      transform: string;
    }).transform)).toContain('scale(4)');
    invoke(preview(), 'onPointerDown', event());
    expect(set).toHaveBeenCalledWith(1);
    invoke(preview(), 'onPointerMove', event(2));
    invoke(preview(), 'onPointerUp', event(2));
    invoke(preview(), 'onPointerCancel', event(2));
    invoke(preview(), 'onPointerMove', event(1, 11, 11));
    invoke(preview(), 'onPointerMove', event(1, 11, 30));
    invoke(preview(), 'onPointerMove', event(1, 1000, -1000));
    expect(String(elementProps(preview()).className)).toContain('is-dragging');
    captured = true;
    invoke(preview(), 'onPointerUp', event());
    expect(release).toHaveBeenCalledWith(1);
    invoke(preview(), 'onClick', event());
    expect(elements(renderUser()).some((node) => String(elementProps(node).className).startsWith('settings-user-image-translation-preview'))).toBe(true);
    invoke(preview(), 'onPointerDown', event());
    captured = false;
    invoke(preview(), 'onPointerUp', event());
    expect(release).toHaveBeenCalledOnce();
    listeners.get('wheel')?.({
      deltaY: 10000,
      preventDefault: prevent,
      stopPropagation: stop
    });
    renderUser();
    runEffects();
    expect((elementProps(findElement(preview(), (node) => node.type === 'img')).style as {
      transform: string;
    }).transform).toContain('scale(0.5)');
    invoke(preview(), 'onPointerCancel', event());
    invoke(preview(), 'onClick', event());
    renderUser();
    runEffects();
    expect(listeners.size).toBe(0);
    const [, result] = elements(renderUser()).filter((node) => node.type === 'button' && String(elementProps(node).className) === 'settings-user-image-translation-image-wrap');
    invoke(result, 'onClick');
    expect(elementProps(findElement(preview(), (node) => node.type === 'img')).src).toBe(image.resultUrl);
    invoke(preview(), 'onClick', event());
    renderUser();
    runEffects();
  });
});
