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
 * @file paymentPendingOrder.test.tsx
 * @description PaymentPendingOrder 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, find, invoke, text } from '../../../test/tree';

import { PaymentPendingOrder } from '../PaymentPendingOrder';
import type { TreeElement } from '../../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

function fixture() { return { pendingOrder: { outTradeNo: 'order-1', channel: 'WECHAT', qrCodeUrl: 'https://pay.example.com/qr', payUrl: '' }, pendingOrderAmountLabel: '¥20', paymentStatusLabel: 'Pending', paymentStatusClassName: 'pending', isPendingOrderPaying: true, isPendingOrderSuccess: false, orderExpireLabel: '', feedback: '', isRefreshingStatus: false, creatingOrRefreshing: false, onRefreshStatus: vi.fn(), onOpenPaymentPage: vi.fn(), onViewOrders: vi.fn(), onGoUserCenter: vi.fn() }; }
function render(props = fixture()) { slots.cursor = 0; return ((PaymentPendingOrder(props as unknown as Parameters<typeof PaymentPendingOrder>[0]) as TreeElement)); }
describe('PaymentPendingOrder', () => {
  it('opens and closes a WeChat QR code using the payment URL', () => {
    const props = fixture(); let root = render(props); expect(elements(root).some((node) => node.props.value === props.pendingOrder.qrCodeUrl)).toBe(false);
    invoke(byClass(root, 'payment-confirm-btn'), 'onClick'); root = render(props);
    expect(find(root, (node) => node.props.value === props.pendingOrder.qrCodeUrl).props.size).toBe(200);
    invoke(byClass(root, 'payment-confirm-btn'), 'onClick'); expect(elements(render(props)).some((node) => node.props.value === props.pendingOrder.qrCodeUrl)).toBe(false);
  });
  it('omits QR controls when URLs are missing and displays fallback fields', () => {
    const props = fixture(); props.pendingOrder.qrCodeUrl = ''; props.pendingOrder.outTradeNo = '';
    const root = render(props); expect(elements(root).some((node) => String(node.props.className).includes('payment-confirm-btn'))).toBe(false); expect(text(root)).toContain('--');
  });
  it('uses the external payment action for Alipay and forwards refresh/order actions', () => {
    const props = fixture(); props.pendingOrder.channel = 'ALIPAY'; const root = render(props);
    invoke(byClass(root, 'payment-confirm-btn'), 'onClick'); expect(props.onOpenPaymentPage).toHaveBeenCalledOnce();
    const buttons = elements(root).filter((node) => node.type === 'button'); invoke(buttons[0], 'onClick'); invoke(buttons[2], 'onClick');
    expect(props.onRefreshStatus).toHaveBeenCalledOnce(); expect(props.onViewOrders).toHaveBeenCalledOnce();
  });
  it('renders completed order navigation and refresh busy state', () => {
    const props = fixture(); props.isPendingOrderPaying = false; props.isPendingOrderSuccess = true; props.isRefreshingStatus = true; props.creatingOrRefreshing = true; props.feedback = 'Synced'; const root = render(props);
    invoke(byClass(root, 'payment-confirm-btn'), 'onClick'); expect(props.onGoUserCenter).toHaveBeenCalledOnce();
    expect(text(root)).toContain('Synced'); expect(byClass(root, 'payment-btn-spinner').props['aria-hidden']).toBe('true');
    expect(elements(root).filter((node) => node.type === 'button')[0].props.disabled).toBe(true);
  });
});
