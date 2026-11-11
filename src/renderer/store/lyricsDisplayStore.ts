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
 * @description 歌词功能开关的共享状态：关闭时播放音乐只显示「歌名 - 歌手」
 * @author 鸡哥
 */

import { create } from 'zustand';

/** 歌词功能开关的设置通道 */
export const LYRICS_ENABLED_CHANNEL = 'music:lyrics-enabled';

interface LyricsDisplayState {
  /** 为 false 时不请求歌词，歌词状态改为显示「歌名 - 歌手」 */
  lyricsEnabled: boolean;
}

export const useLyricsDisplayStore = create<LyricsDisplayState>(() => ({ lyricsEnabled: true }));

/**
 * 读取当前是否处于只显示歌名模式，供非组件逻辑同步判断。
 * @returns 歌词功能关闭时返回 true。
 */
export function isSongTitleMode(): boolean {
  return !useLyricsDisplayStore.getState().lyricsEnabled;
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
  window.api.musicLyricsEnabledGet().then((enabled) => {
    useLyricsDisplayStore.setState({ lyricsEnabled: enabled });
  }).catch(() => {});
  const unsubscribe = window.api.onSettingsChanged(apply);
  window.addEventListener('island:setting-changed', onLocal);
  return () => {
    unsubscribe();
    window.removeEventListener('island:setting-changed', onLocal);
  };
}
