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
 * @file FileTransferItemCard.tsx
 * @description 文件中转站中的文件卡片，展示文件图标、名称与管理操作。
 * @author 鸡哥
 */

import { File, FolderSearch, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { removeFileTransferItem } from '../../../../store/fileTransferStore';
import { useFileTransferItem } from '../hooks/useFileTransferItem';
import type { FileTransferItem } from '../../../../store/types/fileTransfer';
import type { ReactElement } from 'react';

interface FileTransferItemCardProps {
  item: FileTransferItem;
}

/**
 * 渲染文件卡片：拖动卡片可拖出文件，点击打开，悬停显示定位与移除操作。
 * @param props - 卡片参数。
 * @param props.item - 中转文件条目。
 * @returns 文件卡片节点。
 */
export function FileTransferItemCard({ item }: FileTransferItemCardProps): ReactElement {
  const { t } = useTranslation();
  const { iconBase64, onIconError, onPointerDown, onPointerMove, onPointerUp } =
    useFileTransferItem(item.path);

  return (
    <li className="file-transfer-card">
      <div
        className="file-transfer-card-body"
        title={item.path}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {iconBase64 ? (
          <img
            className="file-transfer-card-image"
            src={`data:image/png;base64,${iconBase64}`}
            alt=""
            draggable={false}
            onError={onIconError}
          />
        ) : (
          <span className="file-transfer-card-placeholder">
            <File className="file-transfer-card-icon" aria-hidden="true" />
          </span>
        )}
        <span className="file-transfer-card-name">{item.name}</span>
      </div>
      <div className="file-transfer-card-actions">
        <button
          className="file-transfer-card-action file-transfer-card-locate"
          type="button"
          title={t('fileTransfer.actions.locate')}
          aria-label={t('fileTransfer.actions.locate')}
          onClick={() => {
            window.api.openInExplorer(item.path).catch(() => {});
          }}
        >
          <FolderSearch className="file-transfer-action-icon" aria-hidden="true" />
        </button>
        <button
          className="file-transfer-card-action file-transfer-destructive"
          type="button"
          title={t('fileTransfer.actions.remove')}
          aria-label={t('fileTransfer.actions.remove')}
          onClick={() => removeFileTransferItem(item.path)}
        >
          <X className="file-transfer-action-icon" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
