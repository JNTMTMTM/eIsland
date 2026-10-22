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
 * @file chatRowsFixture.tsx
 * @description 在现有元素树测试中展开聊天行边界，保留时间线与 Markdown 子组件边界。
 * @author 鸡哥
 */
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import ChatMessage from '../chatMessage';
import ChatSessionItem from '../chatSessionItem';

/**
 * 展开无局部状态的消息行和会话卡片，供页面交互集成测试使用。
 * @param tree - 页面元素树。
 * @returns 展开行组件后的元素树。
 */
export default function expandChatRows(tree: ReactNode): ReactNode {
  if (Array.isArray(tree)) return tree.map(expandChatRows);
  if (!isValidElement<{ children?: ReactNode }>(tree)) return tree;
  if (tree.type === ChatMessage || tree.type === ChatSessionItem) {
    const component = tree.type as unknown as { type: (props: object) => ReactNode };
    return expandChatRows(component.type(tree.props));
  }
  return cloneElement(tree as ReactElement<{ children?: ReactNode }>, {},
    ...Children.toArray(tree.props.children).map(expandChatRows));
}
