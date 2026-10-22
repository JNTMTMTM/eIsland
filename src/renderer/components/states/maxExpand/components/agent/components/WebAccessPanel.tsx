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
 * @file WebAccessPanel.tsx
 * @description 网页访问授权面板与本地高风险操作授权面板。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { SiteAuthorizationPolicy } from '../../../../../../api/site/siteMetaApi';
import { toPrettyJson } from '../utils/chatUtils';
import type { AiLocalToolAccessPrompt } from '../types/chatTypes';

/** 网页访问授权面板 Props */
interface WebAccessPanelProps {
  iconUrl?: string;
  siteName?: string;
  hostname?: string;
  url: string;
  message: string;
  domainPolicy?: SiteAuthorizationPolicy;
  resolving: boolean;
  resolveError: string;
  onResolve: (allow: boolean) => void;
  onPolicyChange: (policy: SiteAuthorizationPolicy) => void;
}

/** 网页访问授权面板 */
export function WebAccessPanel({
  iconUrl,
  siteName,
  hostname,
  url,
  message,
  domainPolicy,
  resolving,
  resolveError,
  onResolve,
  onPolicyChange,
}: WebAccessPanelProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="max-expand-chat-web-access-panel">
      <div className="max-expand-chat-web-access-card">
        <div className="max-expand-chat-web-access-scroll">
          <div className="max-expand-chat-web-access-site">
            {iconUrl ? (
              <img
                className="max-expand-chat-web-access-site-icon"
                src={iconUrl}
                alt=""
                loading="lazy"
              />
            ) : (
              <div className="max-expand-chat-web-access-site-fallback">
                {(siteName || hostname || '?').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="max-expand-chat-web-access-site-meta">
              <div className="max-expand-chat-web-access-site-name">
                {siteName || hostname || url}
              </div>
              {hostname && (
                <div className="max-expand-chat-web-access-site-host">{hostname}</div>
              )}
            </div>
          </div>
          <div className="max-expand-chat-web-access-title">
            {t('aiChat.webAccess.title', { defaultValue: '网页访问授权' })}
          </div>
          <div className="max-expand-chat-web-access-desc">
            {message || t('aiChat.webAccess.requestHint', { defaultValue: 'Agent 需要访问以下 URL，是否允许？' })}
          </div>
          <div className="max-expand-chat-web-access-url">{url}</div>
        </div>
        <div className="max-expand-chat-web-access-actions">
          <button
            type="button"
            className="max-expand-chat-web-access-btn deny"
            onClick={() => { onResolve(false); }}
            disabled={resolving}
          >
            {t('aiChat.webAccess.deny', { defaultValue: '拒绝访问' })}
          </button>
          <button
            type="button"
            className="max-expand-chat-web-access-btn allow"
            onClick={() => { onResolve(true); }}
            disabled={resolving}
          >
            {t('aiChat.webAccess.allow', { defaultValue: '允许访问' })}
          </button>
          <select
            className="max-expand-chat-web-access-policy-select"
            value={domainPolicy || 'ask'}
            onChange={(event) => {
              onPolicyChange(event.target.value as SiteAuthorizationPolicy);
            }}
            disabled={resolving}
            title={t('aiChat.webAccess.policyLabel', { defaultValue: '此域名授权策略' })}
            aria-label={t('aiChat.webAccess.policyLabel', { defaultValue: '此域名授权策略' })}
          >
            <option value="ask">
              {t('aiChat.webAccess.policy.ask', { defaultValue: '每次都询问' })}
            </option>
            <option value="allow">
              {t('aiChat.webAccess.policy.allow', { defaultValue: '始终批准' })}
            </option>
            <option value="deny">
              {t('aiChat.webAccess.policy.deny', { defaultValue: '始终禁止' })}
            </option>
          </select>
        </div>
        {resolveError && (
          <div className="max-expand-chat-web-access-error">{resolveError}</div>
        )}
      </div>
    </div>
  );
}

/** 本地工具访问授权面板 Props */
interface LocalToolAccessPanelProps {
  prompt: AiLocalToolAccessPrompt;
  resolving: boolean;
  resolveError: string;
  onResolve: (allow: boolean) => void;
}

/** 本地高风险操作授权面板 */
export function LocalToolAccessPanel({
  prompt,
  resolving,
  resolveError,
  onResolve,
}: LocalToolAccessPanelProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="max-expand-chat-web-access-panel max-expand-chat-local-tool-access-panel">
      <div className="max-expand-chat-web-access-card max-expand-chat-local-tool-access-card">
        <div className="max-expand-chat-local-tool-access-scroll">
          <div className="max-expand-chat-web-access-title">
            {t('aiChat.localToolAccess.title', { defaultValue: '本地高风险操作授权' })}
          </div>
          <div className="max-expand-chat-web-access-desc">
            {prompt.message || t('aiChat.localToolAccess.requestHint', { defaultValue: 'Agent 请求执行以下本地操作，是否允许？' })}
          </div>
          <div className="max-expand-chat-local-tool-meta">
            <div className="max-expand-chat-local-tool-meta-item">
              <div className="max-expand-chat-local-tool-meta-head">
                <span className="max-expand-chat-local-tool-meta-label">
                  {t('aiChat.localToolAccess.toolLabel', { defaultValue: '操作' })}
                </span>
                <span className="max-expand-chat-local-tool-meta-shot">
                  {t('aiChat.localToolAccess.screenshotTag', { defaultValue: '截图' })}
                </span>
              </div>
              <span className="max-expand-chat-local-tool-meta-value">{prompt.tool}</span>
            </div>
            <div className="max-expand-chat-local-tool-meta-item">
              <div className="max-expand-chat-local-tool-meta-head">
                <span className="max-expand-chat-local-tool-meta-label">
                  {t('aiChat.localToolAccess.riskLabel', { defaultValue: '风险等级' })}
                </span>
                <span className="max-expand-chat-local-tool-meta-shot">
                  {t('aiChat.localToolAccess.screenshotTag', { defaultValue: '截图' })}
                </span>
              </div>
              <span className="max-expand-chat-local-tool-meta-value">
                {(prompt.riskLevel || t('aiChat.localToolAccess.riskLevel.high', { defaultValue: 'high' })).toUpperCase()}
              </span>
            </div>
            <div className="max-expand-chat-local-tool-meta-item">
              <div className="max-expand-chat-local-tool-meta-head">
                <span className="max-expand-chat-local-tool-meta-label">
                  {t('aiChat.localToolAccess.purposeTitle', { defaultValue: '调用用途' })}
                </span>
                <span className="max-expand-chat-local-tool-meta-shot">
                  {t('aiChat.localToolAccess.screenshotTag', { defaultValue: '截图' })}
                </span>
              </div>
              <span className="max-expand-chat-local-tool-meta-value">
                {prompt.purpose || t('aiChat.localToolAccess.purposeFallback', { defaultValue: '未提供用途说明' })}
              </span>
            </div>
          </div>
          <div className="max-expand-chat-tool-result max-expand-chat-local-tool-arguments-card">
            <div className="max-expand-chat-tool-result-title">{t('aiChat.localToolAccess.argumentsTitle', { defaultValue: '参数' })}</div>
            <pre>{toPrettyJson(prompt.argumentsPayload)}</pre>
          </div>
        </div>
        <div className="max-expand-chat-web-access-actions">
          <button
            type="button"
            className="max-expand-chat-web-access-btn deny"
            onClick={() => { onResolve(false); }}
            disabled={resolving}
          >
            {t('aiChat.localToolAccess.deny', { defaultValue: '拒绝执行' })}
          </button>
          <button
            type="button"
            className="max-expand-chat-web-access-btn allow"
            onClick={() => { onResolve(true); }}
            disabled={resolving}
          >
            {t('aiChat.localToolAccess.allow', { defaultValue: '允许执行' })}
          </button>
        </div>
        {resolveError && (
          <div className="max-expand-chat-web-access-error">{resolveError}</div>
        )}
      </div>
    </div>
  );
}
