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
 * @file useGameGomokuEngine.ts
 * @description 五子棋游戏状态与 AI 驱动逻辑 Hook。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState, type WheelEvent } from 'react';
import type { GameGomokuState, GomokuAIDifficulty } from '../config/types';
import { GOMOKU_SIZE } from '../config/types';
import { createGomokuBoard, isGomokuWin } from '../utils/board';
import { selectGomokuAIMove } from '../utils/ai';
import { normalizeGomokuStoredState } from '../utils/storage';

interface UseGameGomokuEngineParams {
  storageKey?: string;
  onStateChange?: (state: GameGomokuState) => void;
  aiDifficulty?: GomokuAIDifficulty;
}

interface UseGameGomokuEngineResult {
  board: number[][];
  winner: 1 | 2 | 0;
  scale: number;
  onCellClick: (row: number, col: number) => void;
  onBoardWheel: (event: WheelEvent<HTMLDivElement>) => void;
  restart: () => void;
}

/**
 * 管理五子棋对局状态与交互行为。
 */
export function useGameGomokuEngine({
  storageKey,
  onStateChange,
  aiDifficulty,
}: UseGameGomokuEngineParams): UseGameGomokuEngineResult {
  const [board, setBoard] = useState<number[][]>(() => createGomokuBoard());
  const [turn, setTurn] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<1 | 2 | 0>(0);
  const [moves, setMoves] = useState(0);
  const [scale, setScale] = useState(1);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [stateReady, setStateReady] = useState(false);
  const lastReportedRef = useRef<string>('');
  const moveSoundRef = useRef<HTMLAudioElement | null>(null);

  const playMoveSound = useCallback(() => {
    if (!moveSoundRef.current) {
      moveSoundRef.current = new Audio('../audio/GOMOKU.wav');
      moveSoundRef.current.preload = 'auto';
      moveSoundRef.current.loop = false;
    }
    const audio = moveSoundRef.current;
    try {
      audio.currentTime = 0;
    } catch {
      // noop
    }
    audio.play().catch(() => {
      audio.src = '../audio/GOMOKU.wav';
      try {
        audio.currentTime = 0;
      } catch {
        // noop
      }
      void audio.play().catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (!storageKey) {
      setStateReady(true);
      return;
    }
    let cancelled = false;
    window.api.storeRead(storageKey).then((savedState) => {
      if (cancelled) return;
      const normalized = normalizeGomokuStoredState(savedState);
      if (normalized) {
        setBoard(normalized.board);
        setTurn(normalized.turn);
        setWinner(normalized.winner);
        setMoves(normalized.moves);
        setScale(normalized.scale);
        setLastMove(normalized.lastMove);
      }
      setStateReady(true);
    }).catch(() => {
      if (cancelled) return;
      setStateReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!stateReady || !storageKey) {
      return;
    }
    const payload: GameGomokuState = {
      board,
      turn,
      winner,
      moves,
      scale,
      lastMove,
    };
    window.api.storeWrite(storageKey, payload).catch(() => {});
  }, [board, lastMove, moves, scale, stateReady, storageKey, turn, winner]);

  useEffect(() => {
    if (!onStateChange) {
      return;
    }
    const snapshot: GameGomokuState = {
      board,
      turn,
      winner,
      moves,
      scale,
      lastMove,
      aiThinking,
    };
    const signature = `${turn}-${winner}-${moves}-${scale}-${lastMove ? `${lastMove[0]}-${lastMove[1]}` : 'none'}-${aiThinking ? 'thinking' : 'idle'}`;
    if (lastReportedRef.current === signature) {
      return;
    }
    lastReportedRef.current = signature;
    onStateChange(snapshot);
  }, [aiThinking, board, lastMove, moves, onStateChange, scale, turn, winner]);

  const restart = useCallback(() => {
    setBoard(createGomokuBoard());
    setTurn(1);
    setWinner(0);
    setMoves(0);
    setLastMove(null);
    setAiThinking(false);
  }, []);

  const onCellClick = useCallback((row: number, col: number) => {
    if (winner !== 0 || board[row]?.[col] !== 0) {
      return;
    }

    if (aiDifficulty && turn === 2) {
      return;
    }

    const piece = turn;
    const nextBoard = board.map((line) => [...line]);
    nextBoard[row][col] = piece;
    const nextMoves = moves + 1;

    setBoard(nextBoard);
    setMoves(nextMoves);
    setLastMove([row, col]);
    setAiThinking(false);
    playMoveSound();

    if (isGomokuWin(nextBoard, row, col, piece)) {
      setWinner(piece);
      return;
    }

    if (nextMoves >= GOMOKU_SIZE * GOMOKU_SIZE) {
      return;
    }

    setTurn(piece === 1 ? 2 : 1);
  }, [aiDifficulty, board, moves, playMoveSound, turn, winner]);

  useEffect(() => {
    if (!aiDifficulty || winner !== 0 || turn !== 2 || moves >= GOMOKU_SIZE * GOMOKU_SIZE) {
      setAiThinking(false);
      return;
    }

    let cancelled = false;
    setAiThinking(true);
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      const nextMove = selectGomokuAIMove(board, aiDifficulty, 2);
      if (!nextMove) {
        setAiThinking(false);
        return;
      }
      const [row, col] = nextMove;
      if (board[row]?.[col] !== 0) {
        setAiThinking(false);
        return;
      }

      const piece: 1 | 2 = 2;
      const nextBoard = board.map((line) => [...line]);
      nextBoard[row][col] = piece;
      const nextMoves = moves + 1;

      setBoard(nextBoard);
      setMoves(nextMoves);
      setLastMove([row, col]);
      setAiThinking(false);
      playMoveSound();

      if (isGomokuWin(nextBoard, row, col, piece)) {
        setWinner(piece);
        return;
      }

      if (nextMoves >= GOMOKU_SIZE * GOMOKU_SIZE) {
        return;
      }

      setTurn(1);
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [aiDifficulty, board, moves, playMoveSound, turn, winner]);

  const onBoardWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.08 : -0.08;
    setScale((prev) => {
      const next = prev + delta;
      return Math.min(1.8, Math.max(1, Number(next.toFixed(2))));
    });
  }, []);

  return {
    board,
    winner,
    scale,
    onCellClick,
    onBoardWheel,
    restart,
  };
}
