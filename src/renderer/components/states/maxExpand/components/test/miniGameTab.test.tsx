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
 * @file miniGameTab.test.tsx
 * @description 小游戏导航、对局控制、账号状态和排行榜分支测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, nodes, render, text, trigger, value } from '../../test/componentHarness';
import { MiniGameTab } from '../MiniGameTab';
import { Game2048 } from '../games/Game2048';
import { GameGomoku, GOMOKU_SIZE } from '../games/GameGomoku';
import type { ReactNode } from 'react';
import type * as MiniGameApi from '../../../../../api/miniGame/miniGameScoreApi';
import type { UserAccountResult } from '../../../../../api/user/userAccountApi.types';
import type { runSliderCaptcha } from '../../../../../utils/sliderCaptcha';
import type { Game2048Handle, Game2048State } from '../games/Game2048';
import type { GameGomokuHandle, GameGomokuState } from '../games/GameGomoku';

const mocks = vi.hoisted(() => ({
  token: vi.fn<() => string | null>(), profile: vi.fn(() => ({ username: 'player', email: 'player@example.test', avatar: 'avatar.png' })),
  subscribe: vi.fn<(callback: () => void) => () => void>(), unsubscribe: vi.fn(), login: vi.fn(), register: vi.fn(),
  read: vi.fn<(key: string) => Promise<unknown>>(), write: vi.fn<(key: string, value: unknown) => Promise<boolean>>(),
  score: vi.fn<typeof MiniGameApi.getMyScore>(), leaderboard: vi.fn<typeof MiniGameApi.getLeaderboard>(),
  refreshCheck: vi.fn<typeof MiniGameApi.checkLeaderboardRefreshCaptcha>(), flush: vi.fn<typeof MiniGameApi.flushPendingSubmissions>(),
  report: vi.fn<typeof MiniGameApi.reportNewBest>(), session: vi.fn<typeof MiniGameApi.startGameSession>(), captcha: vi.fn<typeof runSliderCaptcha>(),
}));
vi.mock('../../../../../store/index', () => ({ useIslandStore: () => ({ setLogin: mocks.login, setRegister: mocks.register }) }));
vi.mock('../../../../../utils/userAccount', () => ({ readLocalToken: mocks.token, readLocalProfile: mocks.profile, subscribeUserAccountSessionChanged: mocks.subscribe }));
vi.mock('../../../../../utils/sliderCaptcha', () => ({ runSliderCaptcha: mocks.captcha }));
vi.mock('../../../../../api/miniGame/miniGameScoreApi', () => ({
  getMyScore: mocks.score, getLeaderboard: mocks.leaderboard, checkLeaderboardRefreshCaptcha: mocks.refreshCheck,
  flushPendingSubmissions: mocks.flush, reportNewBest: mocks.report, startGameSession: mocks.session,
}));

/**
 * 构造接口的成功响应。
 * @param data - 接口返回数据。
 * @returns 保留完整通用响应字段的数据。
 */
function success<T>(data: T): UserAccountResult<T> {
  return { data, ok: true, code: 200, message: '' };
}

/**
 * 点击指定序号的真实元素处理器。
 * @param tree - 当前组件元素树。
 * @param selector - 元素选择器。
 * @param index - 匹配元素序号。
 */
function click(tree: ReactNode, selector: string, index = 0): void {
  const handler = value(tree, selector, 'onClick', index) as () => void;
  handler();
}

/**
 * 从首页切换到指定游戏。
 * @param index - 2048 为 1，五子棋为 2。
 * @returns 游戏页元素树。
 */
function selectGame(index: number): ReactNode {
  click(render(MiniGameTab), '.max-expand-settings-sidebar-item', index);
  return render(MiniGameTab);
}

