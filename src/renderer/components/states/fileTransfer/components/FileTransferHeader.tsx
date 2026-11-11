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
 * @file FileTransferHeader.tsx
 * @description 文件中转站标题、文件数量和清空操作。
 * @author 鸡哥
 */

import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clearFileTransferItems } from '../../../../store/fileTransferStore';
import type { ReactElement } from 'react';
import type { FileTransferHeaderProps } from '../types/fileTransferTypes';

/**
 * 渲染中转站标题，并在有文件时提供清空操作。
 * @param props - 标题栏参数。
 * @param props.count - 当前暂存的文件数量。
 * @returns 中转站标题栏。
 */
export function FileTransferHeader({ count }: FileTransferHeaderProps): ReactElement {
  const { t } = useTranslation();

  return (
    <header className="file-transfer-header" data-file-transfer-dismiss="">
      <div className="file-transfer-heading">
        <h2 className="file-transfer-title">{t('fileTransfer.title')}</h2>
        <span className="file-transfer-count">
          {t('fileTransfer.count', { count })}
        </span>
      </div>
      {count > 0 && (
        <button
          className="file-transfer-clear file-transfer-destructive"
          type="button"
          onClick={clearFileTransferItems}
        >
          <Trash2 className="file-transfer-action-icon" aria-hidden="true" />
          {t('fileTransfer.actions.clear')}
        </button>
      )}
    </header>
  );
}
