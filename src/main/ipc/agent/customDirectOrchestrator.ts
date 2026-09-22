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
 * @file customDirectOrchestrator.ts
 * @description 自定义 API 直连 ReAct 编排器，复用 ollama 编排逻辑，通过 OpenAI 兼容客户端直调 LLM。
 * @author 鸡哥
 */

import { streamOpenAIChat } from './openaiCompatClient';
import type { OpenAIChatMessage, OpenAIStreamChunk } from './openaiCompatClient';
import type { AgentLocalToolResult } from './localToolIpc';
import type { CustomDirectOrchestratorRequest } from '../../types/agent/CustomDirectOrchestratorRequest';
import type { CustomDirectEvent, CustomDirectEventType } from '../../types/agent/CustomDirectEvent';
import type { CustomDirectOrchestratorCallbacks } from '../../types/agent/CustomDirectOrchestratorCallbacks';

export type {
  CustomDirectOrchestratorRequest,
  CustomDirectEvent,
  CustomDirectEventType,
  CustomDirectOrchestratorCallbacks,
};

const MAX_REACT_TURNS = 15;
const MAX_OBSERVATION_CHARS = 8000;

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

function parseLlmOutput(raw: string): ParsedLlmOutput {
  const trimmed = raw.trim();
  const braceStart = trimmed.indexOf('{');
  const braceEnd = trimmed.lastIndexOf('}');
  if (braceStart < 0 || braceEnd <= braceStart) {
    return { type: 'unknown', raw: trimmed };
  }

  const jsonCandidate = trimmed.substring(braceStart, braceEnd + 1);
  const parsedOutput = [jsonCandidate, repairJsonNewlines(jsonCandidate)].reduce<ParsedLlmOutput | null>((acc, candidate) => {
    if (acc) return acc;
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
          data: { answer: String(parsed.answer || '') },
        };
      }

      if (typeof parsed.answer === 'string' && parsed.answer.trim()) {
        return { type: 'final', data: { answer: parsed.answer } };
      }
      return null;
    } catch {
      return null;
    }
  }, null);

  if (parsedOutput) return parsedOutput;

  if (braceStart > 20 || trimmed.length - (braceEnd + 1) > 20) {
    return { type: 'final', data: { answer: trimmed } };
  }

  return { type: 'unknown', raw: trimmed };
}

function repairJsonNewlines(source: string): string {
  return source.replace(/(?<=:\s*")((?:[^"\\]|\\.)*)(?=")/g, (match) => {
    return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  });
}

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

function truncateObservation(obs: string): string {
  if (obs.length <= MAX_OBSERVATION_CHARS) return obs;
  return obs.substring(0, MAX_OBSERVATION_CHARS) + '...';
}

/**
 * 执行自定义 API 直连 ReAct 编排循环。
 */
