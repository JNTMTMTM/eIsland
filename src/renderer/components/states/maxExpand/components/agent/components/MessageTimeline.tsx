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
 * @file MessageTimeline.tsx
 * @description AI 助手消息时间线组件：思考过程、工具调用、Todo 渲染及最终输出。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { AiChatMessage, AiTodoSnapshot } from '../../../../../../store/types';
import useIslandStore from '../../../../../../store/slices';
import { normalizeMarkdownCodeFences, toPrettyJson } from '../utils/chatUtils';
import { AssistantMarkdown } from './AssistantMarkdown';
import { ThinkingReasoning } from '../../../../../components/DynamicIslandAgentProcessComponents/thinking';
import { TodoList } from '../../../../../components/DynamicIslandAgentProcessComponents/todo';

/** MessageTimeline 组件 Props */
interface MessageTimelineProps {
  msg: AiChatMessage;
  absoluteIndex: number;
  totalMessages: number;
  isStreaming: boolean;
  showThinking: boolean;
  onReportIssue: (traceId: string, finalAnswer: string) => void;
}

/** AI 助手消息时间线（思考过程 + 工具调用 + Todo + 最终输出） */
export function MessageTimeline({
  msg,
  absoluteIndex,
  totalMessages,
  isStreaming,
  showThinking,
  onReportIssue,
}: MessageTimelineProps): ReactElement {
  const { t } = useTranslation();
  const isLatestAssistantMsg = absoluteIndex === totalMessages - 1;

  const thinkBlocks = showThinking && Array.isArray(msg.thinkBlocks)
    ? msg.thinkBlocks
    : [];
  const thinkDurations = Array.isArray(msg.thinkDurations) ? msg.thinkDurations : [];

  /** 将思考耗时持久化到消息 */
  const setAiChatMessageThinkDuration = useIslandStore((s) => s.setAiChatMessageThinkDuration);
  const handleDurationComputed = useCallback((thinkIndex: number, seconds: number): void => {
    setAiChatMessageThinkDuration(absoluteIndex, thinkIndex, seconds);
  }, [absoluteIndex, setAiChatMessageThinkDuration]);

  const sortedToolCalls = Array.isArray(msg.toolCalls)
    ? [...msg.toolCalls]
      .filter((toolCall) => toolCall.tool !== 'agent.todo.write')
      .map((tc, idx) => ({ ...tc, _idx: idx }))
      .sort((a, b) => {
        const aTurn = Number.isFinite(a.turn) && (a.turn ?? 0) > 0 ? Number(a.turn) : Number.MAX_SAFE_INTEGER;
        const bTurn = Number.isFinite(b.turn) && (b.turn ?? 0) > 0 ? Number(b.turn) : Number.MAX_SAFE_INTEGER;
        return aTurn - bTurn || a._idx - b._idx;
      })
    : [];

  const todoSnapshots: AiTodoSnapshot[] = Array.isArray(msg.todoSnapshots) ? msg.todoSnapshots : [];
  const showThinkingFooter = showThinking && isStreaming && isLatestAssistantMsg;
  const traceId = typeof msg.traceId === 'string' ? msg.traceId.trim() : '';
  const isMsgOllama = msg.model === 'ollama';
  const isMsgCustomApi = msg.model === 'custom-api';
  const showFinalTraceMeta = Boolean(msg.finalized);
  const normalizedMarkdownContent = normalizeMarkdownCodeFences(msg.content);

  const timelineNodes: ReactElement[] = [];

  /** turn=0 的 todoSnapshot 放在时间线最前面 */
  const unturnedTodoSnapshots = todoSnapshots.filter((snap) => !(snap.turn > 0));
  for (let snapIndex = 0; snapIndex < unturnedTodoSnapshots.length; snapIndex++) {
    const snap = unturnedTodoSnapshots[snapIndex];
    timelineNodes.push(
      <TodoList
        key={`todo-0-${snapIndex}`}
        items={snap.items}
      />,
    );
  }

  /** think[0] 放在所有工具/todo 组之前（初始推理） */
  if (thinkBlocks.length > 0 && thinkBlocks[0]) {
    timelineNodes.push(
      <ThinkingReasoning
        key="think-0"
        content={thinkBlocks[0]}
        isThinking={isStreaming && isLatestAssistantMsg}
        persistedDuration={thinkDurations[0]}
        onDurationComputed={(seconds): void => handleDurationComputed(0, seconds)}
      />,
    );
  }

  /** 收集所有有效 turn */
  const allGroupTurns = new Set<number>();
  const allToolCalls = Array.isArray(msg.toolCalls) ? msg.toolCalls : [];
  allToolCalls.forEach((tc) => {
    const t = Number.isFinite(tc.turn) && (tc.turn ?? 0) > 0 ? Number(tc.turn) : 0;
    if (t > 0) allGroupTurns.add(t);
  });
  todoSnapshots.forEach((snap) => {
    if (snap.turn > 0) allGroupTurns.add(snap.turn);
  });
  const sortedGroupTurns = [...allGroupTurns].sort((a, b) => a - b);

  /** 按 turn 顺序渲染工具/todo 组，每组后面穿插对应的 think 块 */
  let nextThinkIdx = 1;
  for (let groupIdx = 0; groupIdx < sortedGroupTurns.length; groupIdx++) {
    const turn = sortedGroupTurns[groupIdx];

    const turnTodoSnapshots = todoSnapshots.filter((snap) => snap.turn === turn);
    for (let snapIndex = 0; snapIndex < turnTodoSnapshots.length; snapIndex++) {
      const snap = turnTodoSnapshots[snapIndex];
      timelineNodes.push(
        <TodoList
          key={`todo-${turn}-${snapIndex}`}
          items={snap.items}
          turn={turn}
        />,
      );
    }

    const turnToolCalls = sortedToolCalls.filter((toolCall) => {
      return Number.isFinite(toolCall.turn)
        && (toolCall.turn ?? 0) > 0
        && Number(toolCall.turn) === turn;
    });
    for (let toolIndex = 0; toolIndex < turnToolCalls.length; toolIndex++) {
      const toolCall = turnToolCalls[toolIndex];
      timelineNodes.push(
        <details key={`tool-${turn}-${toolCall.tool}-${toolIndex}`} className="max-expand-chat-tool-card">
          <summary className="max-expand-chat-tool-card-head">
            <span className="max-expand-chat-tool-left">
              <span className="max-expand-chat-tool-name">{toolCall.tool}</span>
              <span className="max-expand-chat-tool-turn">#{toolCall.turn || toolIndex + 1}</span>
            </span>
            <span className={`max-expand-chat-tool-status ${toolCall.pending ? '' : (toolCall.success ? 'success' : 'failed')}`}>
              {toolCall.pending && <span className="max-expand-chat-tool-status-dot" />}
              {toolCall.pending
                ? t('aiChat.timeline.toolStatus.pending', { defaultValue: '执行中' })
                : (toolCall.success
                  ? t('aiChat.timeline.toolStatus.success', { defaultValue: '完成' })
                  : t('aiChat.timeline.toolStatus.failed', { defaultValue: '失败' }))}
            </span>
          </summary>
          <div className="max-expand-chat-tool-result">
            <div className="max-expand-chat-tool-result-title">{t('aiChat.timeline.toolResultTitle', { defaultValue: '工具返回结果' })}</div>
            <pre>{toPrettyJson(toolCall.result)}</pre>
          </div>
        </details>,
      );
    }

    /** 每个工具组后面穿插对应的 think 块 */
    if (nextThinkIdx < thinkBlocks.length && thinkBlocks[nextThinkIdx]) {
      const thinkText = thinkBlocks[nextThinkIdx];
      const thinkIdx = nextThinkIdx;
      nextThinkIdx++;
      timelineNodes.push(
        <ThinkingReasoning
          key={`think-${thinkIdx}`}
          content={thinkText}
          isThinking={isStreaming && thinkIdx === thinkBlocks.length - 1 && isLatestAssistantMsg}
          persistedDuration={thinkDurations[thinkIdx]}
          onDurationComputed={(seconds): void => handleDurationComputed(thinkIdx, seconds)}
        />,
      );
    }
  }

  /** 剩余的 think 块 */
  for (let idx = nextThinkIdx; idx < thinkBlocks.length; idx++) {
    const thinkText = thinkBlocks[idx] || '';
    if (thinkText) {
      timelineNodes.push(
        <ThinkingReasoning
          key={`think-${idx}`}
          content={thinkText}
          isThinking={isStreaming && idx === thinkBlocks.length - 1 && isLatestAssistantMsg}
          persistedDuration={thinkDurations[idx]}
          onDurationComputed={(seconds): void => handleDurationComputed(idx, seconds)}
        />,
      );
    }
  }

  /** 无 turn 的工具调用（兜底） */
  const trailingToolCalls = sortedToolCalls.filter((toolCall) => {
    return !(Number.isFinite(toolCall.turn) && (toolCall.turn ?? 0) > 0);
  });
  for (let toolIndex = 0; toolIndex < trailingToolCalls.length; toolIndex++) {
    const toolCall = trailingToolCalls[toolIndex];
    timelineNodes.push(
      <details key={`tool-tail-${toolCall.tool}-${toolIndex}`} className="max-expand-chat-tool-card">
        <summary className="max-expand-chat-tool-card-head">
          <span className="max-expand-chat-tool-left">
            <span className="max-expand-chat-tool-name">{toolCall.tool}</span>
            <span className="max-expand-chat-tool-turn">#{toolIndex + 1}</span>
          </span>
          <span className={`max-expand-chat-tool-status ${toolCall.pending ? '' : (toolCall.success ? 'success' : 'failed')}`}>
            {toolCall.pending && <span className="max-expand-chat-tool-status-dot" />}
            {toolCall.pending
              ? t('aiChat.timeline.toolStatus.pending', { defaultValue: '执行中' })
              : (toolCall.success
                ? t('aiChat.timeline.toolStatus.success', { defaultValue: '完成' })
                : t('aiChat.timeline.toolStatus.failed', { defaultValue: '失败' }))}
          </span>
        </summary>
        <div className="max-expand-chat-tool-result">
          <div className="max-expand-chat-tool-result-title">{t('aiChat.timeline.toolResultTitle', { defaultValue: '工具返回结果' })}</div>
          <pre>{toPrettyJson(toolCall.result)}</pre>
        </div>
      </details>,
    );
  }

  return (
    <>
      {timelineNodes.length > 0 && (
        <div className="max-expand-chat-tool-list">
          {timelineNodes}
        </div>
      )}

      {msg.content ? (
        <>
          {timelineNodes.length > 0 ? <div className="max-expand-chat-final-divider" /> : null}
          <AssistantMarkdown content={normalizedMarkdownContent} />
          {showFinalTraceMeta && (
            <>
              <div className="max-expand-chat-final-divider" />
              {isMsgOllama ? (
                <div className="max-expand-chat-trace-id">
                  <span>{t('aiChat.localModelGenerated', { defaultValue: '本地模型生成' })}</span>
                </div>
              ) : (isMsgCustomApi && !traceId) ? (
                <div className="max-expand-chat-trace-id">
                  <span>{t('aiChat.customDirectGenerated', { defaultValue: '本地直连 LLM 提供商' })}</span>
                </div>
              ) : (
                <div className="max-expand-chat-trace-id">
                  <span>TraceID: {traceId || '-'}</span>
                  <button
                    type="button"
                    className="max-expand-chat-trace-report-btn"
                    onClick={() => onReportIssue(traceId, msg.content)}
                  >
                    {t('aiChat.actions.reportIssue', { defaultValue: '报告问题' })}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        isStreaming && isLatestAssistantMsg && !showThinkingFooter ? (
          <div className="max-expand-chat-loading-row">
            <span className="max-expand-chat-generating-dots"><i /><i /><i /></span>
          </div>
        ) : ''
      )}

      {showThinkingFooter && (
        <div className="max-expand-chat-loading-row">
          <span className="max-expand-chat-think-live-dots">
            <i />
            <i />
            <i />
          </span>
        </div>
      )}
    </>
  );
}
