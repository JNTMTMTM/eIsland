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

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import useIslandStore from '../../../store/isLandStore';
import { streamMihtnelisAgent } from '../../../api/ai/mihtnelisAgentStream';
import type { MihtnelisAgentStreamEvent } from '../../../api/ai/mihtnelisAgentStream';
import { readLocalToken } from '../../../utils/userAccount';
import { loadLocationFromStorage } from '../../../store/utils/storage';
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
  const textRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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

    const controller = new AbortController();
    abortRef.current = controller;
    let active = true;

    const run = async (): Promise<void> => {
      setPhase('connecting');
      setThinkText('');
      setAnswerText('');
      setErrorMsg('');

      const selectedModel = aiConfig.model || 'deepseek-v4-flash';
      const selectedProvider = selectedModel.startsWith('mimo-') ? 'mimo' : 'deepseek';

      try {
        await streamMihtnelisAgent({
          token,
          sessionId: 'island-agent-inline',
          message: agentPrompt.trim(),
          provider: selectedProvider,
          model: selectedModel,
          thinking: aiConfig.deepseekThinking,
          reasoningEffort: aiConfig.deepseekReasoningEffort,
          timestamp: new Date().toISOString(),
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
              if (text) setThinkText((prev) => prev + text);
              return;
            }

            if (event.type === 'chunk') {
              setPhase('answering');
              const payload = event.payload as { text?: unknown };
              const text = typeof payload?.text === 'string' ? payload.text : '';
              if (text) setAnswerText((prev) => prev + text);
              return;
            }

            if (event.type === 'chunk_reset') {
              setAnswerText('');
              return;
            }

            if (event.type === 'tool' || event.type === 'tool_call_request') {
              setPhase('toolCalling');
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
  }, [agentPrompt, aiConfig.model, aiConfig.deepseekThinking, aiConfig.deepseekReasoningEffort]);

  const displayText = answerText || thinkText || errorMsg || PHASE_LABEL[phase];
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
        <span className="agent-text-label">{PHASE_LABEL[phase]}</span>
        <div
          ref={textRef}
          className={`agent-text-body${isThinkOnly ? ' agent-text-thinking' : ''}${phase === 'error' ? ' agent-text-error' : ''}`}
        >
          {displayText}
        </div>
      </div>
      <div className="agent-actions">
        <button className="agent-action-btn" onClick={() => setIdle(true)}>关闭</button>
      </div>
    </div>
  );
}
