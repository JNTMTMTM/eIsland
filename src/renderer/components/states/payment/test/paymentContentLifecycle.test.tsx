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
 * @file paymentContentLifecycle.test.tsx
 * @description 支付内容组件执行真实渠道、定价、captcha、创建API、轮询、状态派生与Zustand导航的完整叶隔离集成测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../../components/test/contentLifecycleHarness';
import { elements, findElement, hookMocks, invoke, textContent } from '../../../test/elementHarness';
import useIslandStore from '../../../../store/slices';
import { settle, modal, modalRoot  } from '../../register/hooks/test/authHookHarness';
import { PaymentContent } from '../PaymentContent';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { PaymentOrderForm } from '../components/PaymentOrderForm';
import { PaymentPendingOrder } from '../components/PaymentPendingOrder';
import { api, order, resetPayment, storage, wire } from './paymentContentHarness';
import type { ReactElement } from 'react';
vi.hoisted(() => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } }));
  vi.stubGlobal('localStorage', { getItem: () => null });
});
const translate = (key: string): string => key;
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-dom/client', () => ({ createRoot: () => modalRoot }));
vi.mock('react-i18next', async (load) => ({ ...(await load<typeof import('react-i18next')>()), useTranslation: () => ({ t: translate }) }));
vi.mock('../../../../store/slices', async (load) => {
  const actual = await load<typeof import('../../../../store/slices')>();
  return { ...actual, default: Object.assign(() => actual.default.getState(), actual.default) };
});
beforeEach(resetPayment);
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
/**
 * 提交真实渠道/价格/轮询Hook并等实际API响应。
 * @returns 最新支付页面。
 */
async function commit(): Promise<ReactElement> {
  renderWithHooks(PaymentContent); runEffects(); await settle();
  const root = renderWithHooks(PaymentContent); runEffects(); return root;
}
/**
 * 从父组件生成属性执行实际订单表单。
 * @returns 真实表单子树。
 */
function form(): ReactElement {
  const element = findElement(renderWithHooks(PaymentContent), (node) => node.type === PaymentOrderForm);
  return PaymentOrderForm(element.props as unknown as Parameters<typeof PaymentOrderForm>[0]);
}
/**
 * 从真实支付页执行当前待支付子组件。
 * @returns 实际订单视图。
 */
function pending(): ReactElement {
  const element = findElement(renderWithHooks(PaymentContent), (node) => node.type === PaymentPendingOrder);
  return PaymentPendingOrder(element.props as unknown as Parameters<typeof PaymentPendingOrder>[0]);
}
/**
 * 通过实际渠道按钮选择启用方式。
 * @param method - 微信或支付宝。
 */
function select(method: 'wechat' | 'alipay' = 'alipay'): void {
  const element = findElement(renderWithHooks(PaymentContent), (node) => node.type === PaymentMethodSelector);
  const view = PaymentMethodSelector(element.props as unknown as Parameters<typeof PaymentMethodSelector>[0]);
  const button = elements(view).filter((node) => node.type === 'button')[method === 'wechat' ? 0 : 1];
  expect(button.props.disabled).toBe(false); invoke(button, 'onClick');
}
/**
 * 通过实际邮箱输入并点击启用创建按钮。
 * @param email - 用户填写的原始邮箱。
 * @returns 真正订单创建链的完成。
 */
async function create(email = ' Buyer@Example.Test '): Promise<void> {
  invoke(findElement(form(), (node) => node.type === 'input'), 'onChange', { target: { value: email } });
  const button = findElement(form(), (node) => node.props.className === 'settings-user-primary-btn payment-confirm-btn');
  expect(button.props.disabled).toBe(false); await Promise.resolve(invoke(button, 'onClick')); await settle();
}
/**
 * 读取当前订单视图或创建表单的反馈。
 * @returns 实际反馈文字。
 */
