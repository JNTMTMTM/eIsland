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
 * @file cliContent.test.tsx
 * @description CliContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, invoke, text } from '../../test/tree';

import { CliContent } from '../CliContent';
import type { TreeElement } from '../../test/tree';
const api = { claudeCodePermissionResolve: vi.fn().mockResolvedValue(true) };

const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const model = vi.hoisted(() => ({ store: { setIdle: vi.fn(), setMaxExpand: vi.fn(), setMaxExpandTab: vi.fn(), cliProvider: 'claude', setCliProvider: vi.fn(), isMusicPlaying: false, syncedLyrics: [], lyricsLoading: false, currentPositionMs: 1500 }, snapshot: { sessions: [] as Array<{ id: string; title: string; phase: string; lastEventAt: number; pendingPermission?: { raw: Record<string, unknown>; toolName: string } }>, events: [] as Array<{ sessionId: string; eventName: string; summary: string; kind: string }> }, lyric: { currentIdx: 0, currentLine: null, currentText: 'Lyric', hasSyllables: false } }));
vi.mock('../../../../store/isLandStore', () => ({ default: (selector: (state: typeof model.store) => unknown) => selector(model.store) }));
vi.mock('../../maxExpand/components/cli/hooks/useCliStatus', () => ({ useCliStatus: () => ({ snapshot: model.snapshot }) }));
vi.mock('../../lyrics/hooks/useCurrentLyric', () => ({ useCurrentLyric: () => model.lyric }));
vi.mock('../../lyrics/hooks/useLyricsSettings', () => ({ useLyricsSettings: () => ({ karaokeEnabled: false }) }));
beforeEach(() => { model.snapshot.sessions = []; model.snapshot.events = []; model.store.cliProvider = 'claude'; model.store.isMusicPlaying = false; vi.stubGlobal('window', { api }); });
describe('CliContent', () => {
  it('renders empty event state and forwards panel/close actions', () => { const root = ((CliContent() as TreeElement)); expect(text(root)).toContain('maxExpand.cli.emptyEvents'); invoke(byClass(root, 'cli-state-body'), 'onClick'); expect(model.store.setMaxExpandTab).toHaveBeenCalledWith('cli'); expect(model.store.setMaxExpand).toHaveBeenCalledOnce(); invoke(byClass(root, 'cli-state-action-btn'), 'onClick'); expect(model.store.setIdle).toHaveBeenCalledWith(true); });
  it('selects latest active session and its event, ignoring completed sessions', () => { model.snapshot.sessions = [{ id: 'old', title: 'Old', phase: 'running', lastEventAt: 1 }, { id: 'new', title: 'New', phase: 'running', lastEventAt: 2 }, { id: 'done', title: 'Completed', phase: 'completed', lastEventAt: 3 }]; model.snapshot.events = [{ sessionId: 'new', eventName: 'Tool', summary: 'New summary', kind: 'tool' }]; const root = ((CliContent() as TreeElement)); expect(text(root)).toContain('New'); expect(text(root)).toContain('New summary'); expect(text(root)).not.toContain('Completed'); expect(byClass(root, 'cli-state-icon').props.src).toContain('waving'); });
  it('renders pending command and resolves each Claude permission choice', () => { model.snapshot.sessions = [{ id: 'permission', title: 'Authorize', phase: 'waiting_permission', lastEventAt: 1, pendingPermission: { raw: { tool_input: { command: 'git status', description: 'Read status' } }, toolName: 'Shell' } }]; const root = ((CliContent() as TreeElement)); expect(text(root)).toContain('git status'); expect(text(root)).toContain('Read status'); ['deny', 'allow', 'always'].forEach((choice) => { invoke(byClass(root, `cli-state-permission-${choice}`), 'onClick'); }); expect(vi.mocked(api.claudeCodePermissionResolve).mock.calls).toEqual([['permission', 'deny'], ['permission', 'allow'], ['permission', 'always']]); });
  it('uses Codex icon and lyric instead of Claude-specific permission controls', () => { model.store.cliProvider = 'codex'; model.store.isMusicPlaying = true; const root = ((CliContent() as TreeElement)); expect(byClass(root, 'cli-state-icon').props.className).toContain('--codex'); expect(text(root)).toContain('Lyric'); expect(elements(root).some((node) => node.props.className === 'cli-state-permission')).toBe(false); });
});
