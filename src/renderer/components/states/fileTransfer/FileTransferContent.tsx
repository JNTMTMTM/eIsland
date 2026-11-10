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
 * @description 文件中转站状态内容组件：左侧拖放区、右侧文件列表，视觉规格对齐 expanded 快捷启动面板
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import { FileTransferItemCard } from './components/FileTransferItemCard';
import { clearFileTransferItems, useFileTransferStore } from './store/fileTransferStore';
import type { ReactElement } from 'react';

/**
 * 文件中转站状态内容。
 * @returns 拖放区与中转文件列表。
 */
export function FileTransferContent(): ReactElement {
  const { t } = useTranslation();
  const items = useFileTransferStore((store) => store.items);
  const returnFromAuth = useIslandStore((store) => store.returnFromAuth);

  return (
    <div className="flex size-full animate-[expandFadeIn_0.3s_cubic-bezier(0.25,1,0.5,1)_forwards] items-stretch gap-3 px-3 pt-2 pb-2.5" onClick={(event) => event.stopPropagation()}>
      <div className="flex w-[120px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[rgba(var(--color-text-rgb),0.12)]">
        <span className="text-[26px] leading-none font-light text-[rgba(var(--color-text-rgb),0.15)]">+</span>
        <span className="text-[9px] text-[rgba(var(--color-text-rgb),0.2)]">{t('fileTransfer.dropHint')}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="mb-1 flex shrink-0 items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-semibold text-[rgba(var(--color-text-rgb),0.55)]">{t('fileTransfer.title')}</span>
            <span className="text-[9px] text-[rgba(var(--color-text-rgb),0.2)]">{t('fileTransfer.count', { count: items.length })}</span>
          </div>
          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button className="rounded-[4px] px-1.5 py-px text-[10px] text-[rgba(255,100,100,0.5)] transition-colors hover:bg-[rgba(255,100,100,0.12)] hover:text-[rgba(255,100,100,0.9)]" type="button" onClick={clearFileTransferItems}>
                {t('fileTransfer.actions.clear')}
              </button>
            )}
            <button className="rounded-[4px] px-1.5 py-px text-[10px] text-[rgba(var(--color-text-rgb),0.4)] transition-colors hover:bg-[rgba(var(--color-text-rgb),0.08)] hover:text-[rgba(var(--color-text-rgb),0.8)]" type="button" onClick={returnFromAuth}>
              {t('fileTransfer.actions.close')}
            </button>
          </div>
        </div>
        {items.length > 0 ? (
          <div className="flex min-h-0 flex-1 gap-1 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-thumb]:rounded-[2px] [&::-webkit-scrollbar-thumb]:bg-[rgba(var(--color-text-rgb),0.1)]">
            {items.map((item) => <FileTransferItemCard key={item.path} item={item} />)}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center text-[10px] text-[rgba(var(--color-text-rgb),0.15)]">
            {t('fileTransfer.empty')}
          </div>
        )}
      </div>
    </div>
  );
}
