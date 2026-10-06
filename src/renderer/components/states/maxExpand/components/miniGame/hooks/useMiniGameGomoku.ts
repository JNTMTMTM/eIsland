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
 * @file useMiniGameGomoku.ts
 * @description 管理页面持有的五子棋快照、模式难度存储和控制句柄。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GOMOKU_SIZE, type GomokuAIDifficulty, type GameGomokuHandle, type GameGomokuState } from '../../games/GameGomoku';
import { MINI_GAME_GOMOKU_SETTINGS_STORE_KEY } from '../config/miniGameConfig';
import { createEmptyGomokuState } from '../utils/createEmptyGomokuState';
import type { MiniGameGomokuState, GomokuMatchMode, GomokuSettingsStoredState } from '../types';

/**
 * 保持五子棋设置恢复、保存和游戏控制的原有顺序。
 * @returns 五子棋展示快照、设置及控制事件。
 */
export function useMiniGameGomoku(): MiniGameGomokuState {
  const gomokuRef = useRef<GameGomokuHandle>(null);
  const [gomokuState, setGomokuState] = useState<GameGomokuState>(() => createEmptyGomokuState());
  const [gomokuMode, setGomokuMode] = useState<GomokuMatchMode>('pve');
  const [gomokuDifficulty, setGomokuDifficulty] = useState<GomokuAIDifficulty>('novice');
  const [gomokuSettingsReady, setGomokuSettingsReady] = useState(false);
  const [gomokuHighlightPulse, setGomokuHighlightPulse] = useState(0);

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
  const gomokuSettingsLocked = gomokuState.moves > 0;

  return {
    gomokuRef,
    gomokuState,
    gomokuMode,
    setGomokuMode,
    gomokuDifficulty,
    setGomokuDifficulty,
    gomokuHighlightPulse,
    handleGomokuStateChange,
    handleStartGomoku,
    handleHighlightLastGomokuMove,
    gomokuDraw,
    gomokuSettingsLocked,
  };
}
