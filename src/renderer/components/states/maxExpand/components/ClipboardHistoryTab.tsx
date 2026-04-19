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
 * @file ClipboardHistoryTab.tsx
 * @description 最大展开模式剪贴板历史 Tab
 * @author 鸡哥
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ClipboardHistoryItem {
  id: number;
  text: string;
  createdAt: number;
}

const STORE_KEY = 'clipboard-history-recent';
const LOCAL_STORAGE_KEY = 'eIsland_clipboard_history_recent';
const HISTORY_LIMIT = 10;
const POLL_INTERVAL_MS = 1000;

function normalizeClipboardText(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

function sanitizeHistory(data: unknown): ClipboardHistoryItem[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const row = item as Partial<ClipboardHistoryItem>;
      const text = typeof row.text === 'string' ? normalizeClipboardText(row.text) : '';
      if (!text) return null;
      const createdAt = typeof row.createdAt === 'number' && Number.isFinite(row.createdAt) ? row.createdAt : Date.now();
      const id = typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : createdAt;
      return { id, text, createdAt };
    })
    .filter((item): item is ClipboardHistoryItem => Boolean(item))
    .slice(0, HISTORY_LIMIT);
}

function persistHistory(items: ClipboardHistoryItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // noop
  }
  window.api.storeWrite(STORE_KEY, items).catch(() => {});
}

function getPreviewText(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= 72) return oneLine;
  return `${oneLine.slice(0, 72)}…`;
}

export function ClipboardHistoryTab(): React.ReactElement {
  const { t } = useTranslation();
  const [items, setItems] = useState<ClipboardHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustTextareaHeight = useCallback((el: HTMLTextAreaElement | null): void => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    window.api.storeRead(STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data) && data.length > 0) {
        setItems(sanitizeHistory(data));
      } else {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (raw) {
            const parsed = sanitizeHistory(JSON.parse(raw) as unknown[]);
            setItems(parsed);
            window.api.storeWrite(STORE_KEY, parsed).catch(() => {});
          }
        } catch {
          // noop
        }
      }
      setLoaded(true);
    }).catch(() => {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) setItems(sanitizeHistory(JSON.parse(raw) as unknown[]));
      } catch {
        // noop
      }
      if (!cancelled) setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    persistHistory(items);
  }, [items, loaded]);

  useEffect(() => {
    let timerId: number | null = null;
    let disposed = false;
    let lastText = '';

    const poll = async (): Promise<void> => {
      try {
        const rawText = await window.api.clipboardReadText();
        if (disposed) return;
        const normalized = normalizeClipboardText(rawText);
        if (!normalized || normalized === lastText) return;
        lastText = normalized;
        setItems((prev) => {
          if (prev[0]?.text === normalized) return prev;
          const now = Date.now();
          const next: ClipboardHistoryItem = {
            id: now,
            text: normalized,
            createdAt: now,
          };
          return [next, ...prev.filter((row) => row.text !== normalized)].slice(0, HISTORY_LIMIT);
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
  }, []);

  const totalCount = items.length;
  const countLabel = useMemo(
    () => t('clipboardHistoryTab.count', { defaultValue: '{{count}} 条', count: totalCount }),
    [t, totalCount],
  );

  const handleClear = (): void => {
    setItems([]);
    setExpandedId(null);
    setEditText('');
  };

  const handleRemove = (id: number): void => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (expandedId === id) {
      setExpandedId(null);
      setEditText('');
    }
  };

  const handleToggleExpand = (item: ClipboardHistoryItem): void => {
    if (expandedId === item.id) {
      setExpandedId(null);
      setEditText('');
      return;
    }
    setExpandedId(item.id);
    setEditText(item.text);
  };

  const handleSaveEdit = (id: number): void => {
    const nextText = editText.replace(/\r\n/g, '\n').trim();
    if (!nextText) return;
    setItems((prev) => prev.map((item) => (
      item.id === id
        ? { ...item, text: nextText }
        : item
    )));
  };

  useEffect(() => {
    if (expandedId === null) return;
    adjustTextareaHeight(editTextareaRef.current);
  }, [editText, expandedId, adjustTextareaHeight]);

  return (
    <div className="clipboard-history">
      <div className="clipboard-history-header">
        <span className="clipboard-history-title">{t('clipboardHistoryTab.title', { defaultValue: '剪贴板历史' })}</span>
        <div className="clipboard-history-header-right">
          <span className="clipboard-history-count">{countLabel}</span>
          <button
            className="clipboard-history-clear"
            type="button"
            onClick={handleClear}
            disabled={totalCount === 0}
          >
            {t('clipboardHistoryTab.actions.clear', { defaultValue: '清空' })}
          </button>
        </div>
      </div>

      <div
        className="clipboard-history-list"
        onWheelCapture={(e) => {
          e.stopPropagation();
        }}
      >
        {items.length === 0 ? (
          <div className="clipboard-history-empty">
            {t('clipboardHistoryTab.empty', { defaultValue: '暂时没有记录，复制一些文本后会显示在这里。' })}
          </div>
        ) : items.map((item) => {
          const expanded = expandedId === item.id;
          return (
            <div key={item.id} className="clipboard-history-item">
              <button
                className="clipboard-history-summary"
                type="button"
                onClick={() => handleToggleExpand(item)}
                title={item.text}
              >
                <span className="clipboard-history-preview">{getPreviewText(item.text)}</span>
                <span className="clipboard-history-time">{new Date(item.createdAt).toLocaleString()}</span>
                <span className="clipboard-history-expand-indicator">
                  {expanded
                    ? t('clipboardHistoryTab.actions.collapse', { defaultValue: '收起' })
                    : t('clipboardHistoryTab.actions.expand', { defaultValue: '展开' })}
                </span>
              </button>

              {expanded ? (
                <div className="clipboard-history-detail">
                  <textarea
                    className="clipboard-history-content"
                    value={editText}
                    ref={editTextareaRef}
                    onChange={(e) => {
                      setEditText(e.target.value);
                      adjustTextareaHeight(e.currentTarget);
                    }}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveEdit(item.id);
                      }
                    }}
                  />
                  <div className="clipboard-history-actions">
                    <button
                      className="clipboard-history-save"
                      type="button"
                      onClick={() => handleSaveEdit(item.id)}
                      disabled={!editText.trim()}
                    >
                      {t('clipboardHistoryTab.actions.save', { defaultValue: '保存' })}
                    </button>
                    <button
                      className="clipboard-history-remove"
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      aria-label={t('clipboardHistoryTab.actions.removeAria', { defaultValue: '删除该剪贴板记录' })}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
