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
 * @file FileTransferContent.tsx
 * @description 文件中转站面板，展示拖入提示和可纵向滚动的文件网格。
 * @author 鸡哥
 */

import { ArrowDownToLine, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clearFileTransferItems, useFileTransferStore } from '../../../store/fileTransferStore';
import useIslandStore from '../../../store/slices';
import { FileTransferItemCard } from './components/FileTransferItemCard';
import './styles/file-transfer.css';
import type { MouseEvent, PointerEvent, ReactElement } from 'react';

/**
 * 文件中转站状态内容。
 * @returns 文件中转站面板。
 */
export function FileTransferContent(): ReactElement {
  const { t } = useTranslation();
  const items = useFileTransferStore((store) => store.items);
  const returnFromAuth = useIslandStore((store) => store.returnFromAuth);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const pressedTargetRef = useRef<EventTarget | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);

  useEffect(() => window.api.onNativeDragPosition((position) => {
    const target = position && document.elementFromPoint(position.x, position.y);
    setDropZoneActive(dropZoneRef.current?.contains(target) ?? false);
  }), []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.repeat || event.defaultPrevented || useIslandStore.getState().state !== 'fileTransfer') return;
      event.preventDefault();
      returnFromAuth();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [returnFromAuth]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    pressedTargetRef.current = event.target;
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
    event.stopPropagation();
    const pressedTarget = pressedTargetRef.current;
    pressedTargetRef.current = null;
    // 从卡片拖到空白处时，浏览器可能把点击派发给共同的父节点。
    if (event.target === pressedTarget && event.target instanceof HTMLElement && event.target.hasAttribute('data-file-transfer-dismiss')) {
      returnFromAuth();
    }
  };

  return (
    <div className="file-transfer-panel" data-file-transfer-dismiss="" onPointerDown={handlePointerDown} onClick={handleClick}>
      <header className="file-transfer-header" data-file-transfer-dismiss="">
        <div className="file-transfer-heading">
          <h2 className="file-transfer-title">{t('fileTransfer.title')}</h2>
          <span className="file-transfer-count">
            {t('fileTransfer.count', { count: items.length })}
          </span>
        </div>
        {items.length > 0 && (
          <button className="file-transfer-clear file-transfer-destructive" type="button" onClick={clearFileTransferItems}>
            <Trash2 className="file-transfer-action-icon" aria-hidden="true" />
            {t('fileTransfer.actions.clear')}
          </button>
        )}
      </header>

      {items.length > 0 ? (
        <>
          <ul className="file-transfer-grid" data-file-transfer-dismiss="">
            {items.map((item) => <FileTransferItemCard key={item.path} item={item} />)}
          </ul>
          <div className="file-transfer-footer" data-file-transfer-dismiss="">
            <ArrowDownToLine className="file-transfer-action-icon" aria-hidden="true" />
            <span>{t('fileTransfer.dropHint')}</span>
          </div>
        </>
      ) : (
        <div className="file-transfer-drop-zone" ref={dropZoneRef} data-drag-active={dropZoneActive} data-file-transfer-dismiss="">
          <ArrowDownToLine className="file-transfer-drop-icon" aria-hidden="true" />
          <div className="file-transfer-drop-copy">
            <p className="file-transfer-drop-hint">{t('fileTransfer.dropHint')}</p>
            <p className="file-transfer-empty-label">{t('fileTransfer.empty')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
