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
 * @file ollamaOrchestrator.ts
 * @description 本地 Ollama ReAct 编排器，管理 system prompt → LLM → 工具执行 → 循环。
 * @author 鸡哥
 */

import { streamOllamaChat } from './ollamaClient';
import type { OllamaChatMessage, OllamaStreamChunk } from './ollamaClient';
import type { AgentLocalToolRequest, AgentLocalToolResult } from './localToolIpc';

const MAX_REACT_TURNS = 15;
const MAX_OBSERVATION_CHARS = 8000;

export interface OllamaOrchestratorRequest {
  model: string;
  systemPrompt: string;
  userMessage: string;
  context?: string;
  baseUrl?: string;
  temperature?: number;
  signal?: AbortSignal;
}

export type OllamaEventType =
  | 'meta'
  | 'status'
  | 'think'
  | 'chunk'
  | 'tool_call_request'
  | 'tool_call_result'
  | 'final'
  | 'error';

export interface OllamaEvent {
  type: OllamaEventType;
  payload: Record<string, unknown>;
}

export interface OllamaOrchestratorCallbacks {
  onEvent: (event: OllamaEvent) => void;
  executeLocalTool: (request: AgentLocalToolRequest) => Promise<AgentLocalToolResult>;
}

interface ParsedToolCall {
  tool: string;
  purpose: string;
  arguments: Record<string, unknown>;
}

interface ParsedFinalAnswer {
  answer: string;
}

type ParsedLlmOutput =
  | { type: 'tool_call'; data: ParsedToolCall }
  | { type: 'final'; data: ParsedFinalAnswer }
  | { type: 'unknown'; raw: string };

/**
 * 解析 LLM 输出的 JSON（tool_call 或 final）。
 */
function parseLlmOutput(raw: string): ParsedLlmOutput {
  const trimmed = raw.trim();

  // 尝试提取 JSON 块（可能前后有多余文字）
  const braceStart = trimmed.indexOf('{');
  const braceEnd = trimmed.lastIndexOf('}');
  if (braceStart < 0 || braceEnd <= braceStart) {
    return { type: 'unknown', raw: trimmed };
  }

  const jsonCandidate = trimmed.substring(braceStart, braceEnd + 1);

  // 尝试多种修复策略
  for (const candidate of [jsonCandidate, repairJsonNewlines(jsonCandidate)]) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const outputType = String(parsed.type || '').trim().toLowerCase();

      if (outputType === 'tool_call') {
        return {
          type: 'tool_call',
          data: {
            tool: String(parsed.tool || ''),
            purpose: String(parsed.purpose || ''),
            arguments: (parsed.arguments && typeof parsed.arguments === 'object'
              ? parsed.arguments
              : {}) as Record<string, unknown>,
          },
        };
      }

      if (outputType === 'final') {
        return {
          type: 'final',
          data: {
            answer: String(parsed.answer || ''),
          },
        };
      }

      // 有 answer 字段但 type 不明确
      if (typeof parsed.answer === 'string' && parsed.answer.trim()) {
        return { type: 'final', data: { answer: parsed.answer } };
      }
    } catch {
      // try next candidate
    }
  }

  // 如果整个输出看起来不是 JSON，视为直接回答
  if (braceStart > 20 || trimmed.length - (braceEnd + 1) > 20) {
    return { type: 'final', data: { answer: trimmed } };
  }

  return { type: 'unknown', raw: trimmed };
}

/**
 * 修复 JSON 字符串值中的未转义换行。
 */
function repairJsonNewlines(source: string): string {
  return source.replace(/(?<=:\s*")((?:[^"\\]|\\.)*)(?=")/g, (match) => {
    return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  });
}

/**
 * 构建 ReAct 用户提示词。
 */
function buildReActUserPrompt(
  userMessage: string,
  context: string,
  scratchpad: string,
): string {
  const parts: string[] = [];

  if (context.trim()) {
    parts.push(`对话上下文:\n${context.trim()}`);
  }

  parts.push(`用户问题:\n${userMessage.trim()}`);

  if (scratchpad.trim()) {
    parts.push(`--- 历史观察结果 ---\n${scratchpad.trim()}`);
    parts.push('只允许输出一个 JSON 对象。请按内部思考框架决策后输出 tool_call 或 final。禁止输出解释或额外文本。');
  } else {
    parts.push('只允许输出一个 JSON 对象。请按内部思考框架决策后输出 tool_call 或 final。禁止输出其他文本。');
  }

  return parts.join('\n\n');
}

/**
 * 截断工具观察结果到安全长度。
 */
function truncateObservation(obs: string): string {
  if (obs.length <= MAX_OBSERVATION_CHARS) return obs;
  return obs.substring(0, MAX_OBSERVATION_CHARS) + '...';
}

/**
 * 执行本地 Ollama ReAct 编排循环。
 */
