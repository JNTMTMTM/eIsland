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
 * @file SttContent.tsx
 * @description STT 识别结果状态内容组件
 * @author 鸡哥
 */

import { useState, useRef, useEffect } from 'react';
import type { ReactElement } from 'react';
import useIslandStore from '../../../store/isLandStore';
import '../../../styles/stt/stt.css';

/**
 * STT 识别结果状态内容组件
 * @description 与 notification 尺寸一致
 */
export function SttContent(): ReactElement {
  const sttText = useIslandStore((s) => s.sttText);
  const setIdle = useIslandStore((s) => s.setIdle);
  const setStt = useIslandStore((s) => s.setStt);
  const setAgent = useIslandStore((s) => s.setAgent);
  const editRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addedTodo, setAddedTodo] = useState(false);

  useEffect(() => {
    if (editRef.current && !editing) {
      editRef.current.textContent = sttText || '...';
    }
  }, [sttText, editing]);

  const handleFocus = (): void => {
    setEditing(true);
    if (editRef.current && editRef.current.textContent === '...') {
      editRef.current.textContent = '';
    }
  };

  const handleBlur = (): void => {
    setEditing(false);
    const text = editRef.current?.textContent?.trim() || '';
    if (text && text !== sttText) {
      setStt(text);
    }
  };

  const handleAddTodo = (): void => {
    const text = editRef.current?.textContent?.trim() || sttText || '';
    if (!text) return;
    const now = Date.now();
    const newItem = { id: now, text, done: false, createdAt: now, description: '', subTodos: [] };
    window.api.storeRead('todos').then((data: unknown) => {
      const prev = Array.isArray(data) ? data : [];
      const updated = [...prev, newItem];
      try { localStorage.setItem('eIsland_todos', JSON.stringify(updated)); } catch { /* noop */ }
      return window.api.storeWrite('todos', updated);
    }).then(() => {
      setAddedTodo(true);
      setTimeout(() => setAddedTodo(false), 1500);
    }).catch(() => {});
  };

  const handleCopy = (): void => {
    const text = editRef.current?.textContent?.trim() || sttText || '';
    if (!text) return;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="stt-content">
      <img className="stt-icon" src="image/STT_LISTENING.png" alt="" draggable={false} />
      <div className="stt-text-area">
        <span className="stt-text-label">识别结果</span>
        <div
          ref={editRef}
          className="stt-text-body"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
      <div className="stt-actions">
        <button className="stt-action-btn" onClick={() => setAgent()}>发送给Agent</button>
        <button className="stt-action-btn" onClick={handleAddTodo}>{addedTodo ? '已添加' : '添加待办'}</button>
        <button className="stt-action-btn" onClick={handleCopy}>{copied ? '已复制' : '复制'}</button>
        <button className="stt-action-btn" onClick={() => setIdle(true)}>忽略</button>
      </div>
    </div>
  );
}
