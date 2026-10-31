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
 * @file AgentUsageTab.tsx
 * @description Expanded Agent 用量 Tab，展示本机 Claude Code 与 Codex 日志中的 token 用量及 Codex 额度
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { SKELETON_PROVIDERS } from '../config/agentUsageConfig';
import { useAgentUsageTab } from '../hooks/useAgentUsageTab';
import { ProviderCard } from './ProviderCard';
import { ProviderSkeleton } from './ProviderSkeleton';
import type { ReactElement } from 'react';

/**
 * Agent 用量 Tab
 * @description 展开时读取本地日志汇总，标签页可见期间每分钟刷新一次
 * @returns Agent 用量面板
 */
export function AgentUsageTab(): ReactElement {
  const { t } = useTranslation();
  const { snapshot, failed, loading, handleRefresh } = useAgentUsageTab();

  if (!snapshot && failed) {
    return (
      <div className="expand-tab-panel au-tab-panel">
        <div className="au-status">
          <span>{t('expanded.agentUsage.error', { defaultValue: '读取本地日志失败' })}</span>
          <button className="au-refresh-btn" type="button" onClick={handleRefresh}>
            {t('expanded.agentUsage.refresh', { defaultValue: '刷新' })}
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="expand-tab-panel au-tab-panel">
        <div className="au-panel-wrap" role="status" aria-busy="true" aria-label={t('expanded.agentUsage.loading', { defaultValue: '正在读取本地日志...' })}>
          <div className="au-head">
            <div className="au-title-group">
              <span className="au-title">{t('expanded.agentUsage.title', { defaultValue: 'Agent 用量' })}</span>
              <span className="au-subtitle">{t('expanded.agentUsage.subtitle', { defaultValue: '读取本机 Claude Code 与 Codex 日志' })}</span>
            </div>
            <span className="au-skeleton-block au-skeleton-action" />
          </div>
          <div className="au-cards">
            {SKELETON_PROVIDERS.map((provider) => <ProviderSkeleton key={provider} provider={provider} />)}
          </div>
        </div>
      </div>
    );
  }

  const updatedAt = new Date(snapshot.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="expand-tab-panel au-tab-panel">
      <div className="au-panel-wrap">
        <div className="au-head">
          <div className="au-title-group">
            <span className="au-title">{t('expanded.agentUsage.title', { defaultValue: 'Agent 用量' })}</span>
            <span className="au-subtitle">{t('expanded.agentUsage.subtitle', { defaultValue: '读取本机 Claude Code 与 Codex 日志' })}</span>
          </div>
          <div className="au-head-actions">
            <span className="au-updated">
              {failed
                ? t('expanded.agentUsage.error', { defaultValue: '读取本地日志失败' })
                : t('expanded.agentUsage.updatedAt', { defaultValue: '更新于 {{time}}', time: updatedAt })}
            </span>
            <button className="au-refresh-btn" type="button" disabled={loading} onClick={handleRefresh}>
              {loading
                ? t('expanded.agentUsage.refreshing', { defaultValue: '刷新中' })
                : t('expanded.agentUsage.refresh', { defaultValue: '刷新' })}
            </button>
          </div>
        </div>
        <div className="au-cards">
          {snapshot.providers.map((provider) => (
            <ProviderCard key={provider.provider} provider={provider} now={snapshot.generatedAt} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
