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
 * @file useClipboardHistoryItems.ts
 * @description 剪贴板历史条目管理 hook — 初始化加载、轮询采集、持久化、展开/编辑、复制。
 * @author 鸡哥
 */

import { useShallow } from 'zustand/react/shallow';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../store/slices';
import { DEFAULT_HISTORY_LIMIT, EXIT_MAX_EXPAND_ON_COPY_STORE_KEY, HISTORY_ENABLED_STORE_KEY, HISTORY_LIMIT_STORE_KEY, LOCAL_STORAGE_KEY, POLL_INTERVAL_MS, STORE_KEY } from '../config/clipboardHistoryConfig';
import type { ClipboardHistoryItem, UseClipboardHistoryItemsReturn } from '../types/clipboardHistoryTypes';
import { isRecordableClipboardText, normalizeClipboardText, persistHistory, sanitizeHistory } from '../utils/clipboardHistoryUtils';

/**
 * 管理剪贴板历史条目的完整生命周期：加载、轮询、持久化、展开/编辑、复制
 * @param showCopyFeedback - 复制结果反馈回调
 */
export function useClipboardHistoryItems(
  showCopyFeedback: (type: 'success' | 'error', text: string) => void,
): UseClipboardHistoryItemsReturn {
  const { t } = useTranslation();
  const { setIdle, setLyrics } = useIslandStore(useShallow((store) => ({
    setIdle: store.setIdle,
    setLyrics: store.setLyrics,
  })));
  const [items, setItems] = useState<ClipboardHistoryItem[]>([]);
  const [historyEnabled, setHistoryEnabled] = useState<boolean>(true);
  const [historyLimit, setHistoryLimit] = useState<number>(DEFAULT_HISTORY_LIMIT);
  const [exitMaxExpandOnCopy, setExitMaxExpandOnCopy] = useState<boolean>(false);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustTextareaHeight = useCallback((el: HTMLTextAreaElement | null): void => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  /* ── 初始化加载设置与历史数据 ── */
  useEffect(() => {
    let cancelled = false;

    /* 先读取设置，再用解析后的 historyLimit 加载历史数据 */
    Promise.all([
      window.api.storeRead(HISTORY_ENABLED_STORE_KEY),
      window.api.storeRead(HISTORY_LIMIT_STORE_KEY),
      window.api.storeRead(EXIT_MAX_EXPAND_ON_COPY_STORE_KEY),
    ]).then(([enabledRaw, limitRaw, exitRaw]) => {
      if (cancelled) return;
      const nextEnabled = typeof enabledRaw === 'boolean' ? enabledRaw : true;
      const nextLimit = typeof limitRaw === 'number' && Number.isFinite(limitRaw)
        ? Math.max(1, Math.min(50, Math.round(limitRaw)))
        : DEFAULT_HISTORY_LIMIT;
      const nextExitOnCopy = typeof exitRaw === 'boolean' ? exitRaw : false;
      setHistoryEnabled(nextEnabled);
      setHistoryLimit(nextLimit);
      setExitMaxExpandOnCopy(nextExitOnCopy);
      return nextLimit;
    }).then((resolvedLimit) => {
      if (cancelled) return;
      return window.api.storeRead(STORE_KEY).then((data) => {
        if (cancelled) return;
        const limit = resolvedLimit ?? DEFAULT_HISTORY_LIMIT;
        if (Array.isArray(data) && data.length > 0) {
          setItems(sanitizeHistory(data, limit));
        } else {
          try {
            const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (raw) {
              const parsed = sanitizeHistory(JSON.parse(raw) as unknown[], limit);
              setItems(parsed);
              window.api.storeWrite(STORE_KEY, parsed).catch(() => {});
            }
          } catch {
            // noop
          }
        }
        setLoaded(true);
      });
    }).catch(() => {
      if (cancelled) return;
      setHistoryEnabled(true);
      setHistoryLimit(DEFAULT_HISTORY_LIMIT);
      setExitMaxExpandOnCopy(false);
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) setItems(sanitizeHistory(JSON.parse(raw) as unknown[], DEFAULT_HISTORY_LIMIT));
      } catch {
        // noop
      }
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── 条数上限变化时截断 ── */
  useEffect(() => {
    setItems((prev) => prev.slice(0, historyLimit));
  }, [historyLimit]);

  /* ── 持久化 ── */
  useEffect(() => {
    if (!loaded) return;
    persistHistory(items);
  }, [items, loaded]);

  /* ── 剪贴板轮询采集 ── */
  useEffect(() => {
    if (!historyEnabled) return;
    let timerId: number | null = null;
    let disposed = false;
    let lastText = '';

    const poll = async (): Promise<void> => {
      try {
        const rawText = await window.api.clipboardReadText();
        if (disposed) return;
        const normalized = normalizeClipboardText(rawText);
        if (!isRecordableClipboardText(normalized) || normalized === lastText) return;
        lastText = normalized;
        setItems((prev) => {
          if (prev[0]?.text === normalized) return prev;
          const now = Date.now();
          const next: ClipboardHistoryItem = {
            id: now,
            text: normalized,
            createdAt: now,
          };
          return [next, ...prev.filter((row) => row.text !== normalized)].slice(0, historyLimit);
        });
      } catch {
        // noop
      }
    };

    void poll();
    timerId = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      disposed = true;
      if (timerId !== null) {
        window.clearInterval(timerId);
      }
    };
  }, [historyEnabled, historyLimit]);

  /* ── 展开/编辑 textarea 自适应高度 ── */
  useEffect(() => {
    if (expandedId === null) return;
    adjustTextareaHeight(editTextareaRef.current);
  }, [editText, expandedId, adjustTextareaHeight]);

  /* ── 展开/折叠切换 ── */
  const handleToggleExpand = useCallback((item: ClipboardHistoryItem): void => {
    if (expandedId === item.id) {
      setExpandedId(null);
      setEditText('');
      return;
    }
    setExpandedId(item.id);
    setEditText(item.text);
  }, [expandedId]);

  /* ── 保存编辑 ── */
  const handleSaveEdit = useCallback((id: number): void => {
    const nextText = editText.replace(/\r\n/g, '\n');
    if (!nextText.trim()) return;
    setItems((prev) => prev.map((item) => (
      item.id === id
        ? { ...item, text: nextText }
        : item
    )));
  }, [editText]);

  /* ── 复制到剪贴板 ── */
  const handleCopy = useCallback((item: ClipboardHistoryItem): void => {
    const text = expandedId === item.id ? editText : item.text;
    window.api.clipboardWriteText(text)
      .then(() => {
        showCopyFeedback('success', t('clipboardHistoryTab.messages.copySuccess', { defaultValue: '已复制到剪贴板' }));
        if (exitMaxExpandOnCopy) {
          const store = useIslandStore.getState();
          if (store.isMusicPlaying) {
            setLyrics();
          } else {
            setIdle(true);
          }
        }
      })
      .catch(() => {
        showCopyFeedback('error', t('clipboardHistoryTab.messages.copyFailed', { defaultValue: '复制失败，请稍后重试' }));
      });
  }, [expandedId, editText, exitMaxExpandOnCopy, showCopyFeedback, t, setIdle, setLyrics]);

  return {
    items, setItems, historyLimit, loaded,
    expandedId, setExpandedId, editText, setEditText,
    editTextareaRef, adjustTextareaHeight,
    handleToggleExpand, handleSaveEdit, handleCopy,
  };
}
