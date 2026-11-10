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
 * @description 文件中转站中的单个文件卡片，操作按钮配色沿用快捷启动列表
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../utils/SvgIcon';
import { useFileTransferItem } from '../hooks/useFileTransferItem';
import { removeFileTransferItem } from '../store/fileTransferStore';
import type { FileTransferItem } from '../types';
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
  const { icon, onPointerDown, onPointerMove, onPointerUp } = useFileTransferItem(item.path);

  return (
    <div className="group relative flex w-[84px] shrink-0 cursor-grab flex-col items-center justify-center gap-1 rounded-[10px] px-1.5 transition-colors duration-150 select-none hover:bg-[rgba(var(--color-text-rgb),0.05)] active:cursor-grabbing" title={item.path} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      {icon
        ? <img className="size-7 rounded-[3px] object-contain" src={icon} alt="" draggable={false} />
        : <img className="size-6 opacity-40 in-data-[theme=light]:invert" src={SvgIcon.ATTACHMENT} alt="" draggable={false} />}
      <span className="w-full truncate text-center text-[11px] text-[rgba(var(--color-text-rgb),0.7)]">{item.name}</span>
      <div className="absolute top-0.5 right-0.5 flex opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button className="flex size-[18px] items-center justify-center rounded-[4px] transition-colors hover:bg-[rgba(120,200,255,0.12)]" type="button" title={t('fileTransfer.actions.locate')} aria-label={t('fileTransfer.actions.locate')} onPointerDown={(event) => event.stopPropagation()} onClick={() => { window.api.openInExplorer(item.path).catch(() => {}); }}>
          <img className="size-2.5 opacity-60 in-data-[theme=light]:invert" src={SvgIcon.SEARCH} alt="" draggable={false} />
        </button>
        <button className="flex size-[18px] items-center justify-center rounded-[4px] text-[10px] text-[rgba(255,100,100,0.5)] transition-colors hover:bg-[rgba(255,100,100,0.12)] hover:text-[rgba(255,100,100,0.9)]" type="button" title={t('fileTransfer.actions.remove')} aria-label={t('fileTransfer.actions.remove')} onPointerDown={(event) => event.stopPropagation()} onClick={() => removeFileTransferItem(item.path)}>
          ×
        </button>
      </div>
    </div>
  );
}
