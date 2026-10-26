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
 * @description 聊天会话加载骨架：历史会话侧栏与消息区占位，复用共享扫光动画。
 * @author 鸡哥
 */

/* eslint-disable better-tailwindcss/no-unknown-classes -- 复用项目共享的骨架占位、扫光样式与聊天消息区样式。 */

import type { ReactElement } from 'react';

/**
 * 渲染历史会话侧栏骨架，填满侧栏内容区；装饰内容由外层加载状态统一提供读屏提示。
 * @returns 带扫光效果的会话列表占位。
 */
export function ChatSessionListSkeleton(): ReactElement {
  return (
    <div className="settings-skeleton-sweep relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden" aria-hidden="true">
      <span className="settings-skeleton-block mb-1 h-3 w-3/4" />
      {['first', 'second', 'third', 'fourth'].map((key) => (
        <div key={key} className="flex shrink-0 flex-col gap-2 rounded-lg border border-[rgba(var(--color-text-rgb),0.08)] p-3">
          <span className="settings-skeleton-block h-3 w-4/5" />
          <span className="settings-skeleton-block h-2 w-3/5" />
        </div>
      ))}
    </div>
  );
}

/**
 * 渲染消息区骨架，沿用消息列表容器的尺寸与内边距；装饰内容由外层加载状态统一提供读屏提示。
 * @returns 带扫光效果的消息占位。
 */
export function ChatMessagesSkeleton(): ReactElement {
  return (
    <div className="max-expand-chat-messages" aria-hidden="true">
      <div className="settings-skeleton-sweep relative flex h-full flex-col gap-6 overflow-hidden">
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
  );
}

/* eslint-enable better-tailwindcss/no-unknown-classes -- 共享骨架样式的例外仅限当前组件。 */
