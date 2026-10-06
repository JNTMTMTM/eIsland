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
 * @file paymentChannelsAndStatusRuntime.test.ts
 * @description 真实支付渠道加载、价格派生、方法校正、失败及取消边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import { usePaymentChannels } from '../usePaymentChannels';
import { usePaymentStatus } from '../usePaymentStatus';
import { useMethodValidation } from '../useMethodValidation';
import type { PaymentMethod } from '../../config/paymentConstants';
import type { UserPaymentPricingData, UserPaymentChannelsData, UserPaymentOrderData, UserAccountResult } from '../../../../../api/user/userAccountApi.types';
const api = vi.hoisted(() => ({
  channels: vi.fn<typeof import('../../../../../api/user/userAccountApi').fetchPaymentChannels>(),
  pricing: vi.fn<typeof import('../../../../../api/user/userAccountApi').fetchProMonthPricing>()
}));
vi.mock('../../../../../api/user/userAccountApi', () => ({
  fetchPaymentChannels: api.channels,
  fetchProMonthPricing: api.pricing
}));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
let token: string | null;
/** 返回实际API协议响应。
 * @param data - 网络响应载荷
 * @param ok - 是否成功
 * @returns API响应
 */
function response<T>(data?: T, ok = true): UserAccountResult<T> {
  return {
    data,
    ok,
    code: 200,
    message: ''
  };
}
/** 生成完整原生价格响应。
 * @param patch - API覆盖字段
 * @returns 价格载荷
 */
function pricing(patch: Partial<UserPaymentPricingData> = {}): UserPaymentPricingData {
  return {
    productCode: 'PRO',
    amountFen: 800,
    amountYuan: '8.00',
    currency: 'CNY',
    billingCycle: 'MONTH',
    subject: 'pro',
    ...patch
  };
}
/** 调用真实渠道Hook。
 * @param recharge - 充值模式
 * @param amount - 金额分
 * @returns 当前渠道和价格
 */
function run(recharge = false, amount = 1234) {
  return renderHook(usePaymentChannels, recharge, amount);
}
/** 完成一次真实挂载请求。
 * @param recharge - 充值模式
 * @returns 当前加载结果
 */
