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
 * @file userAccountApi.payment.ts
 * @description 用户支付相关接口（套餐价格等）。
 * @author 鸡哥
 */

import { request } from './userAccountApi.client';
import type { UserAccountResult, UserPaymentChannelsData, UserPaymentPricingData } from './userAccountApi.types';

/**
 * 获取 Pro 月付价格信息。
 * @param token - 用户 token。
 * @returns 定价数据。
 */
export function fetchProMonthPricing(token: string): Promise<UserAccountResult<UserPaymentPricingData>> {
  return request<UserPaymentPricingData>('/v1/user/payment/pricing/pro-month', {
    method: 'GET',
    auth: token,
  });
}

export function fetchPaymentChannels(token: string): Promise<UserAccountResult<UserPaymentChannelsData>> {
  return request<UserPaymentChannelsData>('/v1/user/payment/channels', {
    method: 'GET',
    auth: token,
  });
}
