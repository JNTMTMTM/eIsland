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
 * @file openaiCompatClient.ts
 * @description 通用 OpenAI 兼容流式 HTTP/HTTPS 客户端，供自定义 API 直连模式使用。
 * @author 鸡哥
 */

import http from 'http';
import https from 'https';
import type { OpenAIChatMessage } from '../../types/agent/OpenAIChatMessage';
import type { OpenAIChatRequest } from '../../types/agent/OpenAIChatRequest';
import type { OpenAIStreamDelta } from '../../types/agent/OpenAIStreamDelta';
import type { OpenAIStreamChoice } from '../../types/agent/OpenAIStreamChoice';
import type { OpenAIStreamChunk } from '../../types/agent/OpenAIStreamChunk';
import type { OpenAIStreamCallbacks } from '../../types/agent/OpenAIStreamCallbacks';

export type {
  OpenAIChatMessage,
  OpenAIChatRequest,
  OpenAIStreamDelta,
  OpenAIStreamChoice,
  OpenAIStreamChunk,
  OpenAIStreamCallbacks,
};

const CHAT_COMPLETIONS_PATH = '/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * 解析 baseUrl，确定正确的 completions 路径。
 * 如果 baseUrl 已包含路径（如 /v1），则追加 /chat/completions。
 */
function resolveCompletionsUrl(baseUrl: string): URL {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) {
    return new URL(trimmed);
  }
  if (trimmed.endsWith('/v1')) {
    return new URL(trimmed + '/chat/completions');
  }
  // 默认追加 /v1/chat/completions
  return new URL(trimmed + CHAT_COMPLETIONS_PATH);
}

/**
 * 向 OpenAI 兼容 API 发起流式 Chat Completion 请求。
 * 支持 http 和 https 协议，支持 API Key 认证。
 */
export function streamOpenAIChat(
  request: OpenAIChatRequest,
  callbacks: OpenAIStreamCallbacks,
): { abort: () => void } {
  const url = resolveCompletionsUrl(request.baseUrl);
  const isHttps = url.protocol === 'https:';
  const httpModule = isHttps ? https : http;
  const defaultPort = isHttps ? '443' : '80';

  const payload = JSON.stringify({
    model: request.model,
    messages: request.messages,
    stream: request.stream !== false,
    stream_options: request.stream !== false ? { include_usage: true } : undefined,
    temperature: request.temperature,
    top_p: request.top_p,
    max_tokens: request.max_tokens,
  });

  let finished = false;
  let fullText = '';
  let lastUsage: OpenAIStreamChunk['usage'] | undefined;
  let abortRequest = (): void => {};
  const cleanup = (): void => request.signal?.removeEventListener('abort', abortRequest);
  const fail = (error: Error): void => {
    if (finished) return;
    finished = true;
    fullText = '';
    cleanup();
    callbacks.onError?.(error);
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (request.apiKey) {
    headers['Authorization'] = `Bearer ${request.apiKey}`;
  }

  const req = httpModule.request(
    {
      hostname: url.hostname,
      port: url.port || defaultPort,
      path: url.pathname + url.search,
      method: 'POST',
      headers,
      timeout: REQUEST_TIMEOUT_MS,
    },
    (res) => {
      res.on('error', fail);
      res.on('aborted', () => fail(new Error('API 响应已中断')));
      if (res.statusCode && res.statusCode >= 400) {
        let errBody = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          errBody += chunk;
        });
        res.on('end', () => {
          fail(new Error(`API 请求失败 (${res.statusCode}): ${errBody || 'unknown error'}`));
        });
        return;
      }

      let buffer = '';
      res.setEncoding('utf8');

      res.on('data', (chunk: string) => {
        if (finished) return;
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) return;

          const dataPrefix = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed;
          if (dataPrefix === '[DONE]') {
            return;
          }

          try {
            const parsed = JSON.parse(dataPrefix) as OpenAIStreamChunk;
            if (parsed.usage) {
              lastUsage = parsed.usage;
            }
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.reasoning_content) {
              callbacks.onThinkChunk?.(delta.reasoning_content);
            }
            if (delta?.content) {
              fullText += delta.content;
              callbacks.onChunk?.(delta.content);
            }
            if (parsed.choices?.[0]?.finish_reason) {
              // stream complete
            }
          } catch {
            // 跳过无法解析的行
          }
        });
      });

      res.on('end', () => {
        if (finished) return;
        if (buffer.trim()) {
          const dataPrefix = buffer.trim().startsWith('data: ')
            ? buffer.trim().slice(6)
            : buffer.trim();
          if (dataPrefix !== '[DONE]') {
            try {
              const parsed = JSON.parse(dataPrefix) as OpenAIStreamChunk;
              if (parsed.usage) lastUsage = parsed.usage;
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.reasoning_content) {
                callbacks.onThinkChunk?.(delta.reasoning_content);
              }
              if (delta?.content) {
                fullText += delta.content;
                callbacks.onChunk?.(delta.content);
              }
            } catch {
              // ignore
            }
          }
        }
        finished = true;
        cleanup();
        callbacks.onDone?.(fullText, lastUsage);
        fullText = '';
      });
    },
  );

  req.on('error', fail);

  req.on('timeout', () => {
    fail(new Error('API 请求超时'));
    req.destroy();
  });

  abortRequest = (): void => {
    if (finished) return;
    // 取消也必须结算上层 Promise，否则会保留本轮对话、工具结果及请求对象。
    fail(new DOMException('请求已取消', 'AbortError'));
    req.destroy();
  };
  if (request.signal?.aborted) {
    abortRequest();
  } else if (!finished) {
    request.signal?.addEventListener('abort', abortRequest, { once: true });
    req.write(payload);
    req.end();
  }

  return { abort: abortRequest };
}