async function mount(recharge = false) {
  run(recharge);
  flushHookEffects();
  await settleHook();
  return run(recharge);
}
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  token = 'token';
  vi.stubGlobal('localStorage', {
    getItem: () => token
  });
  api.channels.mockResolvedValue(response({
    wechatEnabled: false,
    alipayEnabled: true
  }));
  api.pricing.mockResolvedValue(response(pricing()));
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('payment actual channels and derivation hooks', () => {
  it('anonymous channels disable payment and pricing without API requests', async () => {
    token = null;
    expect(await mount()).toMatchObject({
      wechatEnabled: false,
      alipayEnabled: false,
      priceLabel: ''
    });
    expect(api.channels).not.toHaveBeenCalled();
    expect(api.pricing).not.toHaveBeenCalled();
  });
  it('recharge price uses requested fen and does not load Pro pricing, then updates for amount changes', async () => {
    expect(await mount(true)).toMatchObject({
      wechatEnabled: false,
      alipayEnabled: true,
      priceLabel: '¥12.34'
    });
    expect(api.pricing).not.toHaveBeenCalled();
    run(true, 500);
    flushHookEffects();
    await settleHook();
    expect(run(true, 500).priceLabel).toBe('¥5.00');
  });
  it.each([{
    amountYuan: ' 18.50 ',
    billingCycle: 'month',
    expected: '¥18.50 / settings.user.pro.billingCycle.month'
  }, {
    amountYuan: '',
    amountFen: 300,
    billingCycle: ' YEAR ',
    expected: '¥3.00 / YEAR'
  }, {
    amountYuan: '2.50',
    billingCycle: '',
    expected: '¥2.50'
  }, {
    amountYuan: '',
    amountFen: 0,
    billingCycle: '',
    expected: '¥0.00'
  }])('native price response %j produces display label', async (row) => {
    api.pricing.mockResolvedValue(response(pricing(row)));
    expect((await mount()).priceLabel).toBe(row.expected);
  });
  it.each([{
    amountYuan: 3,
    amountFen: 350,
    billingCycle: null,
    expected: '¥3.50'
  }, {
    amountYuan: null,
    amountFen: null,
    billingCycle: null,
    expected: ''
  }])('unvalidated network JSON pricing %j uses actual type guards', async (row) => {
    const data = JSON.parse(JSON.stringify(row)) as UserPaymentPricingData;
    api.pricing.mockResolvedValue(response(data));
    expect((await mount()).priceLabel).toBe(row.expected);
  });
  it.each(['not-ok', 'no-data', 'rejected'] as const)('both API %s branches preserve default channel state and empty price', async (kind) => {
    if (kind === 'rejected') {
      api.channels.mockRejectedValue(new Error('channels'));
      api.pricing.mockRejectedValue(new Error('price'));
    } else {
      api.channels.mockResolvedValue(response<UserPaymentChannelsData>(undefined, kind !== 'not-ok'));
      api.pricing.mockResolvedValue(response<UserPaymentPricingData>(undefined, kind !== 'not-ok'));
    }
    expect(await mount()).toMatchObject({
      wechatEnabled: true,
      alipayEnabled: true,
      priceLabel: ''
    });
  });
  it('late native channel and pricing responses after cleanup leave state unchanged', async () => {
    const channels = deferred<UserAccountResult<UserPaymentChannelsData>>();
    const price = deferred<UserAccountResult<UserPaymentPricingData>>();
    api.channels.mockReturnValue(channels.promise);
    api.pricing.mockReturnValue(price.promise);
    run();
    flushHookEffects();
    unmountHook();
    channels.resolve(response({
      wechatEnabled: false,
      alipayEnabled: false
    }));
    price.resolve(response(pricing()));
    await settleHook();
    expect(run()).toMatchObject({
      wechatEnabled: true,
      alipayEnabled: true,
      priceLabel: ''
    });
  });
  it.each(['wechat', 'alipay', null] as const)('actual selected %s method clears only when its own channel is unavailable', (method) => {
    const setMethod = vi.fn<(method: PaymentMethod) => void>();
    renderHook(useMethodValidation, method, true, true, setMethod);
    flushHookEffects();
    expect(setMethod).not.toHaveBeenCalled();
    renderHook(useMethodValidation, method, false, false, setMethod);
    flushHookEffects();
    expect(setMethod).toHaveBeenCalledTimes(method === null ? 0 : 1);
  });
  it.each(['PAYING', 'SUCCESS', 'CLOSED', 'FAILED', 'UNKNOWN', ''] as const)('actual order %s yields amount/class/status flags', (status) => {
    const order: UserPaymentOrderData = {
      status,
      outTradeNo: 'order',
      productCode: 'PRO',
      amountFen: 500,
      currency: 'CNY',
      channel: 'WECHAT'
    };
    const state = renderHook(usePaymentStatus, order);
    expect(state.pendingOrderAmountLabel).toBe('¥5.00');
    expect(state.paymentStatusClassName).toBe(`is-${  (status || 'UNKNOWN').toLowerCase()}`);
    expect(state.paymentStatusLabel).toContain('settings.user.payment.status.');
    expect(state.isPendingOrderPaying).toBe(status === 'PAYING');
    expect(state.isPendingOrderSuccess).toBe(status === 'SUCCESS');
  });
  it('missing and malformed network order amounts yield unavailable labels safely', () => {
    expect(renderHook(usePaymentStatus, null).pendingOrderAmountLabel).toBe('--');
    const malformed = JSON.parse('{"status":null,"amountFen":"invalid"}') as UserPaymentOrderData;
    expect(renderHook(usePaymentStatus, malformed)).toMatchObject({
      pendingOrderAmountLabel: '--',
      paymentStatusClassName: 'is-unknown'
    });
  });
});
