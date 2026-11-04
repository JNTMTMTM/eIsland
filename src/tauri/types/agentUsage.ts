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
 * @file agentUsage.ts
 * @description 本机 AI 编码 Agent（Claude Code / Codex）用量统计类型定义
 * @author 鸡哥
 */

/** 用量统计来源 */
export type AgentUsageProviderId = 'claude' | 'codex';

/** token 用量；input 不含缓存命中部分，total 为四项之和 */
export interface AgentUsageTokens {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
}

/** 单个额度窗口；resetsAt 为毫秒时间戳 */
export interface AgentUsageRateLimitWindow {
  usedPercent: number;
  windowMinutes: number | null;
  resetsAt: number | null;
}

/** 日志中最近一次上报的额度；仅 Codex 本地日志提供 */
export interface AgentUsageRateLimits {
  primary: AgentUsageRateLimitWindow | null;
  secondary: AgentUsageRateLimitWindow | null;
  planType: string | null;
  updatedAt: number;
}

/** 单个来源的用量汇总 */
export interface AgentUsageProviderSnapshot {
  provider: AgentUsageProviderId;
  /** 本机是否存在该来源的日志目录 */
  available: boolean;
  today: AgentUsageTokens;
  /** 含今天在内的最近 7 个自然日 */
  week: AgentUsageTokens;
  todaySessions: number;
  /** 最近 7 天 token 用量最多的模型 */
  topModel: string | null;
  rateLimits: AgentUsageRateLimits | null;
}

/** Agent 用量快照 */
export interface AgentUsageSnapshot {
  generatedAt: number;
  providers: AgentUsageProviderSnapshot[];
}
