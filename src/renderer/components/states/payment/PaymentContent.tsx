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

import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import { SvgIcon } from '../../../utils/SvgIcon';
import '../../../styles/settings/settings.css';
import '../../../styles/auth/auth.css';

type PaymentMethod = 'wechat' | 'alipay' | null;
const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';

export function PaymentContent(): ReactElement {
  const { t } = useTranslation();
  const { returnFromAuth, setMaxExpand, setMaxExpandTab } = useIslandStore();
  const [method, setMethod] = useState<PaymentMethod>(null);

  const handleReportIssue = (): void => {
    window.api.storeWrite(SETTINGS_OPEN_TAB_STORE_KEY, 'about-feedback').catch(() => {});
    setMaxExpandTab('settings');
    setMaxExpand();
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
            onClick={() => setMethod('wechat')}
          >
            <img className="payment-method-icon" src={SvgIcon.WECHATPAY} alt="" aria-hidden="true" />
            {t('settings.user.payment.wechat', { defaultValue: '微信支付' })}
          </button>
          <button
            type="button"
            className={`payment-method-btn ${method === 'alipay' ? 'active' : ''}`}
            onClick={() => setMethod('alipay')}
          >
            <img className="payment-method-icon" src={SvgIcon.ALIPAY} alt="" aria-hidden="true" />
            {t('settings.user.payment.alipay', { defaultValue: '支付宝' })}
          </button>
        </div>

        {method ? (
          <div className="payment-qr-card">
            <div className="payment-qr-box" aria-hidden="true">
              {method === 'wechat' ? 'WECHAT PAY' : 'ALIPAY'}
            </div>
            <div className="payment-qr-hint">
              {method === 'wechat'
                ? t('settings.user.payment.wechatHint', { defaultValue: '推荐使用微信扫码完成支付' })
                : t('settings.user.payment.alipayHint', { defaultValue: '推荐使用支付宝扫码完成支付' })}
            </div>
            <div className="payment-qr-subhint">
              {t('settings.user.payment.fallbackHint', { defaultValue: '如果扫码不可用，可点击下方按钮前往官网支付页面。' })}
            </div>
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
