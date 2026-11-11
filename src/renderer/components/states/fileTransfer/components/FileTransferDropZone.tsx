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
 * @file FileTransferDropZone.tsx
 * @description 文件中转站为空时的拖入区域与拖动高亮。
 * @author 鸡哥
 */

import { ArrowDownToLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReactElement } from 'react';
import type { FileTransferDropZoneProps } from '../types/fileTransferTypes';

/**
 * 渲染空列表时的拖入区域。
 * @param props - 拖入区域参数。
 * @param props.dropZoneRef - 用于判断系统文件拖动位置是否在框内的引用。
 * @param props.active - 文件拖至框内时为 true，用于显示高亮。
 * @returns 空列表拖入区域。
 */
export function FileTransferDropZone({
  dropZoneRef,
  active,
}: FileTransferDropZoneProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div
      className="file-transfer-drop-zone"
      data-drag-active={active}
      data-file-transfer-dismiss=""
      ref={dropZoneRef}
    >
      <ArrowDownToLine className="file-transfer-drop-icon" aria-hidden="true" />
      <div className="file-transfer-drop-copy">
        <p className="file-transfer-drop-hint">{t('fileTransfer.dropHint')}</p>
        <p className="file-transfer-empty-label">{t('fileTransfer.empty')}</p>
      </div>
    </div>
  );
}
