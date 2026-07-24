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
 * @file useLyricModeSetting.ts
 * @description 引导歌词模式设置逻辑 Hook
 * @author 鸡哥
 */

import { useState, useCallback, useEffect } from 'react';

interface UseLyricModeSettingReturn {
  /** 当前是否启用逐字模式（false = 普通模式） */
  karaoke: boolean;
  /** 切换歌词模式 */
  setKaraoke: (enabled: boolean) => void;
}

/**
 * 歌词模式设置逻辑 Hook
 * @description 从存储加载逐字扫光开关，管理状态并实时同步。
 *   监听 music:lyrics-karaoke 事件，确保外部变更（设置页等）时 UI 保持一致。
 */
export function useLyricModeSetting(): UseLyricModeSettingReturn {
  const [karaoke, setKaraokeState] = useState(false);

  /** 初始化时从存储加载 */
  useEffect(() => {
    window.api.musicLyricsKaraokeGet().then((val) => {
      setKaraokeState(val);
    }).catch(() => {});
  }, []);

  /** 监听逐字模式外部变更（设置页等） */
  useEffect(() => {
    const unsub = window.api.onSettingsChanged((channel, value) => {
      if (channel === 'music:lyrics-karaoke') {
        setKaraokeState(typeof value === 'boolean' ? value : false);
      }
    });
    return unsub;
  }, []);

  const setKaraoke = useCallback((enabled: boolean): void => {
    setKaraokeState(enabled);
    window.api.musicLyricsKaraokeSet(enabled).catch(() => {});
  }, []);

  return { karaoke, setKaraoke };
}
