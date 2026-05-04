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
  | 'stream_rollback'
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
      thinkingEnabled: true,
    },
  });
  callbacks.onEvent({
    type: 'status',
    payload: { phase: 'orchestrating', message: '正在处理中…' },
  });

  let scratchpad = '';
  let turn = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

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

    // 创建 ThinkStreamParser 实现实时流式推送
    const parser = new ThinkStreamParser();
    const emitCallbacks = {
      onThink: (text: string, index: number): void => {
        callbacks.onEvent({ type: 'think', payload: { text, index } });
      },
      onContent: (text: string): void => {
        callbacks.onEvent({ type: 'chunk', payload: { text } });
      },
    };

    // 流式获取 LLM 输出（实时推送 chunk 和 think 事件）
    let llmOutput: string;
    let usage: OllamaStreamChunk['usage'] | undefined;
    try {
      const result = await streamLlmTurn(model, messages, baseUrl, temperature, signal, (chunk) => {
        parser.feed(chunk, emitCallbacks);
      });
      parser.flush(emitCallbacks);
      llmOutput = result.text;
      usage = result.usage;
    } catch (err) {
      parser.flush(emitCallbacks);
      const msg = err instanceof Error ? err.message : String(err);
      callbacks.onEvent({ type: 'error', payload: { code: 'LLM_ERROR', message: msg } });
      return;
    }

    if (usage) {
      totalInputTokens += usage.prompt_tokens ?? 0;
      totalOutputTokens += usage.completion_tokens ?? 0;
    }

    // 去除 <think> 块后的纯正文
    const contentWithoutThink = llmOutput
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .trim();

    // 解析 LLM 输出（使用去除 think 块后的文本）
    const parsed = parseLlmOutput(contentWithoutThink);

    if (parsed.type === 'final') {
      const answer = parsed.data.answer;
      // 如果已流式输出的正文与最终答案不同（JSON 信封场景），则替换
      if (parser.streamedContent.trim() !== answer.trim() && answer) {
        callbacks.onEvent({ type: 'stream_rollback', payload: {} });
        callbacks.onEvent({ type: 'chunk', payload: { text: answer } });
      }
      callbacks.onEvent({
        type: 'final',
        payload: {
          done: true,
          agent: 'mihtnelis agent (local)',
          provider: 'ollama',
          model,
          billedInputTokens: totalInputTokens,
          billedOutputTokens: totalOutputTokens,
          billedTokenTotal: totalInputTokens + totalOutputTokens,
          tokenSource: usage ? 'api' : 'estimate',
        },
      });
      return;
    }

    if (parsed.type === 'tool_call') {
      const { tool, purpose, arguments: toolArgs } = parsed.data;

      // 回滚已流式输出的 JSON 内容
      if (parser.streamedContent.trim()) {
        callbacks.onEvent({ type: 'stream_rollback', payload: {} });
      }

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

    // unknown 类型 - 正文已被实时流式推送，直接 finalize
    callbacks.onEvent({
      type: 'final',
      payload: {
        done: true,
        agent: 'mihtnelis agent (local)',
        provider: 'ollama',
        model,
        billedInputTokens: totalInputTokens,
        billedOutputTokens: totalOutputTokens,
        billedTokenTotal: totalInputTokens + totalOutputTokens,
        tokenSource: usage ? 'api' : 'estimate',
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
      billedInputTokens: totalInputTokens,
      billedOutputTokens: totalOutputTokens,
      billedTokenTotal: totalInputTokens + totalOutputTokens,
      tokenSource: 'estimate',
    },
  });
}

/**
 * 流式 <think> 标签解析器。
 * 将 LLM 输出拆分为思考内容（think）与正文内容（content）。
 */
class ThinkStreamParser {
  private state: 'outside' | 'thinking' = 'outside';
  private buffer = '';
  private thinkIndex = 0;
  /** 已通过 onContent 输出的累积正文 */
  streamedContent = '';

  feed(
    chunk: string,
    emit: { onThink: (text: string, index: number) => void; onContent: (text: string) => void },
  ): void {
    this.buffer += chunk;
    this.drain(emit);
  }

  flush(
    emit: { onThink: (text: string, index: number) => void; onContent: (text: string) => void },
  ): void {
    if (this.buffer) {
      if (this.state === 'thinking') {
        emit.onThink(this.buffer, this.thinkIndex);
      } else {
        this.streamedContent += this.buffer;
        emit.onContent(this.buffer);
      }
      this.buffer = '';
    }
  }

  private drain(
    emit: { onThink: (text: string, index: number) => void; onContent: (text: string) => void },
  ): void {
    while (this.buffer.length > 0) {
      if (this.state === 'outside') {
        const idx = this.buffer.indexOf('<think>');
        if (idx === -1) {
          const partial = this.partialTagLen(this.buffer, '<think>');
          if (partial > 0) {
            const safe = this.buffer.substring(0, this.buffer.length - partial);
            if (safe) { this.streamedContent += safe; emit.onContent(safe); }
            this.buffer = this.buffer.substring(this.buffer.length - partial);
            return;
          }
          this.streamedContent += this.buffer;
          emit.onContent(this.buffer);
          this.buffer = '';
          return;
        }
        if (idx > 0) {
          const before = this.buffer.substring(0, idx);
          this.streamedContent += before;
          emit.onContent(before);
        }
        this.buffer = this.buffer.substring(idx + 7);
        this.state = 'thinking';
      } else {
        const idx = this.buffer.indexOf('</think>');
        if (idx === -1) {
          const partial = this.partialTagLen(this.buffer, '</think>');
          if (partial > 0) {
            const safe = this.buffer.substring(0, this.buffer.length - partial);
            if (safe) emit.onThink(safe, this.thinkIndex);
            this.buffer = this.buffer.substring(this.buffer.length - partial);
            return;
          }
          emit.onThink(this.buffer, this.thinkIndex);
          this.buffer = '';
          return;
        }
        if (idx > 0) emit.onThink(this.buffer.substring(0, idx), this.thinkIndex);
        this.buffer = this.buffer.substring(idx + 8);
        this.state = 'outside';
        this.thinkIndex++;
      }
    }
  }

  private partialTagLen(text: string, tag: string): number {
    for (let len = Math.min(text.length, tag.length - 1); len > 0; len--) {
      if (text.endsWith(tag.substring(0, len))) return len;
    }
    return 0;
  }
}

/**
 * 执行单轮 LLM 流式调用并收集完整输出。
 * @param onStreamChunk 实时流式回调，每收到一个 delta 即调用。
 */
function streamLlmTurn(
  model: string,
  messages: OllamaChatMessage[],
  baseUrl: string | undefined,
  temperature: number | undefined,
  signal: AbortSignal | undefined,
  onStreamChunk?: (text: string) => void,
): Promise<{ text: string; usage?: OllamaStreamChunk['usage'] }> {
  return new Promise((resolve, reject) => {
    const handle = streamOllamaChat(
      { model, messages, stream: true, baseUrl, temperature, signal },
      {
        onChunk: (text) => {
          onStreamChunk?.(text);
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
