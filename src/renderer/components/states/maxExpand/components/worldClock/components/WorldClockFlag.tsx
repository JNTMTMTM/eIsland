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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/**
 * @file WorldClockFlag.tsx
 * @description 按需加载独立 SVG 国旗，复用浏览器图片缓存并避免时钟刷新触发图标重渲染
 * @author 鸡哥
 */

/// <reference types="vite/client" />

import { memo, type ReactElement } from 'react';

// 仅生成 4:3 图片的 URL 索引，禁止将整套 SVG 内联进 JS 或全局 CSS。
const flagUrls = import.meta.glob<string>('../../../../../../../../node_modules/flag-icons/flags/4x3/*.svg', {
  eager: true,
  import: 'default',
  query: '?url&no-inline',
});

/**
 * 渲染国家旗帜；无国家归属的条目不显示图标。
 * @param props - 可选 ISO 国家代码
 * @returns 延迟加载的国旗图片或空内容
 */
export const WorldClockFlag = memo(function WorldClockFlag({ countryCode }: { countryCode?: string }): ReactElement | null {
  const src = countryCode ? flagUrls[`../../../../../../../../node_modules/flag-icons/flags/4x3/${countryCode}.svg`] : undefined;
  if (!src) return null;

  return (
    <img
      className="world-clock-country-flag no-filter"
      src={src}
      width={18}
      height={14}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
});
