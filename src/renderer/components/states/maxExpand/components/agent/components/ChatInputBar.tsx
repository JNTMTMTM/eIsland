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
 * @file ChatInputBar.tsx
 * @description AI 对话输入栏组件：模型选择卡片、附件拖放、Agent 模式切换、消息输入与发送。
 * @author 鸡哥
 */

import type { Dispatch, DragEvent, KeyboardEvent, MutableRefObject, ReactElement, RefObject, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon, resolveDevIconByFileName } from '../../../../../../utils/SvgIcon';
import type { AiConfig } from '../../../../../../store/types';
import {
  AGENT_MODES,
  ATTACHMENT_ACCEPT_EXTENSIONS,
  ATTACHMENT_MAX_COUNT,
  CONTEXT_LIMIT_OPTIONS,
  type AgentMode,
} from '../config/chatConstants';
import {
  isMinimaxModel,
} from '../utils/chatHelpers';

/** ChatInputBar 组件 Props */
interface ChatInputBarProps {
  /** 当前输入文本 */
  input: string;
  setInput: (value: string) => void;
  /** 是否正在流式生成 */
  isStreaming: boolean;
  /** Agent 模式 */
  agentMode: AgentMode;
  /** 当前 agent 模式配置 */
  currentAgentModeConfig: (typeof AGENT_MODES)[number];
  /** 模型相关 */
  selectedModel: string;
  isOllamaModel: boolean;
  isCustomApiModel: boolean;
  modelToggleIcon: string | null;
  customApiDisplayLabel: string;
  ollamaDisplayLabel: string;
  /** 用户 Pro 状态 */
  isProUser: boolean;
  /** 自定义 API 凭据 */
  hasCustomApiCredentials: boolean;
  /** AI 配置 */
  aiConfig: AiConfig;
  setAiConfig: (partial: Partial<AiConfig>) => void;
  /** 上下文使用量 */
  contextUsageTokens: number;
  selectedContextLimit: number;
  contextUsagePercent: number;
  contextUsagePercentText: string;
  contextUsageLevelClass: string;
  contextUsageInlineText: string;
  selectedContextLabel: string;
  /** 模型选择下拉 */
  showModelCard: boolean;
  /** 当前会话等待授权时，模型卡片入口让位给授权浮层。 */
  modelCardDisabled?: boolean;
  setShowModelCard: (v: boolean | ((prev: boolean) => boolean)) => void;
  showModelDropdown: boolean;
  setShowModelDropdown: (v: boolean | ((prev: boolean) => boolean)) => void;
  modelDropdownRef: RefObject<HTMLDivElement | null>;
  /** 上下文下拉 */
  showContextDropdown: boolean;
  setShowContextDropdown: (v: boolean | ((prev: boolean) => boolean)) => void;
  contextDropdownRef: RefObject<HTMLDivElement | null>;
  /** Agent 模式下拉 */
  showAgentModeDropdown: boolean;
  toggleAgentModeDropdown: () => void;
  setAgentMode: (mode: AgentMode) => void;
  agentModeDropdownRef: RefObject<HTMLDivElement | null>;
  agentModeTriggerRef: RefObject<HTMLButtonElement | null>;
  agentModeDropdownPos: { left: number; bottom: number } | null;
  /** 会话历史 */
  showSessionSidebar: boolean;
  setShowSessionSidebar: (v: boolean | ((prev: boolean) => boolean)) => void;
  /** 附件 */
  pendingAttachments: Array<{ name: string; size: number; content: string }>;
  setPendingAttachments: (v: Array<{ name: string; size: number; content: string }> | ((prev: Array<{ name: string; size: number; content: string }>) => Array<{ name: string; size: number; content: string }>)) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  attachmentDragOver: boolean;
  attachmentDropInvalid: boolean;
  handleAttachmentDragEnter: (e: DragEvent<HTMLDivElement>) => void;
  handleAttachmentDragOver: (e: DragEvent<HTMLDivElement>) => void;
  handleAttachmentDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  handleAttachmentDropEvent: (e: DragEvent<HTMLDivElement>) => void;
  handleAttachFiles: (files: FileList | File[]) => void;
  /** Skills 拖放 */
  skillDragOver: boolean;
  setSkillDragOver: Dispatch<SetStateAction<boolean>>;
  skillDragDepthRef: MutableRefObject<number>;
  /** 引用 */
  pendingQuote: string | null;
  setPendingQuote: (quote: string | null) => void;
  /** 操作 */
  handleSend: () => void;
  /** 会话读取完成前禁用发送并将输入框设为只读，避免输入后回车或点击发送被静默忽略 */
  sendDisabled?: boolean;
  handleStop: () => void;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  /** refs */
  inputRef: RefObject<HTMLTextAreaElement | null>;
  /** Provider 信息 */
  selectedProvider: string;
}

