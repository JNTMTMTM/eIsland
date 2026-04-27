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
 * @file AiChatTab.tsx
 * @description 最大展开模式 — AI 对话 Tab（OpenAI 兼容 API + 流式输出）
 * @author 鸡哥
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { streamMihtnelisAgent } from '../../../../api/ai/mihtnelisAgentStream';
import useIslandStore from '../../../../store/slices';
import { readLocalToken } from '../../../../utils/userAccount';

/** 单条消息 */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 调用 OpenAI 兼容 Chat Completions API（流式）
 */
async function streamChatCompletion(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  signal: AbortSignal,
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
    throw new Error(`API 请求失败 (${res.status}): ${body || res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('无法读取响应流');

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
      } catch { /* skip malformed chunks */ }
    }
  }
}

/**
 * AI 对话 Tab
 * @description 包含消息列表和输入栏的聊天界面，调用 OpenAI 兼容 API
 */
export function AiChatTab(): React.ReactElement {
  const { t } = useTranslation();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { aiConfig, aiChatMessages, setAiChatMessages, clearAiChatMessages } = useIslandStore();

  /** 始终从 store 读最新消息再更新，避免流式 chunk 之间的闭包过期 */
  const updateMessages = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    const latest = useIslandStore.getState().aiChatMessages;
    useIslandStore.getState().setAiChatMessages(updater(latest));
  }, []);

  /** 滚动到最新消息 */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatMessages]);

  /** 取消正在进行的请求 */
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  /** 发送消息并调用 API */
  const handleSend = useCallback(async (): Promise<void> => {
    const text = input.trim();
    if (!text || loading) return;

    const localToken = readLocalToken();
    const canUseMihtnelis = Boolean(localToken && localToken.trim().length > 0);

    if (!canUseMihtnelis && !aiConfig.apiKey) {
      updateMessages(prev => ([
        ...prev,
        { role: 'user', content: text },
        {
          role: 'assistant',
          content: t('aiChat.messages.missingApiKeyWarn', {
            defaultValue: '⚠️ 请先在「设置 → AI配置」中填写 API Key。',
          }),
        },
      ]));
      setInput('');
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextMessages = [...aiChatMessages, userMsg];
    setAiChatMessages(nextMessages);
    setInput('');
    setLoading(true);

    // 构建 API 请求消息（含 system prompt）
    const apiMessages: { role: string; content: string }[] = [];
    if (aiConfig.systemPrompt) {
      apiMessages.push({ role: 'system', content: aiConfig.systemPrompt });
    }
    nextMessages.forEach((m) => {
      apiMessages.push({ role: m.role, content: m.content });
    });

    // 添加占位 AI 消息
    updateMessages(prev => ([...prev, { role: 'assistant', content: '' }]));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (canUseMihtnelis) {
        let receivedMihtnelisChunk = false;
        let mihtnelisErrorMessage: string | null = null;
        await streamMihtnelisAgent({
          token: localToken!,
          sessionId: 'max-expand-ai-chat',
          message: text,
          provider: aiConfig.model,
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === 'chunk') {
              const payload = event.payload as { text?: unknown };
              const chunk = typeof payload?.text === 'string' ? payload.text : '';
              if (!chunk) return;
              receivedMihtnelisChunk = true;
              updateMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === 'assistant') {
                  copy[copy.length - 1] = { ...last, content: last.content + chunk };
                }
                return copy;
              });
              return;
            }

            if (event.type === 'error') {
              const payload = event.payload as { message?: unknown };
              const message = typeof payload?.message === 'string'
                ? payload.message
                : 'mihtnelis agent 返回错误';
              mihtnelisErrorMessage = message;
            }
          },
        });

        if (!receivedMihtnelisChunk) {
          const fallbackMessage = mihtnelisErrorMessage
            ? `❌ ${mihtnelisErrorMessage}`
            : '⚠️ 未收到模型输出，请检查 DeepSeek 配置与服务端日志。';
          updateMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.role === 'assistant' && !last.content) {
              copy[copy.length - 1] = { ...last, content: fallbackMessage };
            }
            return copy;
          });
        }
      } else {
        await streamChatCompletion(
          aiConfig.endpoint,
          aiConfig.apiKey,
          aiConfig.model,
          apiMessages,
          (chunk) => {
            updateMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: last.content + chunk };
              }
              return copy;
            });
          },
          controller.signal,
        );
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const errMsg = err instanceof Error
        ? err.message
        : t('aiChat.messages.unknownError', { defaultValue: '未知错误' });
      updateMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant' && !last.content) {
          copy[copy.length - 1] = { ...last, content: `❌ ${errMsg}` };
        } else {
          copy.push({ role: 'assistant', content: `❌ ${errMsg}` });
        }
        return copy;
      });
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }, [input, loading, aiChatMessages, aiConfig, setAiChatMessages, updateMessages, t]);

  /** 回车发送 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** 停止生成 */
  const handleStop = (): void => {
    abortRef.current?.abort();
  };

  /** 清空对话 */
  const handleClear = (): void => {
    abortRef.current?.abort();
    clearAiChatMessages();
    setLoading(false);
  };

  return (
    <div className="max-expand-chat">
      {/* 标题 */}
      <div className="max-expand-chat-header">
        <span className="max-expand-chat-header-title">{t('aiChat.title', { defaultValue: 'AI 对话' })}</span>
        <div className="max-expand-chat-header-actions">
          <span className="max-expand-chat-header-model">{readLocalToken() ? 'mihtnelis agent' : (aiConfig.model || t('aiChat.notConfigured', { defaultValue: '未配置' }))}</span>
          {aiChatMessages.length > 0 && (
            <button className="max-expand-chat-clear" onClick={handleClear} type="button">
              {t('aiChat.actions.clear', { defaultValue: '清空' })}
            </button>
          )}
        </div>
      </div>
      {/* 消息列表 */}
      <div className="max-expand-chat-messages">
        {aiChatMessages.length === 0 && (
          <div className="max-expand-chat-empty">
            {aiConfig.apiKey
              ? t('aiChat.messages.emptyWithApiKey', { defaultValue: '有什么可以帮你的？' })
              : t('aiChat.messages.emptyWithoutApiKey', { defaultValue: '请先在「设置 → AI配置」中填写 API Key' })}
          </div>
        )}
        {aiChatMessages.map((msg, i) => (
          <div key={i} className={`max-expand-chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
            {msg.role === 'user' ? (
              msg.content
            ) : (
              msg.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              ) : (
                loading && i === aiChatMessages.length - 1 ? '...' : ''
              )
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      {/* 输入栏 */}
      <div className="max-expand-chat-input-bar">
        <input
          className="max-expand-chat-input"
          type="text"
          placeholder={loading
            ? t('aiChat.input.generatingPlaceholder', { defaultValue: '生成中...' })
            : t('aiChat.input.placeholder', { defaultValue: '输入消息...' })}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        {loading ? (
          <button className="max-expand-chat-send" onClick={handleStop}>
            {t('aiChat.actions.stop', { defaultValue: '停止' })}
          </button>
        ) : (
          <button className="max-expand-chat-send" onClick={handleSend}>
            {t('aiChat.actions.send', { defaultValue: '发送' })}
          </button>
        )}
      </div>
    </div>
  );
}
