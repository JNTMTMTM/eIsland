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
 * @file cliContentRuntime.test.tsx
 * @description CLI内容保留真实状态订阅、会话选取、歌词设置与当前行Hook，覆盖原生快照、权限缺省、GIF及逐字歌词公开交互。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../i18n';
import useIslandStore from '../../../../store/slices';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../../components/test/contentLifecycleHarness';
import { elements, findElement, hookMocks, invoke, textContent } from '../../../test/elementHarness';
import { contentApi, resetContent, settings } from '../../lyrics/test/lyricsContentHarness';
import { KaraokeSyllableLine } from '../../lyrics/components/KaraokeSyllableLine';
import { CliProviderSwitch } from '../../maxExpand/components/cli/components/CliProviderSwitch';
import { EMPTY_CLI_STATUS } from '../../maxExpand/components/cli/types/types';
import { GifIcon } from '../../../../utils/GifIcon/gif-icon';
import { AgentIcon } from '../../../../utils/SvgIcon';
import { CliContent } from '../CliContent';
import { settleBackground } from '../../../hooks/test/standaloneIpcHarness';
import type { CliHookEvent, CliSessionSnapshot, CliStatusSnapshot } from '../../maxExpand/components/cli/types/types';
import type { ReactElement } from 'react';

vi.hoisted(() => {
  const localStorage = { getItem: () => null, setItem: () => undefined };
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    localStorage, api: {}, location: { hostname: 'localhost' },
    matchMedia: () => ({ matches: false, addEventListener: () => undefined }),
  }));
});
vi.mock('react', async (load) => ({
  ...await load<typeof import('react')>(), ...hookMocks, ...lifecycleHooks,
  // 活跃宿主对应真实 IslandContentActivityContext 默认值，保留其业务 Hook。
  useContext: () => true,
}));
vi.mock('react-i18next', async (load) => ({
  ...await load<typeof import('react-i18next')>(), useTranslation: () => ({ t: i18n.t }),
}));
vi.mock('../../../../store/slices', async (load) => {
  const actual = await load<typeof import('../../../../store/slices')>();
  return { ...actual, default: Object.assign(
    <T,>(selector: (state: ReturnType<typeof actual.default.getState>) => T): T => selector(actual.default.getState()),
    actual.default,
  ) };
});

let snapshot: CliStatusSnapshot;
let claudeReceive: ((next: CliStatusSnapshot) => void) | undefined;
let codexReceive: ((next: CliStatusSnapshot) => void) | undefined;
const claudeGet = vi.fn<() => Promise<CliStatusSnapshot>>();
const codexGet = vi.fn<() => Promise<CliStatusSnapshot>>();
const claudeOff = vi.fn(() => { claudeReceive = undefined; });
const codexOff = vi.fn(() => { codexReceive = undefined; });
const permission = vi.fn<(id: string, decision: string) => Promise<boolean>>();
const expand = vi.fn();
const disableMouse = vi.fn();
let browser: EventTarget;
beforeEach(() => {
  resetContent();
  snapshot = { ...EMPTY_CLI_STATUS, sessions: [], events: [], heatmap: {}, updatedAt: 1 };
  claudeReceive = undefined; codexReceive = undefined;
  claudeGet.mockResolvedValue(snapshot); codexGet.mockResolvedValue(snapshot);
  permission.mockResolvedValue(true);
  browser = Object.assign(new EventTarget(), {
    localStorage: { getItem: () => null, setItem: () => undefined },
    api: { ...contentApi, claudeCodeStatusGet: claudeGet, codexStatusGet: codexGet,
      onClaudeCodeStatusUpdated: (receive: (next: CliStatusSnapshot) => void) => { claudeReceive = receive; return claudeOff; },
      onCodexStatusUpdated: (receive: (next: CliStatusSnapshot) => void) => { codexReceive = receive; return codexOff; },
      claudeCodePermissionResolve: permission, expandWindowSettings: expand, disableMousePassthrough: disableMouse,
    },
  });
  vi.stubGlobal('window', browser);
  useIslandStore.setState({ state: 'cli', cliProvider: 'claude', isMusicPlaying: false, uiStateLocked: false });
});
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

/**
 * 制造符合原生快照契约的事件，不替换任何派生业务逻辑。
 * @param raw - 真实IPC允许的原始JSON数据。
 * @param kind - 事件类别。
 * @returns 完整CLI事件。
 */
function event(raw: Record<string, unknown> = {}, kind: CliHookEvent['kind'] = 'message'): CliHookEvent {
  return { raw, kind, id: 'event-1', eventName: 'PermissionRequest', sessionId: 'session-1',
    cwd: null, transcriptPath: null, summary: '实时事件', detail: null, detailItems: [],
    toolName: null, toolInputPreview: null, createdAt: 1 };
}

