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
 * @file AgentContent.tsx
 * @description Agent 状态内容组件 — 流式 AI 响应展示
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import useIslandStore from '../../../store/isLandStore';
import {
  streamMihtnelisAgent,
  resolveMihtnelisWebAccess,
  resolveMihtnelisLocalToolAccess,
  resolveMihtnelisLocalToolResult,
} from '../../../api/ai/mihtnelisAgentStream';
import type { MihtnelisAgentStreamEvent } from '../../../api/ai/mihtnelisAgentStream';
import { readLocalToken } from '../../../utils/userAccount';
import { loadLocationFromStorage } from '../../../store/utils/storage';
import { buildMihtnelisContext } from '../../states/maxExpand/components/agent/utils/chatUtils';
import type { AiChatMessage } from '../../../store/types';
import '../../../styles/agent/agent.css';

type AgentPhase = 'connecting' | 'thinking' | 'toolCalling' | 'answering' | 'done' | 'error';

const PHASE_IMAGE: Record<AgentPhase, string> = {
  connecting: 'image/AGENT_DEFAULT.png',
  thinking: 'image/AGENT_THINKING.png',
  toolCalling: 'image/AGENT_TOOL_CALLING.png',
  answering: 'image/AGENT_FINAL_ANSWER.png',
  done: 'image/AGENT_FINAL_ANSWER.png',
  error: 'image/AGENT_CONFUSE.png',
};

const PHASE_LABEL: Record<AgentPhase, string> = {
  connecting: '正在连接…',
  thinking: '正在思考…',
  toolCalling: '正在调用工具…',
  answering: '正在回答…',
  done: '回答完成',
  error: '出错了',
};

const AGENT_MODE_STORAGE_KEY = 'eIsland_agentMode';
const VALID_AGENT_MODES = new Set(['mihtnelis', 'r1pxc', 'edoc']);
function loadAgentMode(): string {
  try {
    const raw = localStorage.getItem(AGENT_MODE_STORAGE_KEY);
    if (raw && VALID_AGENT_MODES.has(raw)) return raw;
  } catch { /* ignore */ }
  return 'mihtnelis';
}

const INLINE_PROMPT_HINT = '[快问快答模式] 请用简洁精炼的语言回答，输出不超过3句话，避免冗长解释和列表。直接给出核心结论。';

const CLIENT_LOCAL_TOOL_PREFIXES = [
  'file.', 'cmd.', 'sys.', 'win.', 'clipboard.', 'notification.', 'net.',
  'monitor.', 'volume.', 'brightness.', 'display.', 'power.', 'wifi.',
  'registry.', 'service.', 'schedule.', 'firewall.', 'defender.', 'island.',
] as const;
const CLIENT_LOCAL_TOOL_EXACT_NAMES = new Set(['web.search']);
const HIGH_RISK_LOCAL_TOOL_PREFIXES = [
  'file.delete', 'file.rename', 'file.trash', 'cmd.exec', 'cmd.powershell',
  'win.close', 'win.minimize', 'win.maximize', 'win.restore', 'power.',
  'registry.write', 'registry.delete', 'service.start', 'service.stop',
  'service.restart', 'schedule.task.create', 'net.proxy', 'net.hosts',
  'defender.scan', 'island.settings.write', 'island.theme.set',
  'island.opacity.set', 'island.restart',
] as const;
function isClientLocalToolName(tool: string): boolean {
  const n = tool.trim().toLowerCase();
  return CLIENT_LOCAL_TOOL_EXACT_NAMES.has(n) || CLIENT_LOCAL_TOOL_PREFIXES.some((p) => n.startsWith(p));
}
function isHighRiskLocalToolName(tool: string): boolean {
  const n = tool.trim().toLowerCase();
  return HIGH_RISK_LOCAL_TOOL_PREFIXES.some((p) => n.startsWith(p));
}

interface AuthPending {
  type: 'web' | 'tool';
  requestId: string;
  description: string;
  tool?: string;
  argumentsPayload?: Record<string, unknown>;
}

/**
 * Agent 状态内容组件
 * @description 与 notification 尺寸一致（500×88），左侧状态图 + 右侧流式文本
 */
