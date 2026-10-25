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
import { SESSION_STREAMING_IDS } from '../hooks/useChatState';
import { useChatState } from '../hooks/useChatState';
import { useChatSend } from '../hooks/useChatSend';
import { VirtualChatMessages } from './virtualChatMessages';
import ChatSessionItem from './chatSessionItem';
import { WebAccessPanel, LocalToolAccessPanel } from './WebAccessPanel';
import { ChatInputBar } from './ChatInputBar';
import { ChatMessagesSkeleton, ChatSessionListSkeleton } from './chatLoadingSkeleton';

interface AiChatContentProps {
  /** 会话正文尚未就绪：历史会话侧栏与消息区显示骨架，标题栏与输入栏照常显示 */
  loading?: boolean;
}

/**
 * AI 对话 Tab
 * @description 包含消息列表和输入栏的聊天界面，调用 OpenAI 兼容 API
 * @param props - 组件属性
 * @param props.loading - 会话正文尚未就绪时为 true
 * @returns 聊天界面元素
 */
export function AiChatContent({ loading = false }: AiChatContentProps): React.ReactElement {
  const { t } = useTranslation();
  const state = useChatState();
  const send = useChatSend({ state });

  const {
    isProUser,
    chatRootRef, inputRef,
    agentMode,
    showSessionSidebar,
    hasLoginSession, userAvatarUrl,
    currentAgentModeConfig,
    emptyGreeting, hasActiveTextSelection,
    orderedSessions, getSessionCardState,
    aiChatMessages, aiChatStreaming, activeAiChatSessionId,
    aiWebAccessPrompt, aiLocalToolAccessPrompt,
    aiConfig,
    setAiChatStreaming,
    switchAiChatSession,
    deleteAiChatSession,
    setLogin, setRegister,
    dominantColor,
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

  const { setPendingQuote, setResolvingWebAccessDecision, setResolvingLocalToolAccessDecision } = state;
  const handleSelectSession = useCallback((id: string): void => {
    if (id === activeAiChatSessionId) return;
    void switchAiChatSession(id).catch(() => {});
    setAiChatStreaming(SESSION_STREAMING_IDS.has(id));
    setResolvingWebAccessDecision(false);
    setResolvingLocalToolAccessDecision(false);
    setPendingQuote(null);
  }, [activeAiChatSessionId, switchAiChatSession, setAiChatStreaming,
    setResolvingWebAccessDecision, setResolvingLocalToolAccessDecision, setPendingQuote]);
  const handleDeleteSession = useCallback((id: string): void => {
    void deleteAiChatSession(id).catch(() => {});
  }, [deleteAiChatSession]);
  /** 保持引用回调稳定，使输入和流式更新不会使历史消息失效。 */
  const handleQuote = useCallback((text: string): void => {
    setPendingQuote(text);
    inputRef.current?.focus();
  }, [inputRef, setPendingQuote]);

  const activeWebAccessPrompt = aiWebAccessPrompt?.sessionId === activeAiChatSessionId ? aiWebAccessPrompt : null;
  const activeLocalToolAccessPrompt = aiLocalToolAccessPrompt?.sessionId === activeAiChatSessionId ? aiLocalToolAccessPrompt : null;
  const hasActiveAuthorization = Boolean(activeWebAccessPrompt || activeLocalToolAccessPrompt);

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
      {/* 切换或读取会话期间只有历史会话侧栏与消息区显示骨架，标题栏与输入栏照常可用；侧栏收起时骨架随之隐藏。 */}
      <div className="max-expand-chat-body">
        <aside
          className={`max-expand-chat-session-sidebar ${showSessionSidebar ? 'is-open' : 'is-closed'}`}
          aria-hidden={!showSessionSidebar}
        >
          <div className="max-expand-chat-session-sidebar-inner">
            {loading ? <ChatSessionListSkeleton /> : (
              <>
                <div className="max-expand-chat-session-sidebar-title">
                  {t('aiChat.session.historyTitle', { defaultValue: '历史会话' })}
                </div>
                <div className="max-expand-chat-session-list">
                  {orderedSessions.map((session) => (
                    <ChatSessionItem
                      key={session.id}
                      id={session.id}
                      title={session.title}
                      updatedAt={session.updatedAt}
                      active={session.id === activeAiChatSessionId}
                      status={getSessionCardState(session.id)}
                      onSelect={handleSelectSession}
                      onDelete={handleDeleteSession}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>
        <div className="max-expand-chat-content">
          {/* 消息列表 */}
          {loading ? <ChatMessagesSkeleton /> : (
            <VirtualChatMessages
              key={activeAiChatSessionId}
              messages={aiChatMessages}
              isStreaming={aiChatStreaming}
              agentMode={agentMode}
              r1pxcAvatar={aiConfig.r1pxcAvatar}
              userAvatarUrl={userAvatarUrl}
              showThinking={Boolean(aiConfig.deepseekThinking)}
              onQuote={handleQuote}
              onReportIssue={handleReportIssueFromFinalAnswer}
              navigateToSettingsTab={navigateToSettingsTab}
              hasActiveTextSelection={hasActiveTextSelection}
              emptyContent={(
                <div className="max-expand-chat-empty">
                  <div>{emptyGreeting}</div>
                  <div className="max-expand-chat-empty-disclaimer">
                    {t('aiChat.messages.aiGeneratedDisclaimer', { defaultValue: '内容由 AI 生成，请仔细甄别。' })}
                  </div>
                </div>
              )}
            />
          )}

        </div>
      </div>
      {hasActiveAuthorization && (
        <div className="max-expand-chat-access-drawer" role="dialog"
          aria-label={t(activeLocalToolAccessPrompt ? 'aiChat.localToolAccess.title' : 'aiChat.webAccess.title')}
          onWheelCapture={(event) => { event.stopPropagation(); }}
          onWheel={(event) => { event.stopPropagation(); }}
        >
          {activeLocalToolAccessPrompt ? (
            <LocalToolAccessPanel
              prompt={activeLocalToolAccessPrompt}
              resolving={state.resolvingLocalToolAccessDecision}
              resolveError={state.aiLocalToolAccessResolveError}
              onResolve={handleResolveLocalToolAccess}
            />
          ) : activeWebAccessPrompt && (
            <WebAccessPanel
              iconUrl={activeWebAccessPrompt.iconUrl}
              siteName={activeWebAccessPrompt.siteName}
              hostname={activeWebAccessPrompt.hostname}
              url={activeWebAccessPrompt.url}
              message={activeWebAccessPrompt.message}
              domainPolicy={activeWebAccessPrompt.domainPolicy}
              resolving={state.resolvingWebAccessDecision}
              resolveError={state.aiWebAccessResolveError}
              onResolve={handleResolveWebAccess}
              onPolicyChange={handleDomainPolicyChange}
            />
          )}
        </div>
      )}
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
        showModelCard={state.showModelCard && !hasActiveAuthorization}
        modelCardDisabled={hasActiveAuthorization}
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
 * @returns 聊天界面，读取失败时叠加重试入口。
 */
export function AiChatTab(): React.ReactElement {
  const { t } = useTranslation();
  const ready = useIslandStore((state) => state.aiChatReady);
  const loading = useIslandStore((state) => state.aiChatLoading);
  const failed = useIslandStore((state) => state.aiChatStorageError);
  const ensure = useIslandStore((state) => state.ensureAiChatReady);
  const release = useIslandStore((state) => state.releaseAiChatBodies);
  useEffect(() => { void ensure().catch(() => {}); return release; }, [ensure, release]);
  // 首次读取完成前也挂载聊天界面，标题栏与输入栏照常显示，正文就绪前由侧栏与消息区骨架占位；读取失败时以重试覆盖整个页面。
  return (
    <div className="relative isolate flex size-full min-h-0 flex-col overflow-hidden" aria-busy={loading}>
      <div className="flex min-h-0 flex-1 flex-col" inert={failed}><AiChatContent loading={loading || !ready} /></div>
      {loading && !failed && <span className="sr-only" role="status">{t('aiChat.storageLoading')}</span>}
      {failed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--color-island-bg)] text-center text-sm text-[rgb(var(--color-text-rgb))]" role="status">
          <button className="m-4" type="button" disabled={loading} onClick={() => { void ensure().catch(() => {}); }}>{t('aiChat.storageRetry')}</button>
        </div>
      )}
    </div>
  );
}
