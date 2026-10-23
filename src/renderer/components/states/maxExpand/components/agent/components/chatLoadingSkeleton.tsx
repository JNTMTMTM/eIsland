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
 * @file chatLoadingSkeleton.tsx
 * @description 聊天历史加载骨架：会话列表、消息和输入栏占位，复用共享扫光动画。
 * @author 鸡哥
 */

/* eslint-disable better-tailwindcss/no-unknown-classes -- 复用项目共享的骨架占位与扫光样式。 */

import type { ReactElement } from 'react';

/**
 * 渲染聊天加载骨架，装饰内容由外层加载状态统一提供读屏提示。
 * @returns 带扫光效果的聊天布局占位。
 */
export default function ChatLoadingSkeleton(): ReactElement {
  return (
    <div className="settings-skeleton-sweep relative flex size-full min-h-0 flex-col overflow-hidden" aria-hidden="true">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[rgba(var(--color-text-rgb),0.08)] px-4">
        <span className="settings-skeleton-block h-4 w-32" />
        <span className="settings-skeleton-block h-6 w-16" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-1/3 max-w-[220px] shrink-0 flex-col gap-3 overflow-hidden border-r border-[rgba(var(--color-text-rgb),0.08)] p-3">
          <span className="settings-skeleton-block mb-1 h-3 w-3/4" />
          {['first', 'second', 'third', 'fourth'].map((key) => (
            <div key={key} className="flex shrink-0 flex-col gap-2 rounded-lg border border-[rgba(var(--color-text-rgb),0.08)] p-3">
              <span className="settings-skeleton-block h-3 w-4/5" />
              <span className="settings-skeleton-block h-2 w-3/5" />
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-hidden p-4">
          <span className="settings-skeleton-block h-12 w-3/5 self-end" />
          <div className="flex gap-3">
            <span className="settings-skeleton-block size-7" />
            <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1">
              <span className="settings-skeleton-block h-3 w-11/12" />
              <span className="settings-skeleton-block h-3 w-4/5" />
              <span className="settings-skeleton-block h-3 w-1/2" />
            </div>
          </div>
          <span className="settings-skeleton-block h-10 w-1/2 self-end" />
        </div>
      </div>
      <div className="flex h-14 shrink-0 items-center gap-3 border-t border-[rgba(var(--color-text-rgb),0.08)] px-4">
        <span className="settings-skeleton-block size-7" />
        <span className="settings-skeleton-block h-8 flex-1" />
        <span className="settings-skeleton-block size-7" />
      </div>
    </div>
  );
}

/* eslint-enable better-tailwindcss/no-unknown-classes -- 共享骨架样式的例外仅限当前组件。 */
