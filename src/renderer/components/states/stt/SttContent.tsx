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
  const editRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);

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
      <button className="stt-dismiss-btn" onClick={() => setIdle(true)}>忽略</button>
    </div>
  );
}