export async function orchestrateOllamaChat(
  request: OllamaOrchestratorRequest,
  callbacks: OllamaOrchestratorCallbacks,
): Promise<void> {
  const { model, systemPrompt, userMessage, context, baseUrl, temperature, signal } = request;

  callbacks.onEvent({
    type: 'meta',
    payload: {
      agent: 'mihtnelis agent (local)',
      provider: 'ollama',
      model,
      timestamp: new Date().toISOString(),
    },
  });
  callbacks.onEvent({
    type: 'status',
    payload: { phase: 'orchestrating', message: '正在处理中…' },
  });

  let scratchpad = '';
  let turn = 0;

  while (turn < MAX_REACT_TURNS) {
    if (signal?.aborted) {
      callbacks.onEvent({ type: 'error', payload: { code: 'ABORTED', message: '请求已取消' } });
      return;
    }

    turn++;
    const userPrompt = buildReActUserPrompt(userMessage, context || '', scratchpad);

    const messages: OllamaChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 流式获取 LLM 输出
    let llmOutput: string;
    let usage: OllamaStreamChunk['usage'] | undefined;
    try {
      const result = await streamLlmTurn(model, messages, baseUrl, temperature, signal);
      llmOutput = result.text;
      usage = result.usage;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      callbacks.onEvent({ type: 'error', payload: { code: 'LLM_ERROR', message: msg } });
      return;
    }

    // 解析 LLM 输出
    const parsed = parseLlmOutput(llmOutput);

    if (parsed.type === 'final') {
      // 流式推送最终回答
      const answer = parsed.data.answer;
      if (answer) {
        callbacks.onEvent({ type: 'chunk', payload: { text: answer } });
      }
      callbacks.onEvent({
        type: 'final',
        payload: {
          done: true,
          agent: 'mihtnelis agent (local)',
          provider: 'ollama',
          model,
          billedInputTokens: usage?.prompt_tokens ?? 0,
          billedOutputTokens: usage?.completion_tokens ?? 0,
          billedTokenTotal: usage?.total_tokens ?? 0,
          tokenSource: usage ? 'api' : 'estimate',
        },
      });
      return;
    }

    if (parsed.type === 'tool_call') {
      const { tool, purpose, arguments: toolArgs } = parsed.data;

      callbacks.onEvent({
        type: 'tool_call_request',
        payload: {
          turn,
          tool,
          purpose,
          arguments: toolArgs,
          riskLevel: 'local',
        },
      });

      // 执行本地工具
      let toolResult: AgentLocalToolResult;
      try {
        toolResult = await callbacks.executeLocalTool({
          tool,
          arguments: toolArgs,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toolResult = { success: false, result: {}, error: msg, durationMs: 0 };
      }

      callbacks.onEvent({
        type: 'tool_call_result',
        payload: {
          turn,
          tool,
          success: toolResult.success,
          result: toolResult.result,
          error: toolResult.error,
          durationMs: toolResult.durationMs,
        },
      });

      // 构建观察结果追加到 scratchpad
      let obsJson: string;
      try {
        obsJson = JSON.stringify({
          tool,
          success: toolResult.success,
          data: toolResult.result,
          error: toolResult.error,
        });
      } catch {
        obsJson = JSON.stringify({ tool, success: false, error: 'result serialization failed' });
      }
      obsJson = truncateObservation(obsJson);

      let argsJson = '{}';
      try {
        argsJson = JSON.stringify(toolArgs);
        if (argsJson.length > 1200) argsJson = argsJson.substring(0, 1200) + '...';
      } catch { /* noop */ }

      if (scratchpad.length > 0) scratchpad += '\n\n';
      scratchpad += `Turn ${turn}:\nAction: ${tool}\nAction Input: ${argsJson}\nObservation: ${obsJson}`;

      continue;
    }

    // unknown 类型 - LLM 输出不符合预期格式，作为 final 回答处理
    const fallbackText = parsed.raw || llmOutput;
    if (fallbackText.trim()) {
      callbacks.onEvent({ type: 'chunk', payload: { text: fallbackText } });
    }
    callbacks.onEvent({
      type: 'final',
      payload: {
        done: true,
        agent: 'mihtnelis agent (local)',
        provider: 'ollama',
        model,
        tokenSource: 'estimate',
      },
    });
    return;
  }

  // 超过最大轮次
  callbacks.onEvent({
    type: 'chunk',
    payload: { text: '抱歉，本次请求处理步骤过多，已达到上限。请简化问题后重试。' },
  });
  callbacks.onEvent({
    type: 'final',
    payload: {
      done: true,
      agent: 'mihtnelis agent (local)',
      provider: 'ollama',
      model,
      tokenSource: 'estimate',
    },
  });
}

/**
 * 执行单轮 LLM 流式调用并收集完整输出
 */
function streamLlmTurn(
  model: string,
  messages: OllamaChatMessage[],
  baseUrl: string | undefined,
  temperature: number | undefined,
  signal: AbortSignal | undefined,
): Promise<{ text: string; usage?: OllamaStreamChunk['usage'] }> {
  return new Promise((resolve, reject) => {
    const handle = streamOllamaChat(
      { model, messages, stream: true, baseUrl, temperature, signal },
      {
        onChunk: (text) => {
          void text;
        },
        onDone: (fullText, usage) => {
          resolve({ text: fullText, usage });
        },
        onError: (err) => {
          reject(err);
        },
      },
    );

    if (signal) {
      signal.addEventListener('abort', () => handle.abort(), { once: true });
    }
  });
}
