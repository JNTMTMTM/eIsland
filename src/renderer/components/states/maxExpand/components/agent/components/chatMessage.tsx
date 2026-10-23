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
 * @file chatMessage.tsx
 * @description 独立缓存消息行，避免流式更新和输入时重复渲染历史内容。
 * @author 鸡哥
 */

/* eslint-disable better-tailwindcss/no-unknown-classes -- 复用聊天页面现有的语义 CSS 类。 */
/* eslint-disable jsx-a11y/no-noninteractive-element-to-interactive-role -- 保留头像 img 布局，已提供按钮角色、键盘与焦点交互。 */
/* eslint-disable react/jsx-no-bind -- 消息行已由 memo 隔离；分段操作需要捕获对应片段。 */

import { memo, type KeyboardEvent, type ReactElement, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon, resolveDevIconByFileName } from '../../../../../../utils/SvgIcon';
import { normalizeMarkdownCodeFences } from '../utils/chatUtils';
import { AssistantMarkdown } from './AssistantMarkdown';
import { MessageTimeline } from './MessageTimeline';
import type { AiChatMessage } from '../../../../../../store/types';
import type { AgentMode } from '../config/chatConstants';

/** 消息行仅接收影响自身显示的状态，保持历史消息的属性稳定。 */
interface ChatMessageProps {
  msg: AiChatMessage;
  absoluteIndex: number;
  isLatest: boolean;
  isStreaming: boolean;
  agentMode: AgentMode;
  r1pxcAvatar: string | undefined;
  userAvatarUrl: string | null;
  showThinking: boolean;
  onQuote: (text: string) => void;
  onReportIssue: (traceId: string, finalAnswer: string) => void;
  navigateToSettingsTab: (intent: string) => void;
}

/**
 * 渲染单条用户或助手消息；未变化的历史消息跳过解析、分段及 DOM 协调。
 * @param props - 消息及稳定的交互回调。
 * @returns 消息行或空占位。
 */
