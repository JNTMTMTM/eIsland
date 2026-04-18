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
 * @file TagInput.tsx
 * @description 插件市场标签输入组件
 * @author 鸡哥
 */

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { searchUserTags, type WallpaperTagItem } from '../../../../../../../api/userAccountApi';
import { readLocalToken } from '../../../../../../../utils/userAccount';

interface TagInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
}

const MAX_NAME_LENGTH = 30;

function splitToChips(raw: string): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  raw.split(/[,，]/).forEach((part) => {
    const name = part.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(name.slice(0, MAX_NAME_LENGTH));
  });
  return out;
}

function joinChips(chips: string[]): string {
  return chips.join(',');
}

/**
 * 插件市场标签输入组件
 */
export function TagInput({ value, onChange, placeholder, disabled, maxTags = 10 }: TagInputProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [suggestions, setSuggestions] = useState<WallpaperTagItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chips = useMemo(() => splitToChips(value), [value]);
  const chipSet = useMemo(() => new Set(chips.map((c) => c.toLowerCase())), [chips]);

  const commit = useCallback((nextChips: string[]): void => {
    onChange(joinChips(nextChips.slice(0, maxTags)));
  }, [onChange, maxTags]);

  const addChip = useCallback((raw: string): void => {
    const name = raw.trim();
    if (!name) return;
    if (chipSet.has(name.toLowerCase())) {
      setDraft('');
      return;
    }
    commit([...chips, name]);
    setDraft('');
    setSuggestions([]);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  }, [chips, chipSet, commit]);

  const removeChipAt = useCallback((idx: number): void => {
    const next = chips.slice();
    next.splice(idx, 1);
    commit(next);
  }, [chips, commit]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (!showDropdown) return;
    const keyword = draft.trim();
    debounceRef.current = setTimeout(() => {
      const token = readLocalToken();
      if (!token) return;
      searchUserTags(token, keyword, 15).then((result) => {
        if (result.ok && Array.isArray(result.data)) {
          setSuggestions(result.data.filter((it) => !chipSet.has(it.name.toLowerCase())));
          setHighlightedIndex(-1);
        }
      }).catch(() => {});
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, showDropdown, chipSet]);

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (disabled) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        addChip(suggestions[highlightedIndex].name);
      } else if (draft.trim()) {
        addChip(draft);
      }
    } else if (e.key === ',' || e.key === '，') {
      e.preventDefault();
      if (draft.trim()) addChip(draft);
    } else if (e.key === 'Backspace' && !draft && chips.length > 0) {
      e.preventDefault();
      removeChipAt(chips.length - 1);
    } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleFocus = (): void => {
    setShowDropdown(true);
  };

  return (
    <div ref={containerRef} className="settings-plugin-market-tag-input-wrap">
      <div
        className={`settings-plugin-market-tag-input ${disabled ? 'disabled' : ''}`}
        onClick={() => { inputRef.current?.focus(); }}
      >
        {chips.map((chip, idx) => (
          <span key={`${chip}-${idx}`} className="settings-plugin-market-tag-chip">
            <span>{chip}</span>
            <button
              type="button"
              className="settings-plugin-market-tag-chip-remove"
              onClick={(e) => { e.stopPropagation(); removeChipAt(idx); }}
              disabled={disabled}
              aria-label={t('settings.pluginMarket.tag.removeTag', { defaultValue: '移除标签' })}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="settings-plugin-market-tag-input-field"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={chips.length === 0 ? (placeholder || t('settings.pluginMarket.tag.placeholder', { defaultValue: '输入标签后回车或逗号确认' })) : ''}
          disabled={disabled || chips.length >= maxTags}
        />
      </div>
      {showDropdown && suggestions.length > 0 && (
        <div className="settings-plugin-market-tag-dropdown">
          {suggestions.map((suggestion, idx) => (
            <button
              key={suggestion.id}
              type="button"
              className={`settings-plugin-market-tag-suggestion ${idx === highlightedIndex ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); addChip(suggestion.name); }}
              onMouseEnter={() => setHighlightedIndex(idx)}
            >
              <span>{suggestion.name}</span>
              <span className="settings-plugin-market-tag-suggestion-count">
                {suggestion.usageCount ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}
      {showDropdown && suggestions.length === 0 && draft.trim().length > 0 && !chipSet.has(draft.trim().toLowerCase()) && (
        <div className="settings-plugin-market-tag-dropdown">
          <button
            type="button"
            className="settings-plugin-market-tag-suggestion new"
            onMouseDown={(e) => { e.preventDefault(); addChip(draft); }}
          >
            {t('settings.pluginMarket.tag.createNew', { defaultValue: '创建新标签' })}: <strong>{draft.trim()}</strong>
          </button>
        </div>
      )}
    </div>
  );
}
