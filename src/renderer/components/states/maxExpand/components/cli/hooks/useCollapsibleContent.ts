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
 * @file useCollapsibleContent.ts
 * @description CLI 折叠内容按需挂载，并在收起动画结束后释放。
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';

/**
 * 在展开时挂载内容，收起时只保留到 CSS 过渡结束。
 * @param visible - 内容是否处于展开状态
 * @param durationMs - 对应 CSS 收起动画时长（毫秒）
 * @returns 是否需要渲染内容
 */
export default function useCollapsibleContent(visible: boolean, durationMs: number): boolean {
  const [retained, setRetained] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRetained(true);
      return;
    }
    if (!retained) return;

    const timer = window.setTimeout(() => setRetained(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [visible, retained, durationMs]);

  return visible || retained;
}
