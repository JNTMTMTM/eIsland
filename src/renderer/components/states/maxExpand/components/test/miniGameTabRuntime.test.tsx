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
 * @file miniGameTabRuntime.test.tsx
 * @description 小游戏面板真实生命周期、导航存储、账号同步、排行缓存、验证码、会话与游戏回调边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../calendar/hooks/test/calendarHookHarness';
import { byClass, elements, find, invoke, text, type TreeElement } from '../../../test/tree';
import type { ReactElement, RefObject } from 'react';
import type * as GameApi from '../../../../../api/miniGame/miniGameScoreApi';
import type { UserAccountResult } from '../../../../../api/user/userAccountApi.types';
import type { runSliderCaptcha } from '../../../../../utils/sliderCaptcha';
import type { Game2048EndPayload, Game2048Handle } from '../games/Game2048';
import type { GameGomokuHandle } from '../games/GameGomoku';
const leaves = vi.hoisted(() => ({
  token: vi.fn<() => string | null>(),
  profile: vi.fn<() => {
    username?: string;
    email?: string;
    avatar?: string;
  } | null>(),
  subscribe: vi.fn<(callback: () => void) => () => void>(),
  unsubscribe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  read: vi.fn<(key: string) => Promise<unknown>>(),
  write: vi.fn<(key: string, data: unknown) => Promise<boolean>>(),
  score: vi.fn<typeof GameApi.getMyScore>(),
  leaderboard: vi.fn<typeof GameApi.getLeaderboard>(),
  check: vi.fn<typeof GameApi.checkLeaderboardRefreshCaptcha>(),
  flush: vi.fn<typeof GameApi.flushPendingSubmissions>(),
  report: vi.fn<typeof GameApi.reportNewBest>(),
  session: vi.fn<typeof GameApi.startGameSession>(),
  captcha: vi.fn<typeof runSliderCaptcha>()
}));
vi.mock('../../../../../store/index', () => ({
  useIslandStore: () => ({
    setLogin: leaves.login,
    setRegister: leaves.register
  })
}));
vi.mock('../../../../../utils/userAccount', () => ({
  readLocalToken: leaves.token,
  readLocalProfile: leaves.profile,
  subscribeUserAccountSessionChanged: leaves.subscribe
}));
vi.mock('../../../../../utils/sliderCaptcha', () => ({
  runSliderCaptcha: leaves.captcha
}));
vi.mock('../../../../../api/miniGame/miniGameScoreApi', () => ({
  getMyScore: leaves.score,
  getLeaderboard: leaves.leaderboard,
  checkLeaderboardRefreshCaptcha: leaves.check,
  flushPendingSubmissions: leaves.flush,
  reportNewBest: leaves.report,
  startGameSession: leaves.session
}));
let Component: typeof import('../miniGame').MiniGameTab;
let expandMiniGameTree: typeof import('../miniGame/test/expandMiniGameTree').expandMiniGameTree;
let game2048: typeof import('../games/Game2048').Game2048;
let gomoku: typeof import('../games/GameGomoku').GameGomoku;
let changed: (() => void) | undefined;
/** 创建原生接口结果。
 * @param data - 数据
 * @returns 成功 API 结果
 */
function success<T>(data: T): UserAccountResult<T> {
  return {
    data,
    ok: true,
    code: 200,
    message: ''
  };
}
/** 读取真实面板。
 * @returns 面板元素
 */
function run(): ReactElement {
  return expandMiniGameTree(renderHook(Component)) as ReactElement;
}
/** 完成初始异步生命周期。
 * @returns 真实当前树
 */
async function mount(): Promise<ReactElement> {
  run();
  flushHookEffects();
  await settleHook();
  const tree = run();
  flushHookEffects();
  await settleHook();
  return tree;
}
/** 定位实际按钮文字。
 * @param key - 翻译键
 * @returns 按钮
 */
function button(key: string): TreeElement {
  return find(run(), (node) => node.type === 'button' && text(node) === key);
}
/** 从真实侧栏切换游戏。
 * @param name - 游戏
 * @returns 完成后的树
 */
