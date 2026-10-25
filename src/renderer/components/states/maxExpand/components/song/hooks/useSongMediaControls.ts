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
 * @file useSongMediaControls.ts
 * @description 封装播放源上一曲、播放暂停与下一曲事件。
 * @author 鸡哥
 */

import { useCallback } from 'react';
import type { SongMediaControls } from '../types/songTypes';

/**
 * 保留同步按钮事件与媒体命令拒绝处理。
 * @returns 播放源控制句柄。
 */
export default function useSongMediaControls(): SongMediaControls {
  /* eslint-disable promise/prefer-await-to-then -- 原生点击回调同步返回，并处理媒体命令的异步拒绝。 */
  const handlePrev = useCallback((): void => { window.api.mediaPrev().catch(() => undefined); }, []);
  const handlePlayPause = useCallback((): void => { window.api.mediaPlayPause().catch(() => undefined); }, []);
  const handleNext = useCallback((): void => { window.api.mediaNext().catch(() => undefined); }, []);
  /* eslint-enable promise/prefer-await-to-then -- 媒体命令回调结束。 */
  return { handlePrev, handlePlayPause, handleNext };
}