function feedback(): string {
  const root = renderWithHooks(PaymentContent); const element = elements(root).find((node) => node.type === PaymentOrderForm || node.type === PaymentPendingOrder);
  return typeof element?.props.feedback === 'string' ? element.props.feedback : '';
}
describe('支付页真实渠道订单与状态组合', () => {
  it('缺会话禁用全部渠道并呈现不可用反馈；根点击停止冒泡且返回真实idle', async () => {
    storage.delete('user-account-token'); const root = await commit();
    expect(textContent(root)).toContain('settings.user.payment.channelsUnavailable');
    const selector = findElement(root, (node) => node.type === PaymentMethodSelector);
    const actual = PaymentMethodSelector(selector.props as unknown as Parameters<typeof PaymentMethodSelector>[0]);
    expect(elements(actual).filter((node) => node.type === 'button').every((button) => button.props.disabled === true)).toBe(true);
    const stopPropagation = vi.fn(); invoke(findElement(root, (node) => node.props.className === 'auth-state-content'), 'onClick', { stopPropagation }); expect(stopPropagation).toHaveBeenCalledOnce();
    const buttons = elements(root).filter((node) => node.type === 'button'); invoke(buttons[1], 'onClick'); expect(useIslandStore.getState().state).toBe('idle');
  });
  it.each([{ wechatEnabled: false, alipayEnabled: true }, { wechatEnabled: true, alipayEnabled: false }])('真实渠道服务控制按钮可用性$wechatEnabled/$alipayEnabled', async (channels) => {
    wire.channels.data = channels; const root = await commit(); const element = findElement(root, (node) => node.type === PaymentMethodSelector);
    const buttons = elements(PaymentMethodSelector(element.props as unknown as Parameters<typeof PaymentMethodSelector>[0])).filter((node) => node.type === 'button');
    expect(buttons.map((node) => node.props.disabled)).toEqual([!channels.wechatEnabled, !channels.alipayEnabled]);
    select(channels.alipayEnabled ? 'alipay' : 'wechat'); expect(textContent(form())).toContain('¥20.00');
  });
  it('报告问题以真实store写入与设置导航处理，原生写入失败也保持可导航', async () => {
    const root = await commit(); api.storeWrite.mockRejectedValueOnce(new Error('write failed'));
    invoke(elements(root).filter((node) => node.type === 'button')[0], 'onClick'); await settle();
    expect(api.storeWrite).toHaveBeenCalledWith('settings-open-tab', 'about-feedback');
    expect(useIslandStore.getState()).toMatchObject({ state: 'maxExpand', maxExpandTab: 'settings' });
  });
  it('选中渠道后计算真实订阅周期，邮箱无效与会话后来失效均不创建订单', async () => {
    await commit(); select(); expect(textContent(form())).toContain('2026-01-01 - 2026-02-01');
    await create('invalid'); expect(feedback()).toBe('settings.user.payment.emailInvalid');
    storage.delete('user-account-token'); await create(); expect(feedback()).toBe('settings.user.payment.loginRequired');
    expect(api.netFetch.mock.calls.some(([url]) => url.includes('/orders/pro-month'))).toBe(false);
  });
  it.each(['wechat', 'alipay'] as const)('真实Pro订单经%s渠道发送规范化邮箱与授权并打开付款URL', async (method) => {
    await commit(); select(method); await create();
    const request = api.netFetch.mock.calls.find(([url]) => url.includes('/orders/pro-month'));
    expect(request?.[0]).toContain(`channel=${  method === 'wechat' ? 'WECHAT' : 'ALIPAY'}`); expect(request?.[0]).toContain('email=buyer%40example.test');
    expect(api.clipboardOpenUrl).toHaveBeenCalledWith(order.payUrl);
    expect(feedback()).toBe(''); const view = pending(); expect(textContent(view)).toContain('order-1'); expect(textContent(view)).toContain('¥20.00');
  });
  it('真实充值模式用充值金额而非订阅价格，并发送充值订单API', async () => {
    useIslandStore.setState({ paymentContext: { type: 'recharge', amountFen: 1234 } }); const root = await commit();
    expect(textContent(root)).toContain('settings.user.recharge.paymentTitle'); select(); expect(textContent(form())).toContain('¥12.34'); await create();
    expect(api.netFetch.mock.calls.some(([url]) => url.includes('/orders/agent-recharge?channel=ALIPAY&amountFen=1234&email=buyer%40example.test'))).toBe(true);
    expect(api.netFetch.mock.calls.some(([url]) => url.includes('/pricing/pro-month'))).toBe(false);
  });
  it.each([{ code: 403, message: '创建被拒' }, { code: 200, message: '缺订单数据' }])('真实创建API结果$code/$message恢复可创建状态且保持原错误', async (reply) => {
    wire.create = reply; await commit(); select(); await create(); expect(feedback()).toBe(reply.message); expect(api.clipboardOpenUrl).not.toHaveBeenCalled();
    expect(findElement(form(), (node) => node.props.className === 'settings-user-primary-btn payment-confirm-btn').props.disabled).toBe(false);
  });
  it('创建网络返回空Error消息使用组件原有兜底', async () => {
    await commit(); select(); const base = api.netFetch.getMockImplementation()!;
    api.netFetch.mockImplementation((url, init) => url.includes('/orders/pro-month') ? Promise.reject(new Error('')) : base(url, init));
    await create(); expect(feedback()).toBe('settings.user.payment.createOrderFailed');
  });
  it('真实captcha取消不创建订单', async () => {
    await commit(); select(); const base = api.netFetch.getMockImplementation()!;
    api.netFetch.mockImplementation((url, init) => url.endsWith('/captcha-config') ? Promise.resolve({ ok: true, status: 200, body: JSON.stringify({ code: 200, data: { enabled: true, provider: 'builtin' } }) }) : base(url, init));
    const request = create(); await settle(); modal.props!.onCancel(); await request;
    expect(feedback()).toBe('settings.user.feedback.captchaCancelled'); expect(api.clipboardOpenUrl).not.toHaveBeenCalled();
  });
  it.each([new Error('native failure'), 7])('原生打开支付页同步抛出%j走组件catch/finally', async (failure) => {
    await commit(); select();
    api.clipboardOpenUrl.mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- 原生边界可能抛非Error，验证目标catch分类。
      throw failure;
    });
    await create(); expect(feedback()).toBe(failure instanceof Error ? failure.message : 'settings.user.payment.createOrderFailed');
    expect(findElement(renderWithHooks(PaymentContent), (node) => node.type === PaymentPendingOrder).props.creatingOrRefreshing).toBe(false);
  });
  it.each([
    { payUrl: '', qrCodeUrl: ' https://pay.example.test/qr ', expected: 'https://pay.example.test/qr' },
    { payUrl: '', qrCodeUrl: '', expected: null },
    { payUrl: '   ', qrCodeUrl: 'https://pay.example.test/qr', expected: null },
  ])('订单付款字段$payUrl/$qrCodeUrl按现有URL优先级与空值处理', async ({ payUrl, qrCodeUrl, expected }) => {
    // eslint-disable-next-line prefer-object-spread -- 后置自有付款字段覆盖默认订单，不把简写前移导致默认值覆盖。
    wire.create.data = Object.assign({}, order, { payUrl, qrCodeUrl }); await commit(); select(); await create();
    if (expected) { expect(api.clipboardOpenUrl).toHaveBeenCalledWith(expected); } else { expect(feedback()).toBe('settings.user.payment.payUrlMissing'); expect(api.clipboardOpenUrl).not.toHaveBeenCalled(); }
  });
  it('创建订单打开页面异步拒绝显示原生失败反馈，待支付按钮重开也处理拒绝', async () => {
    await commit(); select(); api.clipboardOpenUrl.mockRejectedValueOnce(new Error('open failed')); await create();
    expect(feedback()).toBe('settings.user.payment.openPayFailed');
    api.clipboardOpenUrl.mockRejectedValueOnce(new Error('reopen failed'));
    invoke(findElement(pending(), (node) => node.type === 'button' && textContent(node) === 'settings.user.payment.openPaymentPage'), 'onClick'); await settle();
    expect(feedback()).toBe('settings.user.payment.openPayFailed');
  });
  it.each([undefined, 'not-a-date', '2026-01-01T01:00:00Z'])('服务器expireAt=%s保留有效选择时间或隐藏无效时间', async (expireAt) => {
    // eslint-disable-next-line prefer-object-spread -- 原生返回的过期字段必须覆盖默认订单，保持后置覆盖顺序。
    wire.create.data = Object.assign({}, order, { expireAt }); await commit(); select(); await create();
    const {props} = findElement(renderWithHooks(PaymentContent), (node) => node.type === PaymentPendingOrder);
    expect(Boolean(props.orderExpireLabel)).toBe(expireAt !== 'not-a-date');
  });
  it.each([null, '', ' Account@Example.Test '])('从真实本地资料邮箱%s填充或提示未绑定', async (email) => {
    if (email !== null) storage.set('user-account-profile', JSON.stringify({ email, username: 'Account', avatar: null, gender: 'unspecified', genderCustom: null, birthday: null, createdAt: '2026-01-01' }));
    await commit(); select(); invoke(findElement(form(), (node) => node.props.className === 'settings-user-secondary-btn payment-fill-email-btn'), 'onClick');
    expect(findElement(form(), (node) => node.type === 'input').props.value).toBe(email ? 'account@example.test' : '');
    expect(feedback()).toBe(email ? '' : 'settings.user.payment.boundEmailNotFound');
  });
  it('待支付没有URL的支付宝仍可点击打开并显示缺失反馈', async () => {
    wire.create.data = { ...order, payUrl: undefined, qrCodeUrl: undefined }; await commit(); select(); await create(); vi.clearAllMocks();
    invoke(findElement(pending(), (node) => node.type === 'button' && textContent(node) === 'settings.user.payment.openPaymentPage'), 'onClick');
    expect(feedback()).toBe('settings.user.payment.payUrlMissing'); expect(api.clipboardOpenUrl).not.toHaveBeenCalled();
  });
  it('真实手动刷新与自动轮询读取同订单并派生成功状态，成功按钮返回用户中心', async () => {
    await commit(); select(); await create(); renderWithHooks(PaymentContent); runEffects();
    wire.lookup.data = { ...order, status: 'SUCCESS' };
    invoke(findElement(pending(), (node) => node.type === 'button' && textContent(node) === 'settings.user.payment.refreshStatus'), 'onClick'); await settle();
    const view = pending(); expect(textContent(view)).toContain('settings.user.payment.status.success');
    expect(api.netFetch.mock.calls.some(([url]) => url.endsWith('/orders/order-1'))).toBe(true);
    invoke(findElement(view, (node) => node.type === 'button' && textContent(node) === 'settings.user.payment.goUserCenter'), 'onClick'); expect(useIslandStore.getState().state).toBe('idle');
  });

  it('订单网络等待时真实创建状态禁用提交并显示spinner，晚返回完成后解除busy', async () => {
    await commit(); select();
    let resolve!: (value: Awaited<ReturnType<typeof api.netFetch>>) => void;
    const response = new Promise<Awaited<ReturnType<typeof api.netFetch>>>((done) => { resolve = done; });
    const base = api.netFetch.getMockImplementation()!;
    api.netFetch.mockImplementation((url, init) => url.includes('/orders/pro-month') ? response : base(url, init));
    const request = create(); await settle();
    expect(findElement(form(), (node) => node.props.className === 'settings-user-primary-btn payment-confirm-btn').props.disabled).toBe(true);
    expect(elements(form()).some((node) => node.props.className === 'payment-btn-spinner')).toBe(true);
    resolve({ ok: true, status: 200, body: JSON.stringify({ code: 200, data: order }) }); await request;
    expect(findElement(renderWithHooks(PaymentContent), (node) => node.type === PaymentPendingOrder).props.creatingOrRefreshing).toBe(false);
  });
  it('真实自动轮询在订单创建后启动，成功后不再排下一次并卸载清定时器', async () => {
    await commit(); select(); await create(); renderWithHooks(PaymentContent); runEffects();
    wire.lookup.data = { ...order, status: 'SUCCESS' };
    await vi.advanceTimersByTimeAsync(3000); await settle();
    const root = renderWithHooks(PaymentContent); runEffects();
    expect(findElement(root, (node) => node.type === PaymentPendingOrder).props.isPendingOrderSuccess).toBe(true);
    expect(api.netFetch.mock.calls.filter(([url]) => url.endsWith('/orders/order-1'))).toHaveLength(1);
    unmountHooks(); expect(vi.getTimerCount()).toBe(0);
  });
  it('待支付查看订单写设置tab并导航，原生写入失败被捕获', async () => {
    await commit(); select(); await create(); api.storeWrite.mockRejectedValueOnce(new Error('write failed'));
    invoke(findElement(pending(), (node) => node.type === 'button' && textContent(node) === 'settings.user.payment.viewOrders'), 'onClick'); await settle();
    expect(api.storeWrite).toHaveBeenCalledWith('settings-open-tab', 'user-orders'); expect(useIslandStore.getState()).toMatchObject({ state: 'maxExpand', maxExpandTab: 'settings' });
  });
});
