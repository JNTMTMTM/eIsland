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
 */

/**
 * @file PaymentContent.tsx
 * @description 独立支付状态界面
 * @author 鸡哥
 */

import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import { SvgIcon } from '../../../utils/SvgIcon';
import {
  createProMonthOrder,
  fetchPaymentOrder,
  fetchPaymentChannels,
  fetchProMonthPricing,
  type UserPaymentCreateChannel,
  type UserPaymentOrderData,
} from '../../../api/user/userAccountApi';
import { runSliderCaptcha } from '../../../utils/sliderCaptcha';
import { readLocalProfile, readLocalToken } from '../../../utils/userAccount';
import '../../../styles/settings/settings.css';
import '../../../styles/auth/auth.css';

type PaymentMethod = 'wechat' | 'alipay' | null;
const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 支付状态页面主内容组件。
 * @returns 支付页面视图。
 */
export function PaymentContent(): ReactElement {
  const { t } = useTranslation();
  const { returnFromAuth, setMaxExpand, setMaxExpandTab } = useIslandStore();
  const [method, setMethod] = useState<PaymentMethod>(null);
  const [receiptEmail, setReceiptEmail] = useState('');
  const [orderExpireAt, setOrderExpireAt] = useState<string>('');
  const [subscriptionPeriod, setSubscriptionPeriod] = useState('');
  const [priceLabel, setPriceLabel] = useState('');
  const [feedback, setFeedback] = useState('');
  const [wechatEnabled, setWechatEnabled] = useState(true);
  const [alipayEnabled, setAlipayEnabled] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<UserPaymentOrderData | null>(null);

  const handleReportIssue = (): void => {
    window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'about-feedback').catch(() => {});
    setMaxExpandTab('settings');
    setMaxExpand();
  };

  useEffect(() => {
    const token = readLocalToken();
    if (!token) {
      setWechatEnabled(false);
      setAlipayEnabled(false);
      setPriceLabel('');
      return;
    }
    let cancelled = false;
    fetchPaymentChannels(token).then((result) => {
      if (cancelled || !result.ok || !result.data) return;
      setWechatEnabled(Boolean(result.data.wechatEnabled));
      setAlipayEnabled(Boolean(result.data.alipayEnabled));
    }).catch(() => {});
    fetchProMonthPricing(token).then((result) => {
      if (cancelled || !result.ok || !result.data) return;
      const amountYuanRaw = typeof result.data.amountYuan === 'string' ? result.data.amountYuan.trim() : '';
      const amountYuan = amountYuanRaw || (typeof result.data.amountFen === 'number' ? (result.data.amountFen / 100).toFixed(2) : '');
      const cycle = String(result.data.billingCycle || '').toUpperCase() === 'MONTH'
        ? t('settings.user.pro.billingCycle.month', { defaultValue: '月' })
        : String(result.data.billingCycle || '').trim();
      if (!amountYuan) {
        setPriceLabel('');
        return;
      }
      setPriceLabel(cycle ? `¥${amountYuan} / ${cycle}` : `¥${amountYuan}`);
    }).catch(() => {}).finally(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const orderExpireLabel = useMemo(() => {
    if (!orderExpireAt) return '';
    const date = new Date(orderExpireAt);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleString();
  }, [orderExpireAt]);

  useEffect(() => {
    if (method === 'wechat' && !wechatEnabled) {
      setMethod(null);
    }
    if (method === 'alipay' && !alipayEnabled) {
      setMethod(null);
    }
  }, [method, wechatEnabled, alipayEnabled]);

  const anyChannelEnabled = wechatEnabled || alipayEnabled;
  const creatingOrRefreshing = isCreatingOrder || isRefreshingStatus;

  const pendingOrderAmountLabel = useMemo(() => {
    if (!pendingOrder || typeof pendingOrder.amountFen !== 'number') return '--';
    return `¥${(pendingOrder.amountFen / 100).toFixed(2)}`;
  }, [pendingOrder]);

  const paymentStatusLabel = useMemo(() => {
    const status = String(pendingOrder?.status || '').toUpperCase();
    if (status === 'PAYING') return t('settings.user.payment.status.paying', { defaultValue: '待支付' });
    if (status === 'SUCCESS') return t('settings.user.payment.status.success', { defaultValue: '已支付' });
    if (status === 'CLOSED') return t('settings.user.payment.status.closed', { defaultValue: '已关闭' });
    if (status === 'FAILED') return t('settings.user.payment.status.failed', { defaultValue: '支付失败' });
    return t('settings.user.payment.status.unknown', { defaultValue: '未知' });
  }, [pendingOrder, t]);

  const paymentStatusClassName = useMemo(() => {
    const status = String(pendingOrder?.status || '').toUpperCase();
    if (status === 'SUCCESS') return 'is-success';
    if (status === 'FAILED') return 'is-failed';
    if (status === 'CLOSED') return 'is-closed';
    if (status === 'PAYING') return 'is-paying';
    return 'is-unknown';
  }, [pendingOrder]);

  const isPendingOrderPaying = String(pendingOrder?.status || '').toUpperCase() === 'PAYING';
  const isPendingOrderSuccess = String(pendingOrder?.status || '').toUpperCase() === 'SUCCESS';

  const handleSelectMethod = (nextMethod: Exclude<PaymentMethod, null>): void => {
    if ((nextMethod === 'wechat' && !wechatEnabled) || (nextMethod === 'alipay' && !alipayEnabled)) {
      return;
    }
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
    if (isCreatingOrder) {
      return;
    }
    if (!method) {
      setFeedback(t('settings.user.payment.selectMethodHint', { defaultValue: '请选择上方支付方式后再创建订单。' }));
      return;
    }
    const email = receiptEmail.trim();
    if (!EMAIL_PATTERN.test(email)) {
      setFeedback(t('settings.user.payment.emailInvalid', { defaultValue: '请输入有效的收据邮箱地址' }));
      return;
    }
    const token = readLocalToken();
    if (!token) {
      setFeedback(t('settings.user.payment.loginRequired', { defaultValue: '登录状态已失效，请重新登录后再试。' }));
      return;
    }

    const channel: UserPaymentCreateChannel = method === 'alipay' ? 'ALIPAY' : 'WECHAT';
    try {
      const captcha = await runSliderCaptcha(email);
      if (!captcha) {
        setFeedback(t('settings.user.feedback.captchaCancelled', { defaultValue: '请完成滑块验证后再继续操作' }));
        return;
      }
      setIsCreatingOrder(true);
      const result = await createProMonthOrder(token, channel, email);
      if (!result.ok || !result.data) {
        setFeedback(result.message || t('settings.user.payment.createOrderFailed', { defaultValue: '创建支付订单失败，请稍后重试。' }));
        return;
      }
      setPendingOrder(result.data);
      if (result.data.expireAt) {
        setOrderExpireAt(result.data.expireAt);
      }
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
    if (!pendingOrder) {
      return;
    }
    const payUrl = (pendingOrder.payUrl || pendingOrder.qrCodeUrl || '').trim();
    if (!payUrl) {
      setFeedback(t('settings.user.payment.payUrlMissing', { defaultValue: '订单创建成功但未返回支付链接，请稍后重试。' }));
      return;
    }
    window.api.clipboardOpenUrl(payUrl).catch(() => {
      setFeedback(t('settings.user.payment.openPayFailed', { defaultValue: '无法打开支付页面，请稍后重试。' }));
    });
  };

  const handleGoUserCenter = (): void => {
    returnFromAuth();
  };

  const handleViewOrders = (): void => {
    window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'user-orders').catch(() => {});
    setMaxExpandTab('settings');
    setMaxExpand();
  };

  const handleRefreshPaymentStatus = async (): Promise<void> => {
    if (!pendingOrder || !pendingOrder.outTradeNo || isRefreshingStatus) {
      return;
    }
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
      if (result.data.expireAt) {
        setOrderExpireAt(result.data.expireAt);
      }
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
      <div className="auth-panel payment-panel">
        <div className="auth-panel-title">{t('settings.user.payment.title', { defaultValue: '购买 Pro' })}</div>
        <div className="auth-panel-subtitle">
          {t('settings.user.payment.subtitle', { defaultValue: '选择支付方式后前往官网完成支付，支付成功后账号会自动同步 Pro 权益。' })}
        </div>

        <div className="payment-method-row" role="radiogroup" aria-label={t('settings.user.payment.method', { defaultValue: '支付方式' })}>
          <button
            type="button"
            className={`payment-method-btn ${method === 'wechat' ? 'active' : ''}`}
            disabled={!wechatEnabled}
            onClick={() => handleSelectMethod('wechat')}
          >
            <img className="payment-method-icon" src={SvgIcon.WECHATPAY} alt="" aria-hidden="true" />
            {t('settings.user.payment.wechat', { defaultValue: '微信支付' })}
          </button>
          <button
            type="button"
            className={`payment-method-btn ${method === 'alipay' ? 'active' : ''}`}
            disabled={!alipayEnabled}
            onClick={() => handleSelectMethod('alipay')}
          >
            <img className="payment-method-icon" src={SvgIcon.ALIPAY} alt="" aria-hidden="true" />
            {t('settings.user.payment.alipay', { defaultValue: '支付宝' })}
          </button>
        </div>

        {!anyChannelEnabled ? (
          <div className="payment-order-feedback">
            {t('settings.user.payment.channelsUnavailable', { defaultValue: '当前支付通道暂不可用，请稍后重试。' })}
          </div>
        ) : null}

        {method && !pendingOrder ? (
          <div className="payment-order-card">
            <div className="payment-order-title">
              {t('settings.user.payment.orderTitle', { defaultValue: '确认订单' })}
            </div>
            <label className="payment-order-email-field">
              <div className="payment-order-email-row">
                <input
                  className="settings-field-input"
                  value={receiptEmail}
                  onChange={(e) => setReceiptEmail(e.target.value)}
                  placeholder={t('settings.user.payment.receiptEmailPlaceholder', { defaultValue: '请输入接收收据的邮箱地址' })}
                />
                <button
                  type="button"
                  className="settings-user-secondary-btn payment-fill-email-btn"
                  onClick={handleFillAccountEmail}
                >
                  {t('settings.user.payment.fillAccountEmail', { defaultValue: '填充本账号邮箱' })}
                </button>
              </div>
            </label>
            <div className="payment-order-row payment-order-row-split">
              <div className="payment-order-item">
                <span className="payment-order-label">{t('settings.user.payment.priceLabel', { defaultValue: '价格' })}</span>
                <span className="payment-order-value">{priceLabel || t('settings.user.pro.pro.priceUnavailable', { defaultValue: '价格待定' })}</span>
              </div>
              <div className="payment-order-item">
                <span className="payment-order-label">{t('settings.user.payment.subscriptionPeriodLabel', { defaultValue: '订阅时间' })}</span>
                <span className="payment-order-value">{subscriptionPeriod || '--'}</span>
              </div>
            </div>
            {feedback ? <div className="payment-order-feedback">{feedback}</div> : null}
            <button
              type="button"
              className="settings-user-primary-btn payment-confirm-btn"
              onClick={handleConfirmPay}
              disabled={creatingOrRefreshing}
            >
              {isCreatingOrder ? (
                <>
                  <span className="payment-btn-spinner" aria-hidden="true" />
                  {t('settings.user.payment.creatingOrder', { defaultValue: '创建订单中...' })}
                </>
              ) : t('settings.user.payment.confirmPay', { defaultValue: '创建订单' })}
            </button>
          </div>
        ) : null}

        {pendingOrder ? (
          <div className="payment-order-card">
            <div className="payment-order-title">
              {t('settings.user.payment.pendingTitle', { defaultValue: '待支付订单' })}
            </div>
            <div className="payment-order-row payment-order-row-split">
              <div className="payment-order-item">
                <span className="payment-order-label">{t('settings.user.payment.orderNoLabel', { defaultValue: '订单号' })}</span>
                <span className="payment-order-value">{pendingOrder.outTradeNo || '--'}</span>
              </div>
              <div className="payment-order-item">
                <span className="payment-order-label">{t('settings.user.payment.payAmountLabel', { defaultValue: '付款金额' })}</span>
                <span className="payment-order-value">{pendingOrderAmountLabel}</span>
              </div>
            </div>
            <div className="payment-order-row">
              <span className="payment-order-label">{t('settings.user.payment.payStatusLabel', { defaultValue: '支付状态' })}</span>
              <span className={`payment-status-badge ${paymentStatusClassName}`}>{paymentStatusLabel}</span>
            </div>
            <div className="payment-order-row">
              <span className="payment-order-label">{t('settings.user.payment.expireLabel', { defaultValue: '订单到期时间' })}</span>
              <span className="payment-order-value">{orderExpireLabel || '--'}</span>
            </div>
            {feedback ? <div className="payment-order-feedback">{feedback}</div> : null}
            <button
              type="button"
              className="settings-user-secondary-btn payment-refresh-status-btn"
              onClick={handleRefreshPaymentStatus}
              disabled={creatingOrRefreshing}
            >
              {isRefreshingStatus ? (
                <>
                  <span className="payment-btn-spinner" aria-hidden="true" />
                  {t('settings.user.payment.refreshingStatus', { defaultValue: '刷新中...' })}
                </>
              ) : t('settings.user.payment.refreshStatus', { defaultValue: '刷新支付状态' })}
            </button>
            {isPendingOrderPaying ? (
              <button
                type="button"
                className="settings-user-primary-btn payment-confirm-btn"
                onClick={handleOpenPendingPaymentPage}
                disabled={creatingOrRefreshing}
              >
                <img className="payment-action-icon" src={SvgIcon.ALIPAY} alt="" aria-hidden="true" />
                {t('settings.user.payment.openPaymentPage', { defaultValue: '打开支付界面' })}
              </button>
            ) : null}
            {isPendingOrderPaying ? (
              <button
                type="button"
                className="settings-user-secondary-btn payment-refresh-status-btn"
                onClick={handleViewOrders}
                disabled={creatingOrRefreshing}
              >
                {t('settings.user.payment.viewOrders', { defaultValue: '查看订单' })}
              </button>
            ) : null}
            {isPendingOrderSuccess ? (
              <button
                type="button"
                className="settings-user-primary-btn payment-confirm-btn"
                onClick={handleGoUserCenter}
              >
                {t('settings.user.payment.goUserCenter', { defaultValue: '前往用户中心' })}
              </button>
            ) : null}
            {isPendingOrderSuccess ? (
              <button
                type="button"
                className="settings-user-secondary-btn payment-refresh-status-btn"
                onClick={handleViewOrders}
              >
                {t('settings.user.payment.viewOrders', { defaultValue: '查看订单' })}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="auth-panel-actions">
          <button
            type="button"
            className="settings-user-secondary-btn"
            onClick={handleReportIssue}
          >
            {t('settings.user.actions.reportIssue', { defaultValue: '报告问题' })}
          </button>
          <button
            type="button"
            className="settings-user-secondary-btn"
            onClick={returnFromAuth}
          >
            {t('settings.user.actions.backToCenter', { defaultValue: '返回上一页' })}
          </button>
        </div>

      </div>
    </div>
  );
}
