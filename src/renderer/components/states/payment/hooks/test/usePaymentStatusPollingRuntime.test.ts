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
 * @file usePaymentStatusPollingRuntime.test.ts
 * @description 支付状态 Hook 实际轮询、手动刷新、并发拒绝、订单变化与清理边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { shouldPollPaymentOrder, usePaymentStatusPolling } from '../usePaymentStatusPolling';
import type * as UserApi from '../../../../../api/user/userAccountApi';
const leaves = vi.hoisted(() => ({
  token: vi.fn<() => string | null>(),
  fetch: vi.fn<typeof UserApi.fetchPaymentOrder>(),
  feedback: vi.fn<(message: string) => void>()
}));
vi.mock('../../../../../utils/userAccount', () => ({
  readLocalToken: leaves.token
}));
vi.mock('../../../../../api/user/userAccountApi', () => ({
  fetchPaymentOrder: leaves.fetch
}));
/** 创建真实接口形状的订单。
 * @param overrides - 服务端差异
 * @returns 订单
 */
function order(overrides: Partial<UserApi.UserPaymentOrderData> = {}): UserApi.UserPaymentOrderData {
  return {
    outTradeNo: 'order1',
    productCode: 'PRO_MONTH',
    amountFen: 1500,
    currency: 'CNY',
    status: 'PAYING',
    channel: 'WECHAT',
    ...overrides
  };
}
/** 读取同一 Hook 实例。
 * @returns 实际订单状态和事件
 */
function run() {
  return renderHook(usePaymentStatusPolling, {
    onManualFeedback: leaves.feedback
  });
}
/** 启用一个待支付订单并提交轮询生命周期。
 * @param value - 订单
 */
