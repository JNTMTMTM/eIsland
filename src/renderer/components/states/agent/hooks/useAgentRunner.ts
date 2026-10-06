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
 * @file useAgentRunner.ts
 * @description Agent 执行流程编排 Hook。
 * @author 鸡哥
 */

import { useEffect } from 'react';
import useIslandStore from '../../../../store/isLandStore';
import {
  streamMihtnelisAgent,
} from '../../../../api/ai/mihtnelisAgentStream';
import { streamOllamaLocalAgent } from '../../../../api/ai/ollamaLocalAgent';
import { streamCustomDirectAgent } from '../../../../api/ai/customDirectAgent';
import { readLocalToken } from '../../../../utils/userAccount';
import type { AiChatMessage } from '../../../../store/types';
import type { AgentPhase } from '../config/agentContentConfig';
import type { AuthPending } from '../types/AuthPending';
import { INLINE_PROMPT_HINT } from '../config/agentContentConfig';
import {
  resolveAgentRouting,
  resolveAgentContextAndSkills,
  buildCurrentTimestamp,
  buildCurrentLocation,
} from '../utils/agentRunnerPreparation';
import { createAgentStreamEventHandler } from '../utils/agentRunnerEventHandler';

interface UseAgentRunnerOptions {
  agentPrompt: string;
  aiConfig: ReturnType<typeof useIslandStore.getState>['aiConfig'];
  setPhase: React.Dispatch<React.SetStateAction<AgentPhase>>;
  setThinkText: React.Dispatch<React.SetStateAction<string>>;
  setAnswerText: React.Dispatch<React.SetStateAction<string>>;
  setErrorMsg: React.Dispatch<React.SetStateAction<string>>;
  setAuthPending: React.Dispatch<React.SetStateAction<AuthPending | null>>;
  setToolCallInfo: React.Dispatch<React.SetStateAction<{ tool: string; purpose: string } | null>>;
  answerAccRef: React.MutableRefObject<string>;
  thinkAccRef: React.MutableRefObject<string>;
  traceIdRef: React.MutableRefObject<string>;
  tokenRef: React.MutableRefObject<string>;
}

/**
 * @description 执行 Agent 请求并同步流式事件状态。
 * @param options - Agent 执行流程配置。
 */
