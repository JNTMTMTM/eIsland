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
 * @file paymentContentHarness.ts
 * @description 支付内容集成私有原生网络与会话叶边界，真实API/渠道/轮询/状态派生Hook继续执行。
 * @author 鸡哥
 */

import { vi } from 'vitest';
import useIslandStore from '../../../../store/slices';
import { api, browser, resetBrowser, storage } from '../../register/hooks/test/authHookHarness';
import type { UserPaymentOrderData } from '../../../../api/user/userAccountApi';
interface Reply { code: number; message?: string; data?: unknown }
export const order: UserPaymentOrderData = { outTradeNo: 'order-1', productCode: 'PRO_MONTH', amountFen: 2000, currency: 'CNY', status: 'PAYING', channel: 'ALIPAY', payUrl: 'https://pay.example.test/order-1', expireAt: '2026-01-01T01:00:00Z' };
export const wire: { channels: Reply; pricing: Reply; create: Reply; lookup: Reply } = {
  channels: { code: 200 }, pricing: { code: 200 }, create: { code: 200 }, lookup: { code: 200 },
};
/**
 * 安全模拟原生网络响应，保留实际API编码、认证及响应处理。
 * @param url - 真实请求URL。
 * @returns 对应服务器JSON响应。
 */
function reply(url: string): Reply {
  const path = new URL(url).pathname;
  if (path.endsWith('/channels')) return wire.channels;
  if (path.endsWith('/pricing/pro-month')) return wire.pricing;
  if (path.endsWith('/captcha-config')) return { code: 200, data: { enabled: false } };
  if (path.endsWith('/captcha-challenge')) return { code: 200, data: { challengeId: 'payment-challenge', captchaSign: 'sign' } };
  if (path.endsWith('/orders/pro-month') || path.endsWith('/orders/agent-recharge')) return wire.create;
  if (path.includes('/orders/')) return wire.lookup;
  throw new Error(`测试遇到未声明原生网络路径：${  path}`);
}
/**
 * 重建支付页合法会话和各服务叶边界，避免真实支付与外部通信。
 */
export function resetPayment(): void {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  resetBrowser(); Object.assign(browser, { api }); storage.set('user-account-token', 'payment-token');
  Object.assign(wire, { channels: { code: 200, data: { wechatEnabled: true, alipayEnabled: true } },
    pricing: { code: 200, data: { amountFen: 2000, billingCycle: 'MONTH' } },
    create: { code: 200, data: { ...order } }, lookup: { code: 200, data: { ...order } } });
  api.netFetch.mockReset().mockImplementation((url) => Promise.resolve({ ok: true, status: 200, body: JSON.stringify(reply(url)) }));
  api.storeWrite.mockReset().mockResolvedValue(); api.clipboardOpenUrl.mockReset().mockResolvedValue();
  useIslandStore.setState({ state: 'payment', authReturnState: 'idle', uiStateLocked: false, paymentContext: { type: 'pro' }, maxExpandTab: 'todo' });
}
export { api, browser, storage };
