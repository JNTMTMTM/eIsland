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
    <div className="auth-state-content music-provider-login-state">
      <section className="music-provider-login-panel">
        <header className="music-provider-login-header">
          <button
            className="music-provider-login-back"
            type="button"
            onClick={returnFromAuth}
          >
            {t('settings.musicProviderLogin.actions.back')}
          </button>
          <div className="music-provider-login-identity">
            <img className="music-provider-login-icon-img" src={provider.icon} alt="" />
            <div>
              <h1>{t(provider.nameKey)}</h1>
              <p>{t('settings.musicProviderLogin.title')}</p>
            </div>
          </div>
          <span className={`music-provider-login-badge ${confirmed ? 'connected' : ''}`}>
            {t(confirmed ? 'settings.musicProviderLogin.connected' : 'settings.musicProviderLogin.notConnected')}
          </span>
        </header>

        <div className="music-provider-login-body">
          <div className={`music-provider-login-qr ${confirmed ? 'confirmed' : ''}`}>
            {qrContent && !confirmed ? (
              <QRCodeSVG
                value={qrContent}
                size={212}
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
            <h2>{t(confirmed ? 'settings.musicProviderLogin.successTitle' : provider.instructionKey)}</h2>
            <p className={`music-provider-login-status ${authState}`}>
              {error || t(statusKey)}
            </p>
            <ol className="music-provider-login-steps">
              <li>{t('settings.musicProviderLogin.steps.openDouyin')}</li>
              <li>{t('settings.musicProviderLogin.steps.scan')}</li>
              <li>{t('settings.musicProviderLogin.steps.confirm')}</li>
            </ol>
            <div className="music-provider-login-actions">
              {confirmed ? (
                <button className="settings-hotkey-btn" type="button" disabled={loading} onClick={() => { void logout(); }}>
                  {t('settings.musicProviderLogin.actions.logout')}
                </button>
              ) : (
                <button className="settings-hotkey-btn" type="button" disabled={loading} onClick={() => { void refresh(); }}>
                  {t('settings.musicProviderLogin.actions.refresh')}
                </button>
              )}
              <button className="settings-hotkey-btn" type="button" onClick={returnFromAuth}>
                {t('settings.musicProviderLogin.actions.done')}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}