async function select(name: '2048' | 'gomoku'): Promise<ReactElement> {
  invoke(button(`miniGameTab.games.${  name}`), 'onClick');
  run();
  flushHookEffects();
  await settleHook();
  run();
  flushHookEffects();
  return run();
}
/** 定位真实游戏子组件，保留父面板传入的真实事件。
 * @param type - 子组件类型
 * @returns 游戏节点
 */
function game(type: typeof game2048 | typeof gomoku): TreeElement {
  return find(run(), (node) => node.type === type);
}
/** 调用实际刷新。
 */
async function refresh(): Promise<void> {
  invoke(find(run(), (node) => node.props['aria-label'] === 'miniGameTab.refresh'), 'onClick');
  await settleHook();
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 6, 12));
  changed = undefined;
  leaves.token.mockReturnValue(null);
  leaves.profile.mockReturnValue({
    username: 'player',
    email: 'player@example.test',
    avatar: 'avatar.png'
  });
  leaves.read.mockResolvedValue(null);
  leaves.write.mockResolvedValue(true);
  leaves.subscribe.mockImplementation((callback) => {
    changed = callback;
    return leaves.unsubscribe;
  });
  leaves.score.mockResolvedValue(success(null));
  leaves.leaderboard.mockResolvedValue(success([]));
  leaves.flush.mockResolvedValue();
  leaves.report.mockResolvedValue(true);
  leaves.check.mockResolvedValue(success({
    requireCaptcha: false
  }));
  leaves.session.mockResolvedValue(success({
    sessionId: 'session',
    seed: 3,
    startedAt: 1000
  }));
  leaves.captcha.mockResolvedValue(null);
  vi.stubGlobal('window', {
    api: {
      storeRead: leaves.read,
      storeWrite: leaves.write
    }
  });
  expandMiniGameTree = (await import('../miniGame/test/expandMiniGameTree')).expandMiniGameTree;
  Component = (await import('../miniGame')).MiniGameTab;
  game2048 = (await import('../games/Game2048')).Game2048;
  gomoku = (await import('../games/GameGomoku')).GameGomoku;
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('MiniGameTab runtime', () => {
  it('normalizes persisted navigation ids, duplicates and invalid values before rendering', async () => {
    leaves.read.mockImplementation((key) => { if (key === 'mini-game-nav-order') return Promise.resolve(['game-gomoku', 'game-gomoku', 3, 'missing']);if (key === 'mini-game-hidden-nav-order') return Promise.resolve(['game-2048', 'game-2048', false, 'missing']);return Promise.resolve(null); });
    await mount();
    expect(elements(run()).filter((node) => node.props.className === 'settings-index-card').map(text)).toEqual([expect.stringContaining('game-gomoku'), expect.stringContaining('game-2048')]);
    invoke(button('miniGameTab.index.edit'), 'onClick');
    expect(text(run())).toContain('miniGameTab.index.emptyAddable');
  });
  it.each(['nav', 'hidden'] as const)('navigation %s read rejection is contained', async (stage) => {
    leaves.read.mockImplementation((key) => key === (stage === 'nav' ? 'mini-game-nav-order' : 'mini-game-hidden-nav-order') ? Promise.reject(new Error('read')) : Promise.resolve(null));
    await mount();
    expect(elements(run()).filter((node) => node.props.className === 'settings-index-card')).toHaveLength(2);
  });
  it.each(['nav', 'hidden', 'settings-resolve', 'settings-reject'] as const)('unmount guards late %s response', async (stage) => {
    const pending = deferred<unknown>();
    leaves.read.mockImplementation((key) => {
      let requested = 'mini-game-gomoku-settings';if (stage === 'nav')requested = 'mini-game-nav-order';else if (stage === 'hidden')requested = 'mini-game-hidden-nav-order';if (key === requested) return pending.promise;
      return Promise.resolve(null);
    });
    run();
    flushHookEffects();
    await settleHook();
    unmountHook();
    if (stage === 'settings-reject') pending.reject(new Error('late'));else pending.resolve(['game-gomoku']);
    await settleHook();
    expect(leaves.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it.each(['novice', 'easy', 'hard', 'expert', 'master', 'invalid'] as const)('loads Gomoku difficulty %s and saves normalized settings', async (difficulty) => {
    leaves.read.mockImplementation((key) => Promise.resolve(key === 'mini-game-gomoku-settings' ? {
      difficulty,
      mode: 'pve'
    } : null));
    await mount();
    await select('gomoku');
    expect(game(gomoku).props.aiDifficulty).toBe(difficulty === 'invalid' ? 'novice' : difficulty);
    expect(leaves.write).toHaveBeenCalledWith('mini-game-gomoku-settings', {
      mode: 'pve',
      difficulty: difficulty === 'invalid' ? 'novice' : difficulty
    });
  });
  it('invalid mode is ignored and failed settings read still enables persistence', async () => {
    leaves.read.mockImplementation((key) => key === 'mini-game-gomoku-settings' ? Promise.reject(new Error('read')) : Promise.resolve(null));
    leaves.write.mockRejectedValue(new Error('write'));
    await mount();
    await select('gomoku');
    expect(game(gomoku).props.aiDifficulty).toBe('novice');
  });
  it('guest authentication callbacks forward actions and later account login loads then reuses cache', async () => {
    await mount();
    await select('2048');
    invoke(button('miniGameTab.auth.gotoLogin'), 'onClick');
    invoke(button('miniGameTab.auth.gotoRegister'), 'onClick');
    expect(leaves.login).toHaveBeenCalledTimes(1);
    expect(leaves.register).toHaveBeenCalledTimes(1);
    leaves.token.mockReturnValue('token');
    changed?.();
    await settleHook();
    run();
    flushHookEffects();
    expect(leaves.score).toHaveBeenCalledTimes(1);
    changed?.();
    await settleHook();
    expect(leaves.score).toHaveBeenCalledTimes(1);
    leaves.token.mockReturnValue(null);
    changed?.();
    expect(text(run())).toContain('miniGameTab.auth.entryTitle');
    await select('gomoku');
    expect(text(run())).toContain('miniGameTab.gomoku.unrankedHint');
  });
  it.each([null, {}, {
    username: '   '
  }] as const)('missing profile fields %j use token cache and fallback refresh account', async (profile) => {
    leaves.profile.mockReturnValue(profile);
    leaves.token.mockReturnValue('token');
    await mount();
    await select('2048');
    leaves.check.mockResolvedValue(success({
      requireCaptcha: true
    }));
    await refresh();
    expect(leaves.captcha).toHaveBeenCalledWith('mini-game-leaderboard-refresh');
  });
  it('profile username is trimmed for captcha when no email is present', async () => {
    leaves.profile.mockReturnValue({
      username: ' player '
    });
    leaves.token.mockReturnValue('token');
    await mount();
    await select('2048');
    leaves.check.mockResolvedValue(success({
      requireCaptcha: true
    }));
    await refresh();
    expect(leaves.captcha).toHaveBeenCalledWith('player');
  });
  it('ranked loading waits, resolves score/leaderboard failures and clears load error on refresh', async () => {
    leaves.token.mockReturnValue('token');
    const pending = deferred<Awaited<ReturnType<typeof GameApi.getMyScore>>>();
    leaves.score.mockReturnValueOnce(pending.promise);
    run();
    flushHookEffects();
    await select('2048');
    expect(text(run())).toContain('miniGameTab.loading');
    pending.reject(new Error('offline'));
    await settleHook();
    expect(text(run())).toContain('miniGameTab.loadError');
    leaves.score.mockResolvedValue({
      ok: false,
      code: 403,
      message: 'no'
    });
    leaves.leaderboard.mockResolvedValue({
      ok: false,
      code: 403,
      message: 'no'
    });
    await refresh();
    expect(text(run())).toContain('miniGameTab.lbEmpty');
    leaves.score.mockResolvedValue({
      ok: true,
      code: 200,
      message: ''
    });
    leaves.leaderboard.mockResolvedValue({
      ok: true,
      code: 200,
      message: ''
    });
    await refresh();
    expect(text(run())).toContain('miniGameTab.rankUnavailable');
  });
  it.each([['denied', 'denied'], ['', 'miniGameTab.loadError']] as const)('failed refresh check message %s is displayed', async (message, expected) => {
    leaves.token.mockReturnValue('token');
    await mount();
    await select('2048');
    leaves.check.mockResolvedValue({
      message,
      ok: false,
      code: 403
    });
    await refresh();
    expect(text(run())).toContain(expected);
  });
  it.each([new Error('network'), new Error(''), 'non-error'] as const)('refresh rejection %s uses error or translated fallback', async (error) => {
    leaves.token.mockReturnValue('token');
    await mount();
    await select('2048');
    leaves.check.mockRejectedValue(error);
    await refresh();
    expect(text(run())).toContain(error instanceof Error && error.message ? error.message : 'miniGameTab.loadError');
  });
  it('captcha approval refreshes data and rejected pending submissions remain contained', async () => {
    leaves.token.mockReturnValue('token');
    await mount();
    await select('2048');
    leaves.check.mockResolvedValue(success({
      requireCaptcha: true
    }));
    leaves.captcha.mockResolvedValue({
      ticket: 'ticket',
      randstr: 'random',
      sign: 'sign'
    });
    leaves.flush.mockRejectedValue(new Error('queue'));
    await refresh();
    expect(leaves.score).toHaveBeenCalledTimes(2);
  });
  it('refresh callback captured before logout checks current token and performs no API call', async () => {
    leaves.token.mockReturnValue('token');
    await mount();
    await select('2048');
    const refreshButton = find(run(), (node) => node.props['aria-label'] === 'miniGameTab.refresh');
    leaves.token.mockReturnValue(null);
    invoke(refreshButton, 'onClick');
    await settleHook();
    expect(leaves.check).not.toHaveBeenCalled();
  });
  it.each(['success', 'missing', 'denied', 'reject'] as const)('new game session %s updates actual child handle', async (result) => {
    leaves.token.mockReturnValue('token');
    await mount();
    await select('2048');
    const newGame = vi.fn();
    const ref = game(game2048).props.ref as RefObject<Game2048Handle | null>;
    ref.current = {
      newGame
    };
    if (result === 'missing') {leaves.session.mockResolvedValue({
      ok: true,
      code: 200,
      message: ''
    });}
    if (result === 'denied') {leaves.session.mockResolvedValue({
      ok: false,
      code: 403,
      message: 'denied'
    });}
    if (result === 'reject') leaves.session.mockRejectedValue(new Error('session'));
    invoke(button('miniGameTab.game2048.newGame'), 'onClick');
    await settleHook();
    expect(newGame).toHaveBeenCalledWith(result === 'success' ? {
      sessionId: 'session',
      seed: 3,
      startedAt: 1000
    } : null);
  });
  it('guest new game and absent refs need no server session and remain safe', async () => {
    await mount();
    await select('2048');
    invoke(button('miniGameTab.game2048.newGame'), 'onClick');
    await settleHook();
    expect(leaves.session).not.toHaveBeenCalled();
    leaves.token.mockReturnValue('token');
    leaves.session.mockRejectedValue(new Error('offline'));
    invoke(button('miniGameTab.game2048.newGame'), 'onClick');
    await settleHook();
  });
  it.each(['missing-session', 'missing-trace', 'resolve', 'reject'] as const)('game-end %s reports full session proof or only delayed refresh', async (mode) => {
    leaves.token.mockReturnValue('token');
    await mount();
    await select('2048');
    const payload: Game2048EndPayload = {
      score: 64,
      durationMs: 2000,
      moves: 3,
      achievedAt: 10000,
      sessionId: 'session',
      moveTrace: 'LDR'
    };
    if (mode === 'missing-session') delete payload.sessionId;
    if (mode === 'missing-trace') delete payload.moveTrace;
    if (mode === 'reject') leaves.report.mockRejectedValue(new Error('report'));
    invoke(game(game2048), 'onGameEnd', payload);
    await settleHook();
    expect(leaves.report).toHaveBeenCalledTimes(mode.startsWith('missing') ? 0 : 1);
    const calls = leaves.score.mock.calls.length;
    vi.advanceTimersByTime(1499);
    await settleHook();
    expect(leaves.score).toHaveBeenCalledTimes(calls);
    vi.advanceTimersByTime(1);
    await settleHook();
    expect(leaves.score).toHaveBeenCalledTimes(calls + 1);
  });
  it('leaderboard resolves own and other username/avatar, unknown profile, ranks and seconds/minutes', async () => {
    leaves.token.mockReturnValue('token');
    leaves.score.mockResolvedValue(success({
      gameId: '2048',
      userId: 1,
      highScore: 2048,
      bestDurationMs: 5000,
      bestMoves: 0
    }));
    leaves.leaderboard.mockResolvedValue(success([{
      userId: 1,
      rank: 1,
      highScore: 2048,
      isPro: true
    }, {
      userId: 2,
      rank: 2,
      highScore: 1024,
      username: 'Other',
      avatar: 'other.png'
    }, {
      userId: 3,
      rank: 3,
      highScore: 512,
      username: '   ',
      avatar: ' '
    }, {
      userId: 4,
      rank: 4,
      highScore: 256
    }, {
      userId: 5,
      rank: 5,
      highScore: 128
    }]));
    await mount();
    await select('2048');
    expect(text(run())).toContain('5s');
    expect(text(run())).toContain('player');
    expect(text(run())).toContain('Other');
    expect(text(run())).toContain('miniGameTab.unknownUser');
    expect(elements(run()).filter((node) => String(node.props.className).split(' ').includes('mg-lb-row'))).toHaveLength(4);
    leaves.profile.mockReturnValue(null);
    run();
    expect(byClass(run(), 'mg-lb-user-avatar').props.src).toBe('other.png');
    leaves.score.mockResolvedValue(success({
      gameId: '2048',
      userId: 99,
      highScore: 2048,
      bestDurationMs: 65000
    }));
    await refresh();
    expect(text(run())).toContain('1m 5s');
    expect(text(run())).toContain('miniGameTab.rankUnavailable');
  });
  it('navigation drag leave and empty/same drop keep order, card opens game and failed saves are contained', async () => {
    await mount();
    invoke(button('miniGameTab.index.edit'), 'onClick');
    let cards = elements(run()).filter((node) => String(node.props.className).startsWith('settings-index-card editing'));
    const preventDefault = vi.fn();
    invoke(cards[0], 'onDrop', {
      preventDefault
    });
    invoke(cards[0], 'onDragStart', {
      dataTransfer: {
        effectAllowed: ''
      }
    });
    invoke(cards[0], 'onDragOver', {
      preventDefault
    });
    expect(text(run())).toContain('miniGameTab.index.title');
    invoke(cards[0], 'onDragLeave');
    invoke(cards[0], 'onDrop', {
      preventDefault
    });
    invoke(cards[0], 'onDragEnd');
    expect(elements(run()).filter((node) => String(node.props.className).startsWith('settings-index-card editing')).map(text)).toEqual(cards.map(text));
    leaves.write.mockRejectedValue(new Error('write'));
    invoke(button('miniGameTab.index.done'), 'onClick');
    await settleHook();
    cards = elements(run()).filter((node) => node.props.className === 'settings-index-card');
    invoke(cards[1], 'onClick');
    expect(game(gomoku).props.boardAriaLabel).toBe('miniGameTab.gomoku.boardAria');
    expect(preventDefault).toHaveBeenCalledTimes(3);
  });
  it('Gomoku accessibility, absent restart refs, pvp overlays and all difficulty changes reach real callbacks', async () => {
    await mount();
    await select('gomoku');
    expect(invoke(game(gomoku), 'getCellAriaLabel', 3, 7)).toBe('miniGameTab.gomoku.cellAria');
    invoke(button('miniGameTab.gomoku.restart'), 'onClick');
    invoke(button('miniGameTab.gomoku.highlightLastMove'), 'onClick');
    let radios = elements(run()).filter((node) => node.type === 'input' && node.props.name === 'gomoku-match-mode');
    invoke(radios[1], 'onChange');
    invoke(game(gomoku), 'onStateChange', {
      turn: 1,
      winner: 1,
      moves: 9,
      lastMove: null,
      aiThinking: false
    });
    expect(game(gomoku).props.resultOverlayText).toBe('miniGameTab.gomoku.winnerBlack');
    invoke(game(gomoku), 'onStateChange', {
      turn: 2,
      winner: 2,
      moves: 10,
      lastMove: null,
      aiThinking: false
    });
    expect(game(gomoku).props.resultOverlayText).toBe('miniGameTab.gomoku.winnerWhite');
    invoke(game(gomoku), 'onStateChange', {
      turn: 1,
      winner: 0,
      moves: 0,
      lastMove: null,
      aiThinking: false
    });
    radios = elements(run()).filter((node) => node.type === 'input' && node.props.name === 'gomoku-match-mode');
    invoke(radios[0], 'onChange');
    const restart = vi.fn();
    const ref = game(gomoku).props.ref as RefObject<GameGomokuHandle | null>;
    ref.current = {
      restart
    };
    invoke(radios[0], 'onChange');
    ['master', 'expert', 'hard', 'easy', 'novice', 'invalid'].forEach((difficulty) => {
      invoke(find(run(), (node) => node.type === 'select'), 'onChange', {
        target: {
          value: difficulty
        }
      });
      expect(game(gomoku).props.aiDifficulty).toBe(difficulty === 'invalid' ? 'novice' : difficulty);
    });
    expect(restart).toHaveBeenCalledTimes(7);
  });
  it('invalid stored mode is ignored and a successful empty captcha check refreshes normally', async () => {
    leaves.read.mockImplementation((key) => Promise.resolve(key === 'mini-game-gomoku-settings' ? {
      mode: 'invalid',
      difficulty: 'novice'
    } : null));
    leaves.token.mockReturnValue('token');
    await mount();
    await select('2048');
    leaves.check.mockResolvedValue({
      ok: true,
      code: 200,
      message: ''
    });
    await refresh();
    expect(leaves.score).toHaveBeenCalledTimes(2);
    expect(leaves.captcha).not.toHaveBeenCalled();
  });
  it('logout during refresh check prevents load requests, including delayed ended-game refresh', async () => {
    leaves.token.mockReturnValue('token');
    await mount();
    await select('2048');
    const pending = deferred<Awaited<ReturnType<typeof GameApi.checkLeaderboardRefreshCaptcha>>>();
    leaves.check.mockReturnValue(pending.promise);
    invoke(find(run(), (node) => node.props['aria-label'] === 'miniGameTab.refresh'), 'onClick');
    leaves.token.mockReturnValue(null);
    pending.resolve(success({
      requireCaptcha: false
    }));
    await settleHook();
    expect(leaves.score).toHaveBeenCalledTimes(1);
    invoke(game(game2048), 'onGameEnd', {
      score: 64,
      durationMs: 2000,
      moves: 3,
      achievedAt: 10000
    });
    vi.advanceTimersByTime(1500);
    await settleHook();
    expect(leaves.score).toHaveBeenCalledTimes(1);
  });
  it('late successful requests use current guest cache identity and rejected login loads are contained', async () => {
    leaves.token.mockReturnValue('token');
    leaves.profile.mockReturnValue(null);
    const pending = deferred<Awaited<ReturnType<typeof GameApi.getMyScore>>>();
    leaves.score.mockReturnValueOnce(pending.promise);
    run();
    flushHookEffects();
    await select('2048');
    leaves.token.mockReturnValue(null);
    pending.resolve(success(null));
    await settleHook();
    expect(text(run())).toContain('miniGameTab.lbEmpty');
    leaves.token.mockReturnValue('token');
    leaves.score.mockRejectedValue(new Error('load'));
    changed?.();
    await settleHook();
    expect(text(run())).toContain('miniGameTab.loadError');
  });
});
