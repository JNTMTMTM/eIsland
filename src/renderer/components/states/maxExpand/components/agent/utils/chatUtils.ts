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
 * @file chatUtils.ts
 * @description AI 对话工具函数（上下文构建、JSON 信封拆包、Markdown 修正、流式推送等）。
 * @author 鸡哥
 */

import type { AiChatMessage } from '../../../../../../store/types';

export const MAX_MIHTNELIS_CONTEXT_CHARS = 1_000_000;

/** 根据历史消息构建 mihtnelis agent 的对话上下文字符串。 */
export function buildMihtnelisContext(messages: AiChatMessage[]): string {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '';
  }
  const tailLines: string[] = [];
  let roughLength = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const role = msg?.role === 'assistant' ? 'assistant' : 'user';
    const content = typeof msg?.content === 'string' ? msg.content.trim() : '';
    if (!content) {
      continue;
    }
    tailLines.push(`${role}: ${content}`);
    roughLength += content.length + role.length + 4;
    if (roughLength >= MAX_MIHTNELIS_CONTEXT_CHARS + 4096) {
      break;
    }
  }
  if (tailLines.length === 0) {
    return '';
  }
  const fullContext = tailLines.reverse().join('\n\n');
  if (fullContext.length <= MAX_MIHTNELIS_CONTEXT_CHARS) {
    return fullContext;
  }
  return fullContext.slice(fullContext.length - MAX_MIHTNELIS_CONTEXT_CHARS);
}

function repairJsonControlChars(json: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (inString) {
      if (escaped) { result += c; escaped = false; continue; }
      if (c === '\\') { result += c; escaped = true; continue; }
      if (c === '"') { result += c; inString = false; continue; }
      if (c === '\n') { result += '\\n'; continue; }
      if (c === '\r') { result += '\\r'; continue; }
      if (c === '\t') { result += '\\t'; continue; }
      result += c;
    } else {
      result += c;
      if (c === '"') { inString = true; }
    }
  }
  return result;
}

/** 尝试将 JSON 信封格式的内容拆包为 answer 纯文本。 */
export function unwrapJsonEnvelope(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return content;
  }
  const candidates = [trimmed, repairJsonControlChars(trimmed)];
  for (let ci = 0; ci < candidates.length; ci++) {
    try {
      const parsed = JSON.parse(candidates[ci]);
      if (typeof parsed?.answer === 'string' && parsed.answer.trim()) {
        return parsed.answer;
      }
    } catch {
      // try next
    }
  }
  return content;
}

/** 将任意值转为格式化的 JSON 字符串。 */
export function toPrettyJson(value: unknown): string {
  if (value === null || value === undefined) {
    return '{}';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** 修正 Markdown 代码围栏前缺少换行符的问题。 */
export function normalizeMarkdownCodeFences(content: string): string {
  if (!content || content.indexOf('```') < 0) {
    return content;
  }
  let normalized = content;
  normalized = normalized.replace(/([^\n])\s```(?=\r?\n)/g, '$1\n```');
  normalized = normalized.replace(/([^\n])\s```\s*$/g, '$1\n```');
  return normalized;
}

export async function streamChatCompletion(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  signal: AbortSignal,
  errorMessages: {
    apiRequestFailed: string;
    cannotReadResponseStream: string;
  },
): Promise<void> {
  const url = `${endpoint.replace(/\/+$/, '')}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(errorMessages.apiRequestFailed
      .replace('{{status}}', String(res.status))
      .replace('{{detail}}', body || res.statusText));
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error(errorMessages.cannotReadResponseStream);

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) onChunk(delta);
      } catch {
        // skip malformed chunks
      }
    }
  }
}
