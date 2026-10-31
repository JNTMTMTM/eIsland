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
 * @file ProviderCard.tsx
 * @description Expanded Agent 用量页单个来源卡片：今日 token、明细、会话数与额度窗口。
 * @author 鸡哥
 */

import { AGENT_USAGE_PROVIDER_ICONS } from '../config/agentUsageConfig';
import { formatTokens } from '../utils/agentUsageUtils';
import { QuotaBar } from './QuotaBar';
import type { ReactElement } from 'react';
import type { AgentUsageRateLimitWindow } from '../../../../../../../preload/types/agentUsage';
import type { ProviderCardProps } from '../types/agentUsageTypes';

/**
 * 渲染来源卡片，日志目录缺失时只显示未检测提示。
 * @param props - 组件参数
 * @param props.provider - 来源快照
 * @param props.now - 快照生成时间
 * @param props.t - 翻译函数
 * @returns 来源卡片
 */
export function ProviderCard({ provider, now, t }: ProviderCardProps): ReactElement {
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
          ? windows.map((quota) => <QuotaBar key={`${quota.windowMinutes}`} quota={quota} now={now} t={t} />)
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
