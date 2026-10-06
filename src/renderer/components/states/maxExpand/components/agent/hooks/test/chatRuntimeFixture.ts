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
 * @file chatRuntimeFixture.ts
 * @description 聊天 Hook 专用真实 AI slice 与本地存储、浏览器帧及原生选择叶边界。
 * @author 鸡哥
 */
import { vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createAiSlice } from '../../../../../../../store/slices/aiSlice';
import type { AiSlice } from '../../../../../../../store/types';
/** 安装真实状态切片，浏览器和 IPC 在外部边界被隔离。
 * @returns 本地数据、真实 store 和原生能力探针
 */
export function installChatRuntime() {
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    }
  };
  const api = {
    storeRead: vi.fn<(key: string) => Promise<unknown>>().mockResolvedValue(null),
    storeWrite: vi.fn<(key: string, value: unknown) => Promise<boolean>>().mockResolvedValue(true),
    openStandaloneWindow: vi.fn<() => Promise<boolean>>().mockResolvedValue(true)
  };
  const selection = vi.fn<() => Selection | null>().mockReturnValue(null);
  const documentTarget: EventTarget & { activeElement: unknown } = Object.assign(new EventTarget(), {
    activeElement: null
  });
  const browser = Object.assign(new EventTarget(), {
    localStorage,
    api,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    innerHeight: 900,
    getSelection: selection,
    requestAnimationFrame: (callback: FrameRequestCallback) => Number(setTimeout(() => callback(Date.now()), 16)),
    cancelAnimationFrame: (id: number) => {
      clearTimeout(id);
    }
  });
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', browser);
  vi.stubGlobal('document', documentTarget);
  const store = createStore<AiSlice>()(createAiSlice);
  const navigation = {
    setMaxExpandTab: vi.fn<(tab: string) => void>(),
    setLogin: vi.fn(),
    setRegister: vi.fn(),
    dominantColor: '#223344'
  };
  const getState = () => ({
    ...store.getState(),
    ...navigation
  });
  vi.doMock('../../../../../../../store/slices', () => ({
    default: Object.assign(getState, {
      getState,
      subscribe: store.subscribe
    })
  }));
  return {
    storage,
    store,
    api,
    selection,
    documentTarget,
    browser,
    navigation
  };
}
/** 生成真实 JWT 存储输入供真实角色解析器读取。
 * @param role - 用户角色
 * @returns JWT
 */
export function roleToken(role: string): string {
  return `header.${  btoa(JSON.stringify({
    role
  }))  }.signature`;
}