export async function orchestrateCustomDirectChat(
  request: CustomDirectOrchestratorRequest,
  callbacks: CustomDirectOrchestratorCallbacks,
): Promise<void> {
  const { model, systemPrompt, userMessage, context, baseUrl, apiKey, temperature, signal } = request;

  callbacks.onEvent({
    type: 'meta',
    payload: {
      agent: 'mihtnelis agent (direct)',
      provider: 'custom-direct',
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

    const messages: OpenAIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const envFilter = new JsonEnvelopeStreamFilter();
    const parser = new ThinkStreamParser();
    const emitCallbacks = {
      onThink: (text: string, index: number): void => {
        callbacks.onEvent({ type: 'think', payload: { text, index } });
      },
      onContent: (text: string): void => {
        envFilter.feed(text, (clean) => {
          callbacks.onEvent({ type: 'chunk', payload: { text: clean } });
        });
      },
    };

    let llmOutput: string;
    let usage: OpenAIStreamChunk['usage'] | undefined;
    try {
      const result = await streamLlmTurn(model, messages, baseUrl, apiKey, temperature, signal, (chunk, isThink) => {
        if (isThink) {
          parser.feedThinkDirect(chunk, emitCallbacks);
        } else {
          parser.feed(chunk, emitCallbacks);
        }
      });
      parser.flush(emitCallbacks);
      envFilter.flush((clean) => {
        callbacks.onEvent({ type: 'chunk', payload: { text: clean } });
      });
      llmOutput = result.text;
      usage = result.usage;
    } catch (err) {
      parser.flush(emitCallbacks);
      envFilter.flush((clean) => {
        callbacks.onEvent({ type: 'chunk', payload: { text: clean } });
      });
      const msg = err instanceof Error ? err.message : String(err);
      callbacks.onEvent({ type: 'error', payload: { code: signal?.aborted ? 'ABORTED' : 'LLM_ERROR', message: msg } });
      return;
    }

    if (usage) {
      totalInputTokens += usage.prompt_tokens ?? 0;
      totalOutputTokens += usage.completion_tokens ?? 0;
    }

    const contentWithoutThink = llmOutput
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .trim();

    const parsed = parseLlmOutput(contentWithoutThink);

    if (parsed.type === 'final') {
      const answer = parsed.data.answer;
      const alreadyForwarded = envFilter.forwardedContent.trim();
      if (alreadyForwarded !== answer.trim() && answer) {
        callbacks.onEvent({ type: 'stream_rollback', payload: {} });
        callbacks.onEvent({ type: 'chunk', payload: { text: answer } });
      }
      callbacks.onEvent({
        type: 'final',
        payload: {
          done: true,
          agent: 'mihtnelis agent (direct)',
          provider: 'custom-direct',
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

      if (envFilter.forwardedContent.trim()) {
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

      let toolResult: AgentLocalToolResult;
      try {
        toolResult = await callbacks.executeLocalTool({ tool, arguments: toolArgs });
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

    // unknown 类型
    callbacks.onEvent({
      type: 'final',
      payload: {
        done: true,
        agent: 'mihtnelis agent (direct)',
        provider: 'custom-direct',
        model,
        billedInputTokens: totalInputTokens,
        billedOutputTokens: totalOutputTokens,
        billedTokenTotal: totalInputTokens + totalOutputTokens,
        tokenSource: usage ? 'api' : 'estimate',
      },
    });
    return;
  }

  callbacks.onEvent({
    type: 'chunk',
    payload: { text: '抱歉，本次请求处理步骤过多，已达到上限。请简化问题后重试。' },
  });
  callbacks.onEvent({
    type: 'final',
    payload: {
      done: true,
      agent: 'mihtnelis agent (direct)',
      provider: 'custom-direct',
      model,
      billedInputTokens: totalInputTokens,
      billedOutputTokens: totalOutputTokens,
      billedTokenTotal: totalInputTokens + totalOutputTokens,
      tokenSource: 'estimate',
    },
  });
}

/**
 * 流式 JSON 信封过滤器（与 ollamaOrchestrator 相同逻辑）。
 */
class JsonEnvelopeStreamFilter {
  private buf = '';
  private mode: 'detecting' | 'answer' | 'passthrough' | 'suppressed' = 'detecting';
  private fwdPos = 0;
  forwardedContent = '';
  private static readonly TRAIL = 2;
  private static readonly DETECT_THRESHOLD = 80;

  feed(text: string, emit: (clean: string) => void): void {
    if (!text) return;
    this.buf += text;
    if (this.mode === 'suppressed') return;

    if (this.mode === 'detecting') {
      const b = this.buf;
      let idx = b.indexOf('"answer":"');
      if (idx < 0) idx = b.indexOf('"answer": "');
      if (idx >= 0) {
        this.mode = 'answer';
        const qStart = b.indexOf('"', idx + '"answer":'.length);
        this.fwdPos = qStart >= 0 ? qStart + 1 : b.length;
        this.flushAnswer(emit, false);
        return;
      }
      if (b.includes('"tool_call"')) {
        this.mode = 'suppressed';
        return;
      }
      const trimmedStart = b.trimStart();
      if (trimmedStart.length > 0 && trimmedStart[0] !== '{') {
        this.mode = 'passthrough';
        this.forwardedContent += b;
        emit(b);
        this.fwdPos = b.length;
        return;
      }
      if (b.length > JsonEnvelopeStreamFilter.DETECT_THRESHOLD) {
        this.mode = 'suppressed';
        return;
      }
    } else if (this.mode === 'answer') {
      this.flushAnswer(emit, false);
    } else if (this.mode === 'passthrough') {
      this.forwardedContent += text;
      emit(text);
    }
  }

  flush(emit: (clean: string) => void): void {
    if (this.mode === 'answer') {
      this.flushAnswer(emit, true);
    } else if (this.mode === 'detecting') {
      const b = this.buf.trimStart();
      if (b.length > 0 && b[0] !== '{') {
        this.forwardedContent += this.buf;
        emit(this.buf);
      }
    }
  }

  private flushAnswer(emit: (clean: string) => void, done: boolean): void {
    const b = this.buf;
    let end: number;
    if (done) {
      end = b.length;
      if (end >= 2 && b[end - 1] === '}' && b[end - 2] === '"') end -= 2;
      else if (end >= 3 && b[end - 1] === '}' && b[end - 3] === '"') end -= 3;
    } else {
      end = b.length - JsonEnvelopeStreamFilter.TRAIL;
    }
    if (!done && end > this.fwdPos && b[end - 1] === '\\') end--;
    if (end > this.fwdPos) {
      const raw = b.substring(this.fwdPos, end);
      this.fwdPos = end;
      const clean = JsonEnvelopeStreamFilter.unescapeJsonValue(raw);
      if (clean) {
        this.forwardedContent += clean;
        emit(clean);
      }
    }
  }

  private static unescapeJsonValue(s: string): string {
    if (!s || !s.includes('\\')) return s;
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '\\' && i + 1 < s.length) {
        const n = s[i + 1];
        switch (n) {
          case 'n': out += '\n'; i++; break;
          case 't': out += '\t'; i++; break;
          case 'r': out += '\r'; i++; break;
          case '"': out += '"'; i++; break;
          case '\\': out += '\\'; i++; break;
          case '/': out += '/'; i++; break;
          default: out += c; break;
        }
      } else {
        out += c;
      }
    }
    return out;
  }
}

/**
 * 流式 <think> 标签解析器（与 ollamaOrchestrator 相同逻辑）。
 * 额外支持 reasoning_content delta 直接推送。
 */
class ThinkStreamParser {
  private state: 'outside' | 'thinking' = 'outside';
  private buffer = '';
  private thinkIndex = 0;
  streamedContent = '';

  /** 处理来自 reasoning_content delta 的思考内容（已分离，无需解析标签） */
  feedThinkDirect(
    chunk: string,
    emit: { onThink: (text: string, index: number) => void; onContent: (text: string) => void },
  ): void {
    if (chunk) {
      emit.onThink(chunk, this.thinkIndex);
    }
  }

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
 */
function streamLlmTurn(
  model: string,
  messages: OpenAIChatMessage[],
  baseUrl: string,
  apiKey: string,
  temperature: number | undefined,
  signal: AbortSignal | undefined,
  onStreamChunk?: (text: string, isThink: boolean) => void,
): Promise<{ text: string; usage?: OpenAIStreamChunk['usage'] }> {
  return new Promise((resolve, reject) => {
    streamOpenAIChat(
      { model, messages, stream: true, baseUrl, apiKey, temperature, signal },
      {
        onChunk: (text) => {
          onStreamChunk?.(text, false);
        },
        onThinkChunk: (text) => {
          onStreamChunk?.(text, true);
        },
        onDone: (fullText, usage) => {
          resolve({ text: fullText, usage });
        },
        onError: (err) => {
          reject(err);
        },
      },
    );

  });
}