describe('MiniGameTab', () => {
  beforeEach(() => {
    mocks.token.mockReturnValue(null);
    mocks.subscribe.mockReturnValue(mocks.unsubscribe);
    mocks.read.mockResolvedValue(null);
    mocks.write.mockResolvedValue(true);
    mocks.flush.mockResolvedValue(undefined);
    mocks.score.mockResolvedValue(success(null));
    mocks.leaderboard.mockResolvedValue(success([]));
    mocks.refreshCheck.mockResolvedValue(success({ requireCaptcha: false }));
    mocks.session.mockResolvedValue(success({ sessionId: 's1', seed: 3, startedAt: 10 }));
    mocks.captcha.mockResolvedValue(null);
    vi.stubGlobal('window', { api: { storeRead: mocks.read, storeWrite: mocks.write } });
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('首页只显示游戏导航，搜索支持结果、空结果和清空', () => {
    let tree = render(MiniGameTab);
    expect(nodes(tree, '.settings-index-card')).toHaveLength(2);
    expect(nodes(tree, Game2048)).toHaveLength(0);
    trigger(tree, '.settings-index-search-input', 'onChange', { target: { value: 'gomoku' } });
    tree = render(MiniGameTab);
    expect(nodes(tree, '.settings-index-search-dropdown-item')).toHaveLength(1);
    trigger(tree, '.settings-index-search-input', 'onChange', { target: { value: 'no-such-game' } });
    tree = render(MiniGameTab);
    expect(text(tree)).toContain('miniGameTab.index.searchEmpty');
    click(tree, '.settings-index-search-clear');
    expect(nodes(render(MiniGameTab), '.settings-index-search-dropdown')).toHaveLength(0);
  });

  it('搜索结果进入指定游戏并清空查询，首页按钮返回导航', () => {
    trigger(render(MiniGameTab), '.settings-index-search-input', 'onChange', { target: { value: 'gomoku' } });
    click(render(MiniGameTab), '.settings-index-search-dropdown-item');
    let tree = render(MiniGameTab);
    expect(nodes(tree, GameGomoku)).toHaveLength(1);
    click(tree, '.max-expand-settings-sidebar-item');
    tree = render(MiniGameTab);
    expect(value(tree, '.settings-index-search-input', 'value')).toBe('');
    expect(nodes(tree, GameGomoku)).toHaveLength(0);
  });

  it('编辑模式可以隐藏和恢复导航卡片，完成与重置时持久化配置', () => {
    click(render(MiniGameTab), '.settings-nav-edit-btn', 1);
    let tree = render(MiniGameTab);
    expect(nodes(tree, '.editing')).toHaveLength(2);
    click(tree, '.settings-index-card-remove');
    tree = render(MiniGameTab);
    expect(nodes(tree, '.settings-index-card')).toHaveLength(1);
    expect(nodes(tree, '.settings-nav-add-item')).toHaveLength(1);
    click(tree, '.settings-nav-add-item');
    tree = render(MiniGameTab);
    expect(nodes(tree, '.settings-index-card')).toHaveLength(2);
    click(tree, '.settings-nav-edit-btn', 1);
    expect(mocks.write).toHaveBeenCalledWith('mini-game-nav-order', ['game-gomoku', 'game-2048']);
    click(render(MiniGameTab), '.settings-nav-edit-btn');
    expect(mocks.write).toHaveBeenCalledWith('mini-game-nav-order', ['game-2048', 'game-gomoku']);
    expect(mocks.write).toHaveBeenCalledWith('mini-game-hidden-nav-order', []);
  });

  it('拖动编辑卡片交换导航顺序，并清除拖动标识', () => {
    click(render(MiniGameTab), '.settings-nav-edit-btn', 1);
    let tree = render(MiniGameTab);
    const dataTransfer = { effectAllowed: '' };
    trigger(tree, '.settings-index-card', 'onDragStart', { dataTransfer });
    const onDragOver = value(tree, '.settings-index-card', 'onDragOver', 1) as (event: { preventDefault: () => void }) => void;
    const preventDefault = vi.fn();
    onDragOver({ preventDefault });
    tree = render(MiniGameTab);
    expect(nodes(tree, '.drag-over')).toHaveLength(1);
    const onDrop = value(tree, '.settings-index-card', 'onDrop', 1) as (event: { preventDefault: () => void }) => void;
    onDrop({ preventDefault });
    tree = render(MiniGameTab);
    expect(text(nodes(tree, '.settings-index-card')[0])).toContain('game-gomoku');
    trigger(tree, '.settings-index-card', 'onDragEnd');
    expect(nodes(render(MiniGameTab), '.drag-over')).toHaveLength(0);
    expect(dataTransfer.effectAllowed).toBe('move');
    expect(preventDefault).toHaveBeenCalledTimes(2);
  });

  it('游客2048页显示认证入口和本局分数，登录注册事件被转发', () => {
    let tree = selectGame(1);
    expect(text(tree)).toContain('miniGameTab.auth.entryTitle');
    expect(nodes(tree, '.mg-leaderboard')).toHaveLength(0);
    click(tree, '.settings-user-primary-btn');
    click(tree, '.settings-user-secondary-btn');
    expect(mocks.login).toHaveBeenCalledOnce();
    expect(mocks.register).toHaveBeenCalledOnce();
    trigger(tree, Game2048, 'onStateChange', { score: 128, best: 256, over: false, moveCount: 10 } satisfies Game2048State);
    tree = render(MiniGameTab);
    expect(value(tree, '.g2048-score-val', 'children')).toBe(128);
    expect(value(tree, '.g2048-score-val', 'children', 1)).toBe('--');
  });

  it.each([false, true])('2048重开在登录状态 %s 下传递服务器会话或空会话', async (loggedIn) => {
    mocks.token.mockReturnValue(loggedIn ? 'token' : null);
    const tree = selectGame(1);
    const newGame = vi.fn();
    const ref = value(tree, Game2048, 'ref') as { current: Game2048Handle | null };
    ref.current = { newGame };
    click(tree, '.g2048-new-btn');
    await vi.waitFor(() => { expect(newGame).toHaveBeenCalledOnce(); });
    expect(newGame).toHaveBeenCalledWith(loggedIn ? { sessionId: 's1', seed: 3, startedAt: 10 } : null);
    expect(mocks.session).toHaveBeenCalledTimes(loggedIn ? 1 : 0);
  });

  it('会话创建失败时仍以空会话重开', async () => {
    mocks.token.mockReturnValue('token');
    mocks.session.mockRejectedValue(new Error('offline'));
    const tree = selectGame(1);
    const newGame = vi.fn();
    const ref = value(tree, Game2048, 'ref') as { current: Game2048Handle | null };
    ref.current = { newGame };
    click(tree, '.g2048-new-btn');
    await vi.waitFor(() => { expect(newGame).toHaveBeenCalledWith(null); });
  });

  it('五子棋选择对战模式和难度调用重开，并按落子状态锁定设置', () => {
    let tree = selectGame(2);
    const restart = vi.fn();
    const ref = value(tree, GameGomoku, 'ref') as { current: GameGomokuHandle | null };
    ref.current = { restart };
    trigger(tree, '.gomoku-difficulty-select', 'onChange', { target: { value: 'master' } });
    tree = render(MiniGameTab);
    expect(value(tree, GameGomoku, 'aiDifficulty')).toBe('master');
    const onChange = value(tree, 'input', 'onChange', 1) as () => void;
    onChange();
    tree = render(MiniGameTab);
    expect(value(tree, GameGomoku, 'aiDifficulty')).toBeUndefined();
    expect(nodes(tree, '.gomoku-difficulty-select')).toHaveLength(0);
    expect(restart).toHaveBeenCalledTimes(2);
    const state: GameGomokuState = { board: [], turn: 1, winner: 0, moves: 1, scale: 1, lastMove: [0, 0] };
    trigger(tree, GameGomoku, 'onStateChange', state);
    tree = render(MiniGameTab);
    expect(value(tree, 'input', 'disabled')).toBe(true);
    click(tree, '.g2048-new-btn', 1);
    expect(value(render(MiniGameTab), GameGomoku, 'highlightPulse')).toBe(1);
    click(tree, '.g2048-new-btn');
    expect(restart).toHaveBeenCalledTimes(3);
  });

  it.each([
    { winner: 1, turn: 1, moves: 5, aiThinking: false, status: 'winnerBlack', overlay: 'victory' },
    { winner: 2, turn: 2, moves: 6, aiThinking: false, status: 'winnerWhite', overlay: 'defeat' },
    { winner: 0, turn: 2, moves: 2, aiThinking: true, status: 'thinking', overlay: null },
    { winner: 0, turn: 2, moves: 2, aiThinking: false, status: 'turnWhite', overlay: null },
    { winner: 0, turn: 1, moves: GOMOKU_SIZE * GOMOKU_SIZE, aiThinking: false, status: 'draw', overlay: 'draw' },
  ] as const)('五子棋状态 $status 对应提示与结果遮罩', ({ winner, turn, moves, aiThinking, status, overlay }) => {
    let tree = selectGame(2);
    trigger(tree, GameGomoku, 'onStateChange', { winner, turn, moves, aiThinking, board: [], scale: 1, lastMove: null } satisfies GameGomokuState);
    tree = render(MiniGameTab);
    expect(text(tree)).toContain(`miniGameTab.gomoku.${status}`);
    expect(value(tree, GameGomoku, 'resultOverlayText')).toEqual(overlay === null ? null : expect.stringContaining(`miniGameTab.gomoku.${overlay}`));
    expect(nodes(tree, '.mg-leaderboard')).toHaveLength(0);
  });

  it('登录刷新渲染排名、前三标识、PRO、昵称头像回退并限制四条结果', async () => {
    mocks.token.mockReturnValue('token');
    mocks.score.mockResolvedValue(success({ gameId: '2048', userId: 1, highScore: 2048, bestDurationMs: 65000, bestMoves: 0 }));
    mocks.leaderboard.mockResolvedValue(success([
      { userId: 1, rank: 1, highScore: 2048, isPro: true },
      { userId: 2, rank: 2, highScore: 1024, username: 'other', avatar: 'other.png' },
      { userId: 3, rank: 3, highScore: 512 },
      { userId: 4, rank: 4, highScore: 256, username: 'fourth' },
      { userId: 5, rank: 5, highScore: 128, username: 'hidden' },
    ]));
    click(selectGame(1), '.mg-refresh-btn', 1);
    await vi.waitFor(() => { expect(mocks.score).toHaveBeenCalledWith('token', '2048'); });
    await vi.waitFor(() => { expect(nodes(render(MiniGameTab), '.mg-lb-row')).toHaveLength(4); });
    const tree = render(MiniGameTab);
    expect(nodes(tree, '.mg-lb-top')).toHaveLength(3);
    expect(nodes(tree, '.mg-lb-row-pro')).toHaveLength(1);
    expect(value(tree, '.mg-lb-user-avatar', 'src')).toBe('avatar.png');
    expect(text(tree)).toContain('player');
    expect(text(tree)).toContain('miniGameTab.unknownUser');
    expect(text(tree)).not.toContain('hidden');
    expect(value(tree, '.g2048-score-val', 'children', 2)).toBe('1m 5s');
    expect(value(tree, '.g2048-score-val', 'children', 3)).toBe(0);
  });

  it('验证码取消时不刷新数据，检查失败时展示错误并禁用刷新', async () => {
    mocks.token.mockReturnValue('token');
    mocks.refreshCheck.mockResolvedValue(success({ requireCaptcha: true }));
    click(selectGame(1), '.mg-refresh-btn', 1);
    await vi.waitFor(() => { expect(mocks.captcha).toHaveBeenCalledWith('player@example.test'); });
    expect(mocks.score).not.toHaveBeenCalled();
    mocks.refreshCheck.mockResolvedValue({ ok: false, code: 500, message: 'check failed' });
    click(render(MiniGameTab), '.mg-refresh-btn', 1);
    await vi.waitFor(() => { expect(text(render(MiniGameTab))).toContain('check failed'); });
    expect(value(render(MiniGameTab), '.mg-refresh-btn', 'disabled', 1)).toBe(true);
  });

  it('排行请求未完成时展示加载态，失败后保留可见错误提示', async () => {
    mocks.token.mockReturnValue('token');
    const scoreRequest = Promise.withResolvers<Awaited<ReturnType<typeof MiniGameApi.getMyScore>>>();
    mocks.score.mockReturnValue(scoreRequest.promise);
    click(selectGame(1), '.mg-refresh-btn', 1);
    await vi.waitFor(() => { expect(text(render(MiniGameTab))).toContain('miniGameTab.loading'); });
    scoreRequest.reject(new Error('offline'));
    await vi.waitFor(() => { expect(text(render(MiniGameTab))).toContain('miniGameTab.loadError'); });
    expect(nodes(render(MiniGameTab), '.mg-notice')).toHaveLength(0);
  });

  it('显式运行初始 effect 读取导航与对局设置，并清理账号订阅', async () => {
    mocks.read.mockImplementation((key) => Promise.resolve(key === 'mini-game-gomoku-settings' ? { mode: 'pvp', difficulty: 'expert' } : null));
    const initialTree = render(MiniGameTab);
    expect(nodes(initialTree, '.settings-index-card')).toHaveLength(2);
    const cleanups = flushEffects();
    expect(mocks.read).toHaveBeenCalledWith('mini-game-nav-order');
    expect(mocks.read).toHaveBeenCalledWith('mini-game-gomoku-settings');
    expect(mocks.subscribe).toHaveBeenCalledOnce();
    await vi.waitFor(() => { expect(mocks.read).toHaveBeenCalledWith('mini-game-hidden-nav-order'); });
    const tree = selectGame(2);
    expect(value(tree, GameGomoku, 'aiDifficulty')).toBeUndefined();
    expect(value(tree, 'input', 'checked', 1)).toBe(true);
    cleanups.forEach((cleanup) => { cleanup(); });
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });
});
