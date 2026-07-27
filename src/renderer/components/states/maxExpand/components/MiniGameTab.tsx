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
 * @file MiniGameTab.tsx
 * @description MaxExpand 迷你游戏入口 Tab：游戏选择 + 个人最高分 + 排行榜
 * @author 鸡哥
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useIslandStore } from '../../../../store/index';
import { readLocalProfile, readLocalToken, subscribeUserAccountSessionChanged } from '../../../../utils/userAccount';
import { runSliderCaptcha } from '../../../../utils/sliderCaptcha';
import { SvgIcon } from '../../../../utils/SvgIcon';
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
} from '../../../../api/miniGame/miniGameScoreApi';
import {
  Game2048,
  type Game2048EndPayload,
  type Game2048Handle,
  type Game2048Session,
  type Game2048State,
} from './games/Game2048';
import {
  GameGomoku,
  GOMOKU_SIZE,
  type GomokuAIDifficulty,
  type GameGomokuHandle,
  type GameGomokuState,
} from './games/GameGomoku';

interface GameEntry {
  id: string;
  labelKey: string;
  available: boolean;
}

const GAME_LIST: GameEntry[] = [
  { id: '2048', labelKey: 'miniGameTab.games.2048', available: true },
  { id: 'gomoku', labelKey: 'miniGameTab.games.gomoku', available: true },
];

type MiniGameIndexCardId = 'game-2048' | 'game-gomoku';
type GomokuMatchMode = 'pve' | 'pvp';

interface MiniGameNavCard {
  id: MiniGameIndexCardId;
  labelKey: string;
  descKey: string;
  gameId: string;
}

const MINI_GAME_NAV_ORDER_STORE_KEY = 'mini-game-nav-order';
const MINI_GAME_HIDDEN_NAV_ORDER_STORE_KEY = 'mini-game-hidden-nav-order';
const MINI_GAME_GOMOKU_STATE_STORE_KEY = 'mini-game-gomoku-state';
const MINI_GAME_GOMOKU_SETTINGS_STORE_KEY = 'mini-game-gomoku-settings';
const MINI_GAME_NAV_CARDS: MiniGameNavCard[] = [
  {
    id: 'game-2048',
    labelKey: 'miniGameTab.nav.game-2048.label',
    descKey: 'miniGameTab.nav.game-2048.desc',
    gameId: '2048',
  },
  {
    id: 'game-gomoku',
    labelKey: 'miniGameTab.nav.game-gomoku.label',
    descKey: 'miniGameTab.nav.game-gomoku.desc',
    gameId: 'gomoku',
  },
];
const DEFAULT_MINI_GAME_NAV_ORDER: MiniGameIndexCardId[] = MINI_GAME_NAV_CARDS.map((card) => card.id);
const MINI_GAME_NAV_CARD_MAP = new Map(MINI_GAME_NAV_CARDS.map((card) => [card.id, card]));
const RANKED_GAME_IDS = new Set<string>(['2048']);

function createEmptyGomokuState(): GameGomokuState {
  return {
    board: Array.from({ length: GOMOKU_SIZE }, () => Array.from({ length: GOMOKU_SIZE }, () => 0)),
    turn: 1,
    winner: 0,
    moves: 0,
    scale: 1,
    lastMove: null,
    aiThinking: false,
  };
}

interface RuntimeLeaderboardSnapshot {
  myScore: MiniGameScoreData | null;
  leaderboard: MiniGameLeaderboardEntry[];
}

interface GomokuSettingsStoredState {
  mode?: GomokuMatchMode;
  difficulty?: GomokuAIDifficulty;
}

const runtimeLeaderboardCache = new Map<string, RuntimeLeaderboardSnapshot>();
const runtimeLeaderboardLoadedKeys = new Set<string>();

function resolveLeaderboardCacheKey(gameId: string): string {
  const profile = readLocalProfile();
  const userKey = profile?.username?.trim()
    ? profile.username.trim()
    : (readLocalToken() ? 'token-user' : 'guest');
  return `${userKey}:${gameId}`;
}

function isRankedGame(gameId: string): boolean {
  return RANKED_GAME_IDS.has(gameId);
}

/**
 * 迷你游戏 Tab 内容
 * @returns React 元素
 */