function start(value: UserApi.UserPaymentOrderData = order()): void {
  run().setPendingOrder(value);
  run();
  flushHookEffects();
}
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 6, 12));
  leaves.token.mockReturnValue('token');
  leaves.fetch.mockResolvedValue({
    ok: true,
    code: 200,
    message: '',
    data: order()
  });
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
});
describe('usePaymentStatusPolling runtime', () => {
  it('null order and blank order number cannot manually query; empty status is terminal', async () => {
    run();
    flushHookEffects();
    await run().refreshStatus();
    expect(vi.getTimerCount()).toBe(0);
    run().setPendingOrder(order({
      outTradeNo: ''
    }));
    await run().refreshStatus();
    expect(leaves.fetch).not.toHaveBeenCalled();
    expect(shouldPollPaymentOrder(order({
      status: ''
    }))).toBe(false);
  });
  it('manual refresh marks busy, ignores concurrent refresh, replaces matching order and clears feedback', async () => {
    const pending = deferred<Awaited<ReturnType<typeof UserApi.fetchPaymentOrder>>>();
    leaves.fetch.mockReturnValue(pending.promise);
    start();
    const first = run().refreshStatus();
    expect(run().isRefreshingStatus).toBe(true);
    await run().refreshStatus();
    expect(leaves.fetch).toHaveBeenCalledTimes(1);
    pending.resolve({
      ok: true,
      code: 200,
      message: '',
      data: order({
        status: 'SUCCESS'
      })
    });
    await first;
    expect(run()).toMatchObject({
      isRefreshingStatus: false,
      pendingOrder: {
        status: 'SUCCESS'
      }
    });
    expect(leaves.feedback).toHaveBeenCalledWith('');
    run();
    flushHookEffects();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('logged-out manual feedback is shown but automatic token loss silently retries', async () => {
    leaves.token.mockReturnValue(null);
    start();
    await run().refreshStatus();
    expect(leaves.feedback).toHaveBeenCalledWith('settings.user.payment.loginRequired');
    leaves.feedback.mockClear();
    vi.advanceTimersByTime(3000);
    await settleHook();
    expect(leaves.fetch).not.toHaveBeenCalled();
    expect(leaves.feedback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
  });
  it.each([{
    ok: false,
    message: 'declined',
    expected: 'declined'
  }, {
    ok: false,
    message: '',
    expected: 'settings.user.payment.refreshStatusFailed'
  }, {
    ok: true,
    message: '',
    expected: 'settings.user.payment.refreshStatusFailed'
  }])('manual failed response $ok/$message releases flag and preserves order', async ({
    ok,
    message,
    expected
  }) => {
    leaves.fetch.mockResolvedValue({
      ok,
      message,
      code: 403
    });
    start();
    await run().refreshStatus();
    expect(leaves.feedback).toHaveBeenCalledWith(expected);
    expect(run()).toMatchObject({
      isRefreshingStatus: false,
      pendingOrder: {
        status: 'PAYING'
      }
    });
  });
  it('automatic successful PAYING response schedules next poll and SUCCESS stops it', async () => {
    start();
    vi.advanceTimersByTime(2999);
    expect(leaves.fetch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await settleHook();
    expect(leaves.fetch).toHaveBeenCalledWith('token', 'order1');
    expect(leaves.feedback).not.toHaveBeenCalled();
    expect(run().isRefreshingStatus).toBe(false);
    expect(vi.getTimerCount()).toBe(1);
    leaves.fetch.mockResolvedValue({
      ok: true,
      code: 200,
      message: '',
      data: order({
        status: 'SUCCESS'
      })
    });
    vi.advanceTimersByTime(3000);
    await settleHook();
    expect(run().pendingOrder?.status).toBe('SUCCESS');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('automatic failed response retries original pending order without feedback until expiration', async () => {
    leaves.fetch.mockResolvedValue({
      ok: false,
      code: 503,
      message: 'offline'
    });
    start(order({
      expireAt: new Date(Date.now() - 58000).toISOString()
    }));
    vi.advanceTimersByTime(3000);
    await settleHook();
    expect(vi.getTimerCount()).toBe(0);
    expect(leaves.feedback).not.toHaveBeenCalled();
    expect(run().pendingOrder?.status).toBe('PAYING');
  });
  it('automatic in-flight request blocks manual query without changing manual loading state', async () => {
    const pending = deferred<Awaited<ReturnType<typeof UserApi.fetchPaymentOrder>>>();
    leaves.fetch.mockReturnValue(pending.promise);
    start();
    vi.advanceTimersByTime(3000);
    await run().refreshStatus();
    expect(leaves.fetch).toHaveBeenCalledTimes(1);
    expect(run().isRefreshingStatus).toBe(false);
    pending.resolve({
      ok: false,
      code: 503,
      message: ''
    });
    await settleHook();
    expect(vi.getTimerCount()).toBe(1);
  });
  it.each(['different', 'null'] as const)('manual late response cannot replace %s current order', async (mode) => {
    const pending = deferred<Awaited<ReturnType<typeof UserApi.fetchPaymentOrder>>>();
    leaves.fetch.mockReturnValue(pending.promise);
    start();
    const refresh = run().refreshStatus();
    const current = mode === 'different' ? order({
      outTradeNo: 'order2'
    }) : null;
    run().setPendingOrder(current);
    pending.resolve({
      ok: true,
      code: 200,
      message: '',
      data: order({
        status: 'SUCCESS'
      })
    });
    await refresh;
    expect(run().pendingOrder).toBe(current);
    expect(run().isRefreshingStatus).toBe(false);
  });
  it('unmount cancels pending automatic completion and no timer is recreated', async () => {
    const pending = deferred<Awaited<ReturnType<typeof UserApi.fetchPaymentOrder>>>();
    leaves.fetch.mockReturnValue(pending.promise);
    start();
    vi.advanceTimersByTime(3000);
    unmountHook();
    pending.resolve({
      ok: true,
      code: 200,
      message: '',
      data: order()
    });
    await settleHook();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('order replacement cancels old automatic request and retains new order/timer after late response', async () => {
    const pending = deferred<Awaited<ReturnType<typeof UserApi.fetchPaymentOrder>>>();
    leaves.fetch.mockReturnValueOnce(pending.promise);
    start();
    vi.advanceTimersByTime(3000);
    run().setPendingOrder(order({
      outTradeNo: 'order2'
    }));
    run();
    flushHookEffects();
    pending.resolve({
      ok: true,
      code: 200,
      message: '',
      data: order({
        status: 'SUCCESS'
      })
    });
    await settleHook();
    expect(run().pendingOrder?.outTradeNo).toBe('order2');
    expect(vi.getTimerCount()).toBe(1);
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
  });
});
