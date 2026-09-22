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
 * @file ollamaIpc.ts
 * @description Ollama 本地直连 IPC handler，桥接渲染进程与主进程 Ollama 编排器。
 * @author 鸡哥
 */

import { ipcMain, type WebContents } from 'electron';
import { pingOllama, listOllamaModels, detectOllamaBaseUrl } from './ollamaClient';
import { orchestrateOllamaChat } from './ollamaOrchestrator';
import { orchestrateCustomDirectChat } from './customDirectOrchestrator';
import type { AgentLocalToolRequest, AgentLocalToolResult } from './localToolIpc';

interface OllamaChatIpcRequest {
  model: string;
  systemPrompt: string;
  userMessage: string;
  context?: string;
  baseUrl?: string;
  temperature?: number;
}

interface CustomDirectChatIpcRequest {
  model: string;
  systemPrompt: string;
  userMessage: string;
  context?: string;
  baseUrl: string;
  apiKey: string;
  temperature?: number;
}

const activeAbortControllers = new Map<string, AbortController>();

/**
 * 将生成任务绑定到调用窗口，并在替换、取消或结束时移除生命周期引用。
 * @param sender - 发起生成的渲染进程。
 * @param sessionId - 生成会话标识。
 * @returns 取消控制器和幂等清理函数。
 */
function trackChatRequest(sender: WebContents, sessionId: string): { controller: AbortController; release: () => void } {
  activeAbortControllers.get(sessionId)?.abort();
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  const release = (): void => {
    sender.removeListener('destroyed', abort);
    controller.signal.removeEventListener('abort', release);
    // 旧请求结束时不能删除同一会话中新请求的控制器。
    if (activeAbortControllers.get(sessionId) === controller) activeAbortControllers.delete(sessionId);
  };
  activeAbortControllers.set(sessionId, controller);
  sender.once('destroyed', abort);
  controller.signal.addEventListener('abort', release, { once: true });
  return { controller, release };
}

interface RegisterOllamaIpcHandlersOptions {
  executeAgentLocalTool: (request: AgentLocalToolRequest) => Promise<AgentLocalToolResult>;
}

/**
 * 注册 Ollama 相关 IPC 处理器。
 * @param options - 注册所需依赖（本地工具执行器）。
 */
export function registerOllamaIpcHandlers(options: RegisterOllamaIpcHandlersOptions): void {
  ipcMain.handle('ollama:ping', async (_event, baseUrl?: string) => {
    try {
      return await pingOllama(baseUrl);
    } catch {
      return false;
    }
  });

  ipcMain.handle('ollama:models', async (_event, baseUrl?: string) => {
    try {
      return await listOllamaModels(baseUrl);
    } catch {
      return [];
    }
  });

  ipcMain.handle('ollama:detectBaseUrl', async () => {
    try {
      return await detectOllamaBaseUrl();
    } catch {
      return null;
    }
  });

  ipcMain.handle('ollama:chat:start', (event, sessionId: string, request: OllamaChatIpcRequest) => {
    const sender = event.sender;
    const { controller: abortController, release } = trackChatRequest(sender, sessionId);

    orchestrateOllamaChat(
      {
        model: request.model,
        systemPrompt: request.systemPrompt,
        userMessage: request.userMessage,
        context: request.context,
        baseUrl: request.baseUrl,
        temperature: request.temperature,
        signal: abortController.signal,
      },
      {
        onEvent: (evt) => {
          try {
            if (!sender.isDestroyed()) {
              sender.send(`ollama:chat:event:${sessionId}`, evt);
            }
          } catch {
            // sender 可能已销毁
          }
        },
        executeLocalTool: options.executeAgentLocalTool,
      },
    )
      .catch((err) => {
        try {
          if (!sender.isDestroyed()) {
            sender.send(`ollama:chat:event:${sessionId}`, {
              type: 'error',
              payload: {
                code: 'ORCHESTRATOR_ERROR',
                message: err instanceof Error ? err.message : String(err),
              },
            });
          }
        } catch {
          // ignore
        }
      })
      .finally(release);

    return { started: true, sessionId };
  });

  ipcMain.handle('ollama:chat:abort', (_event, sessionId: string) => {
    const controller = activeAbortControllers.get(sessionId);
    if (controller) {
      controller.abort();
      activeAbortControllers.delete(sessionId);
      return { aborted: true };
    }
    return { aborted: false };
  });

  // ─── Custom Direct Chat IPC ───────────────────────────────────────────────

  ipcMain.handle('customDirect:chat:start', (event, sessionId: string, request: CustomDirectChatIpcRequest) => {
    const sender = event.sender;
    const { controller: abortController, release } = trackChatRequest(sender, sessionId);

    orchestrateCustomDirectChat(
      {
        model: request.model,
        systemPrompt: request.systemPrompt,
        userMessage: request.userMessage,
        context: request.context,
        baseUrl: request.baseUrl,
        apiKey: request.apiKey,
        temperature: request.temperature,
        signal: abortController.signal,
      },
      {
        onEvent: (evt) => {
          try {
            if (!sender.isDestroyed()) {
              sender.send(`customDirect:chat:event:${sessionId}`, evt);
            }
          } catch {
            // sender 可能已销毁
          }
        },
        executeLocalTool: options.executeAgentLocalTool,
      },
    )
      .catch((err) => {
        try {
          if (!sender.isDestroyed()) {
            sender.send(`customDirect:chat:event:${sessionId}`, {
              type: 'error',
              payload: {
                code: 'ORCHESTRATOR_ERROR',
                message: err instanceof Error ? err.message : String(err),
              },
            });
          }
        } catch {
          // ignore
        }
      })
      .finally(release);

    return { started: true, sessionId };
  });

  ipcMain.handle('customDirect:chat:abort', (_event, sessionId: string) => {
    const controller = activeAbortControllers.get(sessionId);
    if (controller) {
      controller.abort();
      activeAbortControllers.delete(sessionId);
      return { aborted: true };
    }
    return { aborted: false };
  });
}
