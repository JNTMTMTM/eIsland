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
 * @file useMiniGameLeaderboard.ts
 * @description 管理 2048 会话、账号订阅、排行缓存、验证码刷新和成绩回调。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { readLocalProfile, readLocalToken, subscribeUserAccountSessionChanged } from '../../../../../../utils/userAccount';
import { runSliderCaptcha } from '../../../../../../utils/sliderCaptcha';
import {
  checkLeaderboardRefreshCaptcha,
  getMyScore,
  getLeaderboard,
  flushPendingSubmissions,
  reportNewBest,
  startGameSession,
  type MiniGameScoreData,
  type MiniGameLeaderboardEntry,
  type MiniGameSessionData,
} from '../../../../../../api/miniGame/miniGameScoreApi';
import type { Game2048EndPayload, Game2048Handle, Game2048Session, Game2048State } from '../../games/Game2048';
import type { MiniGameLeaderboardState, RuntimeLeaderboardSnapshot } from '../types';
import { isRankedGame, resolveLeaderboardCacheKey } from '../utils/leaderboardIdentity';

const runtimeLeaderboardCache = new Map<string, RuntimeLeaderboardSnapshot>();
const runtimeLeaderboardLoadedKeys = new Set<string>();

/**
 * 管理排名和对局会话，保留账号隔离的运行时缓存。
 * @param selectedGame - 当前选择的游戏。
 * @param t - 当前语言翻译函数。
 * @returns 排名数据、游戏快照和原有异步回调。
 */
