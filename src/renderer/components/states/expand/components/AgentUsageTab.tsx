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

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AGENT_USAGE_PROVIDER_ICONS,
  effectivePercent,
  formatTokens,
  quotaLevel,
  resetLabel,
  windowLabel,
  type Translate,
} from '../utils/agentUsageFormat';
import type React from 'react';
import type {
  AgentUsageProviderId,
  AgentUsageProviderSnapshot,
  AgentUsageRateLimitWindow,
  AgentUsageSnapshot,
} from '../../../../../preload/types/agentUsage';

const REFRESH_INTERVAL_MS = 60_000;
const START_FETCH_DELAY_MS = 200;
let cachedAgentUsageSnapshot: AgentUsageSnapshot | null = null;

function QuotaBar({ window, now, t }: { window: AgentUsageRateLimitWindow; now: number; t: Translate }): React.ReactElement {
  const percent = effectivePercent(window, now);
  const level = quotaLevel(percent);
  const resetText = resetLabel(window.resetsAt, now, t);
  return (
    <div className="au-quota">
      <span className="au-quota-label">{windowLabel(window.windowMinutes, t)}</span>
      <div className="au-quota-track">
        <div className={`au-quota-fill${level ? ` au-quota-fill--${level}` : ''}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="au-quota-value">{`${Math.round(percent)}%`}</span>
      {resetText && <span className="au-quota-reset">{resetText}</span>}
    </div>
  );
}

function ProviderCard({ provider, now, t }: { provider: AgentUsageProviderSnapshot; now: number; t: Translate }): React.ReactElement {
  const name = t(`expanded.agentUsage.providers.${provider.provider}`);
  if (!provider.available) {
    return (
      <div className={`au-card au-card--${provider.provider} au-card--empty`}>
        <img className="au-card-icon" src={AGENT_USAGE_PROVIDER_ICONS[provider.provider]} alt="" draggable={false} />
        <div className="au-card-head">
          <span className="au-card-dot" aria-hidden="true" />
          <span className="au-card-name">{name}</span>
        </div>
        <span className="au-card-hint">{t('expanded.agentUsage.unavailable', { defaultValue: '未检测到本地日志' })}</span>
      </div>
    );
  }
  const windows = [provider.rateLimits?.primary, provider.rateLimits?.secondary].filter((item): item is AgentUsageRateLimitWindow => Boolean(item));
  const breakdown = [
    { key: 'input', value: provider.today.input },
    { key: 'output', value: provider.today.output },
    { key: 'cacheRead', value: provider.today.cacheRead },
    { key: 'cacheWrite', value: provider.today.cacheWrite },
  ];
  return (
    <div className={`au-card au-card--${provider.provider}`}>
      <img className="au-card-icon" src={AGENT_USAGE_PROVIDER_ICONS[provider.provider]} alt="" draggable={false} />
      <div className="au-card-head">
        <span className="au-card-dot" aria-hidden="true" />
        <span className="au-card-name">{name}</span>
        {provider.topModel && <span className="au-card-model">{provider.topModel}</span>}
        {provider.rateLimits?.planType && <span className="au-card-plan">{provider.rateLimits.planType}</span>}
      </div>
      <div className="au-card-summary">
        <span className="au-card-today">{formatTokens(provider.today.total)}</span>
        <span className="au-card-today-label">{t('expanded.agentUsage.todayTokens', { defaultValue: '今日 tokens' })}</span>
        <span className="au-card-meta">
          {t('expanded.agentUsage.week', { defaultValue: '7 天 {{value}}', value: formatTokens(provider.week.total) })}
          {' · '}
          {t('expanded.agentUsage.sessions', { defaultValue: '今日会话 {{count}}', count: provider.todaySessions })}
        </span>
      </div>
      <div className="au-card-breakdown">
        {breakdown.map((item) => (
          <span className="au-card-breakdown-item" key={item.key}>
            <span className="au-card-breakdown-label">{t(`expanded.agentUsage.tokens.${item.key}`)}</span>
            <span className="au-card-breakdown-value">{formatTokens(item.value)}</span>
          </span>
        ))}
      </div>
      <div className="au-card-quota">
        {windows.length > 0
          ? windows.map((window) => <QuotaBar key={`${window.windowMinutes}`} window={window} now={now} t={t} />)
          : (
            <span className="au-card-hint">
              {provider.provider === 'claude'
                ? t('expanded.agentUsage.noQuotaInLogs', { defaultValue: '本地日志不含额度信息' })
                : t('expanded.agentUsage.noQuotaData', { defaultValue: '暂无额度数据' })}
            </span>
          )}
      </div>
    </div>
  );
}

const SKELETON_PROVIDERS: AgentUsageProviderId[] = ['claude', 'codex'];

/**
 * 渲染单个来源的加载骨架卡片。
 * @description 沿用真实卡片的四行布局，数据到达后切换不会产生位移。
 * @param props - 组件参数
 * @param props.provider - 来源标识，用于保留来源色点
 * @returns 骨架卡片
 */
function ProviderSkeleton({ provider }: { provider: AgentUsageProviderId }): React.ReactElement {
  return (
    <div className={`au-card au-card--${provider} au-card-skeleton`} aria-hidden="true">
      <img className="au-card-icon" src={AGENT_USAGE_PROVIDER_ICONS[provider]} alt="" draggable={false} />
      <div className="au-card-head">
        <span className="au-card-dot" />
        <span className="au-skeleton-block au-skeleton-name" />
        <span className="au-skeleton-block au-skeleton-model" />
      </div>
      <div className="au-card-summary">
        <span className="au-skeleton-block au-skeleton-today" />
        <span className="au-skeleton-block au-skeleton-meta" />
      </div>
      <div className="au-card-breakdown">
        {[0, 1, 2, 3].map((index) => <span key={index} className="au-skeleton-block au-skeleton-cell" />)}
      </div>
      <div className="au-card-quota">
        <span className="au-skeleton-block au-skeleton-bar" />
      </div>
    </div>
  );
}

/**
 * Agent 用量 Tab
 * @description 展开时读取本地日志汇总，标签页可见期间每分钟刷新一次
 * @returns Agent 用量面板
 */
export function AgentUsageTab(): React.ReactElement {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<AgentUsageSnapshot | null>(() => cachedAgentUsageSnapshot);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (isCancelled: () => boolean = () => false): Promise<void> => {
    setLoading(true);
    try {
      const data = await window.api.agentUsageSnapshotGet();
      if (isCancelled()) return;
      cachedAgentUsageSnapshot = data;
      setSnapshot(data);
      setFailed(false);
    } catch {
      if (!isCancelled()) setFailed(true);
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback((): void => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- 读取异常已在 load 内处理。
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    let intervalTimer: number | undefined;
    const isCancelled = (): boolean => cancelled;
    const poll = (): void => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- 读取异常已在 load 内处理。
      void load(isCancelled);
    };
    const startPolling = (): void => {
      if (cancelled || intervalTimer !== undefined) return;
      poll();
      intervalTimer = window.setInterval(poll, REFRESH_INTERVAL_MS);
    };
    const stopPolling = (): void => {
      if (intervalTimer === undefined) return;
      window.clearInterval(intervalTimer);
      intervalTimer = undefined;
    };
    const handleVisibilityChange = (): void => {
      if (document.hidden) stopPolling();
      else startPolling();
    };
    // 延后首次扫描，避免与展开动画争抢主进程。
    const delayTimer = window.setTimeout(() => {
      if (!document.hidden) startPolling();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }, START_FETCH_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(delayTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
    };
  }, [load]);

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
