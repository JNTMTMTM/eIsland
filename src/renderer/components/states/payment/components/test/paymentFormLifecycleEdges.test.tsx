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
 * @file paymentFormLifecycleEdges.test.tsx
 * @description 支付公开表单的空订阅时间回退及真实订单变化、二维码展开收起生命周期测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../../i18n';
import { elements, findElement, hookMocks, invoke, textContent } from '../../../../test/elementHarness';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../components/test/contentLifecycleHarness';
import { PaymentOrderForm } from '../PaymentOrderForm';
import { PaymentPendingOrder } from '../PaymentPendingOrder';
import type { UserPaymentOrderData } from '../../../../../api/user/userAccountApi';

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    api: {}, location: { hostname: 'localhost' },
    localStorage: { getItem: () => null, setItem: () => undefined },
  } });
});
vi.mock('react', async (load) => ({ ...await load<typeof import('react')>(), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-i18next', async (load) => ({
  ...await load<typeof import('react-i18next')>(), useTranslation: () => ({ t: i18n.t }),
}));

const order: UserPaymentOrderData = {
  outTradeNo: 'order-1', productCode: 'PRO_MONTH', amountFen: 2000, currency: 'CNY',
  status: 'PAYING', channel: 'WECHAT', qrCodeUrl: '', payUrl: 'https://pay.example.test/first',
};
beforeEach(() => { resetLifecycle(); });
afterEach(() => { unmountHooks(); });

/**
 * 创建具有真实订单公开类型的待支付视图状态。
 * @param pendingOrder - 当前服务订单。
 * @returns 渲染所需合法属性。
 */
function fixture(pendingOrder = order): Parameters<typeof PaymentPendingOrder>[0] {
  return { pendingOrder, pendingOrderAmountLabel: '¥20', paymentStatusLabel: '待支付',
    paymentStatusClassName: 'pending', isPendingOrderPaying: true, isPendingOrderSuccess: false,
    orderExpireLabel: '', feedback: '', isRefreshingStatus: false, creatingOrRefreshing: false,
    onRefreshStatus: vi.fn(), onOpenPaymentPage: vi.fn(), onViewOrders: vi.fn(), onGoUserCenter: vi.fn() };
}

describe('支付公开表单的生命周期与缺省值', () => {
  it('缺少订阅时间时显示占位并保留可执行确认', () => {
    const onConfirmPay = vi.fn();
    const tree = PaymentOrderForm({ onConfirmPay, isRechargeMode: false, receiptEmail: '',
      onReceiptEmailChange: vi.fn(), onFillAccountEmail: vi.fn(), priceLabel: '¥20',
      subscriptionPeriod: '', feedback: '', isCreatingOrder: false, creatingOrRefreshing: false });
    expect(textContent(tree)).toContain('--');
    const button = findElement(tree, (node) => node.props.className === 'settings-user-primary-btn payment-confirm-btn');
    expect(button.props.disabled).toBe(false);
    invoke(button, 'onClick');
    expect(onConfirmPay).toHaveBeenCalledOnce();
  });

  it('微信仅有支付链接时二维码使用该链接，换订单后折叠', () => {
    let props = fixture();
    let tree = renderWithHooks(() => PaymentPendingOrder(props));
    runEffects();
    const button = findElement(tree, (node) => node.props.className === 'settings-user-primary-btn payment-confirm-btn');
    invoke(button, 'onClick');
    tree = renderWithHooks(() => PaymentPendingOrder(props));
    expect(findElement(tree, (node) => node.props.value === order.payUrl).props.size).toBe(200);
    props = fixture({ ...order, outTradeNo: 'order-2', payUrl: 'https://pay.example.test/second' });
    renderWithHooks(() => PaymentPendingOrder(props));
    runEffects();
    tree = renderWithHooks(() => PaymentPendingOrder(props));
    expect(elements(tree).some((node) => node.props.value === props.pendingOrder.payUrl)).toBe(false);
    expect(textContent(tree)).toContain(i18n.t('settings.user.payment.showQrCode'));
  });

  it('二维码专用地址优先于支付链接且可正常收起', () => {
    const props = fixture({ ...order, qrCodeUrl: 'https://pay.example.test/qr' });
    let tree = renderWithHooks(() => PaymentPendingOrder(props));
    runEffects();
    invoke(findElement(tree, (node) => node.props.className === 'settings-user-primary-btn payment-confirm-btn'), 'onClick');
    tree = renderWithHooks(() => PaymentPendingOrder(props));
    expect(findElement(tree, (node) => node.props.value === props.pendingOrder.qrCodeUrl).props.level).toBe('M');
    expect(textContent(tree)).toContain(i18n.t('settings.user.payment.hideQrCode'));
    invoke(findElement(tree, (node) => node.props.className === 'settings-user-primary-btn payment-confirm-btn'), 'onClick');
    tree = renderWithHooks(() => PaymentPendingOrder(props));
    expect(elements(tree).some((node) => node.props.value === props.pendingOrder.qrCodeUrl)).toBe(false);
  });
});