/** AI 对话输入栏 */
export function ChatInputBar(props: ChatInputBarProps): ReactElement {
  const { t } = useTranslation();
  const {
    input, setInput,
    isStreaming,
    agentMode,
    currentAgentModeConfig,
    selectedModel,
    isOllamaModel,
    isCustomApiModel,
    modelToggleIcon,
    customApiDisplayLabel,
    ollamaDisplayLabel,
    isProUser,
    hasCustomApiCredentials,
    aiConfig, setAiConfig,
    contextUsageTokens,
    selectedContextLimit,
    contextUsagePercent,
    contextUsagePercentText,
    contextUsageLevelClass,
    contextUsageInlineText,
    selectedContextLabel,
    showModelCard, setShowModelCard, modelCardDisabled = false,
    showModelDropdown, setShowModelDropdown,
    modelDropdownRef,
    showContextDropdown, setShowContextDropdown,
    contextDropdownRef,
    showAgentModeDropdown, toggleAgentModeDropdown, setAgentMode,
    agentModeDropdownRef, agentModeTriggerRef, agentModeDropdownPos,
    showSessionSidebar, setShowSessionSidebar,
    pendingAttachments, setPendingAttachments,
    fileInputRef,
    attachmentDragOver, attachmentDropInvalid,
    handleAttachmentDragEnter, handleAttachmentDragOver, handleAttachmentDragLeave, handleAttachmentDropEvent,
    handleAttachFiles,
    skillDragOver, setSkillDragOver, skillDragDepthRef,
    pendingQuote, setPendingQuote,
    handleSend, sendDisabled = false, handleStop, handleKeyDown,
    inputRef,
    selectedProvider,
  } = props;

  const closeModelCard = (): void => {
    setShowModelCard(false);
    setShowModelDropdown(false);
    setShowContextDropdown(false);
  };

  return (
    <div>
      {/* 模型选择卡片 */}
      <div id="ai-chat-model-card"
        className={`max-expand-chat-model-card-wrap ${showModelCard ? 'max-expand-chat-model-card-wrap--open' : ''}`}
        hidden={modelCardDisabled}
        aria-hidden={!showModelCard}
        inert={!showModelCard}
      >
        <div className="max-expand-chat-model-card">
          <div
            className="max-expand-chat-model-card-scroll"
            onWheelCapture={(e) => { e.stopPropagation(); }}
            onWheel={(e) => { e.stopPropagation(); }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 text-xs">
              <span className="opacity-70">{t('aiChat.modelCard.title', { defaultValue: '模型选择卡片' })}</span>
              <button className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-[rgba(var(--color-text-rgb),0.08)]"
                type="button"
                onClick={closeModelCard}
                aria-label={t('agent.actions.close')}
              >×</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* 模型选择 */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{t('settings.ai.model', { defaultValue: '模型' })}</span>
                <div className="max-expand-chat-model-select-shell" ref={modelDropdownRef}>
                  <button
                    type="button"
                    className="max-expand-chat-model-dropdown-trigger"
                    onClick={() => setShowModelDropdown((v) => !v)}
                    title={t('settings.ai.model', { defaultValue: '模型' })}
                  >
                    <span className="max-expand-chat-model-dropdown-trigger-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <img style={{ width: 14, height: 14 }} src={modelToggleIcon || SvgIcon.DEEPSEEK} alt="" />
                      {isCustomApiModel ? customApiDisplayLabel : (isOllamaModel ? ollamaDisplayLabel : selectedModel)}
                    </span>
                    <span className="max-expand-chat-model-dropdown-arrow">▾</span>
                  </button>
                  {showModelDropdown && (
                    <div className="max-expand-chat-model-dropdown-list">
                      {(['deepseek-v4-flash', 'deepseek-v4-pro', 'mimo-v2.5', 'mimo-v2.5-pro', 'MiniMax-M2.7', 'MiniMax-M2.7-highspeed', 'MiniMax-M2.5', 'MiniMax-M2.5-highspeed', 'ollama'] as const).map((m) => {
                        const isOllama = m === 'ollama';
                        const isPro = m === 'deepseek-v4-pro'
                          || m === 'mimo-v2.5-pro'
                          || m === 'MiniMax-M2.7-highspeed'
                          || m === 'MiniMax-M2.5-highspeed'
                          || isOllama;
                        const disabled = isPro && !isProUser;
                        const icon = isOllama ? SvgIcon.OLLAMA : (m.startsWith('mimo-') ? SvgIcon.MIMO : (isMinimaxModel(m) ? SvgIcon.MINIMAX : SvgIcon.DEEPSEEK));
                        const label = isOllama ? (aiConfig.ollamaModel ? `ollama (${aiConfig.ollamaModel})` : 'ollama') : m;
                        return (
                          <button
                            key={m}
                            type="button"
                            className={`max-expand-chat-model-dropdown-item${selectedModel === m ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                            onClick={() => {
                              if (disabled) return;
                              setAiConfig({ model: m });
                              setShowModelDropdown(false);
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <img style={{ width: 14, height: 14 }} src={icon} alt="" />
                              {label}
                            </span>
                            {isPro && <img className="max-expand-chat-model-dropdown-pro-icon" src={SvgIcon.PRO} alt="PRO" />}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        className={`max-expand-chat-model-dropdown-item${isCustomApiModel ? ' active' : ''}${(!isProUser || !hasCustomApiCredentials) ? ' disabled' : ''}`}
                        onClick={() => {
                          if (!isProUser || !hasCustomApiCredentials) return;
                          setAiConfig({ model: 'custom-api' });
                          setShowModelDropdown(false);
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <img style={{ width: 14, height: 14 }} src={SvgIcon.AI} alt="" />
                          {customApiDisplayLabel}
                        </span>
                        <img className="max-expand-chat-model-dropdown-pro-icon" src={SvgIcon.PRO} alt="PRO" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* 推理强度 */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{selectedProvider === 'custom' ? t('settings.ai.customReasoningEffort', { defaultValue: '推理强度' }) : selectedProvider === 'ollama' ? t('settings.ai.ollamaReasoningEffort', { defaultValue: '思考强度' }) : selectedProvider === 'mimo' ? t('settings.ai.mimoReasoningEffort', { defaultValue: 'Mimo 推理强度' }) : selectedProvider === 'minimax' ? t('settings.ai.minimaxReasoningEffort', { defaultValue: 'MiniMax 推理强度' }) : t('settings.ai.deepseekReasoningEffort', { defaultValue: 'DeepSeek 推理强度' })}</span>
                <select
                  className="max-expand-chat-web-access-policy-select"
                  value={aiConfig.deepseekReasoningEffort}
                  onChange={(event) => {
                    const value = event.target.value;
                    setAiConfig({
                      deepseekReasoningEffort: value === 'low' || value === 'high' ? value : 'medium',
                    });
                  }}
                  title={selectedProvider === 'custom' ? t('settings.ai.customReasoningEffort', { defaultValue: '推理强度' }) : selectedProvider === 'ollama' ? t('settings.ai.ollamaReasoningEffort', { defaultValue: '思考强度' }) : selectedProvider === 'mimo' ? t('settings.ai.mimoReasoningEffort', { defaultValue: 'Mimo 推理强度' }) : selectedProvider === 'minimax' ? t('settings.ai.minimaxReasoningEffort', { defaultValue: 'MiniMax 推理强度' }) : t('settings.ai.deepseekReasoningEffort', { defaultValue: 'DeepSeek 推理强度' })}
                  aria-label={selectedProvider === 'custom' ? t('settings.ai.customReasoningEffort', { defaultValue: '推理强度' }) : selectedProvider === 'ollama' ? t('settings.ai.ollamaReasoningEffort', { defaultValue: '思考强度' }) : selectedProvider === 'mimo' ? t('settings.ai.mimoReasoningEffort', { defaultValue: 'Mimo 推理强度' }) : selectedProvider === 'minimax' ? t('settings.ai.minimaxReasoningEffort', { defaultValue: 'MiniMax 推理强度' }) : t('settings.ai.deepseekReasoningEffort', { defaultValue: 'DeepSeek 推理强度' })}
                >
                  <option value="low">{t('settings.ai.deepseekReasoningEffortOptions.low', { defaultValue: '低 (low)' })}</option>
                  <option value="medium">{t('settings.ai.deepseekReasoningEffortOptions.medium', { defaultValue: '中 (medium)' })}</option>
                  <option value="high">{t('settings.ai.deepseekReasoningEffortOptions.high', { defaultValue: '高 (high)' })}</option>
                </select>
              </div>
              {/* 专注模式 */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{t('aiChat.modelCard.focusMode', { defaultValue: '专注模式' })}</span>
                <select
                  className="max-expand-chat-web-access-policy-select"
                  value={aiConfig.deepseekThinking ? 'on' : 'off'}
                  onChange={(event) => {
                    setAiConfig({ deepseekThinking: event.target.value === 'on' });
                  }}
                  disabled={isOllamaModel}
                  title={t('aiChat.modelCard.focusMode', { defaultValue: '专注模式' })}
                  aria-label={t('aiChat.modelCard.focusMode', { defaultValue: '专注模式' })}
                >
                  <option value="off">{t('settings.ai.deepseekThinkingOptions.off', { defaultValue: '关闭' })}</option>
                  <option value="on">{t('settings.ai.deepseekThinkingOptions.on', { defaultValue: '开启' })}</option>
                </select>
              </div>
              {/* 自定义 API 调用模式 */}
              {isCustomApiModel && (
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>{t('aiChat.modelCard.customApiMode', { defaultValue: '调用模式' })}</span>
                  <select
                    className="max-expand-chat-web-access-policy-select"
                    value={aiConfig.customApiMode || 'relay'}
                    onChange={(event) => {
                      setAiConfig({ customApiMode: event.target.value as 'relay' | 'direct' });
                    }}
                    title={t('aiChat.modelCard.customApiModeTitle', { defaultValue: '选择自定义 API 调用模式' })}
                    aria-label={t('aiChat.modelCard.customApiMode', { defaultValue: '调用模式' })}
                  >
                    <option value="relay">{t('aiChat.modelCard.customApiModeRelay', { defaultValue: '服务器转发' })}</option>
                    <option value="direct">{t('aiChat.modelCard.customApiModeDirect', { defaultValue: '直连' })}</option>
                  </select>
                </div>
              )}
              {/* 上下文限制 */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{t('aiChat.modelCard.contextLimit', { defaultValue: '上下文' })}</span>
                <div className="max-expand-chat-model-select-shell" ref={contextDropdownRef}>
                  <button
                    type="button"
                    className="max-expand-chat-model-dropdown-trigger"
                    disabled={isOllamaModel}
                    onClick={() => { if (!isOllamaModel) setShowContextDropdown((v) => !v); }}
                    title={t('aiChat.modelCard.contextLimit', { defaultValue: '上下文' })}
                  >
                    <span className="max-expand-chat-model-dropdown-trigger-label">{selectedContextLabel}</span>
                    <span className="max-expand-chat-model-dropdown-arrow">▾</span>
                  </button>
                  {showContextDropdown && (
                    <div className="max-expand-chat-model-dropdown-list">
                      {CONTEXT_LIMIT_OPTIONS.map((opt) => {
                        const disabled = opt.proOnly && !isProUser;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            className={`max-expand-chat-model-dropdown-item${selectedContextLimit === opt.value ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                            onClick={() => {
                              if (disabled) return;
                              setAiConfig({ contextLimit: opt.value });
                              setShowContextDropdown(false);
                            }}
                          >
                            <span>{opt.label}</span>
                            {opt.proOnly && <img className="max-expand-chat-model-dropdown-pro-icon" src={SvgIcon.PRO} alt="PRO" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Agent Skills */}
            <div
              className={`max-expand-chat-skills-section${skillDragOver ? ' drag-over' : ''}`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                skillDragDepthRef.current += 1;
                setSkillDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                skillDragDepthRef.current = Math.max(0, skillDragDepthRef.current - 1);
                if (skillDragDepthRef.current === 0) setSkillDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                skillDragDepthRef.current = 0;
                setSkillDragOver(false);
                const files = Array.from(e.dataTransfer.files);
                const mdFiles = files.filter((f) => f.name.toLowerCase().endsWith('.md'));
                if (mdFiles.length === 0) return;
                const current = Array.isArray(aiConfig.skills) ? aiConfig.skills : [];
                const newSkills = [...current];
                mdFiles.forEach((file) => {
                  const filePath = window.api.getPathForFile(file);
                  if (!filePath) return;
                  if (newSkills.some((s) => s.filePath.toLowerCase() === filePath.toLowerCase())) return;
                  const name = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/i, '') || 'skill';
                  const id = `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                  newSkills.push({ id, name, filePath, enabled: true });
                });
                if (newSkills.length !== current.length) {
                  setAiConfig({ skills: newSkills });
                }
              }}
            >
              <div className="max-expand-chat-skills-header">
                <span className="max-expand-chat-skills-title">
                  {t('aiChat.skills.title', { defaultValue: 'Skills' })}
                </span>
                <button
                  type="button"
                  className="max-expand-chat-skills-add-btn"
                  onClick={async () => {
                    const filePath = await window.api.pickSkillFile();
                    if (!filePath) return;
                    const current = Array.isArray(aiConfig.skills) ? aiConfig.skills : [];
                    if (current.some((s) => s.filePath.toLowerCase() === filePath.toLowerCase())) return;
                    const name = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/i, '') || 'skill';
                    const id = `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                    setAiConfig({ skills: [...current, { id, name, filePath, enabled: true }] });
                  }}
                >
                  {t('aiChat.skills.add', { defaultValue: '+ 添加' })}
                </button>
              </div>
              {Array.isArray(aiConfig.skills) && aiConfig.skills.length > 0 ? (
                <div className="max-expand-chat-skills-list">
                  {aiConfig.skills.map((skill) => (
                    <div key={skill.id} className={`max-expand-chat-skills-item ${skill.enabled ? '' : 'disabled'}`}>
                      <button
                        type="button"
                        className={`max-expand-chat-skills-toggle ${skill.enabled ? 'on' : 'off'}`}
                        onClick={() => {
                          const updated = aiConfig.skills.map((s) => s.id === skill.id ? { ...s, enabled: !s.enabled } : s);
                          setAiConfig({ skills: updated });
                        }}
                        title={skill.enabled ? t('aiChat.skills.disable', { defaultValue: '禁用' }) : t('aiChat.skills.enable', { defaultValue: '启用' })}
                      />
                      <span className="max-expand-chat-skills-name" title={skill.filePath}>{skill.name}</span>
                      <button
                        type="button"
                        className="max-expand-chat-skills-remove-btn"
                        onClick={() => {
                          const updated = aiConfig.skills.filter((s) => s.id !== skill.id);
                          setAiConfig({ skills: updated });
                        }}
                        title={t('aiChat.skills.remove', { defaultValue: '移除' })}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-expand-chat-skills-drop-hint">
                  {t('aiChat.skills.dropHint', { defaultValue: '拖入 .md 文件或点击添加' })}
                </div>
              )}
            </div>
            {/* 上下文使用量 */}
            <div
              className={`max-expand-chat-context-usage in-card ${contextUsageLevelClass}`}
              role="img"
              aria-label={t('aiChat.contextUsage.aria', {
                defaultValue: '上下文使用情况：{{used}} / {{max}} tokens（{{percent}}）',
                used: contextUsageTokens.toLocaleString(),
                max: selectedContextLimit.toLocaleString(),
                percent: contextUsagePercentText,
              })}
            >
              <div className="max-expand-chat-context-usage-title-row">
                <div className="max-expand-chat-context-usage-title">
                  {t('aiChat.contextUsage.title', { defaultValue: '上下文使用量' })}
                </div>
                <div className="max-expand-chat-context-usage-summary">{contextUsageInlineText}</div>
              </div>
              <div className="max-expand-chat-context-usage-track">
                <div
                  className="max-expand-chat-context-usage-fill"
                  style={{ width: `${contextUsagePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 隐藏文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT_EXTENSIONS}
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files) handleAttachFiles(e.target.files); }}
      />
      {/* 附件拖放区域 + 输入栏 */}
      <div
        className={`max-expand-chat-attachments-drop-zone${attachmentDragOver ? ' drag-over' : ''}${attachmentDropInvalid ? ' invalid' : ''}`}
        onDragEnter={(e) => {
          handleAttachmentDragEnter(e);
        }}
        onDragOver={handleAttachmentDragOver}
        onDragLeave={handleAttachmentDragLeave}
        onDrop={handleAttachmentDropEvent}
      >
        {pendingAttachments.length > 0 && (
          <div className="max-expand-chat-attachments-pending">
            {pendingAttachments.map((a) => (
              <span key={a.name} className="max-expand-chat-attachment-tag">
                {resolveDevIconByFileName(a.name) ? (
                  <img className="max-expand-chat-attachment-tag-icon" src={resolveDevIconByFileName(a.name)} alt="" aria-hidden="true" />
                ) : (
                  <span className="max-expand-chat-attachment-tag-icon-fallback" aria-hidden="true" />
                )}
                <span className="max-expand-chat-attachment-tag-name">{a.name}</span>
                <button
                  type="button"
                  className="max-expand-chat-attachment-tag-remove"
                  onClick={() => setPendingAttachments((prev) => prev.filter((p) => p.name !== a.name))}
                  aria-label={t('aiChat.attachments.remove', { defaultValue: '移除附件' })}
                >×</button>
              </span>
            ))}
          </div>
        )}
        <div className="max-expand-chat-input-bar">
          {/* 会话历史切换 */}
          <button
            className="max-expand-chat-send max-expand-chat-session-toggle"
            type="button"
            onClick={() => { setShowSessionSidebar((prev) => !prev); }}
            title={t('aiChat.session.toggleHistory', { defaultValue: '展开历史会话' })}
          >
            <img
              className="max-expand-chat-session-toggle-icon"
              src={showSessionSidebar ? SvgIcon.COLLAPSE : SvgIcon.EXPAND}
              alt=""
            />
          </button>
          {/* 添加附件 */}
          <button
            className="max-expand-chat-send max-expand-chat-session-toggle"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={t('aiChat.attachments.add', { defaultValue: '添加文本附件' })}
            disabled={isStreaming || pendingAttachments.length >= ATTACHMENT_MAX_COUNT}
          >
            <img
              className="max-expand-chat-session-toggle-icon"
              src={SvgIcon.ATTACHMENT}
              alt=""
            />
          </button>
          {/* Agent 模式切换 */}
          <div className="max-expand-chat-agent-mode-wrap">
            <button
              ref={agentModeTriggerRef}
              className="max-expand-chat-agent-mode-trigger"
              type="button"
              onClick={toggleAgentModeDropdown}
              title={t('aiChat.agentMode.switch', { defaultValue: '切换 Agent 模式' })}
            >
              <img className={`max-expand-chat-agent-mode-icon${currentAgentModeConfig.noFilter ? ' no-filter' : ''}`} src={currentAgentModeConfig.icon} alt="" />
            </button>
            {showAgentModeDropdown && agentModeDropdownPos && (
              <div
                ref={agentModeDropdownRef}
                className="max-expand-chat-agent-mode-dropdown"
                style={{ position: 'fixed', left: agentModeDropdownPos.left, bottom: agentModeDropdownPos.bottom }}
              >
                {AGENT_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`max-expand-chat-agent-mode-item${agentMode === m.id ? ' active' : ''}`}
                    onClick={() => setAgentMode(m.id)}
                  >
                    <img className={`max-expand-chat-agent-mode-item-icon${m.noFilter ? ' no-filter' : ''}`} src={m.icon} alt="" />
                    <span className="max-expand-chat-agent-mode-item-label">{m.label}</span>
                    <span className="max-expand-chat-agent-mode-item-desc">{m.desc}</span>
                    {m.badgeIcon && <img className="max-expand-chat-agent-mode-item-badge" src={m.badgeIcon} alt="" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 消息输入 */}
          <textarea
            ref={inputRef}
            className="max-expand-chat-input"
            placeholder={isStreaming && agentMode !== 'r1pxc'
              ? t('aiChat.input.generatingPlaceholder', { defaultValue: '生成中...' })
              : t('aiChat.input.placeholder', { defaultValue: '输入消息...' })}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={sendDisabled || (isStreaming && agentMode !== 'r1pxc')}
            aria-disabled={sendDisabled || (isStreaming && agentMode !== 'r1pxc')}
            rows={1}
          />
          {/* 发送/停止按钮 */}
          {isStreaming && !(agentMode === 'r1pxc' && input.trim()) ? (
            <button className="max-expand-chat-send" onClick={handleStop}>
              {t('aiChat.actions.stop', { defaultValue: '停止' })}
            </button>
          ) : (
            <button className="max-expand-chat-send" onClick={handleSend} disabled={sendDisabled}>
              {t('aiChat.actions.send', { defaultValue: '发送' })}
            </button>
          )}
          {/* 模型切换按钮 */}
          <button
            className="max-expand-chat-send"
            type="button"
            onClick={() => { setShowModelCard((prev) => !prev); }}
            disabled={modelCardDisabled}
            title={t('aiChat.modelCard.title', { defaultValue: '模型选择卡片' })}
            aria-expanded={showModelCard}
            aria-controls="ai-chat-model-card"
          >
            {modelToggleIcon ? (
              <span className="max-expand-chat-model-toggle-with-icon">
                <img className="max-expand-chat-model-toggle-icon" src={modelToggleIcon} alt="" />
                <span>{selectedModel}</span>
              </span>
            ) : selectedModel}
          </button>
        </div>
        {/* 引用预览 */}
        {pendingQuote && agentMode === 'r1pxc' && (
          <div className="max-expand-chat-quote-preview">
            <span className="max-expand-chat-quote-preview-text">{pendingQuote.length > 60 ? pendingQuote.slice(0, 60) + '…' : pendingQuote}</span>
            <button type="button" className="max-expand-chat-quote-preview-close" onClick={() => setPendingQuote(null)}>✕</button>
          </div>
        )}
      </div>
    </div>
  );
}
