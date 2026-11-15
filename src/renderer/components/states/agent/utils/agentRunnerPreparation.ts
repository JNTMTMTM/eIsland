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
 * @file agentRunnerPreparation.ts
 * @description Agent 运行前路由与上下文准备工具。
 * @author 鸡哥
 */

import useIslandStore from '../../../../store/isLandStore';
import { getRoleFromToken } from '../../../../utils/userAccount';
import { loadLocationFromStorage } from '../../../../store/utils/storage';
import { buildMihtnelisContext } from '../../../states/maxExpand/components/agent/utils/chatUtils';
import { loadAgentMode } from './agentMode';

type AiConfig = ReturnType<typeof useIslandStore.getState>['aiConfig'];

interface AgentRouting {
  isOllama: boolean;
  useCustomApi: boolean;
  selectedModel: string;
  selectedProvider: 'ollama' | 'custom' | 'deepseek';
  agentMode: string;
}

interface AgentContextAndSkills {
  activeSessionId: string;
  context: string;
  resolvedSkills: Array<{ name: string; content: string }> | undefined;
}

const AVAILABLE_MODELS = ['deepseek-v4-flash', 'deepseek-v4-pro'];

/**
 * @description 解析 Agent 运行路由配置。
 * @param aiConfig - 当前 AI 配置。
 * @param token - 当前登录令牌。
 * @returns Agent 路由解析结果。
 */
export function resolveAgentRouting(aiConfig: AiConfig, token: string): AgentRouting {
  const isOllama = aiConfig.model === 'ollama';
  const isCustomApi = aiConfig.model === 'custom-api';
  const userRole = getRoleFromToken(token);
  const isProUser = userRole === 'pro' || userRole === 'admin';
  const useCustomApi = isCustomApi && isProUser && Boolean(aiConfig.apiKey?.trim() && aiConfig.endpoint?.trim());
  const selectedModelBase = isOllama
    ? 'ollama'
    : useCustomApi
      ? (aiConfig.customApiModel?.trim() || 'gpt-4o-mini')
      : (AVAILABLE_MODELS.includes(aiConfig.model) ? aiConfig.model : 'deepseek-v4-flash');

  const selectedModel = (!isProUser && selectedModelBase === 'deepseek-v4-pro')
    ? 'deepseek-v4-flash'
    : selectedModelBase;

  const selectedProvider: AgentRouting['selectedProvider'] = isOllama
    ? 'ollama'
    : useCustomApi
      ? 'custom'
      : 'deepseek';

  return {
    isOllama,
    useCustomApi,
    selectedModel,
    selectedProvider,
    agentMode: loadAgentMode(),
  };
}

/**
 * @description 构建 Agent 上下文与可用技能列表。
 */
export async function resolveAgentContextAndSkills(aiConfig: AiConfig): Promise<AgentContextAndSkills> {
  const state = useIslandStore.getState();
  const activeSessionId = state.activeAiChatSessionId || 'island-agent-inline';
  const activeSession = state.aiChatSessions.find((s) => s.id === state.activeAiChatSessionId);
  const sessionMessages = activeSession?.messages ?? [];
  const context = buildMihtnelisContext(sessionMessages);

  const enabledSkills = Array.isArray(aiConfig.skills) ? aiConfig.skills.filter((s) => s.enabled && s.filePath) : [];
  let resolvedSkills: Array<{ name: string; content: string }> | undefined;
  if (enabledSkills.length > 0) {
    const results = await Promise.all(
      enabledSkills.map(async (s) => {
        const content = await window.api.readTextFile(s.filePath);
        return content ? { name: s.name, content } : null;
      }),
    );
    const valid = results.filter((r): r is { name: string; content: string } => r !== null && r.content.trim().length > 0);
    if (valid.length > 0) resolvedSkills = valid;
  }

  return {
    activeSessionId,
    context,
    resolvedSkills,
  };
}

/**
 * @description 生成带时区偏移的当前时间戳。
 */
export function buildCurrentTimestamp(): string {
  const d = new Date();
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const pad = (n: number): string => String(Math.abs(n)).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}

/**
 * @description 从本地位置信息构建位置字符串。
 */
export function buildCurrentLocation(): string | undefined {
  const loc = loadLocationFromStorage();
  if (!loc) return undefined;
  const parts = [loc.city, loc.regionName, loc.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}
