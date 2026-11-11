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
 * @file FileTransferList.tsx
 * @description 文件中转站的卡片网格和底部拖入提示。
 * @author 鸡哥
 */

import { ArrowDownToLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type ReactElement } from 'react';
import { FileTransferItemCard } from './FileTransferItemCard';
import type { FileTransferListProps } from '../types/fileTransferTypes';

/**
 * 渲染中转文件列表及列表下方的拖入提示。
 * @param props - 文件列表参数。
 * @param props.items - 当前暂存的文件。
 * @returns 文件卡片网格和拖入提示。
 */
export function FileTransferList({ items }: FileTransferListProps): ReactElement {
  const { t } = useTranslation();

  return (
    <>
      <ul className="file-transfer-grid" data-file-transfer-dismiss="">
        {items.map((item) => <FileTransferItemCard key={item.path} item={item} />)}
      </ul>
      <div className="file-transfer-footer" data-file-transfer-dismiss="">
        <ArrowDownToLine className="file-transfer-action-icon" aria-hidden="true" />
        <span>{t('fileTransfer.dropHint')}</span>
      </div>
    </>
  );
}