/**
 * 制造真实服务可返回的完整会话状态。
 * @param phase - 公开会话阶段。
 * @param pendingPermission - 可为空的待授权事件。
 * @returns 完整CLI会话。
 */
function session(phase: CliSessionSnapshot['phase'] = 'running', pendingPermission: CliHookEvent | null = null): CliSessionSnapshot {
  return { phase, pendingPermission, id: 'session-1', title: '当前会话', cwd: null, transcriptPath: null,
    lastSummary: '', lastEventAt: 2, events: [] };
}

/**
 * 提交真实内容Hooks并等待原生设置、状态读取返回。
 * @returns 当前真实组件树。
 */
async function mount(): Promise<ReactElement> {
  renderWithHooks(CliContent); runEffects();
  await settleBackground();
  return renderWithHooks(CliContent);
}

/**
 * 通过已注册的真实原生订阅发布快照。
 * @param sessions - 服务会话列表。
 * @param events - 服务事件列表。
 * @returns 执行实际状态更新后的组件树。
 */
function publish(sessions: CliSessionSnapshot[], events: CliHookEvent[] = []): ReactElement {
  const next = { ...snapshot };
  Object.assign(next, { sessions, events, updatedAt: snapshot.updatedAt + 1 });
  claudeReceive?.(next);
  return renderWithHooks(CliContent);
}