export function useAgentRunner(options: UseAgentRunnerOptions): void {
  const {
    agentPrompt,
    aiConfig,
    setPhase,
    setThinkText,
    setAnswerText,
    setErrorMsg,
    setAuthPending,
    setToolCallInfo,
    answerAccRef,
    thinkAccRef,
    traceIdRef,
    tokenRef,
  } = options;

  useEffect(() => {
    const token = readLocalToken();
    if (!token || !agentPrompt.trim()) {
      setPhase('error');
      setErrorMsg(!token ? '请先登录' : '没有输入内容');
      return;
    }
    tokenRef.current = token;

    const controller = new AbortController();
    let active = true;

    const run = async (): Promise<void> => {
      setPhase('connecting');
      setThinkText('');
      setAnswerText('');
      setErrorMsg('');
      setAuthPending(null);
      setToolCallInfo(null);
      answerAccRef.current = '';
      thinkAccRef.current = '';
      traceIdRef.current = '';

      try {
        const {
          isOllama,
          useCustomApi,
          selectedModel,
          selectedProvider,
          agentMode,
        } = resolveAgentRouting(aiConfig, token);

        const {
          activeSessionId,
          context,
          resolvedSkills,
        } = await resolveAgentContextAndSkills(aiConfig);

        const message = `${INLINE_PROMPT_HINT}\n\n${agentPrompt.trim()}`;

        const handleEvent = createAgentStreamEventHandler({
          isActive: () => active,
          isOllama,
          token,
          workspaces: aiConfig.workspaces,
          setPhase,
          setThinkText,
          setAnswerText,
          setErrorMsg,
          setAuthPending,
          setToolCallInfo,
          answerAccRef,
          thinkAccRef,
          traceIdRef,
        });

        if (isOllama) {
          const ollamaModelName = aiConfig.ollamaModel || 'qwen3:8b';
          const ollamaTemperature = aiConfig.deepseekReasoningEffort === 'low' ? 0.3 : aiConfig.deepseekReasoningEffort === 'high' ? 1.0 : 0.6;
          await streamOllamaLocalAgent({
            token: token || '',
            message,
            model: ollamaModelName,
            agentMode,
            context: context || undefined,
            workspaces: aiConfig.workspaces,
            skills: resolvedSkills,
            baseUrl: aiConfig.ollamaBaseUrl || undefined,
            temperature: ollamaTemperature,
            signal: controller.signal,
            onEvent: handleEvent,
          });
        } else if (useCustomApi && aiConfig.customApiMode === 'direct') {
          const directModelName = aiConfig.customApiModel?.trim() || 'gpt-4o-mini';
          const directTemperature = aiConfig.deepseekReasoningEffort === 'low' ? 0.3 : aiConfig.deepseekReasoningEffort === 'high' ? 1.0 : 0.6;
          await streamCustomDirectAgent({
            token: token || '',
            message,
            model: directModelName,
            agentMode,
            context: context || undefined,
            workspaces: aiConfig.workspaces,
            skills: resolvedSkills,
            snapshotMode: true,
            baseUrl: aiConfig.endpoint,
            apiKey: aiConfig.apiKey,
            temperature: directTemperature,
            signal: controller.signal,
            onEvent: handleEvent,
          });
        } else if (useCustomApi) {
          const customModelName = aiConfig.customApiModel?.trim() || 'gpt-4o-mini';
          await streamMihtnelisAgent({
            token,
            sessionId: activeSessionId || 'island-agent-inline',
            message,
            provider: 'custom',
            model: customModelName,
            agentMode,
            context: context || undefined,
            workspaces: aiConfig.workspaces,
            skills: resolvedSkills,
            snapshotMode: true,
            thinking: aiConfig.deepseekThinking,
            reasoningEffort: aiConfig.deepseekReasoningEffort,
            timestamp: buildCurrentTimestamp(),
            location: buildCurrentLocation(),
            customApiKey: aiConfig.apiKey,
            customEndpoint: aiConfig.endpoint,
            signal: controller.signal,
            onEvent: handleEvent,
          });
        } else {
          await streamMihtnelisAgent({
            token,
            sessionId: activeSessionId || 'island-agent-inline',
            message,
            provider: selectedProvider,
            model: selectedModel,
            agentMode,
            context: context || undefined,
            workspaces: aiConfig.workspaces,
            skills: resolvedSkills,
            snapshotMode: true,
            thinking: aiConfig.deepseekThinking,
            reasoningEffort: aiConfig.deepseekReasoningEffort,
            timestamp: buildCurrentTimestamp(),
            location: buildCurrentLocation(),
            signal: controller.signal,
            onEvent: handleEvent,
          });
        }

        if (active) {
          setPhase((prev) => (prev === 'error' ? prev : 'done'));
          const finalAnswer = answerAccRef.current.trim();
          if (finalAnswer) {
            const store = useIslandStore.getState();
            const sid = store.activeAiChatSessionId;
            const session = store.aiChatSessions.find((s) => s.id === sid);
            const prev = session?.messages ?? [];
            const userMsg: AiChatMessage = { role: 'user', content: agentPrompt.trim() };
            const assistantMsg: AiChatMessage = {
              role: 'assistant',
              content: finalAnswer,
              model: selectedModel,
              finalized: true,
              traceId: traceIdRef.current || undefined,
              ...(thinkAccRef.current ? { thinkBlocks: [thinkAccRef.current] } : {}),
            };
            store.setAiChatSessionMessages(sid, [...prev, userMsg, assistantMsg]);
          }
        }
      } catch (err: unknown) {
        if (!active) return;
        if (controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : '请求失败';
        setPhase('error');
        setErrorMsg(msg);
      }
    };

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    agentPrompt,
    aiConfig.apiKey,
    aiConfig.customApiMode,
    aiConfig.customApiModel,
    aiConfig.deepseekReasoningEffort,
    aiConfig.deepseekThinking,
    aiConfig.endpoint,
    aiConfig.model,
    aiConfig.ollamaBaseUrl,
    aiConfig.ollamaModel,
    aiConfig.skills,
    aiConfig.workspaces,
    answerAccRef,
    setAnswerText,
    setAuthPending,
    setErrorMsg,
    setPhase,
    setThinkText,
    setToolCallInfo,
    thinkAccRef,
    tokenRef,
    traceIdRef,
  ]);
}
