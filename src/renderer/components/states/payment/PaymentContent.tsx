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
import { fetchProMonthPricing } from '../../../api/user/userAccountApi';
import { readLocalProfile, readLocalToken } from '../../../utils/userAccount';
import '../../../styles/settings/settings.css';
import '../../../styles/auth/auth.css';

type PaymentMethod = 'wechat' | 'alipay' | null;
const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';
const PRO_CHECKOUT_URL = 'https://www.pyisland.com';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function PaymentContent(): ReactElement {
  const { t } = useTranslation();
  const { returnFromAuth, setMaxExpand, setMaxExpandTab } = useIslandStore();
  const [method, setMethod] = useState<PaymentMethod>(null);
  const [receiptEmail, setReceiptEmail] = useState('');
  const [orderExpireAt, setOrderExpireAt] = useState<string>('');
  const [subscriptionPeriod, setSubscriptionPeriod] = useState('');
  const [priceLabel, setPriceLabel] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleReportIssue = (): void => {
    window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'about-feedback').catch(() => {});
    setMaxExpandTab('settings');
    setMaxExpand();
  };

  useEffect(() => {
    const token = readLocalToken();
    if (!token) {
      setPriceLabel('');
      return;
    }
    let cancelled = false;
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

  const handleSelectMethod = (nextMethod: Exclude<PaymentMethod, null>): void => {
    setMethod(nextMethod);
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    setSubscriptionPeriod(`${formatDateOnly(now)} - ${formatDateOnly(end)}`);
    setOrderExpireAt(new Date(Date.now() + 15 * 60 * 1000).toISOString());
    setFeedback('');
  };

  const handleConfirmPay = (): void => {
    const email = receiptEmail.trim();
    if (!EMAIL_PATTERN.test(email)) {
      setFeedback(t('settings.user.payment.emailInvalid', { defaultValue: '请输入有效的收据邮箱地址' }));
      return;
    }
    window.api.clipboardOpenUrl(PRO_CHECKOUT_URL).catch(() => {});
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
            onClick={() => handleSelectMethod('wechat')}
          >
            <img className="payment-method-icon" src={SvgIcon.WECHATPAY} alt="" aria-hidden="true" />
            {t('settings.user.payment.wechat', { defaultValue: '微信支付' })}
          </button>
          <button
            type="button"
            className={`payment-method-btn ${method === 'alipay' ? 'active' : ''}`}
            onClick={() => handleSelectMethod('alipay')}
          >
            <img className="payment-method-icon" src={SvgIcon.ALIPAY} alt="" aria-hidden="true" />
            {t('settings.user.payment.alipay', { defaultValue: '支付宝' })}
          </button>
        </div>

        {method ? (
          <div className="payment-order-card">
            <div className="payment-order-title">
              {t('settings.user.payment.orderTitle', { defaultValue: '确认订单' })}
            </div>
            <label className="payment-order-email-field">
              <span className="payment-order-label">
                {t('settings.user.payment.receiptEmailLabel', { defaultValue: '收据发送邮箱' })}
              </span>
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
            <div className="payment-order-row">
              <span className="payment-order-label">{t('settings.user.payment.priceLabel', { defaultValue: '价格' })}</span>
              <span className="payment-order-value">{priceLabel || t('settings.user.pro.pro.priceUnavailable', { defaultValue: '价格待定' })}</span>
            </div>
            <div className="payment-order-row">
              <span className="payment-order-label">{t('settings.user.payment.subscriptionPeriodLabel', { defaultValue: '订阅时间' })}</span>
              <span className="payment-order-value">{subscriptionPeriod || '--'}</span>
            </div>
            <div className="payment-order-row">
              <span className="payment-order-label">{t('settings.user.payment.expireLabel', { defaultValue: '订单到期时间' })}</span>
              <span className="payment-order-value">{orderExpireLabel || '--'}</span>
            </div>
            {feedback ? <div className="payment-order-feedback">{feedback}</div> : null}
            <button
              type="button"
              className="settings-user-primary-btn payment-confirm-btn"
              onClick={handleConfirmPay}
            >
              {t('settings.user.payment.confirmPay', { defaultValue: '确认支付' })}
            </button>
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
