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
 */

/**
 * @file useMusicProviderQrLogin.ts
 * @description 音乐提供商二维码登录状态与轮询逻辑
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  MusicProviderAuthState,
  MusicProviderId,
} from '../../../../../shared/musicProviderAuth';

interface MusicProviderQrLoginState {
  authState: MusicProviderAuthState;
  qrContent: string;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const DEFAULT_POLL_DELAY_MS = 4_500;

/**
 * 管理指定音乐提供商的二维码登录流程
 * @param provider - 音乐提供商标识
 * @returns 二维码、状态以及刷新和退出操作
 */
export function useMusicProviderQrLogin(provider: MusicProviderId): MusicProviderQrLoginState {
  const [authState, setAuthState] = useState<MusicProviderAuthState>('idle');
  const [qrContent, setQrContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tokenRef = useRef('');
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);

  const stopPolling = useCallback(() => {
    generationRef.current += 1;
    tokenRef.current = '';
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = null;
  }, []);

  const schedulePoll = useCallback((generation: number, delayMs: number) => {
    pollTimerRef.current = setTimeout(async () => {
      if (generation !== generationRef.current || !tokenRef.current) return;
      try {
        const result = await window.api.musicProviderAuthCheckQr(provider, tokenRef.current);
        if (generation !== generationRef.current) return;
        setAuthState(result.state);
        setError('');
        if (result.state === 'confirmed' || result.state === 'expired' || result.state === 'mfa_cancelled') {
          stopPolling();
          return;
        }
        schedulePoll(generation, result.retryAfterMs || DEFAULT_POLL_DELAY_MS);
      } catch (cause) {
        if (generation !== generationRef.current) return;
        setAuthState('error');
        setError(cause instanceof Error ? cause.message : String(cause));
        schedulePoll(generation, 8_000);
      }
    }, delayMs);
  }, [provider, stopPolling]);

  const refresh = useCallback(async () => {
    stopPolling();
    setLoading(true);
    setError('');
    setQrContent('');
    try {
      const result = await window.api.musicProviderAuthCreateQr(provider);
      const generation = generationRef.current;
      tokenRef.current = result.token;
      setQrContent(result.qrContent);
      setAuthState(result.state);
      schedulePoll(generation, 1_200);
    } catch (cause) {
      setAuthState('error');
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [provider, schedulePoll, stopPolling]);

  const logout = useCallback(async () => {
    stopPolling();
    setLoading(true);
    setError('');
    try {
      await window.api.musicProviderAuthClear(provider);
      setAuthState('idle');
      setQrContent('');
      await refresh();
    } catch (cause) {
      setAuthState('error');
      setError(cause instanceof Error ? cause.message : String(cause));
      setLoading(false);
    }
  }, [provider, refresh, stopPolling]);

  useEffect(() => {
    let active = true;
    window.api.musicProviderAuthStatus(provider)
      .then((status) => {
        if (!active) return;
        if (status.loggedIn) {
          setAuthState('confirmed');
          setLoading(false);
          return;
        }
        return refresh();
      })
      .catch((cause) => {
        if (!active) return;
        setAuthState('error');
        setError(cause instanceof Error ? cause.message : String(cause));
        setLoading(false);
      });
    return () => {
      active = false;
      stopPolling();
    };
  }, [provider, refresh, stopPolling]);

  return { authState, qrContent, loading, error, refresh, logout };
}