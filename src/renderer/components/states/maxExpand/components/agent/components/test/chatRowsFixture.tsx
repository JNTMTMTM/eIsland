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
import { Children, cloneElement, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import ChatMessage from '../chatMessage';
import ChatSessionItem from '../chatSessionItem';
import { VirtualChatMessages } from '../virtualChatMessages';

/**
 * 展开消息列表、消息行和会话卡片，供页面交互集成测试使用。
 * @param tree - 页面元素树。
 * @returns 展开行组件后的元素树。
 */
export default function expandChatRows(tree: ReactNode): ReactNode {
  if (Array.isArray(tree)) return tree.map(expandChatRows);
  if (!isValidElement<{ children?: ReactNode }>(tree)) return tree;
  if (tree.type === VirtualChatMessages) {
    const props = tree.props as ComponentProps<typeof VirtualChatMessages>;
    // eslint-disable-next-line better-tailwindcss/no-unknown-classes -- 测试复用聊天页面的语义样式类。
    return expandChatRows(<div className="max-expand-chat-messages">
      {props.messages.length === 0 ? props.emptyContent : props.messages.map((msg, absoluteIndex) => (
        // eslint-disable-next-line react/no-array-index-key -- 元素树夹具不执行列表协调，索引保留真实时间线位置。
        <ChatMessage key={absoluteIndex} msg={msg} absoluteIndex={absoluteIndex}
          isLatest={absoluteIndex === props.messages.length - 1}
          isStreaming={props.isStreaming && absoluteIndex === props.messages.length - 1}
          agentMode={props.agentMode} r1pxcAvatar={props.r1pxcAvatar} userAvatarUrl={props.userAvatarUrl}
          showThinking={props.showThinking} onQuote={props.onQuote} onReportIssue={props.onReportIssue}
          navigateToSettingsTab={props.navigateToSettingsTab} />
      ))}
    </div>);
  }
  if (tree.type === ChatMessage || tree.type === ChatSessionItem) {
    const component = tree.type as unknown as { type: (props: object) => ReactNode };
    return expandChatRows(component.type(tree.props));
  }
  return cloneElement(tree as ReactElement<{ children?: ReactNode }>, {},
    ...Children.toArray(tree.props.children).map(expandChatRows));
}
