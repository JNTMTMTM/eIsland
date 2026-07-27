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
 * @file PaymentContent.tsx
 * @description 独立支付状态界面
 * @author 鸡哥
 */

import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import {
  createProMonthOrder,
  createAgentRechargeOrder,
  fetchPaymentOrder,
  type UserPaymentOrderData,
} from '../../../api/user/userAccountApi';
import { runSliderCaptcha } from '../../../utils/sliderCaptcha';
import { readLocalProfile, readLocalToken } from '../../../utils/userAccount';
import { SETTINGS_OPEN_TAB_STORE_KEY, EMAIL_PATTERN, type PaymentMethod } from './config/paymentConstants';
import { formatDateOnly } from './utils/formatDateOnly';
import { usePaymentChannels } from './hooks/usePaymentChannels';
import { usePaymentStatus } from './hooks/usePaymentStatus';
import { useMethodValidation } from './hooks/useMethodValidation';
import { PaymentMethodSelector } from './components/PaymentMethodSelector';
import { PaymentOrderForm } from './components/PaymentOrderForm';
import { PaymentPendingOrder } from './components/PaymentPendingOrder';
import '../../../styles/settings/settings.css';
import '../../../styles/auth/auth.css';

/**
 * 支付状态页面主内容组件。
 * @returns 支付页面视图。
 */