export function useMiniGameLeaderboard(selectedGame: string, t: TFunction): MiniGameLeaderboardState {
  const [loggedIn, setLoggedIn] = useState<boolean>(() => Boolean(readLocalToken()));
  const [myScore, setMyScore] = useState<MiniGameScoreData | null>(null);
  const [leaderboard, setLeaderboard] = useState<MiniGameLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<Game2048State>({ score: 0, best: 0, over: false, moveCount: 0 });
  const [activeSession, setActiveSession] = useState<Game2048Session | null>(null);
  const gameRef = useRef<Game2048Handle>(null);

  const fetchSession = useCallback(async (gameId: string): Promise<Game2048Session | null> => {
    if (gameId !== '2048') return null;
    const token = readLocalToken();
    if (!token) return null;
    const result = await startGameSession(token, gameId);
    if (!result.ok || !result.data) return null;
    const data = result.data as MiniGameSessionData;
    const session: Game2048Session = {
      sessionId: data.sessionId,
      seed: data.seed,
      startedAt: data.startedAt,
    };
    setActiveSession(session);
    return session;
  }, []);

  const loadData = useCallback(async (gameId: string) => {
    if (!isRankedGame(gameId)) {
      setLoading(false);
      setError(null);
      setMyScore(null);
      setLeaderboard([]);
      return;
    }
    const token = readLocalToken();
    if (!token) {
      setMyScore(null);
      setLeaderboard([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [scoreRes, lbRes] = await Promise.all([
        getMyScore(token, gameId),
        getLeaderboard(token, gameId, 20),
      ]);
      const nextMyScore = scoreRes.ok ? (scoreRes.data ?? null) : null;
      const nextLeaderboard = lbRes.ok && lbRes.data ? lbRes.data : [];
      setMyScore(nextMyScore);
      setLeaderboard(nextLeaderboard);
      const cacheKey = resolveLeaderboardCacheKey(gameId);
      runtimeLeaderboardCache.set(cacheKey, {
        myScore: nextMyScore,
        leaderboard: nextLeaderboard,
      });
      runtimeLeaderboardLoadedKeys.add(cacheKey);
    } catch {
      setError(t('miniGameTab.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const syncLogin = (): void => {
      const hasToken = Boolean(readLocalToken());
      setLoggedIn(hasToken);
      if (hasToken && selectedGame && isRankedGame(selectedGame)) {
        flushPendingSubmissions().catch(() => {});
        const cacheKey = resolveLeaderboardCacheKey(selectedGame);
        const cached = runtimeLeaderboardCache.get(cacheKey);
        if (cached) {
          setMyScore(cached.myScore);
          setLeaderboard(cached.leaderboard);
          setError(null);
        }
        if (!runtimeLeaderboardLoadedKeys.has(cacheKey)) {
          loadData(selectedGame);
        }
      } else {
        setMyScore(null);
        setLeaderboard([]);
        setLoading(false);
        setError(null);
        setActiveSession(null);
      }
    };
    syncLogin();
    return subscribeUserAccountSessionChanged(syncLogin);
  }, [selectedGame, loadData]);

  const handleRefresh = (): void => {
    if (!selectedGame || !isRankedGame(selectedGame)) return;
    const profile = readLocalProfile();
    const account = profile?.email?.trim() || profile?.username?.trim() || 'mini-game-leaderboard-refresh';
    const run = async (): Promise<void> => {
      try {
        const token = readLocalToken();
        if (!token) return;
        const checkRes = await checkLeaderboardRefreshCaptcha(token, selectedGame);
        if (!checkRes.ok) {
          setError(checkRes.message || t('miniGameTab.loadError'));
          return;
        }
        if (checkRes.data?.requireCaptcha) {
          const captcha = await runSliderCaptcha(account);
          if (!captcha) return;
        }
        setError(null);
        await flushPendingSubmissions().catch(() => {});
        await loadData(selectedGame);
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : t('miniGameTab.loadError'));
      }
    };
    run();
  };

  const handleGameEnd = useCallback((payload: Game2048EndPayload) => {
    if (!isRankedGame(selectedGame)) {
      return;
    }
    const refresh = (): void => { setTimeout(() => loadData(selectedGame), 1500); };
    if (!payload.sessionId || !payload.moveTrace) {
      refresh();
      return;
    }
    reportNewBest(selectedGame, {
      score: payload.score,
      durationMs: payload.durationMs,
      moves: payload.moves,
      achievedAt: payload.achievedAt,
      sessionId: payload.sessionId,
      moveTrace: payload.moveTrace,
    }).then(refresh, refresh);
  }, [selectedGame, loadData]);

  const handleStartNewGame = useCallback((): void => {
    fetchSession(selectedGame)
      .then((session) => {
        gameRef.current?.newGame(session);
      })
      .catch(() => {
        gameRef.current?.newGame(null);
      });
  }, [fetchSession, selectedGame]);

  const handleGameState = useCallback((s: Game2048State) => setGameState(s), []);

  const myRank = myScore ? (leaderboard.find((entry) => entry.userId === myScore.userId)?.rank ?? null) : null;
  const localProfile = readLocalProfile();

  const resolveEntryName = useCallback((entry: MiniGameLeaderboardEntry): string => {
    if (entry.username && entry.username.trim()) {
      return entry.username;
    }
    if (myScore && entry.userId === myScore.userId && localProfile?.username) {
      return localProfile.username;
    }
    return t('miniGameTab.unknownUser', { defaultValue: '未知用户' });
  }, [localProfile?.username, myScore, t]);

  const resolveEntryAvatar = useCallback((entry: MiniGameLeaderboardEntry): string | null => {
    if (entry.avatar && entry.avatar.trim()) {
      return entry.avatar;
    }
    if (myScore && entry.userId === myScore.userId) {
      return localProfile?.avatar ?? null;
    }
    return null;
  }, [localProfile?.avatar, myScore]);

  return {
    loggedIn,
    myScore,
    leaderboard,
    loading,
    error,
    gameState,
    activeSession,
    gameRef,
    myRank,
    resolveEntryName,
    resolveEntryAvatar,
    handleRefresh,
    handleGameEnd,
    handleStartNewGame,
    handleGameState,
  };
}
