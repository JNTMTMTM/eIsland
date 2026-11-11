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

import { type ReactElement } from 'react';
import { useFileTransferPanel } from '../hooks/useFileTransferPanel';
import '../styles/file-transfer.css';
import { FileTransferDropZone } from './FileTransferDropZone';
import { FileTransferHeader } from './FileTransferHeader';
import { FileTransferList } from './FileTransferList';

/**
 * 文件中转站状态内容。
 * @returns 文件中转站面板。
 */
export function FileTransferContent(): ReactElement {
  const { items, dropZoneRef, dropZoneActive, handlePointerDown, handleClick } = useFileTransferPanel();

  return (
    <div
      className="file-transfer-panel"
      data-file-transfer-dismiss=""
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <FileTransferHeader count={items.length} />
      {items.length > 0 ? (
        <FileTransferList items={items} />
      ) : (
        <FileTransferDropZone dropZoneRef={dropZoneRef} active={dropZoneActive} />
      )}
    </div>
  );
}
