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
 * @file ollamaClient.ts
 * @description 本地 Ollama OpenAI 兼容 HTTP 流式客户端，供主进程调用。
 * @author 鸡哥
 */

import http from 'http';
import type { OllamaChatMessage } from '../../types/agent/OllamaChatMessage';
import type { OllamaChatRequest } from '../../types/agent/OllamaChatRequest';
import type { OllamaStreamDelta } from '../../types/agent/OllamaStreamDelta';
import type { OllamaStreamChoice } from '../../types/agent/OllamaStreamChoice';
import type { OllamaStreamChunk } from '../../types/agent/OllamaStreamChunk';
import type { OllamaStreamCallbacks } from '../../types/agent/OllamaStreamCallbacks';

export type {
  OllamaChatMessage,
  OllamaChatRequest,
  OllamaStreamDelta,
  OllamaStreamChoice,
  OllamaStreamChunk,
  OllamaStreamCallbacks,
};

const DEFAULT_OLLAMA_BASE = 'http://localhost:11434';
const CHAT_COMPLETIONS_PATH = '/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * 检测本地 Ollama 服务是否可用。
 */
export async function pingOllama(baseUrl?: string): Promise<boolean> {
  const base = baseUrl || DEFAULT_OLLAMA_BASE;
  return new Promise((resolve) => {
    const url = new URL(base);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || '11434',
        path: '/',
        method: 'GET',
        timeout: 3000,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

/**
 * 自动检测本地运行的 Ollama 服务端口。
 * 探测常用端口（11434 默认 / 11435 / 11436），返回可用的 baseUrl，找不到时返回 null。
 */
export async function detectOllamaBaseUrl(): Promise<string | null> {
  const candidates = [
    'http://localhost:11434',
    'http://127.0.0.1:11434',
    'http://localhost:11435',
    'http://localhost:11436',
  ];
  return candidates.reduce<Promise<string | null>>(async (foundPromise, base) => {
    const found = await foundPromise;
    if (found) return found;
    const ok = await pingOllama(base);
    return ok ? base : null;
  }, Promise.resolve(null));
}

/**
 * 获取 Ollama 本地可用模型列表。
 */
export async function listOllamaModels(baseUrl?: string): Promise<string[]> {
  const base = baseUrl || DEFAULT_OLLAMA_BASE;
  return new Promise((resolve, reject) => {
    const url = new URL('/api/tags', base);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || '11434',
        path: url.pathname,
        method: 'GET',
        timeout: 5000,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(body) as { models?: Array<{ name?: string }> };
            const names = (json.models || [])
              .map((m) => m.name || '')
              .filter((n) => n.length > 0);
            resolve(names);
          } catch {
            reject(new Error('解析 Ollama 模型列表失败'));
          }
        });
      },
    );
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('获取 Ollama 模型列表超时'));
    });
    req.end();
  });
}

/**
 * 向本地 Ollama 发起流式 Chat Completion 请求。
 * 使用 OpenAI 兼容接口 /v1/chat/completions。
 */
export function streamOllamaChat(
  request: OllamaChatRequest,
  callbacks: OllamaStreamCallbacks,
): { abort: () => void } {
  const base = request.baseUrl || DEFAULT_OLLAMA_BASE;
  const url = new URL(CHAT_COMPLETIONS_PATH, base);
  const payload = JSON.stringify({
    model: request.model,
    messages: request.messages,
    stream: request.stream !== false,
    temperature: request.temperature,
    top_p: request.top_p,
    max_tokens: request.max_tokens,
  });

  let finished = false;
  let fullText = '';
  let lastUsage: OllamaStreamChunk['usage'] | undefined;
  let abortRequest = (): void => {};
  const cleanup = (): void => request.signal?.removeEventListener('abort', abortRequest);
  const fail = (error: Error): void => {
    if (finished) return;
    finished = true;
    fullText = '';
    cleanup();
    callbacks.onError?.(error);
  };

  const req = http.request(
    {
      hostname: url.hostname,
      port: url.port || '11434',
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      timeout: REQUEST_TIMEOUT_MS,
    },
    (res) => {
      res.on('error', fail);
      res.on('aborted', () => fail(new Error('Ollama 响应已中断')));
      if (res.statusCode && res.statusCode >= 400) {
        let errBody = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          errBody += chunk;
        });
        res.on('end', () => {
          fail(new Error(`Ollama 请求失败 (${res.statusCode}): ${errBody || 'unknown error'}`));
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
            const parsed = JSON.parse(dataPrefix) as OllamaStreamChunk;
            if (parsed.usage) {
              lastUsage = parsed.usage;
            }
            const delta = parsed.choices?.[0]?.delta;
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
        // 处理 buffer 中残留数据
        if (buffer.trim()) {
          const dataPrefix = buffer.trim().startsWith('data: ')
            ? buffer.trim().slice(6)
            : buffer.trim();
          if (dataPrefix !== '[DONE]') {
            try {
              const parsed = JSON.parse(dataPrefix) as OllamaStreamChunk;
              if (parsed.usage) lastUsage = parsed.usage;
              const delta = parsed.choices?.[0]?.delta;
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
    fail(new Error('Ollama 请求超时'));
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

/**
 * 向本地 Ollama 发起非流式 Chat Completion 请求（Promise 版）。
 */
export function chatOllama(request: OllamaChatRequest): Promise<{
  text: string;
  usage?: OllamaStreamChunk['usage'];
}> {
  return new Promise((resolve, reject) => {
    streamOllamaChat(
      { ...request, stream: false },
      {
        onDone: (fullText, usage) => resolve({ text: fullText, usage }),
        onError: (err) => reject(err),
      },
    );
  });
}