describe('CLI内容真实快照、歌词配置与状态集成', () => {
  it('挂载原生订阅，公开面板及关闭操作执行真实Store与窗口叶，卸载取消订阅', async () => {
    const tree = await mount();
    expect(claudeGet).toHaveBeenCalledOnce();
    expect(findElement(tree, (node) => node.props.className === 'cli-state-icon').props.src).toBe(GifIcon.CLAWD_IDLE);
    invoke(findElement(tree, (node) => node.props.className === 'cli-state-body'), 'onClick');
    expect(useIslandStore.getState()).toMatchObject({ state: 'maxExpand', maxExpandTab: 'cli' });
    expect(expand).toHaveBeenCalledOnce(); expect(disableMouse).toHaveBeenCalledOnce();
    invoke(findElement(tree, (node) => node.props.className === 'cli-state-action-btn'), 'onClick');
    expect(useIslandStore.getState().state).toBe('idle');
    expect(contentApi.collapseWindow).toHaveBeenCalledOnce();
    unmountHooks();
    expect(claudeOff).toHaveBeenCalledOnce(); expect(claudeReceive).toBeUndefined();
  });

  it.each(['message', 'tool'] as const)('运行会话根据真实%s事件选择等待或挥手GIF', async (kind) => {
    await mount();
    const tree = publish([session()], [event({}, kind)]);
    expect(textContent(tree)).toContain('实时事件');
    expect(findElement(tree, (node) => node.props.className === 'cli-state-icon').props.src)
      .toBe(kind === 'tool' ? GifIcon.CLAWD_WAVING : GifIcon.CLAWD_WAITING);
  });

  it('真实多会话快照按最近活跃时间排序，排除完成会话且不修改原始列表', async () => {
    await mount();
    const sessions = [
      { ...session(), id: 'old', title: '旧会话', lastEventAt: 1 },
      { ...session(), id: 'new', title: '最新会话', lastEventAt: 10 },
      { ...session('completed'), id: 'done', title: '已完成会话', lastEventAt: 20 },
    ];
    const tree = publish(sessions, [{ ...event(), sessionId: 'new', summary: '最新摘要' }]);
    expect(textContent(tree)).toContain('最新会话');
    expect(textContent(tree)).toContain('最新摘要');
    expect(textContent(tree)).not.toContain('旧会话');
    expect(textContent(tree)).not.toContain('已完成会话');
    expect(sessions.map((item) => item.id)).toEqual(['old', 'new', 'done']);
  });

  it('空闲会话无关联事件时使用空事件与默认会话标题，不误用其他会话事件', async () => {
    await mount();
    const tree = publish([{ ...session('idle'), title: '' }], [{ ...event(), sessionId: 'different' }]);
    expect(findElement(tree, (node) => node.props.className === 'cli-state-icon').props.src).toBe(GifIcon.CLAWD_IDLE);
    expect(textContent(tree)).toContain(i18n.t('maxExpand.cli.sessions')); expect(textContent(tree)).toContain(i18n.t('maxExpand.cli.emptyEvents'));
    expect(textContent(tree)).not.toContain('实时事件');
  });

  it('完成会话不作为活跃会话，但全局最新事件仍显示', async () => {
    await mount();
    const tree = publish([session('completed')], [event()]);
    expect(textContent(tree)).toContain('实时事件');
    expect(textContent(tree)).not.toContain('当前会话');
  });

  it.each([{}, { tool_input: null, toolInput: null, input: null }])('等待授权但无工具输入%j时保留权限操作并显示空事件', async (raw) => {
    await mount();
    const tree = publish([session('waiting_permission', event(raw))]);
    expect(textContent(tree)).toContain(i18n.t('maxExpand.cli.emptyEvents'));
    expect(elements(tree).some((node) => node.props.className === 'cli-state-command')).toBe(false);
    expect(findElement(tree, (node) => node.props.className === 'cli-state-icon').props.src).toBe(GifIcon.CLAWD_REVIEW);
  });

  it('工具输入非字符串字段不会生成命令摘要', async () => {
    await mount();
    const tree = publish([session('waiting_permission', event({ tool_input: { command: 7, description: false } }))]);
    expect(elements(tree).some((node) => node.props.className === 'cli-state-command')).toBe(false);
  });

  it.each(['tool_input', 'toolInput', 'input'] as const)('真实权限原始数据%s可显示命令且缺省描述安全为空', async (field) => {
    await mount();
    const pending = { ...event({ [field]: { command: 'git status' } }), toolName: 'Bash' };
    const tree = publish([session('waiting_permission', pending)]);
    expect(findElement(tree, (node) => node.props.className === 'cli-state-command-text').props.children).toBe('git status');
    expect(elements(tree).some((node) => node.props.className === 'cli-state-command-desc')).toBe(false);
    ['deny', 'allow', 'always'].forEach((decision) => {
      invoke(findElement(tree, (node) => node.props.className === `cli-state-permission-btn cli-state-permission-${  decision}`), 'onClick');
    });
    expect(permission.mock.calls).toEqual([['session-1', 'deny'], ['session-1', 'allow'], ['session-1', 'always']]);
  });

  it('只有描述且工具名缺省时真实授权摘要省略命令和工具标签', async () => {
    await mount();
    const tree = publish([session('waiting_permission', event({ input: { description: '查看项目状态' } }))]);
    expect(textContent(tree)).toContain('查看项目状态');
    expect(elements(tree).some((node) => ['cli-state-command-tool', 'cli-state-command-text'].includes(String(node.props.className)))).toBe(false);
  });

  it('真实逐字设置与歌词选行产生音节属性，公开设置事件可切换回普通文本', async () => {
    settings.karaoke = true;
    const syllables = [{ start_offset_ms: 0, duration_ms: 1000, text: 'original' }];
    useIslandStore.setState({ isMusicPlaying: true, syncedLyrics: [{ syllables, time_ms: 1000, text: 'original' }], currentPositionMs: 1500 });
    let tree = await mount();
    const line = findElement(tree, (node) => node.type === KaraokeSyllableLine);
    expect(line.props).toEqual({ syllables, lineStartMs: 1000, posMs: 1500 });
    const view = KaraokeSyllableLine(line.props as unknown as Parameters<typeof KaraokeSyllableLine>[0]);
    expect(findElement(view, (node) => node.props.className === 'lyrics-syllable').props.style).toEqual({ '--syl-prog': '50.00%' });
    browser.dispatchEvent(new CustomEvent('island:setting-changed', { detail: { channel: 'music:lyrics-karaoke', value: false } }));
    tree = renderWithHooks(CliContent);
    expect(findElement(tree, (node) => node.props.className === 'cli-state-lyric').props.children).toBe('original');
    expect(elements(tree).some((node) => node.type === KaraokeSyllableLine)).toBe(false);
  });

  it('逐字设置开启但普通歌词无音节时仍使用真实当前文本，前奏不显示歌词', async () => {
    settings.karaoke = true; useIslandStore.setState({ isMusicPlaying: true });
    let tree = await mount();
    expect(findElement(tree, (node) => node.props.className === 'cli-state-lyric').props.children).toBe('original');
    useIslandStore.setState({ currentPositionMs: 0 });
    tree = renderWithHooks(CliContent);
    expect(elements(tree).some((node) => String(node.props.className).startsWith('cli-state-lyric'))).toBe(false);
  });

  it('真实提供方选择切换Store并更换原生订阅，Codex显示其图标', async () => {
    let tree = await mount();
    const switchElement = findElement(tree, (node) => node.type === CliProviderSwitch);
    const controls = CliProviderSwitch(switchElement.props as unknown as Parameters<typeof CliProviderSwitch>[0]);
    invoke(findElement(controls, (node) => node.type === 'button' && node.props.children === i18n.t('maxExpand.cli.provider.codex')), 'onClick');
    expect(useIslandStore.getState().cliProvider).toBe('codex');
    renderWithHooks(CliContent); runEffects();
    await settleBackground();
    tree = renderWithHooks(CliContent);
    expect(claudeOff).toHaveBeenCalledOnce(); expect(codexGet).toHaveBeenCalledOnce();
    expect(codexReceive).toBeTypeOf('function');
    expect(findElement(tree, (node) => String(node.props.className).startsWith('cli-state-icon')).props.src).toBe(AgentIcon.CODEX);
  });
});