export function PaymentContent(): ReactElement {
  const { t } = useTranslation();
  const { returnFromAuth, setMaxExpand, setMaxExpandTab, paymentContext } = useIslandStore();
  const isRechargeMode = paymentContext.type === 'recharge';
  const rechargeAmountFen = isRechargeMode ? paymentContext.amountFen : 0;
  const [method, setMethod] = useState<PaymentMethod>(null);
  const [receiptEmail, setReceiptEmail] = useState('');
  const [orderExpireAt, setOrderExpireAt] = useState('');
  const [subscriptionPeriod, setSubscriptionPeriod] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<UserPaymentOrderData | null>(null);

  const { wechatEnabled, alipayEnabled, priceLabel } = usePaymentChannels(isRechargeMode, rechargeAmountFen);
  const {
    pendingOrderAmountLabel, paymentStatusLabel, paymentStatusClassName,
    isPendingOrderPaying, isPendingOrderSuccess,
  } = usePaymentStatus(pendingOrder);
  useMethodValidation(method, wechatEnabled, alipayEnabled, setMethod);

  const orderExpireLabel = useMemo(() => {
    if (!orderExpireAt) return '';
    const date = new Date(orderExpireAt);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleString();
  }, [orderExpireAt]);

  const anyChannelEnabled = wechatEnabled || alipayEnabled;
  const creatingOrRefreshing = isCreatingOrder || isRefreshingStatus;

  const handleReportIssue = (): void => {
    window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'about-feedback').catch(() => {});
    setMaxExpandTab('settings');
    setMaxExpand();
  };

  const handleSelectMethod = (nextMethod: Exclude<PaymentMethod, null>): void => {
    if ((nextMethod === 'wechat' && !wechatEnabled) || (nextMethod === 'alipay' && !alipayEnabled)) return;
    setMethod(nextMethod);
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    setSubscriptionPeriod(`${formatDateOnly(now)} - ${formatDateOnly(end)}`);
    setOrderExpireAt(new Date(Date.now() + 15 * 60 * 1000).toISOString());
    setPendingOrder(null);
    setFeedback('');
  };

  const handleConfirmPay = async (): Promise<void> => {
    if (isCreatingOrder) return;
    if (!method) {
      setFeedback(t('settings.user.payment.selectMethodHint', { defaultValue: '请选择上方支付方式后再创建订单。' }));
      return;
    }
    const email = receiptEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      setFeedback(t('settings.user.payment.emailInvalid', { defaultValue: '请输入有效的收据邮箱地址' }));
      return;
    }
    const token = readLocalToken();
    if (!token) {
      setFeedback(t('settings.user.payment.loginRequired', { defaultValue: '登录状态已失效，请重新登录后再试。' }));
      return;
    }
    const channel = method === 'alipay' ? 'ALIPAY' : 'WECHAT';
    try {
      const captcha = await runSliderCaptcha(email);
      if (!captcha) {
        setFeedback(t('settings.user.feedback.captchaCancelled', { defaultValue: '请完成滑块验证后再继续操作' }));
        return;
      }
      setIsCreatingOrder(true);
      const result = isRechargeMode
        ? await createAgentRechargeOrder(token, channel, rechargeAmountFen, email)
        : await createProMonthOrder(token, channel, email);
      if (!result.ok || !result.data) {
        setFeedback(result.message || t('settings.user.payment.createOrderFailed', { defaultValue: '创建支付订单失败，请稍后重试。' }));
        return;
      }
      setPendingOrder(result.data);
      if (result.data.expireAt) setOrderExpireAt(result.data.expireAt);
      const payUrl = (result.data.payUrl || result.data.qrCodeUrl || '').trim();
      if (!payUrl) {
        setFeedback(t('settings.user.payment.payUrlMissing', { defaultValue: '订单创建成功但未返回支付链接，请稍后重试。' }));
        return;
      }
      setFeedback('');
      window.api.clipboardOpenUrl(payUrl).catch(() => {
        setFeedback(t('settings.user.payment.openPayFailed', { defaultValue: '无法打开支付页面，请稍后重试。' }));
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('settings.user.payment.createOrderFailed', { defaultValue: '创建支付订单失败，请稍后重试。' });
      setFeedback(msg);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleOpenPendingPaymentPage = (): void => {
    if (!pendingOrder) return;
    const payUrl = (pendingOrder.payUrl || pendingOrder.qrCodeUrl || '').trim();
    if (!payUrl) {
      setFeedback(t('settings.user.payment.payUrlMissing', { defaultValue: '订单创建成功但未返回支付链接，请稍后重试。' }));
      return;
    }
    window.api.clipboardOpenUrl(payUrl).catch(() => {
      setFeedback(t('settings.user.payment.openPayFailed', { defaultValue: '无法打开支付页面，请稍后重试。' }));
    });
  };

  const handleGoUserCenter = (): void => { returnFromAuth(); };

  const handleViewOrders = (): void => {
    window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'user-orders').catch(() => {});
    setMaxExpandTab('settings');
    setMaxExpand();
  };

  const handleRefreshPaymentStatus = async (): Promise<void> => {
    if (!pendingOrder || !pendingOrder.outTradeNo || isRefreshingStatus) return;
    const token = readLocalToken();
    if (!token) {
      setFeedback(t('settings.user.payment.loginRequired', { defaultValue: '登录状态已失效，请重新登录后再试。' }));
      return;
    }
    try {
      setIsRefreshingStatus(true);
      const result = await fetchPaymentOrder(token, pendingOrder.outTradeNo);
      if (!result.ok || !result.data) {
        setFeedback(result.message || t('settings.user.payment.refreshStatusFailed', { defaultValue: '刷新支付状态失败，请稍后重试。' }));
        return;
      }
      setPendingOrder(result.data);
      if (result.data.expireAt) setOrderExpireAt(result.data.expireAt);
      setFeedback('');
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const handleFillAccountEmail = (): void => {
    const accountEmail = (readLocalProfile()?.email || '').trim().toLowerCase();
    if (!accountEmail) {
      setFeedback(t('settings.user.payment.boundEmailNotFound', { defaultValue: '当前账号未找到绑定邮箱' }));
      return;
    }
    setReceiptEmail(accountEmail);
    setFeedback('');
  };

  return (
    <div className="auth-state-content" onClick={(e) => e.stopPropagation()}>
      <div className="auth-panel payment-panel settings-scrollbar-thin">
        <div className="auth-panel-title">
          {isRechargeMode
            ? t('settings.user.recharge.paymentTitle', { defaultValue: 'Agent 余额充值' })
            : t('settings.user.payment.title', { defaultValue: '购买 Pro' })}
        </div>
        <div className="auth-panel-subtitle">
          {isRechargeMode
            ? t('settings.user.recharge.paymentSubtitle', { defaultValue: '选择支付方式后完成支付，余额将自动到账。' })
            : t('settings.user.payment.subtitle', { defaultValue: '选择支付方式后前往官网完成支付，支付成功后账号会自动同步 Pro 权益。' })}
        </div>

        <PaymentMethodSelector method={method} wechatEnabled={wechatEnabled} alipayEnabled={alipayEnabled} onSelect={handleSelectMethod} />

        {!anyChannelEnabled ? (
          <div className="payment-order-feedback">
            {t('settings.user.payment.channelsUnavailable', { defaultValue: '当前支付通道暂不可用，请稍后重试。' })}
          </div>
        ) : null}

        {method && !pendingOrder ? (
          <PaymentOrderForm
            isRechargeMode={isRechargeMode}
            receiptEmail={receiptEmail}
            onReceiptEmailChange={setReceiptEmail}
            onFillAccountEmail={handleFillAccountEmail}
            priceLabel={priceLabel}
            subscriptionPeriod={subscriptionPeriod}
            feedback={feedback}
            isCreatingOrder={isCreatingOrder}
            creatingOrRefreshing={creatingOrRefreshing}
            onConfirmPay={handleConfirmPay}
          />
        ) : null}

        {pendingOrder ? (
          <PaymentPendingOrder
            pendingOrder={pendingOrder}
            pendingOrderAmountLabel={pendingOrderAmountLabel}
            paymentStatusLabel={paymentStatusLabel}
            paymentStatusClassName={paymentStatusClassName}
            isPendingOrderPaying={isPendingOrderPaying}
            isPendingOrderSuccess={isPendingOrderSuccess}
            orderExpireLabel={orderExpireLabel}
            feedback={feedback}
            isRefreshingStatus={isRefreshingStatus}
            creatingOrRefreshing={creatingOrRefreshing}
            onRefreshStatus={handleRefreshPaymentStatus}
            onOpenPaymentPage={handleOpenPendingPaymentPage}
            onViewOrders={handleViewOrders}
            onGoUserCenter={handleGoUserCenter}
          />
        ) : null}

        <div className="auth-panel-actions">
          <button type="button" className="settings-user-secondary-btn" onClick={handleReportIssue}>
            {t('settings.user.actions.reportIssue', { defaultValue: '报告问题' })}
          </button>
          <button type="button" className="settings-user-secondary-btn" onClick={returnFromAuth}>
            {t('settings.user.actions.backToCenter', { defaultValue: '返回上一页' })}
          </button>
        </div>
      </div>
    </div>
  );
}
