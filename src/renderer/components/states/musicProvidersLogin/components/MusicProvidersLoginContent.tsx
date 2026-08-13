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
 * @file MusicProvidersLoginContent.tsx
 * @description 音乐提供商扫码登录状态内容组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../store/slices';
import { MUSIC_PROVIDER_LOGIN_CONFIGS } from '../config/providerConfig';
import { useMusicProviderQrLogin } from '../hooks/useMusicProviderQrLogin';
import '../../../../styles/auth/auth.css';

/** 渲染音乐提供商扫码登录界面 */
export function MusicProvidersLoginContent(): ReactElement {
  const { t } = useTranslation();
  const { musicProviderLogin, returnFromAuth } = useIslandStore();
  const provider = MUSIC_PROVIDER_LOGIN_CONFIGS[musicProviderLogin] ?? MUSIC_PROVIDER_LOGIN_CONFIGS.qishui;
  const { authState, qrContent, loading, error, refresh, logout } = useMusicProviderQrLogin(provider.id);
  const confirmed = authState === 'confirmed';
  const statusKey = `settings.musicProviderLogin.status.${authState}`;

  return (
    <div className="auth-state-content" onClick={(event) => event.stopPropagation()}>
      <div className="auth-panel music-provider-login-panel settings-scrollbar-thin">
        <div className="auth-panel-title music-provider-login-title">
          <img className="music-provider-login-icon-img no-filter" src={provider.icon} alt="" />
          <span>{t(provider.nameKey)}</span>
          <span className={`music-provider-login-badge ${confirmed ? 'connected' : ''}`}>
            {t(confirmed ? 'settings.musicProviderLogin.connected' : 'settings.musicProviderLogin.notConnected')}
          </span>
        </div>
        <div className="auth-panel-subtitle">
          {t(confirmed ? 'settings.musicProviderLogin.successTitle' : provider.instructionKey)}
        </div>

        <div className="music-provider-login-body">
          <div className={`music-provider-login-qr ${confirmed ? 'confirmed' : ''}`}>
            {qrContent && !confirmed ? (
              <QRCodeSVG
                value={qrContent}
                size={196}
                level="M"
                marginSize={2}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            ) : (
              <div className="music-provider-login-placeholder">
                {loading ? t('settings.musicProviderLogin.loading') : t(confirmed ? 'settings.musicProviderLogin.success' : 'settings.musicProviderLogin.qrUnavailable')}
              </div>
            )}
          </div>

          <div className="music-provider-login-details">
            <p className={`music-provider-login-status ${authState}`}>
              {error || t(statusKey)}
            </p>
            {!confirmed && (
              <ol className="music-provider-login-steps">
                <li>{t('settings.musicProviderLogin.steps.openDouyin')}</li>
                <li>{t('settings.musicProviderLogin.steps.scan')}</li>
                <li>{t('settings.musicProviderLogin.steps.confirm')}</li>
              </ol>
            )}
          </div>
        </div>

        <div className="auth-panel-actions">
          {!confirmed && (
            <button className="settings-user-primary-btn" type="button" disabled={loading} onClick={() => { void refresh(); }}>
              {t('settings.musicProviderLogin.actions.refresh')}
            </button>
          )}
          {confirmed && (
            <button className="settings-user-secondary-btn" type="button" disabled={loading} onClick={() => { void logout(); }}>
              {t('settings.musicProviderLogin.actions.logout')}
            </button>
          )}
          <button className={confirmed ? 'settings-user-primary-btn' : 'settings-user-secondary-btn'} type="button" onClick={returnFromAuth}>
            {t(confirmed ? 'settings.musicProviderLogin.actions.done' : 'settings.musicProviderLogin.actions.back')}
          </button>
        </div>
      </div>
    </div>
  );
}