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
 * @file CliContent.tsx
 * @description CLI 状态内容组件 — 展示当前 Claude Code 或 Codex 会话的实时流事件
 * @author 鸡哥
 */

import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/isLandStore';
import { GifIcon } from '../../../utils/GifIcon/gif-icon';
import { AgentIcon } from '../../../utils/SvgIcon';
import { useCliStatus } from '../maxExpand/components/cli/hooks/useCliStatus';
import { CliProviderSwitch } from '../maxExpand/components/cli/components/CliProviderSwitch';
import { phaseLabel } from '../maxExpand/components/cli/utils/cliFormatters';
import { useCurrentLyric } from '../lyrics/hooks/useCurrentLyric';
import { useLyricsSettings } from '../lyrics/hooks/useLyricsSettings';
import { KaraokeSyllableLine } from '../lyrics/components/KaraokeSyllableLine';
import '../../../styles/cli/cli-state.css';

/**
 * CLI 状态内容组件
 * @description 与 agent 态尺寸一致（500×88），左侧提供方图标 + 右侧最新流事件，点击进入完整面板。
 */
export function CliContent(): ReactElement {
  const { t } = useTranslation();
  const setIdle = useIslandStore((s) => s.setIdle);
  const setMaxExpand = useIslandStore((s) => s.setMaxExpand);
  const setMaxExpandTab = useIslandStore((s) => s.setMaxExpandTab);
  const provider = useIslandStore((s) => s.cliProvider);
  const setProvider = useIslandStore((s) => s.setCliProvider);
  const { snapshot } = useCliStatus(provider);

  // 同步当前播放歌曲的动态歌词
  const isMusicPlaying = useIslandStore((s) => s.isMusicPlaying);
  const syncedLyrics = useIslandStore((s) => s.syncedLyrics);
  const lyricsLoading = useIslandStore((s) => s.lyricsLoading);
  const currentPositionMs = useIslandStore((s) => s.currentPositionMs);
  const { currentIdx, currentLine, currentText, hasSyllables } = useCurrentLyric(syncedLyrics, lyricsLoading, currentPositionMs);
  const { karaokeEnabled } = useLyricsSettings();

  // 选取最近活跃的会话及其最新流事件
  const { activeSession, latestEvent } = useMemo(() => {
    const active = snapshot.sessions
      .filter((session) => session.phase !== 'completed')
      .sort((a, b) => b.lastEventAt - a.lastEventAt);
    const session = active[0] ?? null;
    const event = session
      ? snapshot.events.find((item) => item.sessionId === session.id) ?? null
      : snapshot.events[0] ?? null;
    return { activeSession: session, latestEvent: event };
  }, [snapshot.sessions, snapshot.events]);

  const openPanel = (): void => {
    setMaxExpandTab('cli');
    setMaxExpand();
  };

  const title = activeSession?.title || t('maxExpand.cli.sessions', { defaultValue: '会话' });
  const phaseText = activeSession ? phaseLabel(activeSession.phase, t) : '';

  // 根据会话状态选择左侧 GIF：idle → 空闲；等待授权 → review；调用工具 → 挥手；运行 → 等待
  const gifSrc = (() => {
    if (!activeSession || activeSession.phase === 'idle') return GifIcon.CLAWD_IDLE;
    if (activeSession.phase === 'waiting_permission') return GifIcon.CLAWD_REVIEW;
    if (latestEvent?.kind === 'tool') return GifIcon.CLAWD_WAVING;
    return GifIcon.CLAWD_WAITING;
  })();

  // 等待授权时，从待授权事件的 tool_input 中取出 command + description
  const permissionCommand = useMemo(() => {
    if (!activeSession || activeSession.phase !== 'waiting_permission') return null;
    const raw = activeSession.pendingPermission?.raw as Record<string, unknown> | undefined;
    const toolInput = (raw?.tool_input ?? raw?.toolInput ?? raw?.input) as Record<string, unknown> | undefined;
    if (!toolInput) return null;
    const command = typeof toolInput.command === 'string' ? toolInput.command : '';
    const description = typeof toolInput.description === 'string' ? toolInput.description : '';
    if (!command && !description) return null;
    return { command, description, toolName: activeSession.pendingPermission?.toolName ?? '' };
  }, [activeSession]);

  return (
    <div className="cli-state-content">
      <img
        className={`cli-state-icon${provider === 'codex' ? ' cli-state-icon--codex' : ''}`}
        src={provider === 'codex' ? AgentIcon.CODEX : gifSrc}
        alt=""
        draggable={false}
      />
      <button type="button" className="cli-state-body" onClick={openPanel}>
        <span className="cli-state-title-row">
          <span className="cli-state-title">{title}</span>
          {phaseText && <span className={`cli-state-phase ${activeSession?.phase ?? ''}`}>{phaseText}</span>}
          {latestEvent && <span className="cli-state-phase cli-state-event-tag">{latestEvent.eventName}</span>}
        </span>
        {permissionCommand ? (
          <span className="cli-state-command">
            <span className="cli-state-command-line">
              {permissionCommand.toolName && <span className="cli-state-command-tool">{permissionCommand.toolName}</span>}
              {permissionCommand.command && <code className="cli-state-command-text">{permissionCommand.command}</code>}
            </span>
            {permissionCommand.description && <span className="cli-state-command-desc">{permissionCommand.description}</span>}
          </span>
        ) : (
          <span className="cli-state-event">
            {latestEvent
              ? (latestEvent.summary && <span className="cli-state-event-summary">{latestEvent.summary}</span>)
              : <span className="cli-state-event-summary">{t('maxExpand.cli.emptyEvents', { defaultValue: '暂无事件' })}</span>}
          </span>
        )}
      </button>
      <div className="cli-state-actions">
        <CliProviderSwitch provider={provider} onChange={setProvider} compact />
        <button type="button" className="cli-state-action-btn" onClick={() => setIdle(true)}>
          {t('agent.actions.close', { defaultValue: '关闭' })}
        </button>
      </div>
      {provider === 'claude' && activeSession?.phase === 'waiting_permission' ? (
        <div className="cli-state-permission">
          <button
            type="button"
            className="cli-state-permission-btn cli-state-permission-deny"
            onClick={() => { void window.api.claudeCodePermissionResolve(activeSession.id, 'deny'); }}
          >
            {t('cli.permission.deny', { defaultValue: '拒绝' })}
          </button>
          <button
            type="button"
            className="cli-state-permission-btn cli-state-permission-allow"
            onClick={() => { void window.api.claudeCodePermissionResolve(activeSession.id, 'allow'); }}
          >
            {t('cli.permission.allow', { defaultValue: '批准' })}
          </button>
          <button
            type="button"
            className="cli-state-permission-btn cli-state-permission-always"
            onClick={() => { void window.api.claudeCodePermissionResolve(activeSession.id, 'always'); }}
          >
            {t('cli.permission.always', { defaultValue: '永久批准' })}
          </button>
        </div>
      ) : (
        isMusicPlaying && currentText && (
          <span key={currentIdx} className={`cli-state-lyric${karaokeEnabled && hasSyllables ? ' cli-state-lyric-karaoke' : ''}`}>
            {karaokeEnabled && hasSyllables && currentLine ? (
              <KaraokeSyllableLine
                syllables={currentLine.syllables!}
                lineStartMs={currentLine.time_ms}
                posMs={currentPositionMs}
              />
            ) : (
              currentText
            )}
          </span>
        )
      )}
    </div>
  );
}
