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
 * @file PaymentPendingOrder.tsx
 * @description 待支付订单展示组件
 * @author 鸡哥
 */

import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { SvgIcon } from '../../../../utils/SvgIcon';
import type { UserPaymentOrderData } from '../../../../api/user/userAccountApi';

interface PaymentPendingOrderProps {
  pendingOrder: UserPaymentOrderData;
  pendingOrderAmountLabel: string;
  paymentStatusLabel: string;
  paymentStatusClassName: string;
  isPendingOrderPaying: boolean;
  isPendingOrderSuccess: boolean;
  orderExpireLabel: string;
  feedback: string;
  isRefreshingStatus: boolean;
  creatingOrRefreshing: boolean;
  onRefreshStatus: () => void;
  onOpenPaymentPage: () => void;
  onViewOrders: () => void;
  onGoUserCenter: () => void;
}

/**
 * 渲染待支付订单详情与操作按钮。
 * @param props - 订单数据与操作回调。
 * @returns 待支付订单视图。
 */
export function PaymentPendingOrder({
  pendingOrder,
  pendingOrderAmountLabel,
  paymentStatusLabel,
  paymentStatusClassName,
  isPendingOrderPaying,
  isPendingOrderSuccess,
  orderExpireLabel,
  feedback,
  isRefreshingStatus,
  creatingOrRefreshing,
  onRefreshStatus,
  onOpenPaymentPage,
  onViewOrders,
  onGoUserCenter,
}: PaymentPendingOrderProps): ReactElement {
  const { t } = useTranslation();
  const [showQr, setShowQr] = useState(false);

  return (
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
        onClick={onRefreshStatus}
        disabled={creatingOrRefreshing}
      >
        {isRefreshingStatus ? (
          <>
            <span className="payment-btn-spinner" aria-hidden="true" />
            {t('settings.user.payment.refreshingStatus', { defaultValue: '刷新中...' })}
          </>
        ) : t('settings.user.payment.refreshStatus', { defaultValue: '刷新支付状态' })}
      </button>
      {isPendingOrderPaying && pendingOrder.channel === 'WECHAT' ? (
        <>
          <button
            type="button"
            className="settings-user-primary-btn payment-confirm-btn"
            onClick={() => setShowQr((v) => !v)}
            disabled={creatingOrRefreshing}
          >
            <img className="payment-action-icon" src={SvgIcon.WECHATPAY} alt="" aria-hidden="true" />
            {showQr
              ? t('settings.user.payment.hideQrCode', { defaultValue: '收起二维码' })
              : t('settings.user.payment.showQrCode', { defaultValue: '显示二维码' })}
          </button>
          {showQr ? (
            <div className="payment-qr-card">
              <div className="payment-qr-box">
                <QRCodeSVG
                  value={pendingOrder.qrCodeUrl || pendingOrder.payUrl || ''}
                  size={200}
                  level="M"
                  bgColor="#ffffff"
                />
              </div>
              <div className="payment-qr-hint">
                {t('settings.user.payment.scanQrHint', { defaultValue: '请使用微信扫一扫完成支付' })}
              </div>
              <div className="payment-qr-subhint">
                {t('settings.user.payment.scanQrSubhint', { defaultValue: '扫码后请在手机上完成支付，再回到此处刷新状态' })}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      {isPendingOrderPaying && pendingOrder.channel === 'ALIPAY' ? (
        <button
          type="button"
          className="settings-user-primary-btn payment-confirm-btn"
          onClick={onOpenPaymentPage}
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
          onClick={onViewOrders}
          disabled={creatingOrRefreshing}
        >
          {t('settings.user.payment.viewOrders', { defaultValue: '查看订单' })}
        </button>
      ) : null}
      {isPendingOrderSuccess ? (
        <button
          type="button"
          className="settings-user-primary-btn payment-confirm-btn"
          onClick={onGoUserCenter}
        >
          {t('settings.user.payment.goUserCenter', { defaultValue: '前往用户中心' })}
        </button>
      ) : null}
      {isPendingOrderSuccess ? (
        <button
          type="button"
          className="settings-user-secondary-btn payment-refresh-status-btn"
          onClick={onViewOrders}
        >
          {t('settings.user.payment.viewOrders', { defaultValue: '查看订单' })}
        </button>
      ) : null}
    </div>
  );
}
