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
 * @file usePaymentStatusPolling.ts
 * @description 支付订单状态轮询与手动刷新 Hook
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchPaymentOrder,
  type UserPaymentOrderData,
} from '../../../../api/user/userAccountApi';
import { readLocalToken } from '../../../../utils/userAccount';

export const PAYMENT_POLL_INTERVAL_MS = 3_000;
export const PAYMENT_EXPIRE_GRACE_MS = 60_000;

interface UsePaymentStatusPollingOptions {
  onManualFeedback: (message: string) => void;
}

interface UsePaymentStatusPollingResult {
  pendingOrder: UserPaymentOrderData | null;
  setPendingOrder: Dispatch<SetStateAction<UserPaymentOrderData | null>>;
  isRefreshingStatus: boolean;
  refreshStatus: () => Promise<void>;
}

/**
 * 判断订单是否仍需自动轮询。
 *
 * @param order - 当前支付订单
 * @param now - 当前时间戳，默认使用系统时间
 * @returns 订单处于待支付且未超过到期宽限时返回 true
 */
export function shouldPollPaymentOrder(
  order: UserPaymentOrderData | null,
  now = Date.now(),
): boolean {
  if (!order || String(order.status || '').toUpperCase() !== 'PAYING') return false;
  if (!order.expireAt) return true;
  const expireAt = new Date(order.expireAt).getTime();
  return !Number.isFinite(expireAt) || now <= expireAt + PAYMENT_EXPIRE_GRACE_MS;
}

/**
 * 管理待支付订单并在支付页存活期间自动同步其状态。
 *
 * @param options - 手动刷新结果回调
 * @returns 当前订单、订单更新入口与手动刷新状态
 */
export function usePaymentStatusPolling({
  onManualFeedback,
}: UsePaymentStatusPollingOptions): UsePaymentStatusPollingResult {
  const { t } = useTranslation();
  const [pendingOrder, setPendingOrder] = useState<UserPaymentOrderData | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const requestInFlightRef = useRef(false);

  const queryOrder = useCallback(async (
    outTradeNo: string,
    manual: boolean,
  ): Promise<UserPaymentOrderData | null> => {
    if (requestInFlightRef.current) return null;
    const token = readLocalToken();
    if (!token) {
      if (manual) {
        onManualFeedback(t('settings.user.payment.loginRequired', { defaultValue: '登录状态已失效，请重新登录后再试。' }));
      }
      return null;
    }

    requestInFlightRef.current = true;
    if (manual) setIsRefreshingStatus(true);
    try {
      const result = await fetchPaymentOrder(token, outTradeNo);
      if (!result.ok || !result.data) {
        if (manual) {
          onManualFeedback(result.message || t('settings.user.payment.refreshStatusFailed', { defaultValue: '刷新支付状态失败，请稍后重试。' }));
        }
        return null;
      }
      setPendingOrder((current) => current?.outTradeNo === outTradeNo ? result.data ?? current : current);
      if (manual) onManualFeedback('');
      return result.data;
    } finally {
      requestInFlightRef.current = false;
      if (manual) setIsRefreshingStatus(false);
    }
  }, [onManualFeedback, t]);

  useEffect(() => {
    if (!shouldPollPaymentOrder(pendingOrder)) return undefined;
    const outTradeNo = pendingOrder.outTradeNo;
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout>;

    const poll = async (): Promise<void> => {
      const result = await queryOrder(outTradeNo, false);
      if (cancelled) return;
      const nextOrder = result ?? pendingOrder;
      if (shouldPollPaymentOrder(nextOrder)) {
        timerId = setTimeout(poll, PAYMENT_POLL_INTERVAL_MS);
      }
    };

    timerId = setTimeout(poll, PAYMENT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [pendingOrder, queryOrder]);

  const refreshStatus = useCallback(async (): Promise<void> => {
    if (!pendingOrder?.outTradeNo) return;
    await queryOrder(pendingOrder.outTradeNo, true);
  }, [pendingOrder, queryOrder]);

  return {
    pendingOrder,
    setPendingOrder,
    isRefreshingStatus,
    refreshStatus,
  };
}