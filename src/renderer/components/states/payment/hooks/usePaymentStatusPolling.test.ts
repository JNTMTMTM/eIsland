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
 * @file usePaymentStatusPolling.test.ts
 * @description 支付订单自动轮询终止条件测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import type { UserPaymentOrderData } from '../../../../api/user/userAccountApi';
import {
  PAYMENT_EXPIRE_GRACE_MS,
  shouldPollPaymentOrder,
} from './usePaymentStatusPolling';

const NOW = Date.parse('2026-08-02T12:00:00.000Z');

function createOrder(overrides: Partial<UserPaymentOrderData> = {}): UserPaymentOrderData {
  return {
    outTradeNo: 'ORDER-1',
    productCode: 'PRO_MONTH',
    amountFen: 1500,
    currency: 'CNY',
    status: 'PAYING',
    channel: 'WECHAT',
    expireAt: new Date(NOW + 60_000).toISOString(),
    ...overrides,
  };
}

describe('shouldPollPaymentOrder', () => {
  it('continues polling a paying order before expiration', () => {
    expect(shouldPollPaymentOrder(createOrder(), NOW)).toBe(true);
  });

  it.each(['SUCCESS', 'CLOSED', 'FAILED'])('stops polling terminal status %s', (status) => {
    expect(shouldPollPaymentOrder(createOrder({ status }), NOW)).toBe(false);
  });

  it('stops after the expiration grace period', () => {
    const expireAt = new Date(NOW - PAYMENT_EXPIRE_GRACE_MS - 1).toISOString();
    expect(shouldPollPaymentOrder(createOrder({ expireAt }), NOW)).toBe(false);
  });

  it('keeps polling when the server omits or returns an invalid expiration', () => {
    expect(shouldPollPaymentOrder(createOrder({ expireAt: undefined }), NOW)).toBe(true);
    expect(shouldPollPaymentOrder(createOrder({ expireAt: 'invalid' }), NOW)).toBe(true);
  });
});