export function AgentContent(): ReactElement {
  const agentPrompt = useIslandStore((s) => s.agentPrompt);
  const setIdle = useIslandStore((s) => s.setIdle);
  const aiConfig = useIslandStore((s) => s.aiConfig);

  const [phase, setPhase] = useState<AgentPhase>('connecting');
  const [thinkText, setThinkText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [authPending, setAuthPending] = useState<AuthPending | null>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const answerAccRef = useRef('');
  const thinkAccRef = useRef('');
  const tokenRef = useRef('');

  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [thinkText, answerText]);

  useEffect(() => {
    const token = readLocalToken();
    if (!token || !agentPrompt.trim()) {
      setPhase('error');
      setErrorMsg(!token ? '请先登录' : '没有输入内容');
      return;
    }
    tokenRef.current = token;

    const controller = new AbortController();
    abortRef.current = controller;
    let active = true;

    const run = async (): Promise<void> => {
      setPhase('connecting');
      setThinkText('');
      setAnswerText('');
      setErrorMsg('');
      setAuthPending(null);
      answerAccRef.current = '';
      thinkAccRef.current = '';

      const availableModels = ['deepseek-v4-flash', 'deepseek-v4-pro', 'mimo-v2.5', 'mimo-v2.5-pro'];
      const selectedModel = availableModels.includes(aiConfig.model) ? aiConfig.model : 'deepseek-v4-flash';
      const selectedProvider = selectedModel.startsWith('mimo-') ? 'mimo' : 'deepseek';
      const agentMode = loadAgentMode();

      const state = useIslandStore.getState();
      const activeSessionId = state.activeAiChatSessionId;
      const activeSession = state.aiChatSessions.find((s) => s.id === activeSessionId);
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

      const message = `${INLINE_PROMPT_HINT}\n\n${agentPrompt.trim()}`;

      try {
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
          thinking: aiConfig.deepseekThinking,
          reasoningEffort: aiConfig.deepseekReasoningEffort,
          timestamp: (() => {
            const d = new Date();
            const off = -d.getTimezoneOffset();
            const sign = off >= 0 ? '+' : '-';
            const pad = (n: number): string => String(Math.abs(n)).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
          })(),
          location: (() => {
            const loc = loadLocationFromStorage();
            if (!loc) return undefined;
            const parts = [loc.city, loc.regionName, loc.country].filter(Boolean);
            return parts.length > 0 ? parts.join(', ') : undefined;
          })(),
          signal: controller.signal,
          onEvent: (event: MihtnelisAgentStreamEvent) => {
            if (!active) return;

            if (event.type === 'think') {
              setPhase('thinking');
              const payload = event.payload as { text?: unknown };
              const text = typeof payload?.text === 'string' ? payload.text : '';
              if (text) {
                thinkAccRef.current += text;
                setThinkText((prev) => prev + text);
              }
              return;
            }

            if (event.type === 'chunk') {
              setPhase('answering');
              const payload = event.payload as { text?: unknown };
              const text = typeof payload?.text === 'string' ? payload.text : '';
              if (text) {
                answerAccRef.current += text;
                setAnswerText((prev) => prev + text);
              }
              return;
            }

            if (event.type === 'chunk_reset') {
              answerAccRef.current = '';
              setAnswerText('');
              return;
            }

            if (event.type === 'tool') {
              setPhase('toolCalling');
              return;
            }

            if (event.type === 'tool_call_request') {
              const payload = event.payload as {
                turn?: unknown; requestId?: unknown; tool?: unknown; purpose?: unknown;
                riskLevel?: unknown; authorizationRequired?: unknown; message?: unknown;
                arguments?: unknown;
              };
              const requestId = typeof payload?.requestId === 'string' ? payload.requestId.trim() : '';
              const tool = typeof payload?.tool === 'string' ? payload.tool.trim() : '';
              const purpose = typeof payload?.purpose === 'string' ? payload.purpose.trim() : '';
              const authorizationRequired = Boolean(payload?.authorizationRequired);
              const authMessage = typeof payload?.message === 'string' ? payload.message : '';
              const argumentsPayload = typeof payload?.arguments === 'object' && payload?.arguments !== null
                ? payload.arguments as Record<string, unknown> : {};
              if (!tool) return;

              setPhase('toolCalling');

              const isLocal = isClientLocalToolName(tool);
              if (!isLocal || !requestId) return;

              const needsAuth = authorizationRequired || isHighRiskLocalToolName(tool);
              if (needsAuth) {
                const desc = authMessage || purpose || `工具 ${tool} 请求授权`;
                setAuthPending({ type: 'tool', requestId, description: desc, tool, argumentsPayload });
                return;
              }

              void (async () => {
                try {
                  const executor = window.api?.executeAgentLocalTool;
                  if (typeof executor !== 'function') {
                    await resolveMihtnelisLocalToolResult({ token, requestId, success: false, result: {}, error: 'LOCAL_RUNTIME_UNAVAILABLE', durationMs: 0 });
                    return;
                  }
                  const execution = await executor({ tool, arguments: argumentsPayload, workspaces: aiConfig.workspaces });
                  await resolveMihtnelisLocalToolResult({
                    token, requestId,
                    success: Boolean(execution?.success),
                    result: execution?.result,
                    error: typeof execution?.error === 'string' ? execution.error : '',
                    durationMs: typeof execution?.durationMs === 'number' ? execution.durationMs : 0,
                  });
                } catch { /* ignore */ }
              })();
              return;
            }

            if (event.type === 'web_access_request') {
              const payload = event.payload as { requestId?: unknown; url?: unknown; message?: unknown };
              const requestId = typeof payload?.requestId === 'string' ? payload.requestId.trim() : '';
              const url = typeof payload?.url === 'string' ? payload.url.trim() : '';
              if (!requestId || !url) return;
              const desc = typeof payload?.message === 'string' && payload.message ? payload.message : `请求访问: ${url}`;
              setAuthPending({ type: 'web', requestId, description: desc });
              return;
            }

            if (event.type === 'web_access_resolved') {
              setAuthPending((prev) => (prev?.type === 'web' ? null : prev));
              return;
            }

            if (event.type === 'error') {
              const payload = event.payload as { message?: unknown };
              const msg = typeof payload?.message === 'string' ? payload.message : '未知错误';
              setPhase('error');
              setErrorMsg(msg);
              return;
            }

            if (event.type === 'final') {
              setPhase('done');
              return;
            }
          },
        });

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
      abortRef.current = null;
    };
  }, [agentPrompt, aiConfig.model, aiConfig.deepseekThinking, aiConfig.deepseekReasoningEffort, aiConfig.workspaces, aiConfig.skills]);

  const handleAuthDecision = useCallback(async (allow: boolean) => {
    const auth = authPending;
    if (!auth) return;
    const token = tokenRef.current;
    if (!token) return;

    setAuthPending(null);

    try {
      if (auth.type === 'web') {
        await resolveMihtnelisWebAccess({ token, requestId: auth.requestId, allow });
      } else if (auth.type === 'tool') {
        await resolveMihtnelisLocalToolAccess({ token, requestId: auth.requestId, allow });
        if (allow) {
          const executor = window.api?.executeAgentLocalTool;
          if (typeof executor !== 'function') {
            await resolveMihtnelisLocalToolResult({ token, requestId: auth.requestId, success: false, result: {}, error: 'LOCAL_RUNTIME_UNAVAILABLE', durationMs: 0 });
          } else {
            let execution: { success?: boolean; result?: unknown; error?: string; durationMs?: number } = {};
            try {
              execution = await executor({ tool: auth.tool!, arguments: auth.argumentsPayload ?? {}, workspaces: aiConfig.workspaces });
            } catch (e: unknown) {
              execution = { success: false, result: {}, error: e instanceof Error ? e.message : '本地工具执行失败', durationMs: 0 };
            }
            await resolveMihtnelisLocalToolResult({
              token, requestId: auth.requestId,
              success: Boolean(execution?.success),
              result: execution?.result,
              error: typeof execution?.error === 'string' ? execution.error : '',
              durationMs: typeof execution?.durationMs === 'number' ? execution.durationMs : 0,
            });
          }
        }
      }
    } catch { /* ignore resolve errors */ }
  }, [authPending, aiConfig.workspaces]);

  const displayText = (answerText || thinkText || errorMsg || PHASE_LABEL[phase]).replace(/\n{2,}/g, '\n');
  const isThinkOnly = !answerText && !!thinkText;

  return (
    <div className="agent-content">
      <img
        className="agent-icon"
        src={PHASE_IMAGE[phase]}
        alt=""
        draggable={false}
      />
      <div className="agent-text-area">
        <span className="agent-text-label">
          {authPending ? '需要授权' : PHASE_LABEL[phase]}
        </span>
        <div
          ref={textRef}
          className={`agent-text-body${authPending ? ' agent-text-auth' : isThinkOnly ? ' agent-text-thinking' : ''}${phase === 'error' ? ' agent-text-error' : ''}`}
        >
          {authPending ? authPending.description : displayText}
        </div>
      </div>
      <div className="agent-actions">
        {authPending ? (
          <>
            <button className="agent-action-btn agent-action-deny" onClick={() => void handleAuthDecision(false)}>不授权</button>
            <button className="agent-action-btn agent-action-allow" onClick={() => void handleAuthDecision(true)}>授权</button>
          </>
        ) : (
          <button className="agent-action-btn" onClick={() => setIdle(true)}>关闭</button>
        )}
      </div>
    </div>
  );
}
