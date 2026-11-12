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
 * @file lyricsDisplayStore.ts
 * @description 歌词功能开关的共享状态：关闭时播放音乐只显示歌名
 * @author 鸡哥
 */

import { create } from 'zustand';

/** 歌词功能开关的设置通道 */
export const LYRICS_ENABLED_CHANNEL = 'music:lyrics-enabled';

interface LyricsDisplayState {
  /** 为 false 时不请求歌词、只显示歌名；null 表示尚未读取已保存的设置 */
  lyricsEnabled: boolean | null;
}

export const useLyricsDisplayStore = create<LyricsDisplayState>(() => ({ lyricsEnabled: null }));

/** 正在进行的已保存设置读取，读取结束后清空以便下次重新读取 */
let reading: Promise<boolean> | null = null;

/**
 * 读取当前是否处于只显示歌名模式，供非组件逻辑同步判断。
 * @returns 歌词功能明确关闭时返回 true。
 */
export function isSongTitleMode(): boolean {
  return useLyricsDisplayStore.getState().lyricsEnabled === false;
}

/**
 * 读取已保存的开关；读取期间收到设置事件时以事件为准，读取失败时按关闭处理，避免在未知状态下请求歌词。
 * @returns 已确定的开关值。
 */
async function readSaved(): Promise<boolean> {
  let saved = false;
  try {
    saved = await window.api.musicLyricsEnabledGet();
  } catch (error) {
    console.error('[lyrics] read lyrics-enabled failed:', error);
  }
  const { lyricsEnabled } = useLyricsDisplayStore.getState();
  if (lyricsEnabled !== null) return lyricsEnabled;
  useLyricsDisplayStore.setState({ lyricsEnabled: saved });
  return saved;
}

/**
 * 获取已确定的歌词功能开关，尚未读取时读取已保存的设置；并发调用共享同一次读取。
 * @returns 歌词功能是否启用。
 */
export function resolveLyricsEnabled(): Promise<boolean> {
  const { lyricsEnabled } = useLyricsDisplayStore.getState();
  if (lyricsEnabled !== null) return Promise.resolve(lyricsEnabled);
  reading ??= readSaved().finally(() => { reading = null; });
  return reading;
}

/**
 * 读取已保存的歌词功能开关，并订阅本窗口与其他窗口的修改。
 * @returns 取消订阅函数。
 */
export function subscribeLyricsEnabled(): () => void {
  const apply = (channel: unknown, value: unknown): void => {
    if (channel === LYRICS_ENABLED_CHANNEL && typeof value === 'boolean') {
      useLyricsDisplayStore.setState({ lyricsEnabled: value });
    }
  };
  const onLocal = (event: Event): void => {
    const { detail } = event as CustomEvent<{ channel?: unknown; value?: unknown }>;
    apply(detail?.channel, detail?.value);
  };
  resolveLyricsEnabled().catch(() => {});
  const unsubscribe = window.api.onSettingsChanged(apply);
  window.addEventListener('island:setting-changed', onLocal);
  return () => {
    unsubscribe();
    window.removeEventListener('island:setting-changed', onLocal);
  };
}
