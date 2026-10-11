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
 * @file AiChatTab.tsx
 * @description 最大展开模式 — AI 对话 Tab（OpenAI 兼容 API + 流式输出）
 * @author 鸡哥
 */

import React, { useCallback, useEffect } from 'react';
import useIslandStore from '../../../../../../store/slices';
import { useTranslation } from 'react-i18next';
import { SvgIcon, resolveDevIconByFileName } from '../../../../../../utils/SvgIcon';
import { SESSION_STREAMING_IDS } from '../hooks/useChatState';
import { useChatState } from '../hooks/useChatState';
import { useChatSend } from '../hooks/useChatSend';
import { AssistantMarkdown } from './AssistantMarkdown';
import { MessageTimeline } from './MessageTimeline';
import { WebAccessPanel, LocalToolAccessPanel } from './WebAccessPanel';
import { ChatInputBar } from './ChatInputBar';
import { normalizeMarkdownCodeFences } from '../utils/chatUtils';

/**
 * AI 对话 Tab
 * @description 包含消息列表和输入栏的聊天界面，调用 OpenAI 兼容 API
 */
export function AiChatContent(): React.ReactElement {
  const { t } = useTranslation();
  const state = useChatState();
  const send = useChatSend({ state });

  const {
    isProUser,
    chatRootRef, chatEndRef, inputRef,
    agentMode,
    showSessionSidebar,
    hasLoginSession, userAvatarUrl,
    currentAgentModeConfig,
    setVisibleWindowStart,
    hasUpperHiddenMessages, hasLowerHiddenMessages,
    emptyGreeting, visibleMessages, visibleStartIndex,
    orderedSessions, getSessionCardState,
    aiChatMessages, aiChatStreaming, activeAiChatSessionId,
    aiWebAccessPrompt, aiLocalToolAccessPrompt,
    aiConfig,
    setAiChatStreaming,
    switchAiChatSession,
    deleteAiChatSession,
    setLogin, setRegister,
    dominantColor,
    VISIBLE_CHAT_WINDOW_SIZE, VISIBLE_CHAT_WINDOW_STEP,
  } = state;

  const {
    handleSend,
    handleResolveWebAccess,
    handleResolveLocalToolAccess,
    handleDomainPolicyChange,
    handleAttachFiles,
    handleAttachmentDragEnter,
    handleAttachmentDragOver,
    handleAttachmentDragLeave,
    handleAttachmentDropEvent,
    handleReportIssueFromFinalAnswer,
    navigateToSettingsTab,
  } = send;

  /** 回车发送 */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (!hasLoginSession) {
    return (
      <div className="max-expand-chat" ref={chatRootRef}>
        <div className="max-expand-chat-header">
          <span className="max-expand-chat-header-title">{currentAgentModeConfig.label} Agent</span>
        </div>
        <div className="settings-user-auth">
          <div className="settings-user-auth-entry-title">
            {t('aiChat.auth.entryTitle', { defaultValue: '登录后即可使用 AI 智能助手' })}
          </div>
          <div className="settings-user-auth-entry-actions">
            <button type="button" className="settings-user-primary-btn" onClick={() => setLogin()}>
              {t('aiChat.auth.gotoLogin', { defaultValue: '前往登录' })}
            </button>
            <button type="button" className="settings-user-secondary-btn" onClick={() => setRegister()}>
              {t('aiChat.auth.gotoRegister', { defaultValue: '前往注册' })}
            </button>
          </div>
          <div className="settings-user-auth-hint">
            {t('aiChat.auth.hint', { defaultValue: 'mihtnelis Agent 为登录用户提供 AI 对话、工具调用与知识检索服务。' })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-expand-chat" ref={chatRootRef} style={{ '--chat-dominant-r': Math.max(dominantColor[0], 140), '--chat-dominant-g': Math.max(dominantColor[1], 140), '--chat-dominant-b': Math.max(dominantColor[2], 140) } as React.CSSProperties}>
      {/* 标题 */}
      <div className="max-expand-chat-header">
        <span className="max-expand-chat-header-title">{currentAgentModeConfig.label} Agent</span>
        <div className="max-expand-chat-header-actions">
          <span className="max-expand-chat-header-model">{state.selectedModel || t('aiChat.notConfigured', { defaultValue: '未配置' })}</span>
          <button className="max-expand-chat-clear" onClick={state.handleCreateNewChat} type="button">
            {t('aiChat.actions.newChat', { defaultValue: '新建对话' })}
          </button>
        </div>
      </div>
      <div className="max-expand-chat-body">
        <aside
          className={`max-expand-chat-session-sidebar ${showSessionSidebar ? 'is-open' : 'is-closed'}`}
          aria-hidden={!showSessionSidebar}
        >
          <div className="max-expand-chat-session-sidebar-inner">
            <div className="max-expand-chat-session-sidebar-title">
              {t('aiChat.session.historyTitle', { defaultValue: '历史会话' })}
            </div>
            <div className="max-expand-chat-session-list">
              {orderedSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={`max-expand-chat-session-item ${session.id === activeAiChatSessionId ? 'active' : ''} status-${getSessionCardState(session.id)}`}
                  onClick={() => {
                    if (session.id === activeAiChatSessionId) return;
                    void switchAiChatSession(session.id).catch(() => {});
                    setAiChatStreaming(SESSION_STREAMING_IDS.has(session.id));
                    setVisibleWindowStart(0);
                    state.setResolvingWebAccessDecision(false);
                    state.setResolvingLocalToolAccessDecision(false);
                    state.setPendingQuote(null);
                  }}
                >
                  <span className="max-expand-chat-session-item-main">
                    <span className="max-expand-chat-session-item-title">{session.title || t('aiChat.session.untitled', { defaultValue: '新对话' })}</span>
                    <span className="max-expand-chat-session-item-time">{new Date(session.updatedAt).toLocaleString()}</span>
                  </span>
                  <span className="max-expand-chat-session-item-actions">
                    <span
                      className="max-expand-chat-session-delete"
                      role="button"
                      aria-label={t('aiChat.actions.deleteSession', { defaultValue: '删除会话' })}
                      title={t('aiChat.actions.deleteSession', { defaultValue: '删除会话' })}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void deleteAiChatSession(session.id).catch(() => {});
                      }}
                    >
                      <img src={SvgIcon.DELETE} alt="" />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
        <div className="max-expand-chat-content">
          {/* 消息列表 */}
          <div className="max-expand-chat-messages">
            {hasUpperHiddenMessages && (
              <div className="max-expand-chat-history-tip">
                <button
                  type="button"
                  className="max-expand-chat-history-load-more"
                  onClick={() => {
                    setVisibleWindowStart(prev => Math.max(0, prev - VISIBLE_CHAT_WINDOW_STEP));
                  }}
                >
                  {t('aiChat.actions.loadMoreHistory', { defaultValue: '加载更多对话' })}
                </button>
              </div>
            )}
            {aiChatMessages.length === 0 && (
              <div className="max-expand-chat-empty">
                <div>{emptyGreeting}</div>
                <div className="max-expand-chat-empty-disclaimer">
                  {t('aiChat.messages.aiGeneratedDisclaimer', { defaultValue: '内容由 AI 生成，请仔细甄别。' })}
                </div>
              </div>
            )}
            {visibleMessages.map((msg, i) => {
              const absoluteIndex = visibleStartIndex + i;
              const isEmptyAssistant = msg.role === 'assistant' && !msg.content
                && (!Array.isArray(msg.todoSnapshots) || msg.todoSnapshots.length === 0)
                && (!Array.isArray(msg.thinkBlocks) || msg.thinkBlocks.length === 0)
                && (!Array.isArray(msg.toolCalls) || msg.toolCalls.filter(tc => tc.tool !== 'agent.todo.write').length === 0)
                && !(aiChatStreaming && absoluteIndex === aiChatMessages.length - 1);
              if (isEmptyAssistant) return null;

              {/* r1pxc 模式助手消息 */}
              if (agentMode === 'r1pxc' && msg.role === 'assistant') {
                const isLatest = absoluteIndex === aiChatMessages.length - 1;
                const r1pxcAvatarRaw = typeof aiConfig.r1pxcAvatar === 'string' ? aiConfig.r1pxcAvatar.trim() : '';
                const r1pxcAvatarUrl = r1pxcAvatarRaw.startsWith('data:image/') ? r1pxcAvatarRaw : '';
                const rawSegments = msg.content
                  ? msg.content.split(/\n\n+/).filter((s) => s.trim().length > 0)
                  : [];
                const segments: string[] = [];
                for (let si = 0; si < rawSegments.length; si++) {
                  if (/^>\s*引用:/.test(rawSegments[si]) && si + 1 < rawSegments.length) {
                    segments.push(rawSegments[si] + '\n' + rawSegments[si + 1]);
                    si++;
                  } else {
                    segments.push(rawSegments[si]);
                  }
                }
                if (segments.length === 0 && aiChatStreaming && isLatest) {
                  return (
                    <div key={absoluteIndex} className="max-expand-chat-agent-row r1pxc-chat">
                      {r1pxcAvatarUrl ? (
                        <img className="max-expand-chat-agent-avatar max-expand-chat-avatar--clickable" src={r1pxcAvatarUrl} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} onClick={() => navigateToSettingsTab('ai')} />
                      ) : (
                        <img className="max-expand-chat-agent-avatar max-expand-chat-agent-avatar--placeholder max-expand-chat-avatar--clickable" src={SvgIcon.USER} alt="" onClick={() => navigateToSettingsTab('ai')} />
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
                  <div key={absoluteIndex} className="max-expand-chat-agent-row r1pxc-chat">
                    {r1pxcAvatarUrl ? (
                      <img className="max-expand-chat-agent-avatar max-expand-chat-avatar--clickable" src={r1pxcAvatarUrl} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} onClick={() => navigateToSettingsTab('ai')} />
                    ) : (
                      <img className="max-expand-chat-agent-avatar max-expand-chat-agent-avatar--placeholder max-expand-chat-avatar--clickable" src={SvgIcon.USER} alt="" onClick={() => navigateToSettingsTab('ai')} />
                    )}
                    <div className="max-expand-chat-agent-bubbles">
                      {segments.map((seg, si) => {
                        const quoteMatch = seg.match(/^>\s*引用:\s*(.*)/);
                        const quoteText = quoteMatch ? quoteMatch[1].trim() : null;
                        const bodyText = quoteMatch ? seg.replace(/^>\s*引用:\s*.*\n?/, '').trim() : seg;
                        return (
                          <div
                            key={`${absoluteIndex}-${si}`}
                            className="max-expand-chat-bubble ai r1pxc-chat max-expand-chat-bubble--hoverable"
                          >
                            {quoteText && (
                              <div className="max-expand-chat-quote-block">
                                <span className="max-expand-chat-quote-block-text">{quoteText.length > 80 ? quoteText.slice(0, 80) + '…' : quoteText}</span>
                              </div>
                            )}
                            {bodyText && <AssistantMarkdown content={normalizeMarkdownCodeFences(bodyText)} />}
                            <span className="max-expand-chat-bubble-actions">
                              <button type="button" onClick={() => { state.setPendingQuote(seg.trim()); inputRef.current?.focus(); }}>{t('aiChat.actions.quote', { defaultValue: '引用' })}</button>
                              <button type="button" onClick={() => { navigator.clipboard.writeText(seg.trim()).catch(() => {}); }}>{t('aiChat.actions.copy', { defaultValue: '复制' })}</button>
                            </span>
                          </div>
                        );
                      })}
                      {aiChatStreaming && isLatest && (
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

              {/* 用户消息 */}
              if (msg.role === 'user') {
                return (
                  <div key={absoluteIndex} className={`max-expand-chat-user-row${agentMode === 'r1pxc' ? ' r1pxc-chat' : ''}`}>
                    <div className={`max-expand-chat-bubble user${agentMode === 'r1pxc' ? ' r1pxc-chat' : ''}`}>
                      {msg.quote && agentMode === 'r1pxc' && (
                        <div className="max-expand-chat-quote-block">
                          <span className="max-expand-chat-quote-block-text">{msg.quote.length > 80 ? msg.quote.slice(0, 80) + '…' : msg.quote}</span>
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
                      <img className="max-expand-chat-user-avatar max-expand-chat-avatar--clickable" src={userAvatarUrl} alt="" onClick={() => navigateToSettingsTab('user-info')} />
                    ) : (
                      <span className="max-expand-chat-user-avatar max-expand-chat-user-avatar--placeholder max-expand-chat-avatar--clickable" onClick={() => navigateToSettingsTab('user-info')} />
                    )}
                  </div>
                );
              }

              {/* 普通助手消息（非 r1pxc） */}
              return (
                <div
                  key={absoluteIndex}
                  className={`max-expand-chat-bubble ai${agentMode === 'r1pxc' ? ' r1pxc-chat' : ''}`}
                >
                  <MessageTimeline
                    msg={msg}
                    absoluteIndex={absoluteIndex}
                    totalMessages={aiChatMessages.length}
                    isStreaming={aiChatStreaming}
                    showThinking={Boolean(aiConfig.deepseekThinking)}
                    onReportIssue={handleReportIssueFromFinalAnswer}
                  />
                </div>
              );
            })}
            {hasLowerHiddenMessages && (
              <div className="max-expand-chat-history-tip">
                <button
                  type="button"
                  className="max-expand-chat-history-load-more"
                  onClick={() => {
                    const maxStart = Math.max(0, aiChatMessages.length - VISIBLE_CHAT_WINDOW_SIZE);
                    setVisibleWindowStart(prev => Math.min(maxStart, prev + VISIBLE_CHAT_WINDOW_STEP));
                  }}
                >
                  {t('aiChat.actions.loadMoreHistory', { defaultValue: '加载更多对话' })}
                </button>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          {/* 网页访问授权面板 */}
          {aiWebAccessPrompt?.sessionId === activeAiChatSessionId && (
            <WebAccessPanel
              iconUrl={aiWebAccessPrompt.iconUrl}
              siteName={aiWebAccessPrompt.siteName}
              hostname={aiWebAccessPrompt.hostname}
              url={aiWebAccessPrompt.url}
              message={aiWebAccessPrompt.message}
              domainPolicy={aiWebAccessPrompt.domainPolicy}
              resolving={state.resolvingWebAccessDecision}
              resolveError={state.aiWebAccessResolveError}
              onResolve={handleResolveWebAccess}
              onPolicyChange={handleDomainPolicyChange}
            />
          )}
          {/* 本地工具访问授权面板 */}
          {aiLocalToolAccessPrompt?.sessionId === activeAiChatSessionId && (
            <LocalToolAccessPanel
              prompt={aiLocalToolAccessPrompt}
              resolving={state.resolvingLocalToolAccessDecision}
              resolveError={state.aiLocalToolAccessResolveError}
              onResolve={handleResolveLocalToolAccess}
            />
          )}
        </div>
      </div>
      {/* 输入栏 */}
      <ChatInputBar
        input={state.input}
        setInput={state.setInput}
        isStreaming={aiChatStreaming}
        agentMode={agentMode}
        currentAgentModeConfig={currentAgentModeConfig}
        selectedModel={state.selectedModel}
        isOllamaModel={state.isOllamaModel}
        isCustomApiModel={state.isCustomApiModel}
        modelToggleIcon={state.modelToggleIcon}
        customApiDisplayLabel={state.customApiDisplayLabel}
        ollamaDisplayLabel={state.ollamaDisplayLabel}
        isProUser={isProUser}
        hasCustomApiCredentials={state.hasCustomApiCredentials}
        aiConfig={aiConfig}
        setAiConfig={state.setAiConfig}
        contextUsageTokens={state.contextUsageTokens}
        selectedContextLimit={state.selectedContextLimit}
        contextUsagePercent={state.contextUsagePercent}
        contextUsagePercentText={state.contextUsagePercentText}
        contextUsageLevelClass={state.contextUsageLevelClass}
        contextUsageInlineText={state.contextUsageInlineText}
        selectedContextLabel={state.selectedContextLabel}
        showModelCard={state.showModelCard}
        setShowModelCard={state.setShowModelCard}
        showModelDropdown={state.showModelDropdown}
        setShowModelDropdown={state.setShowModelDropdown}
        modelDropdownRef={state.modelDropdownRef}
        showContextDropdown={state.showContextDropdown}
        setShowContextDropdown={state.setShowContextDropdown}
        contextDropdownRef={state.contextDropdownRef}
        showAgentModeDropdown={state.showAgentModeDropdown}
        toggleAgentModeDropdown={state.toggleAgentModeDropdown}
        setAgentMode={state.setAgentMode}
        agentModeDropdownRef={state.agentModeDropdownRef}
        agentModeTriggerRef={state.agentModeTriggerRef}
        agentModeDropdownPos={state.agentModeDropdownPos}
        showSessionSidebar={showSessionSidebar}
        setShowSessionSidebar={state.setShowSessionSidebar}
        pendingAttachments={state.pendingAttachments}
        setPendingAttachments={state.setPendingAttachments}
        fileInputRef={state.fileInputRef}
        attachmentDragOver={state.attachmentDragOver}
        attachmentDropInvalid={state.attachmentDropInvalid}
        handleAttachmentDragEnter={handleAttachmentDragEnter}
        handleAttachmentDragOver={handleAttachmentDragOver}
        handleAttachmentDragLeave={handleAttachmentDragLeave}
        handleAttachmentDropEvent={handleAttachmentDropEvent}
        handleAttachFiles={handleAttachFiles}
        skillDragOver={state.skillDragOver}
        setSkillDragOver={state.setSkillDragOver}
        skillDragDepthRef={state.skillDragDepthRef}
        pendingQuote={state.pendingQuote}
        setPendingQuote={state.setPendingQuote}
        handleSend={handleSend}
        handleStop={state.handleStop}
        handleKeyDown={handleKeyDown}
        inputRef={inputRef}
        selectedProvider={state.selectedProvider}
      />
    </div>
  );
}

/**
 * 按需加载当前会话，离开聊天后释放未运行的正文。
 * @returns 聊天加载状态或内容。
 */
export function AiChatTab(): React.ReactElement {
  const { t } = useTranslation();
  const ready = useIslandStore((state) => state.aiChatReady);
  const loading = useIslandStore((state) => state.aiChatLoading);
  const failed = useIslandStore((state) => state.aiChatStorageError);
  const ensure = useIslandStore((state) => state.ensureAiChatReady);
  const release = useIslandStore((state) => state.releaseAiChatBodies);
  useEffect(() => { void ensure().catch(() => {}); return release; }, [ensure, release]);
  return <div className="flex h-full min-h-0 w-full flex-col">
    {failed && <button type="button" onClick={() => { void ensure().catch(() => {}); }}>{t('aiChat.storageRetry')}</button>}
    {loading && <div role="status">{t('aiChat.storageLoading')}</div>}
    {ready && <div className="flex min-h-0 flex-1 flex-col" inert={loading || failed}><AiChatContent /></div>}
  </div>;
}
