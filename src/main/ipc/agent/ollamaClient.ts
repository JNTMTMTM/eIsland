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

const DEFAULT_OLLAMA_BASE = 'http://localhost:11434';
const CHAT_COMPLETIONS_PATH = '/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 120_000;

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  baseUrl?: string;
  signal?: AbortSignal;
}

export interface OllamaStreamDelta {
  content?: string;
  role?: string;
}

export interface OllamaStreamChoice {
  index: number;
  delta: OllamaStreamDelta;
  finish_reason: string | null;
}

export interface OllamaStreamChunk {
  id?: string;
  object?: string;
  model?: string;
  choices: OllamaStreamChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface OllamaStreamCallbacks {
  onChunk?: (text: string) => void;
  onDone?: (fullText: string, usage?: OllamaStreamChunk['usage']) => void;
  onError?: (error: Error) => void;
}

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
  for (const base of candidates) {
    const ok = await pingOllama(base);
    if (ok) return base;
  }
  return null;
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

  let aborted = false;
  let fullText = '';
  let lastUsage: OllamaStreamChunk['usage'] | undefined;

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
      if (res.statusCode && res.statusCode >= 400) {
        let errBody = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          errBody += chunk;
        });
        res.on('end', () => {
          if (!aborted) {
            callbacks.onError?.(
              new Error(`Ollama 请求失败 (${res.statusCode}): ${errBody || 'unknown error'}`),
            );
          }
        });
        return;
      }

      let buffer = '';
      res.setEncoding('utf8');

      res.on('data', (chunk: string) => {
        if (aborted) return;
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const dataPrefix = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed;
          if (dataPrefix === '[DONE]') {
            continue;
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
        }
      });

      res.on('end', () => {
        if (aborted) return;
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
        callbacks.onDone?.(fullText, lastUsage);
      });

      res.on('error', (err) => {
        if (!aborted) {
          callbacks.onError?.(err);
        }
      });
    },
  );

  req.on('error', (err) => {
    if (!aborted) {
      callbacks.onError?.(err);
    }
  });

  req.on('timeout', () => {
    req.destroy();
    if (!aborted) {
      callbacks.onError?.(new Error('Ollama 请求超时'));
    }
  });

  if (request.signal) {
    request.signal.addEventListener('abort', () => {
      aborted = true;
      req.destroy();
    });
  }

  req.write(payload);
  req.end();

  return {
    abort: (): void => {
      aborted = true;
      req.destroy();
    },
  };
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
