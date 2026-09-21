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
 * @file CountdownCardList.tsx
 * @description 可滚动事件网格，提供编辑、置顶、复制、归档与恢复操作。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import { isArchived } from '../utils/countdownUtils';
import { CountdownCard } from './CountdownCard';
import type { ReactElement } from 'react';
import type { CountdownItem } from '../types/countdownTypes';

interface CountdownCardListProps {
  items: CountdownItem[];
  now: Date;
  saving: boolean;
  onStartEdit: (item: CountdownItem) => void;
  onAction: (item: CountdownItem, action: 'pin' | 'copy' | 'archive') => void;
}

/**
 * 展示筛选后的事件及可键盘访问的快捷操作。
 * @param props - 条目及操作回调
 * @param props.items - 排序筛选后的事件
 * @param props.now - 当前本地日期
 * @param props.saving - 是否正在保存
 * @param props.onStartEdit - 打开编辑器
 * @param props.onAction - 持久化快捷操作
 * @returns 自适应卡片网格
 */
export function CountdownCardList({ items, now, saving, onStartEdit, onAction }: CountdownCardListProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="cd-cards-wrap" onWheel={(e) => e.stopPropagation()}>
      {items.length === 0 ? <div className="cd-cards-empty">{t('countdown.manage.empty')}</div>
        : items.map((item) => (<article className="cd-event" key={item.id}>
          <CountdownCard item={item} now={now} onClick={() => onStartEdit(item)} />
          <div className="cd-card-actions">
            <button type="button" title={t('countdown.manage.edit')} aria-label={t('countdown.manage.edit')} onClick={() => onStartEdit(item)}><img className="cd-card-action-icon" src={SvgIcon.DIY} alt="" draggable={false} /></button>
            <button type="button" disabled={saving} title={t(item.pinned ? 'countdown.manage.unpin' : 'countdown.manage.pin')}
              aria-label={t(item.pinned ? 'countdown.manage.unpin' : 'countdown.manage.pin')} aria-pressed={Boolean(item.pinned)}
              onClick={() => onAction(item, 'pin')}><img className="cd-card-action-icon" src={SvgIcon.PIN_ON_TOP} alt="" draggable={false} /></button>
            <button type="button" disabled={saving} title={t('countdown.manage.copy')} aria-label={t('countdown.manage.copy')} onClick={() => onAction(item, 'copy')}><img className="cd-card-action-icon" src={SvgIcon.COPY} alt="" draggable={false} /></button>
            <button type="button" disabled={saving} title={t(isArchived(item, now) ? 'countdown.manage.restore' : 'countdown.manage.archive')}
              aria-label={t(isArchived(item, now) ? 'countdown.manage.restore' : 'countdown.manage.archive')} onClick={() => onAction(item, 'archive')}>
              <img className="cd-card-action-icon" src={isArchived(item, now) ? SvgIcon.REVERT : SvgIcon.ARCHIVE} alt="" draggable={false} />
            </button>
          </div>
        </article>))}
    </div>
  );
}
