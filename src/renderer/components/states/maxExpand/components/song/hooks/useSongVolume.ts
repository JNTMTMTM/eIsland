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
 * @file useSongVolume.ts
 * @description 通过 volume 插件桥接读取系统音量，合并滑动写入并同步外部音量变化。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { SONG_VOLUME_POLL_MS, SONG_VOLUME_REQUEST_TIMEOUT_MS, SONG_VOLUME_UPDATE_DELAY_MS } from '../config/songConstants';
import type { ChangeEvent } from 'react';
import type { SongVolumeResult } from '../types/songTypes';

/**
 * 限制原生音量请求的等待时间，挂起的请求不会一直占用读写标记。
 * @param request - volume 插件桥接返回的请求，桥接缺失时为 undefined。
 * @returns 请求结果；超时与桥接缺失一样返回 undefined，读取据此视为不可用。
 */
async function boundVolumeRequest<T>(request: Promise<T> | undefined): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => { resolve(undefined); }, SONG_VOLUME_REQUEST_TIMEOUT_MS);
  });
  try {
    // 等待竞速结束后才进入 finally 清理计时器，不能直接返回未决的 Promise。
    const result = await Promise.race([request, timeout]);
    return result;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 管理系统主音量，串行提交最新滑块值，写入完成后重新读取真实设备状态。
 * @returns 当前音量、可用性及滑块调节回调。
 */
export default function useSongVolume(): SongVolumeResult {
  const [volume, setVolume] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const requestRef = useRef<((value: number) => void) | null>(null);

  /* eslint-disable @typescript-eslint/no-floating-promises -- refresh 和 flush 内部捕获原生异常；生命周期和定时器同步触发任务。 */
  useEffect(() => {
    let active = true;
    let revision = 0;
    let reading = false;
    let writing = false;
    let queued: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    /** 读取期间发生调节时，丢弃旧读数，避免滑块跳回。 */
    const refresh = async (): Promise<void> => {
      if (!active || reading || writing || queued !== null) return;
      reading = true;
      const readRevision = revision;
      try {
        const value = await boundVolumeRequest(window.api?.getVolume?.());
        if (!active || readRevision !== revision) return;
        const available = typeof value === 'number' && Number.isFinite(value);
        setIsAvailable(available);
        if (available) setVolume(Math.max(0, Math.min(100, Math.round(value))));
      } catch {
        if (active && readRevision === revision) setIsAvailable(false);
      } finally {
        reading = false;
      }
    };

    /** 原生写入串行执行，期间继续滑动仅保留最新值。 */
    const flush = async (): Promise<void> => {
      if (!active || writing || queued === null) return;
      const target = queued;
      queued = null;
      writing = true;
      try {
        await boundVolumeRequest(window.api?.setVolume?.(target));
      } catch {
        // 设备写入失败后由真实读数恢复滑块，不保留虚假的成功值。
      } finally {
        writing = false;
        if (active) {
          if (queued !== null) void flush();
          else void refresh();
        }
      }
    };

    requestRef.current = (value): void => {
      revision += 1;
      queued = value;
      setVolume(value);
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; void flush(); }, SONG_VOLUME_UPDATE_DELAY_MS);
    };
    void refresh();
    const poll = setInterval(() => { void refresh(); }, SONG_VOLUME_POLL_MS);
    return () => {
      active = false;
      requestRef.current = null;
      if (timer !== null) clearTimeout(timer);
      clearInterval(poll);
    };
  }, []);
  /* eslint-enable @typescript-eslint/no-floating-promises -- 音量任务边界结束。 */

  const handleVolumeChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    const value = Number(event.currentTarget.value);
    if (Number.isFinite(value)) requestRef.current?.(Math.max(0, Math.min(100, Math.round(value))));
  }, []);
  return { volume, isAvailable, handleVolumeChange };
}
