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
 * @file paymentOrderForm.test.tsx
 * @description PaymentOrderForm 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { byClass, find, invoke, text } from '../../../test/tree';

import { PaymentOrderForm } from '../PaymentOrderForm';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));

function fixture() { return { isRechargeMode: false, receiptEmail: 'test@example.com', onReceiptEmailChange: vi.fn(), onFillAccountEmail: vi.fn(), priceLabel: '¥10', subscriptionPeriod: '2026-10', feedback: '', isCreatingOrder: false, creatingOrRefreshing: false, onConfirmPay: vi.fn() }; }
describe('PaymentOrderForm', () => {
  it('renders subscription pricing and forwards all user actions', () => {
    const props = fixture(); const root = ((PaymentOrderForm(props) as TreeElement));
    expect(text(root)).toContain('¥10'); expect(text(root)).toContain('2026-10');
    invoke(find(root, (node) => node.type === 'input'), 'onChange', { target: { value: 'next@example.com' } });
    expect(props.onReceiptEmailChange).toHaveBeenCalledWith('next@example.com');
    invoke(byClass(root, 'payment-fill-email-btn'), 'onClick'); expect(props.onFillAccountEmail).toHaveBeenCalledOnce();
    invoke(byClass(root, 'payment-confirm-btn'), 'onClick'); expect(props.onConfirmPay).toHaveBeenCalledOnce();
  });
  it('renders recharge without a subscription period and handles missing pricing', () => {
    const props = fixture(); props.isRechargeMode = true; props.priceLabel = '';
    const root = ((PaymentOrderForm(props) as TreeElement)); expect(text(root)).toContain('settings.user.recharge.rechargeAmountLabel');
    expect(text(root)).toContain('settings.user.pro.pro.priceUnavailable'); expect(text(root)).not.toContain('2026-10');
  });
  it('shows feedback, loading spinner and disabled confirmation during creation', () => {
    const props = fixture(); props.feedback = 'Order failed'; props.isCreatingOrder = true; props.creatingOrRefreshing = true;
    const root = ((PaymentOrderForm(props) as TreeElement)); expect(text(root)).toContain('Order failed'); expect(byClass(root, 'payment-confirm-btn').props.disabled).toBe(true); expect(byClass(root, 'payment-btn-spinner').props['aria-hidden']).toBe('true');
  });
});
