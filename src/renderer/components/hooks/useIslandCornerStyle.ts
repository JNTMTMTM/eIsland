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

import { useCallback, useEffect, useState } from 'react';

export type IslandCornerStyle = 'rounded' | 'concave';
export const ISLAND_CORNER_STYLE_STORE_KEY = 'island-corner-style';
const LOCAL_EVENT = 'island-corner-style-changed';

/**
 * 将缺失或非法配置回退为原有圆角，兼容旧版配置。
 * @param value - 存储或广播的原始配置。
 * @returns 有效的边角样式。
 */
function normalizeCornerStyle(value: unknown): IslandCornerStyle {
  return value === 'concave' ? 'concave' : 'rounded';
}

/**
 * 读取并订阅边角样式；本窗口立即更新，其他窗口通过 store 广播同步。
 * @returns 当前样式及持久化切换函数。
 */
export function useIslandCornerStyle(): readonly [IslandCornerStyle, (value: IslandCornerStyle) => void] {
  const [style, setStyle] = useState<IslandCornerStyle>('rounded');

  useEffect(() => {
    let cancelled = false;
    let updated = false;
    const apply = (value: unknown): void => {
      updated = true;
      setStyle(normalizeCornerStyle(value));
    };
    const unsubscribe = window.api.onSettingsChanged((channel, value) => {
      if (channel === `store:${ISLAND_CORNER_STYLE_STORE_KEY}`) apply(value);
    });
    const onLocalChange = (event: Event): void => apply((event as CustomEvent<unknown>).detail);
    window.addEventListener(LOCAL_EVENT, onLocalChange);
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
      unsubscribe?.();
      window.removeEventListener(LOCAL_EVENT, onLocalChange);
    };
  }, []);

  const changeStyle = useCallback((value: IslandCornerStyle): void => {
    setStyle(value);
    window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: value }));
    const save = async (): Promise<void> => {
      try {
        await window.api.storeWrite(ISLAND_CORNER_STYLE_STORE_KEY, value);
      } catch {
        // 与其他外观配置一致，存储不可用时保留当前窗口的预览。
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- 本地预览同步完成；存储异常已在 save 内处理。
    void save();
  }, []);

  return [style, changeStyle] as const;
}
