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
 * @file useIslandCornerStyle.ts
 * @description 同步主题页与灵动岛的边角样式，支持跨窗口更新与持久化恢复。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type IslandCornerStyle = 'rounded' | 'concave';
export const ISLAND_CORNER_STYLE_STORE_KEY = 'island-corner-style';

/**
 * 将缺失或非法配置回退为原有圆角，兼容旧版配置。
 * @param value - 存储或广播的原始配置。
 * @returns 有效的边角样式。
 */
function normalizeCornerStyle(value: unknown): IslandCornerStyle {
  return value === 'concave' ? 'concave' : 'rounded';
}

/**
 * 读取并订阅已提交的边角样式，所有窗口按主进程广播顺序更新。
 * @returns 当前样式、持久化切换函数及保存失败状态。
 */
export function useIslandCornerStyle(): readonly [IslandCornerStyle, (value: IslandCornerStyle) => void, boolean] {
  const [style, setStyle] = useState<IslandCornerStyle>('rounded');
  const [saveFailed, setSaveFailed] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let updated = false;
    const apply = (value: unknown): void => {
      updated = true;
      setStyle(normalizeCornerStyle(value));
      setSaveFailed(false);
    };
    const unsubscribe = window.api.onSettingsChanged((channel, value) => {
      if (channel === `store:${ISLAND_CORNER_STYLE_STORE_KEY}`) apply(value);
    });
    const load = async (): Promise<void> => {
      try {
        const value = await window.api.storeRead(ISLAND_CORNER_STYLE_STORE_KEY);
        // 异步初始读取不能覆盖用户刚完成的切换。
        if (!cancelled && !updated) setStyle(normalizeCornerStyle(value));
      } catch {
        // 配置读取失败时保留默认样式及后续广播订阅。
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- effect 必须同步返回清理函数；读取异常已在 load 内处理。
    void load();
    return () => {
      cancelled = true;
      requestId.current += 1;
      unsubscribe?.();
    };
  }, []);

  const changeStyle = useCallback((value: IslandCornerStyle): void => {
    const currentRequest = ++requestId.current;
    setSaveFailed(false);
    const save = async (): Promise<void> => {
      try {
        const saved = await window.api.storeWrite(ISLAND_CORNER_STYLE_STORE_KEY, value);
        if (currentRequest === requestId.current) setSaveFailed(!saved);
      } catch {
        if (currentRequest === requestId.current) setSaveFailed(true);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- 事件处理器同步返回；保存结果及异常已在 save 内处理。
    void save();
  }, []);

  return [style, changeStyle, saveFailed] as const;
}
