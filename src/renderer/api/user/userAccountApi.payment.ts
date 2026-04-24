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
import type {
  UserAccountResult,
  UserPaymentChannelsData,
  UserPaymentOrderData,
  UserPaymentPricingData,
} from './userAccountApi.types';

export type UserPaymentCreateChannel = 'WECHAT' | 'ALIPAY';

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

/**
 * 获取当前用户可用支付通道配置。
 * @param token - 用户 token。
 * @returns 支付通道配置。
 */
export function fetchPaymentChannels(token: string): Promise<UserAccountResult<UserPaymentChannelsData>> {
  return request<UserPaymentChannelsData>('/v1/user/payment/channels', {
    method: 'GET',
    auth: token,
  });
}

/**
 * 创建 Pro 月付订单。
 * @param token - 用户 token。
 * @param channel - 支付通道。
 * @param email - 收据邮箱。
 * @returns 新创建的支付订单。
 */
export function createProMonthOrder(
  token: string,
  channel: UserPaymentCreateChannel,
  email: string,
): Promise<UserAccountResult<UserPaymentOrderData>> {
  const encodedEmail = encodeURIComponent(email.trim());
  return request<UserPaymentOrderData>(`/v1/user/payment/orders/pro-month?channel=${channel}&email=${encodedEmail}`, {
    method: 'POST',
    auth: token,
  });
}

/**
 * 根据订单号查询支付订单详情。
 * @param token - 用户 token。
 * @param outTradeNo - 商户订单号。
 * @returns 订单详情。
 */
export function fetchPaymentOrder(
  token: string,
  outTradeNo: string,
): Promise<UserAccountResult<UserPaymentOrderData>> {
  return request<UserPaymentOrderData>(`/v1/user/payment/orders/${encodeURIComponent(outTradeNo)}`, {
    method: 'GET',
    auth: token,
  });
}

/**
 * 查询当前用户支付订单列表。
 * @param token - 用户 token。
 * @param limit - 返回数量上限。
 * @returns 支付订单列表。
 */
export function fetchUserPaymentOrders(
  token: string,
  limit = 20,
): Promise<UserAccountResult<UserPaymentOrderData[]>> {
  const normalizedLimit = Math.max(1, Math.min(Number(limit) || 20, 50));
  return request<UserPaymentOrderData[]>(`/v1/user/payment/orders?limit=${normalizedLimit}`, {
    method: 'GET',
    auth: token,
  });
}

/**
 * 关闭当前用户待支付订单。
 * @param token - 用户 token。
 * @param outTradeNo - 商户订单号。
 * @returns 操作结果。
 */
export function closeUserPaymentOrder(
  token: string,
  outTradeNo: string,
): Promise<UserAccountResult<null>> {
  return request<null>(`/v1/user/payment/orders/${encodeURIComponent(outTradeNo)}/close`, {
    method: 'POST',
    auth: token,
  });
}
