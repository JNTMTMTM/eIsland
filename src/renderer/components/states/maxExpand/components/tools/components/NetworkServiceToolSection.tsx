/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows,
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
 * @file NetworkServiceToolSection.tsx
 * @description 工具箱网络服务模块（IP 信息查询）
 * @author 鸡哥
 */

import { useCallback, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

interface IpInfoData {
  ip?: string;
  region?: string;
  isp?: string;
  llc?: string;
  asn?: string;
  latitude?: number;
  longitude?: number;
  beginip?: string;
  endip?: string;
  [key: string]: unknown;
}

interface IpInfoResponse {
  code?: number;
  msg?: string;
  message?: string;
  data?: IpInfoData;
  ip?: string;
  [key: string]: unknown;
}

const IPINFO_ENDPOINT = 'https://uapis.cn/api/v1/network/ipinfo';

/**
 * 网络服务模块主视图。
 */
export function NetworkServiceToolSection(): ReactElement {
  const { t } = useTranslation();
  const [ipInput, setIpInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<IpInfoData | null>(null);

  const handleQueryIpInfo = useCallback(async (): Promise<void> => {
    if (loading) return;
    setLoading(true);
    setErrorMessage('');

    try {
      const trimmedIp = ipInput.trim();
      if (!trimmedIp) {
        setErrorMessage(t('maxExpand.toolbox.networkService.ipinfo.emptyIp'));
        setLoading(false);
        return;
      }
      const url = `${IPINFO_ENDPOINT}?ip=${encodeURIComponent(trimmedIp)}`;
      const response = await window.api.netFetch(url, {
        method: 'GET',
        timeoutMs: 10000,
      });

      if (!response.ok) {
        setResult(null);
        setErrorMessage(t('maxExpand.toolbox.networkService.ipinfo.httpError', { status: response.status }));
        return;
      }

      if (response.body.trimStart().startsWith('<')) {
        setResult(null);
        setErrorMessage(t('maxExpand.toolbox.networkService.ipinfo.nonJson'));
        return;
      }

      const parsed = JSON.parse(response.body) as IpInfoResponse;

      let info: IpInfoData | null = null;
      if (parsed.data && typeof parsed.data === 'object') {
        if (typeof parsed.code === 'number' && parsed.code !== 200) {
          setResult(null);
          setErrorMessage(parsed.msg || parsed.message || t('maxExpand.toolbox.networkService.ipinfo.failed'));
          return;
        }
        info = parsed.data;
      } else if (parsed.ip) {
        info = parsed as unknown as IpInfoData;
      }

      if (!info || !info.ip) {
        setResult(null);
        setErrorMessage(t('maxExpand.toolbox.networkService.ipinfo.failed'));
        return;
      }

      setResult(info);
    } catch {
      setResult(null);
      setErrorMessage(t('maxExpand.toolbox.networkService.ipinfo.failed'));
    } finally {
      setLoading(false);
    }
  }, [loading, ipInput, t]);

  return (
    <div className="settings-cards">
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">{t('maxExpand.toolbox.networkService.title')}</div>
          <div className="settings-card-subtitle">{t('maxExpand.toolbox.networkService.subtitle')}</div>
        </div>
        <div className="settings-card-body">
          <div className="ipinfo-input-row">
            <input
              type="text"
              className="ipinfo-input"
              placeholder={t('maxExpand.toolbox.networkService.ipinfo.ipPlaceholder')}
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleQueryIpInfo(); }}
            />
            <button
              className={`ipinfo-btn ipinfo-btn-query ${loading ? 'disabled' : ''}`}
              type="button"
              disabled={loading}
              onClick={handleQueryIpInfo}
            >
              {loading
                ? t('maxExpand.toolbox.networkService.ipinfo.querying')
                : t('maxExpand.toolbox.networkService.ipinfo.queryBtn')}
            </button>
          </div>

          {errorMessage && <div className="ipinfo-error">{errorMessage}</div>}

          {result && (
            <div className="ipinfo-result-card">
              <div className="ipinfo-result-header">
                <span className="ipinfo-result-ip">{String(result.ip)}</span>
                <span className="ipinfo-result-badge">{String(result.asn || '-')}</span>
              </div>
              <div className="ipinfo-result-grid">
                <div className="ipinfo-result-item">
                  <span className="ipinfo-result-label">{t('maxExpand.toolbox.networkService.ipinfo.region')}</span>
                  <span className="ipinfo-result-value">{String(result.region || '-')}</span>
                </div>
                <div className="ipinfo-result-item">
                  <span className="ipinfo-result-label">ISP</span>
                  <span className="ipinfo-result-value">{String(result.isp || '-')}</span>
                </div>
                <div className="ipinfo-result-item">
                  <span className="ipinfo-result-label">{t('maxExpand.toolbox.networkService.ipinfo.llc')}</span>
                  <span className="ipinfo-result-value">{String(result.llc || '-')}</span>
                </div>
                <div className="ipinfo-result-item">
                  <span className="ipinfo-result-label">{t('maxExpand.toolbox.networkService.ipinfo.ipRange')}</span>
                  <span className="ipinfo-result-value">{String(result.beginip || '-')} ~ {String(result.endip || '-')}</span>
                </div>
                <div className="ipinfo-result-item">
                  <span className="ipinfo-result-label">{t('maxExpand.toolbox.networkService.ipinfo.latitude')}</span>
                  <span className="ipinfo-result-value">{result.latitude !== undefined ? String(result.latitude) : '-'}</span>
                </div>
                <div className="ipinfo-result-item">
                  <span className="ipinfo-result-label">{t('maxExpand.toolbox.networkService.ipinfo.longitude')}</span>
                  <span className="ipinfo-result-value">{result.longitude !== undefined ? String(result.longitude) : '-'}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