export function MiniGameTab(): ReactElement {
  const { t, i18n } = useTranslation();
  const { setLogin, setRegister } = useIslandStore();
  const [selectedGame, setSelectedGame] = useState<string>(GAME_LIST[0]?.id ?? '');
  const [activeSidebar, setActiveSidebar] = useState<string>('index');
  const [navOrder, setNavOrder] = useState<MiniGameIndexCardId[]>(DEFAULT_MINI_GAME_NAV_ORDER);
  const [hiddenNavOrder, setHiddenNavOrder] = useState<MiniGameIndexCardId[]>([]);
  const [navEditMode, setNavEditMode] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdxRef = useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loggedIn, setLoggedIn] = useState<boolean>(() => Boolean(readLocalToken()));
  const [myScore, setMyScore] = useState<MiniGameScoreData | null>(null);
  const [leaderboard, setLeaderboard] = useState<MiniGameLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<Game2048State>({ score: 0, best: 0, over: false, moveCount: 0 });
  const [activeSession, setActiveSession] = useState<Game2048Session | null>(null);
  const gameRef = useRef<Game2048Handle>(null);
  const gomokuRef = useRef<GameGomokuHandle>(null);
  const [gomokuState, setGomokuState] = useState<GameGomokuState>(() => createEmptyGomokuState());
  const [gomokuMode, setGomokuMode] = useState<GomokuMatchMode>('pve');
  const [gomokuDifficulty, setGomokuDifficulty] = useState<GomokuAIDifficulty>('novice');
  const [gomokuSettingsReady, setGomokuSettingsReady] = useState(false);
  const [gomokuHighlightPulse, setGomokuHighlightPulse] = useState(0);

  const visibleCards = useMemo(() => {
    const seen = new Set<MiniGameIndexCardId>();
    return navOrder.reduce<typeof MINI_GAME_NAV_CARDS>((ordered, id) => {
      if (seen.has(id)) return ordered;
      const card = MINI_GAME_NAV_CARD_MAP.get(id);
      if (card) {
        ordered.push(card);
        seen.add(id);
      }
      return ordered;
    }, []);
  }, [navOrder]);

  const hiddenCards = useMemo(() => {
    const visibleSet = new Set(visibleCards.map((card) => card.id));
    const seen = new Set<MiniGameIndexCardId>();

    const fromHidden = hiddenNavOrder.reduce<typeof MINI_GAME_NAV_CARDS>((acc, id) => {
      if (seen.has(id) || visibleSet.has(id)) return acc;
      const card = MINI_GAME_NAV_CARD_MAP.get(id);
      if (card) {
        acc.push(card);
        seen.add(id);
      }
      return acc;
    }, []);

    const remaining = MINI_GAME_NAV_CARDS.filter((card) => !visibleSet.has(card.id) && !seen.has(card.id));
    return [...fromHidden, ...remaining];
  }, [hiddenNavOrder, visibleCards]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return MINI_GAME_NAV_CARDS
      .map((card) => {
        const localizedLabel = t(card.labelKey);
        const localizedDesc = t(card.descKey);
        return { ...card, localizedLabel, localizedDesc };
      })
      .filter((card) => card.localizedLabel.toLowerCase().includes(q) || card.localizedDesc.toLowerCase().includes(q));
  }, [searchQuery, i18n.language, t]);

  const persistMiniGameNavConfig = (visibleOrder: MiniGameIndexCardId[], hiddenOrder: MiniGameIndexCardId[]): void => {
    window.api.storeWrite(MINI_GAME_NAV_ORDER_STORE_KEY, visibleOrder).catch(() => {});
    window.api.storeWrite(MINI_GAME_HIDDEN_NAV_ORDER_STORE_KEY, hiddenOrder).catch(() => {});
  };

  const resetMiniGameNavConfig = (): void => {
    const nextVisible = [...DEFAULT_MINI_GAME_NAV_ORDER];
    const nextHidden: MiniGameIndexCardId[] = [];
    setNavOrder(nextVisible);
    setHiddenNavOrder(nextHidden);
    persistMiniGameNavConfig(nextVisible, nextHidden);
  };

  const navigateByCard = (cardId: MiniGameIndexCardId): void => {
    const card = MINI_GAME_NAV_CARD_MAP.get(cardId);
    if (!card) return;
    setSelectedGame(card.gameId);
    setActiveSidebar(card.gameId);
  };

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(MINI_GAME_NAV_ORDER_STORE_KEY).then((savedVisible) => {
      if (cancelled) return;
      const visibleRaw = Array.isArray(savedVisible) ? savedVisible : [];
      window.api.storeRead(MINI_GAME_HIDDEN_NAV_ORDER_STORE_KEY).then((savedHidden) => {
        if (cancelled) return;
        const hiddenRaw = Array.isArray(savedHidden) ? savedHidden : [];
        const validVisible = visibleRaw
          .filter((id): id is MiniGameIndexCardId => typeof id === 'string' && MINI_GAME_NAV_CARD_MAP.has(id as MiniGameIndexCardId))
          .filter((id, idx, arr) => arr.indexOf(id) === idx);
        const mergedVisible = validVisible.length > 0
          ? [...validVisible, ...DEFAULT_MINI_GAME_NAV_ORDER.filter((id) => !validVisible.includes(id))]
          : [...DEFAULT_MINI_GAME_NAV_ORDER];
        const validHidden = hiddenRaw
          .filter((id): id is MiniGameIndexCardId => typeof id === 'string' && MINI_GAME_NAV_CARD_MAP.has(id as MiniGameIndexCardId))
          .filter((id, idx, arr) => arr.indexOf(id) === idx)
          .filter((id) => !mergedVisible.includes(id));
        setNavOrder(mergedVisible);
        setHiddenNavOrder(validHidden);
      }).catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(MINI_GAME_GOMOKU_SETTINGS_STORE_KEY).then((raw) => {
      if (cancelled) return;
      if (raw && typeof raw === 'object') {
        const settings = raw as GomokuSettingsStoredState;
        if (settings.mode === 'pvp' || settings.mode === 'pve') {
          setGomokuMode(settings.mode);
        }
        if (
          settings.difficulty === 'novice'
          || settings.difficulty === 'easy'
          || settings.difficulty === 'hard'
          || settings.difficulty === 'expert'
          || settings.difficulty === 'master'
        ) {
          setGomokuDifficulty(settings.difficulty);
        }
      }
      setGomokuSettingsReady(true);
    }).catch(() => {
      if (cancelled) return;
      setGomokuSettingsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!gomokuSettingsReady) {
      return;
    }
    const payload: GomokuSettingsStoredState = {
      mode: gomokuMode,
      difficulty: gomokuDifficulty,
    };
    window.api.storeWrite(MINI_GAME_GOMOKU_SETTINGS_STORE_KEY, payload).catch(() => {});
  }, [gomokuDifficulty, gomokuMode, gomokuSettingsReady]);

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
  const handleGomokuStateChange = useCallback((s: GameGomokuState) => setGomokuState(s), []);

  const handleStartGomoku = useCallback(() => {
    gomokuRef.current?.restart();
  }, []);

  const handleHighlightLastGomokuMove = useCallback(() => {
    if (!gomokuState.lastMove) {
      return;
    }
    setGomokuHighlightPulse((prev) => prev + 1);
  }, [gomokuState.lastMove]);

  const gomokuDraw = gomokuState.winner === 0 && gomokuState.moves >= GOMOKU_SIZE * GOMOKU_SIZE;
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

  const selectedEntry = GAME_LIST.find((g) => g.id === selectedGame);
  const game2048Available = selectedEntry?.available && selectedGame === '2048';
  const gomokuAvailable = selectedEntry?.available && selectedGame === 'gomoku';
  const selectedGameHintKey = selectedGame === '2048'
    ? 'miniGameTab.game2048.hint'
    : selectedGame === 'gomoku'
      ? 'miniGameTab.gomoku.hint'
      : null;
  const showRankedPanel = isRankedGame(selectedGame);
  const gomokuSettingsLocked = gomokuState.moves > 0;
  const gomokuStatusText = (gomokuMode === 'pve' && gomokuState.turn === 2 && gomokuState.aiThinking && gomokuState.winner === 0)
    ? t('miniGameTab.gomoku.thinking', { defaultValue: '正在思考' })
    : gomokuState.winner === 1
    ? t('miniGameTab.gomoku.winnerBlack')
    : gomokuState.winner === 2
      ? t('miniGameTab.gomoku.winnerWhite')
      : gomokuDraw
        ? t('miniGameTab.gomoku.draw')
        : gomokuState.turn === 1
          ? t('miniGameTab.gomoku.turnBlack')
          : t('miniGameTab.gomoku.turnWhite');
  const gomokuResultOverlayText = gomokuState.winner === 1
    ? (gomokuMode === 'pve' ? t('miniGameTab.gomoku.victory', { defaultValue: '胜利' }) : t('miniGameTab.gomoku.winnerBlack'))
    : gomokuState.winner === 2
      ? (gomokuMode === 'pve' ? t('miniGameTab.gomoku.defeat', { defaultValue: '失败' }) : t('miniGameTab.gomoku.winnerWhite'))
      : gomokuDraw
        ? t('miniGameTab.gomoku.draw')
        : null;

  return (
    <div className="max-expand-settings toolbox-tab-container">
      <div className="max-expand-settings-layout">
        {/* 侧栏：快速导航 + 游戏列表 */}
        <div className="max-expand-settings-sidebar">
          <button
            className={`max-expand-settings-sidebar-item ${activeSidebar === 'index' ? 'active' : ''}`}
            onClick={() => setActiveSidebar('index')}
            type="button"
          >
            <span className="sidebar-dot" />
            {t('miniGameTab.sidebar.index')}
          </button>
          {GAME_LIST.map((game) => (
            <button
              key={game.id}
              className={`max-expand-settings-sidebar-item ${activeSidebar === game.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedGame(game.id);
                setActiveSidebar(game.id);
              }}
              type="button"
            >
              <span className="sidebar-dot" />
              {t(game.labelKey, { defaultValue: game.id })}
            </button>
          ))}
        </div>

        {/* 主面板 */}
        <div className="max-expand-settings-panel settings-scrollbar-thin">
          {activeSidebar !== 'index' && (
            <div className="max-expand-settings-title settings-app-title-line">
              <span>{selectedEntry ? t(selectedEntry.labelKey, { defaultValue: selectedEntry.id }) : ''}</span>
              {selectedEntry?.available && selectedGameHintKey && (
                <span className="settings-app-title-sub mg-main-title-subtitle"> - {t(selectedGameHintKey)}</span>
              )}
              {selectedEntry && !selectedEntry.available && (
                <span className="mg-badge-coming-soon">{t('miniGameTab.comingSoon')}</span>
              )}
            </div>
          )}

          {activeSidebar === 'index' && (
            <div className="max-expand-settings-section settings-index-section">
              <div className="settings-index-header">
                <div className="max-expand-settings-title">
                  {t('miniGameTab.index.title')}
                  <button className="settings-nav-edit-btn" type="button" onClick={resetMiniGameNavConfig}>
                    {t('miniGameTab.index.reset')}
                  </button>
                  <button
                    className={`settings-nav-edit-btn ${navEditMode ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      if (navEditMode) {
                        persistMiniGameNavConfig(navOrder, hiddenNavOrder);
                      }
                      setNavEditMode(!navEditMode);
                    }}
                  >
                    {navEditMode ? t('miniGameTab.index.done') : t('miniGameTab.index.edit')}
                  </button>
                  <div className="settings-index-search-wrap">
                    <span className="settings-index-search-icon" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </span>
                    <input
                      className="settings-index-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('miniGameTab.index.searchPlaceholder')}
                    />
                    {searchQuery && (
                      <button
                        className="settings-index-search-clear"
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label={t('miniGameTab.index.searchClear')}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                    {searchResults && (
                      <div className="settings-index-search-dropdown">
                        {searchResults.length === 0 ? (
                          <div className="settings-index-search-dropdown-empty">{t('miniGameTab.index.searchEmpty')}</div>
                        ) : (
                          searchResults.map((card) => (
                            <button
                              key={card.id}
                              className="settings-index-search-dropdown-item"
                              type="button"
                              onClick={() => {
                                navigateByCard(card.id);
                                setSearchQuery('');
                              }}
                            >
                              <div className="settings-index-search-dropdown-text">
                                <span className="settings-index-search-dropdown-title">{card.localizedLabel}</span>
                                <span className="settings-index-search-dropdown-desc">{card.localizedDesc}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="settings-music-hint settings-index-hint">
                  {navEditMode
                    ? t('miniGameTab.index.hintEdit')
                    : t('miniGameTab.index.hintView')}
                </div>
              </div>
              <div className="settings-index-cards" aria-label={t('miniGameTab.index.ariaNav')}>
                {visibleCards.map((card, idx) => (
                  navEditMode ? (
                    <div
                      key={card.id}
                      className={`settings-index-card editing${dragOverIdx === idx ? ' drag-over' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        dragIdxRef.current = idx;
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIdx(idx);
                      }}
                      onDragLeave={() => setDragOverIdx(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverIdx(null);
                        const from = dragIdxRef.current;
                        if (from === null || from === idx) return;
                        const nextOrder = visibleCards.map((item) => item.id);
                        const [moved] = nextOrder.splice(from, 1);
                        nextOrder.splice(idx, 0, moved);
                        setNavOrder(nextOrder);
                      }}
                      onDragEnd={() => {
                        dragIdxRef.current = null;
                        setDragOverIdx(null);
                      }}
                    >
                      <span className="settings-index-card-drag-handle">⠿</span>
                      <button
                        className="settings-index-card-remove"
                        type="button"
                        onClick={() => {
                          const nextVisible = navOrder.filter((id) => id !== card.id);
                          const nextHidden = hiddenNavOrder.includes(card.id)
                            ? hiddenNavOrder
                            : [...hiddenNavOrder, card.id];
                          setNavOrder(nextVisible);
                          setHiddenNavOrder(nextHidden);
                        }}
                        aria-label={t('miniGameTab.index.removeCard', { label: t(card.labelKey) })}
                      >
                        −
                      </button>
                      <span className="settings-index-card-title">{t(card.labelKey)}</span>
                      <span className="settings-index-card-desc">{t(card.descKey)}</span>
                    </div>
                  ) : (
                    <button
                      key={card.id}
                      className="settings-index-card"
                      type="button"
                      onClick={() => navigateByCard(card.id)}
                    >
                      <span className="settings-index-card-title">{t(card.labelKey)}</span>
                      <span className="settings-index-card-desc">{t(card.descKey)}</span>
                    </button>
                  )
                ))}
              </div>
              {navEditMode && (
                <div className="settings-nav-add-panel" aria-label={t('miniGameTab.index.ariaAddPanel')}>
                  <div className="settings-music-label">{t('miniGameTab.index.addableTitle')}</div>
                  {hiddenCards.length === 0 ? (
                    <div className="settings-music-hint">{t('miniGameTab.index.emptyAddable')}</div>
                  ) : (
                    <div className="settings-nav-add-list">
                      {hiddenCards.map((card) => (
                        <button
                          key={card.id}
                          className="settings-nav-add-item"
                          type="button"
                          onClick={() => {
                            const nextVisible = navOrder.includes(card.id)
                              ? navOrder
                              : [...navOrder, card.id];
                            const nextHidden = hiddenNavOrder.filter((id) => id !== card.id);
                            setNavOrder(nextVisible);
                            setHiddenNavOrder(nextHidden);
                          }}
                        >
                          <span>{t(card.labelKey)}</span>
                          <span className="settings-nav-add-plus">+</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSidebar !== 'index' && (
            <div className={`mg-panel-body mg-panel-game-layout${gomokuAvailable ? ' mg-panel-gomoku' : ''}`}>
            {/* 游戏棋盘（纯净，无上下控件） */}
            {game2048Available && (
              <div className="mg-game-area">
                <Game2048 ref={gameRef} onGameEnd={handleGameEnd} onStateChange={handleGameState} activeSession={activeSession} />
              </div>
            )}
            {gomokuAvailable && (
              <div className="mg-game-area">
                <GameGomoku
                  ref={gomokuRef}
                  storageKey={MINI_GAME_GOMOKU_STATE_STORE_KEY}
                  aiDifficulty={gomokuMode === 'pve' ? gomokuDifficulty : undefined}
                  highlightMove={gomokuState.lastMove}
                  highlightPulse={gomokuHighlightPulse}
                  resultOverlayText={gomokuResultOverlayText}
                  onStateChange={handleGomokuStateChange}
                  boardAriaLabel={t('miniGameTab.gomoku.boardAria')}
                  getCellAriaLabel={(row, col) => t('miniGameTab.gomoku.cellAria', { row, col })}
                />
              </div>
            )}

            {/* 右侧信息面板 */}
            <div className="mg-info-sidebar">
              {/* 游戏说明 + 分数 + 新游戏（同行） */}
              {game2048Available && (
                <div className="mg-section mg-section-top-score">
                  <div className="g2048-score-row g2048-score-cards">
                    <div className="g2048-score-box"><span className="g2048-score-label">{t('miniGameTab.game2048.score')}</span><span className="g2048-score-val">{gameState.score}</span></div>
                    <div className="g2048-score-box"><span className="g2048-score-label">{t('miniGameTab.highScore')}</span><span className="g2048-score-val">{myScore?.highScore?.toLocaleString() ?? '--'}</span></div>
                    <div className="g2048-score-box"><span className="g2048-score-label">{t('miniGameTab.duration')}</span><span className="g2048-score-val">{myScore?.bestDurationMs !== null && myScore?.bestDurationMs !== undefined ? formatDuration(myScore.bestDurationMs) : '--'}</span></div>
                    <div className="g2048-score-box"><span className="g2048-score-label">{t('miniGameTab.moves')}</span><span className="g2048-score-val">{myScore?.bestMoves !== null && myScore?.bestMoves !== undefined ? myScore.bestMoves : '--'}</span></div>
                  </div>
                  <button className="g2048-new-btn g2048-new-btn-block" type="button" onClick={handleStartNewGame}>{t('miniGameTab.game2048.newGame')}</button>
                </div>
              )}
              {gomokuAvailable && (
                <div className="mg-section mg-section-top-score">
                  <div className="g2048-score-row">
                    <div className="g2048-score-box gomoku-status-box">
                      <span className="g2048-score-label">{t('miniGameTab.gomoku.status')}</span>
                      <span className="g2048-score-val">{gomokuStatusText}</span>
                    </div>
                  </div>
                  <div className="g2048-score-row g2048-score-box gomoku-status-box">
                    <span className="g2048-score-label">{t('miniGameTab.gomoku.mode', { defaultValue: '对战模式' })}</span>
                    <div className="settings-card-inline-row">
                      <label className="settings-card-check">
                        <input
                          type="radio"
                          name="gomoku-match-mode"
                          checked={gomokuMode === 'pve'}
                          disabled={gomokuSettingsLocked}
                          onChange={() => {
                            setGomokuMode('pve');
                            gomokuRef.current?.restart();
                          }}
                        />
                        {t('miniGameTab.gomoku.modePve', { defaultValue: '人机对战' })}
                      </label>
                      <label className="settings-card-check">
                        <input
                          type="radio"
                          name="gomoku-match-mode"
                          checked={gomokuMode === 'pvp'}
                          disabled={gomokuSettingsLocked}
                          onChange={() => {
                            setGomokuMode('pvp');
                            gomokuRef.current?.restart();
                          }}
                        />
                        {t('miniGameTab.gomoku.modePvp', { defaultValue: '人人对战' })}
                      </label>
                    </div>
                  </div>
                  {gomokuMode === 'pve' && (
                    <div className="g2048-score-row">
                      <div className="g2048-score-box gomoku-status-box">
                      <span className="g2048-score-label">{t('miniGameTab.gomoku.difficulty', { defaultValue: '选择对局难度' })}</span>
                      <select
                        className="gomoku-difficulty-select"
                        value={gomokuDifficulty}
                        disabled={gomokuSettingsLocked}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const nextDifficulty: GomokuAIDifficulty = raw === 'master'
                            ? 'master'
                            : raw === 'expert'
                              ? 'expert'
                              : raw === 'hard'
                                ? 'hard'
                                : raw === 'easy'
                                  ? 'easy'
                                  : 'novice';
                          setGomokuDifficulty(nextDifficulty);
                          gomokuRef.current?.restart();
                        }}
                      >
                        <option value="novice">{t('miniGameTab.gomoku.difficultyNovice', { defaultValue: '新手' })}</option>
                        <option value="easy">{t('miniGameTab.gomoku.difficultyEasy', { defaultValue: '简单' })}</option>
                        <option value="hard">{t('miniGameTab.gomoku.difficultyHard', { defaultValue: '困难' })}</option>
                        <option value="expert">{t('miniGameTab.gomoku.difficultyExpert', { defaultValue: '专家' })}</option>
                        <option value="master">{t('miniGameTab.gomoku.difficultyMaster', { defaultValue: '大师' })}</option>
                      </select>
                    </div>
                    </div>
                  )}
                  <button className="g2048-new-btn g2048-new-btn-block" type="button" onClick={handleStartGomoku}>{t('miniGameTab.gomoku.restart')}</button>
                  <button
                    className="g2048-new-btn g2048-new-btn-block"
                    type="button"
                    onClick={handleHighlightLastGomokuMove}
                    disabled={!gomokuState.lastMove}
                  >
                    {t('miniGameTab.gomoku.highlightLastMove', { defaultValue: '高亮上一手' })}
                  </button>
                  <div className="mg-empty-hint gomoku-unranked-hint">{t('miniGameTab.gomoku.unrankedHint')}</div>
                </div>
              )}

              {/* 未登录提示 */}
              {showRankedPanel && !loggedIn && (
                <div className="settings-user-auth">
                  <div className="settings-user-auth-entry-title">
                    {t('miniGameTab.auth.entryTitle')}
                  </div>
                  <div className="settings-user-auth-entry-actions">
                    <button type="button" className="settings-user-primary-btn" onClick={() => setLogin()}>
                      {t('miniGameTab.auth.gotoLogin')}
                    </button>
                    <button type="button" className="settings-user-secondary-btn" onClick={() => setRegister()}>
                      {t('miniGameTab.auth.gotoRegister')}
                    </button>
                  </div>
                  <div className="settings-user-auth-hint">
                    {t('miniGameTab.auth.hint')}
                  </div>
                </div>
              )}

              {/* 加载态 */}
              {showRankedPanel && loggedIn && loading && (
                <div className="mg-notice">
                  <span className="mg-notice-text">{t('miniGameTab.loading')}</span>
                </div>
              )}

              {/* 排行榜（始终显示） */}
              {showRankedPanel && loggedIn && !loading && (
                <div className="mg-section mg-section-scroll">
                  <div className="mg-section-header">
                    <div className="mg-section-title-wrap">
                      <span className="mg-section-title">{t('miniGameTab.leaderboard')}</span>
                      <button
                        className="mg-refresh-btn mg-leaderboard-hint-btn"
                        type="button"
                        title={t('miniGameTab.leaderboardRestartHint')}
                        aria-label={t('miniGameTab.leaderboardRestartHint')}
                      >
                        ?
                      </button>
                    </div>
                    <div className="mg-section-header-actions">
                      <span className="mg-my-rank">{t('miniGameTab.myRank')}: {myRank ?? t('miniGameTab.rankUnavailable')}</span>
                      <button className="mg-refresh-btn" type="button" onClick={handleRefresh} title={t('miniGameTab.refresh')} aria-label={t('miniGameTab.refresh')} disabled={Boolean(error)}>
                        <img className="mg-refresh-icon" src={SvgIcon.REVERT} alt="" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div className="mg-refresh-error">
                      <span className="mg-refresh-error-text">{error}</span>
                    </div>
                  )}
                  {leaderboard.length > 0 ? (
                    <div className="mg-leaderboard">
                      <div className="mg-lb-header-row">
                        <span className="mg-lb-rank">#</span>
                        <span className="mg-lb-user">{t('miniGameTab.lbUser')}</span>
                        <span className="mg-lb-score">{t('miniGameTab.lbScore')}</span>
                      </div>
                      {leaderboard.slice(0, 4).map((entry) => (
                        <div key={entry.rank} className={`mg-lb-row ${entry.rank <= 3 ? 'mg-lb-top' : ''}${entry.isPro ? ' mg-lb-row-pro' : ''}`}>
                          <span className={`mg-lb-rank ${entry.rank <= 3 ? `mg-lb-rank-${entry.rank}` : ''}`}>{entry.rank}</span>
                          <span className="mg-lb-user">
                            <span className="mg-lb-user-meta">
                              {resolveEntryAvatar(entry)
                                ? <img className="mg-lb-user-avatar" src={resolveEntryAvatar(entry) ?? ''} alt={resolveEntryName(entry)} />
                                : <span className="mg-lb-user-avatar-placeholder">{resolveEntryName(entry).slice(0, 1)}</span>}
                              {entry.isPro ? <img className="mg-lb-pro-icon" src={SvgIcon.PRO} alt="PRO" /> : null}
                              <span className="mg-lb-user-name">{resolveEntryName(entry)}</span>
                            </span>
                          </span>
                          <span className="mg-lb-score">{entry.highScore.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mg-empty-hint">{t('miniGameTab.lbEmpty')}</div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
