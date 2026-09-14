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
 * @file TodoTitleInput.tsx
 * @description 主任务与子任务共用的标题编辑框，支持提交、取消和空值恢复。
 * @author 鸡哥
 */

import { useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

/** 标题与保存回调。 */
interface TodoTitleInputProps {
  text: string;
  label: string;
  className: string;
  onSave: (text: string) => void;
}

/**
 * 显示可直接编辑的标题，提交前不修改持久化数据。
 * @param props - 当前标题、无障碍标签、样式与保存回调。
 * @returns 标题输入框。
 */
export function TodoTitleInput({ text, label, className, onSave }: TodoTitleInputProps): ReactElement {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  return (
    <input
      className={`${className} expand-todo-title-input`}
      type="text"
      aria-label={label}
      title={t('todo.editTitleHint')}
      value={draft ?? text}
      onFocus={() => { cancelledRef.current = false; }}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => {
        const value = event.currentTarget.value.trim();
        if (!cancelledRef.current && value && value !== text) onSave(value);
        setDraft(null);
        cancelledRef.current = false;
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          cancelledRef.current = event.key === 'Escape';
          event.currentTarget.blur();
        }
      }}
    />
  );
}
