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
 * @file paymentContent.test.tsx
 * @description PaymentContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { elements, find, invoke, text } from '../../test/tree';

import { PaymentContent } from '../PaymentContent';

import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { PaymentOrderForm } from '../components/PaymentOrderForm';
import { PaymentPendingOrder } from '../components/PaymentPendingOrder';
import type { TreeElement } from '../../test/tree';
const api = { storeWrite: vi.fn().mockResolvedValue(true), clipboardOpenUrl: vi.fn().mockResolvedValue(true) };

const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const model = vi.hoisted(() => ({ store: { returnFromAuth: vi.fn(), setMaxExpand: vi.fn(), setMaxExpandTab: vi.fn(), paymentContext: { type: 'pro', amountFen: 2000 } }, poll: { pendingOrder: null as null | { outTradeNo: string; channel: string; payUrl: string }, setPendingOrder: vi.fn(), isRefreshingStatus: false, refreshStatus: vi.fn() }, channels: { wechatEnabled: true, alipayEnabled: true, priceLabel: '¥10' }, token: 'token', profile: { email: ' Account@example.com ' }, captcha: vi.fn().mockResolvedValue({ ticket: 't' }), createPro: vi.fn().mockResolvedValue({ ok: true, data: { outTradeNo: 'order', payUrl: 'https://pay.example.com' } }), createRecharge: vi.fn().mockResolvedValue({ ok: true, data: { outTradeNo: 'recharge', payUrl: 'https://pay.example.com' } }) }));
vi.mock('../../../../store/slices', () => ({ default: () => model.store }));
vi.mock('../hooks/usePaymentChannels', () => ({ usePaymentChannels: () => model.channels }));
vi.mock('../hooks/usePaymentStatusPolling', () => ({ usePaymentStatusPolling: () => model.poll }));
vi.mock('../hooks/usePaymentStatus', () => ({ usePaymentStatus: () => ({ pendingOrderAmountLabel: '¥10', paymentStatusLabel: 'Pending', paymentStatusClassName: 'pending', isPendingOrderPaying: true, isPendingOrderSuccess: false }) }));
vi.mock('../hooks/useMethodValidation', () => ({ useMethodValidation: vi.fn() }));
vi.mock('../../../../utils/userAccount', () => ({ readLocalToken: () => model.token, readLocalProfile: () => model.profile }));
vi.mock('../../../../utils/sliderCaptcha', () => ({ runSliderCaptcha: model.captcha }));
vi.mock('../../../../api/user/userAccountApi', () => ({ createProMonthOrder: model.createPro, createAgentRechargeOrder: model.createRecharge }));
function render() { slots.cursor = 0; return ((PaymentContent() as TreeElement)); }
function selected() { slots.values = ['wechat', ' Buyer@example.com ', '', '', '', false]; return find(render(), (node) => node.type === PaymentOrderForm); }
beforeEach(() => { model.poll.pendingOrder = null; model.store.paymentContext.type = 'pro'; model.channels.wechatEnabled = true; model.channels.alipayEnabled = true; model.token = 'token'; model.captcha.mockResolvedValue({ ticket: 't' }); vi.stubGlobal('window', { api }); });
describe('PaymentContent', () => {
  it('selects available channels and shows the order form while blocking disabled methods', () => { model.channels.wechatEnabled = false; invoke(find(render(), (node) => node.type === PaymentMethodSelector), 'onSelect', 'wechat'); expect(slots.values[0]).toBeNull(); invoke(find(render(), (node) => node.type === PaymentMethodSelector), 'onSelect', 'alipay'); expect(find(render(), (node) => node.type === PaymentOrderForm).props.priceLabel).toBe('¥10'); expect(model.poll.setPendingOrder).toHaveBeenCalledWith(null); });
  it('shows unavailable channels and exposes pending-order view', () => { model.channels.wechatEnabled = false; model.channels.alipayEnabled = false; expect(text(render())).toContain('settings.user.payment.channelsUnavailable'); model.poll.pendingOrder = { outTradeNo: 'order', channel: 'WECHAT', payUrl: 'https://pay.example.com' }; const root = render(); expect(find(root, (node) => node.type === PaymentPendingOrder).props.pendingOrder).toBe(model.poll.pendingOrder); expect(elements(root).some((node) => node.type === PaymentMethodSelector)).toBe(false); });
  it('rejects invalid receipt email and expired login before creating an order', async () => { const form = selected(); slots.values[1] = 'invalid'; await invoke(find(render(), (node) => node.type === PaymentOrderForm), 'onConfirmPay'); expect(slots.values[4]).toBe('settings.user.payment.emailInvalid'); slots.values[1] = 'user@example.com'; model.token = ''; await invoke(find(render(), (node) => node.type === PaymentOrderForm), 'onConfirmPay'); expect(slots.values[4]).toBe('settings.user.payment.loginRequired'); expect(model.createPro).not.toHaveBeenCalled(); expect(form.props.isRechargeMode).toBe(false); });
  it.each(['pro', 'recharge'])('creates %s order with normalized receipt and opens payment URL', async (type) => { model.store.paymentContext.type = type; const form = selected(); await invoke(form, 'onConfirmPay'); if (type === 'pro') expect(model.createPro).toHaveBeenCalledWith('token', 'WECHAT', 'buyer@example.com'); else expect(model.createRecharge).toHaveBeenCalledWith('token', 'WECHAT', 2000, 'buyer@example.com'); expect(api.clipboardOpenUrl).toHaveBeenCalledWith('https://pay.example.com'); expect(slots.values[5]).toBe(false); });
  it('reports canceled captcha and fills normalized account email', async () => { model.captcha.mockResolvedValue(null); const form = selected(); await invoke(form, 'onConfirmPay'); expect(slots.values[4]).toBe('settings.user.feedback.captchaCancelled'); invoke(form, 'onFillAccountEmail'); expect(slots.values[1]).toBe('account@example.com'); expect(slots.values[4]).toBe(''); });
  it('forwards pending-order refresh, page, order-history and close actions', () => { model.poll.pendingOrder = { outTradeNo: 'order', channel: 'WECHAT', payUrl: 'https://pay.example.com' }; const pending = find(render(), (node) => node.type === PaymentPendingOrder); invoke(pending, 'onRefreshStatus'); expect(model.poll.refreshStatus).toHaveBeenCalledOnce(); invoke(pending, 'onOpenPaymentPage'); expect(api.clipboardOpenUrl).toHaveBeenCalledWith('https://pay.example.com'); invoke(pending, 'onViewOrders'); expect(model.store.setMaxExpandTab).toHaveBeenCalledWith('settings'); invoke(pending, 'onGoUserCenter'); expect(model.store.returnFromAuth).toHaveBeenCalledOnce(); });
});