function ChatMessage(props: ChatMessageProps): ReactElement | null {
  const {
    msg, absoluteIndex, isLatest, isStreaming, agentMode, r1pxcAvatar,
    userAvatarUrl, showThinking, onQuote, onReportIssue, navigateToSettingsTab,
  } = props;
  const { t } = useTranslation();
  const handleAgentAvatarClick = (): void => navigateToSettingsTab('ai');
  const handleUserAvatarClick = (): void => navigateToSettingsTab('user-info');
  const handleAgentAvatarKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleAgentAvatarClick();
  };
  const handleUserAvatarKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleUserAvatarClick();
  };
  const handleAvatarError = (event: SyntheticEvent<HTMLImageElement>): void => {
    const avatar = event.target as HTMLImageElement;
    avatar.style.display = 'none';
  };
  const copySegment = (segment: string): void => {
    // eslint-disable-next-line promise/prefer-await-to-then -- 保持同步点击回调，并处理系统拒绝剪贴板访问的情况。
    navigator.clipboard.writeText(segment.trim()).catch(() => {});
  };
  const isEmptyAssistant = msg.role === 'assistant' && !msg.content
    && (!Array.isArray(msg.todoSnapshots) || msg.todoSnapshots.length === 0)
    && (!Array.isArray(msg.thinkBlocks) || msg.thinkBlocks.length === 0)
    && (!Array.isArray(msg.toolCalls) || msg.toolCalls.filter((tc) => tc.tool !== 'agent.todo.write').length === 0)
    && !isStreaming;
  if (isEmptyAssistant) return null;

  // r1pxc 模式助手消息
  if (agentMode === 'r1pxc' && msg.role === 'assistant') {
    const r1pxcAvatarRaw = typeof r1pxcAvatar === 'string' ? r1pxcAvatar.trim() : '';
    const r1pxcAvatarUrl = r1pxcAvatarRaw.startsWith('data:image/') ? r1pxcAvatarRaw : '';
    const rawSegments = msg.content
      ? msg.content.split(/\n\n+/).filter((s) => s.trim().length > 0)
      : [];
    const segments: string[] = [];
    for (let si = 0; si < rawSegments.length; si++) {
      if (/^>\s*引用:/.test(rawSegments[si]) && si + 1 < rawSegments.length) {
        segments.push(`${rawSegments[si]}\n${rawSegments[si + 1]}`);
        si++;
      } else {
        segments.push(rawSegments[si]);
      }
    }
    if (segments.length === 0 && isStreaming) {
      return (
        <div className="max-expand-chat-agent-row r1pxc-chat">
          {r1pxcAvatarUrl ? (
            <img className="max-expand-chat-agent-avatar max-expand-chat-avatar--clickable" src={r1pxcAvatarUrl} alt="" onError={handleAvatarError} role="button" tabIndex={0} onKeyDown={handleAgentAvatarKeyDown} onClick={handleAgentAvatarClick} />
          ) : (
            <img className="max-expand-chat-agent-avatar max-expand-chat-agent-avatar--placeholder max-expand-chat-avatar--clickable" src={SvgIcon.USER} alt="" role="button" tabIndex={0} onKeyDown={handleAgentAvatarKeyDown} onClick={handleAgentAvatarClick} />
          )}
          <div className="max-expand-chat-bubble ai r1pxc-chat">
            <div className="max-expand-chat-loading-row">
              <span className="max-expand-chat-generating-dots"><i /><i /><i /></span>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="max-expand-chat-agent-row r1pxc-chat">
        {r1pxcAvatarUrl ? (
          <img className="max-expand-chat-agent-avatar max-expand-chat-avatar--clickable" src={r1pxcAvatarUrl} alt="" onError={handleAvatarError} role="button" tabIndex={0} onKeyDown={handleAgentAvatarKeyDown} onClick={handleAgentAvatarClick} />
        ) : (
          <img className="max-expand-chat-agent-avatar max-expand-chat-agent-avatar--placeholder max-expand-chat-avatar--clickable" src={SvgIcon.USER} alt="" role="button" tabIndex={0} onKeyDown={handleAgentAvatarKeyDown} onClick={handleAgentAvatarClick} />
        )}
        <div className="max-expand-chat-agent-bubbles">
          {segments.map((seg, si) => {
            const quoteMatch = seg.match(/^>\s*引用:\s*(.*)/);
            const quoteText = quoteMatch ? quoteMatch[1].trim() : null;
            const bodyText = quoteMatch ? seg.replace(/^>\s*引用:\s*.*\n?/, '').trim() : seg;
            return (
              // eslint-disable-next-line react/no-array-index-key -- 流式分段没有独立 ID，索引在追加时保持稳定。
              <div key={`${absoluteIndex}-${si}`}
                className="max-expand-chat-bubble ai r1pxc-chat max-expand-chat-bubble--hoverable"
              >
                {quoteText && (
                  <div className="max-expand-chat-quote-block">
                    <span className="max-expand-chat-quote-block-text">{quoteText.length > 80 ? `${quoteText.slice(0, 80)}…` : quoteText}</span>
                  </div>
                )}
                {bodyText && <AssistantMarkdown content={normalizeMarkdownCodeFences(bodyText)} />}
                <span className="max-expand-chat-bubble-actions">
                  <button type="button" onClick={() => { onQuote(seg.trim()); }}>{t('aiChat.actions.quote', { defaultValue: '引用' })}</button>
                  <button type="button" onClick={() => { copySegment(seg); }}>{t('aiChat.actions.copy', { defaultValue: '复制' })}</button>
                </span>
              </div>
            );
          })}
          {isStreaming && (
            <div key={`${absoluteIndex}-dots`} className="max-expand-chat-bubble ai r1pxc-chat">
              <div className="max-expand-chat-loading-row">
                <span className="max-expand-chat-generating-dots"><i /><i /><i /></span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 用户消息
  if (msg.role === 'user') {
    return (
      <div className={`max-expand-chat-user-row${agentMode === 'r1pxc' ? ' r1pxc-chat' : ''}`}>
        <div className={`max-expand-chat-bubble user${agentMode === 'r1pxc' ? ' r1pxc-chat' : ''}`}>
          {msg.quote && agentMode === 'r1pxc' && (
            <div className="max-expand-chat-quote-block">
              <span className="max-expand-chat-quote-block-text">{msg.quote.length > 80 ? `${msg.quote.slice(0, 80)}…` : msg.quote}</span>
            </div>
          )}
          {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
            <div className="max-expand-chat-bubble-attachments">
              {msg.attachments.map((a) => (
                <span key={a.name} className="max-expand-chat-bubble-attachment-tag">
                  {resolveDevIconByFileName(a.name) ? (
                    <img className="max-expand-chat-bubble-attachment-icon" src={resolveDevIconByFileName(a.name)} alt="" aria-hidden="true" />
                  ) : (
                    <span className="max-expand-chat-bubble-attachment-icon-fallback" aria-hidden="true" />
                  )}
                  <span>{a.name}</span>
                </span>
              ))}
            </div>
          )}
          {msg.content.replace(/^(?:<attachment name="[^"]*">\n[\s\S]*?\n<\/attachment>\n*)+/, '').replace(/^> 引用: [\s\S]*?\n\n/, '').trim()}
        </div>
        {userAvatarUrl ? (
          <img className="max-expand-chat-user-avatar max-expand-chat-avatar--clickable" src={userAvatarUrl} alt="" role="button" tabIndex={0} onKeyDown={handleUserAvatarKeyDown} onClick={handleUserAvatarClick} />
        ) : (
          <span className="max-expand-chat-user-avatar max-expand-chat-user-avatar--placeholder max-expand-chat-avatar--clickable" role="button" tabIndex={0} onKeyDown={handleUserAvatarKeyDown} onClick={handleUserAvatarClick} />
        )}
      </div>
    );
  }

  // 普通助手消息（非 r1pxc）
  return (
    <div className={`max-expand-chat-bubble ai${agentMode === 'r1pxc' ? ' r1pxc-chat' : ''}`}
    >
      <MessageTimeline msg={msg}
        absoluteIndex={absoluteIndex}
        isLatestMessage={isLatest}
        isStreaming={isStreaming}
        showThinking={showThinking}
        onReportIssue={onReportIssue}
      />
    </div>
  );
}

export default memo(ChatMessage);

/* eslint-enable better-tailwindcss/no-unknown-classes, react/jsx-no-bind, jsx-a11y/no-noninteractive-element-to-interactive-role -- 恢复项目默认规则。 */
