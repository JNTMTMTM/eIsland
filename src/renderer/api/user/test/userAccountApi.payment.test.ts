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
 * @file userAccountApi.payment.test.ts
 * @description 用户支付相关接口单元测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

const mockRequest = vi.hoisted(() => vi.fn());

vi.mock('../userAccountApi.client', () => ({
  request: mockRequest,
}));

import {
  closeUserPaymentOrder,
  createAgentRechargeOrder,
  createProMonthOrder,
  fetchAgentBalance,
  fetchPaymentChannels,
  fetchPaymentOrder,
  fetchProMonthPricing,
  fetchUserPaymentOrders,
} from '../userAccountApi.payment';

describe('userAccountApi.payment', () => {
  const okResult = { ok: true, code: 200, message: 'success', data: undefined };

  describe('fetchProMonthPricing', () => {
    it('sends GET to /v1/user/payment/pricing/pro-month with auth', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchProMonthPricing('my-token');

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/payment/pricing/pro-month', {
        method: 'GET',
        auth: 'my-token',
      });
    });
  });

  describe('fetchPaymentChannels', () => {
    it('sends GET to /v1/user/payment/channels with auth', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchPaymentChannels('my-token');

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/payment/channels', {
        method: 'GET',
        auth: 'my-token',
      });
    });
  });

  describe('createProMonthOrder', () => {
    it('sends POST to pro-month order endpoint with channel and encoded email', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await createProMonthOrder('my-token', 'WECHAT', 'user@example.com');

      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/user/payment/orders/pro-month?channel=WECHAT&email=user%40example.com',
        { method: 'POST', auth: 'my-token' },
      );
    });

    it('trims and encodes email with spaces', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await createProMonthOrder('my-token', 'ALIPAY', '  user@example.com  ');

      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/user/payment/orders/pro-month?channel=ALIPAY&email=user%40example.com',
        { method: 'POST', auth: 'my-token' },
      );
    });
  });

  describe('fetchPaymentOrder', () => {
    it('sends GET to /v1/user/payment/orders/:outTradeNo with auth', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchPaymentOrder('my-token', 'ORDER-123');

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/payment/orders/ORDER-123', {
        method: 'GET',
        auth: 'my-token',
      });
    });

    it('encodes special characters in outTradeNo', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchPaymentOrder('my-token', 'ORDER/123?foo');

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/payment/orders/ORDER%2F123%3Ffoo', {
        method: 'GET',
        auth: 'my-token',
      });
    });
  });

  describe('fetchUserPaymentOrders', () => {
    it('sends GET to /v1/user/payment/orders with default page 1 and pageSize 5', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchUserPaymentOrders('my-token');

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/payment/orders?page=1&pageSize=5', {
        method: 'GET',
        auth: 'my-token',
      });
    });

    it('uses provided page and pageSize', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchUserPaymentOrders('my-token', 2, 10);

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/payment/orders?page=2&pageSize=10', {
        method: 'GET',
        auth: 'my-token',
      });
    });

    it('clamps pageSize to max 50', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchUserPaymentOrders('my-token', 1, 100);

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/payment/orders?page=1&pageSize=50', {
        method: 'GET',
        auth: 'my-token',
      });
    });

    it('falls back to default pageSize for falsy input (0)', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchUserPaymentOrders('my-token', 1, 0);

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/payment/orders?page=1&pageSize=5', {
        method: 'GET',
        auth: 'my-token',
      });
    });

    it('clamps page to min 1', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchUserPaymentOrders('my-token', 0, 5);

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/payment/orders?page=1&pageSize=5', {
        method: 'GET',
        auth: 'my-token',
      });
    });

    it('falls back to defaults for NaN inputs', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchUserPaymentOrders('my-token', Number.NaN, Number.NaN);

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/payment/orders?page=1&pageSize=5', {
        method: 'GET',
        auth: 'my-token',
      });
    });
  });

  describe('closeUserPaymentOrder', () => {
    it('sends POST to /v1/user/payment/orders/:outTradeNo/close with auth', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await closeUserPaymentOrder('my-token', 'ORDER-456');

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/payment/orders/ORDER-456/close', {
        method: 'POST',
        auth: 'my-token',
      });
    });

    it('encodes special characters in outTradeNo', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await closeUserPaymentOrder('my-token', 'ORDER/456');

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/payment/orders/ORDER%2F456/close', {
        method: 'POST',
        auth: 'my-token',
      });
    });
  });

  describe('fetchAgentBalance', () => {
    it('sends GET to /v1/user/payment/agent/balance with auth', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchAgentBalance('my-token');

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/payment/agent/balance', {
        method: 'GET',
        auth: 'my-token',
      });
    });
  });

  describe('createAgentRechargeOrder', () => {
    it('sends POST with channel, amountFen, and encoded email', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await createAgentRechargeOrder('my-token', 'WECHAT', 1000, 'user@example.com');

      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/user/payment/orders/agent-recharge?channel=WECHAT&amountFen=1000&email=user%40example.com',
        { method: 'POST', auth: 'my-token' },
      );
    });

    it('trims and encodes email with special characters', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await createAgentRechargeOrder('my-token', 'ALIPAY', 5000, '  a+b@c.com  ');

      expect(mockRequest).toHaveBeenCalledWith(
        '/v1/user/payment/orders/agent-recharge?channel=ALIPAY&amountFen=5000&email=a%2Bb%40c.com',
        { method: 'POST', auth: 'my-token' },
      );
    });
  });
});
