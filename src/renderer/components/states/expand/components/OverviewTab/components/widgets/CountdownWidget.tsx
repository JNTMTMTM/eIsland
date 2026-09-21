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
 * @file CountdownWidget.tsx
 * @description expand 倒数日小组件，与管理页共用卡片、排序及存储订阅。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { CountdownCard } from '../../../../../maxExpand/components/countdown/components/CountdownCard';
import { useCountdownItems } from '../../../../../maxExpand/components/countdown/hooks/useCountdownItems';
import { useCountdownToday } from '../../../../../maxExpand/components/countdown/hooks/useCountdownToday';
import { isArchived, sortCountdownItems } from '../../../../../maxExpand/components/countdown/utils/countdownUtils';
import type { ReactElement } from 'react';

interface CountdownWidgetProps {
  openTargetPage: (target: 'todo' | 'countdown' | 'settings') => void;
}

/**
 * 展示置顶或最近两项事件，并通过既有状态转换进入倒数日管理页。
 * @param props - expand 页面导航回调
 * @param props.openTargetPage - 打开管理页的状态转换回调
 * @returns 倒数日小组件
 */
export function CountdownWidget({ openTargetPage }: CountdownWidgetProps): ReactElement {
  const { t } = useTranslation();
  const { items, loaded, error } = useCountdownItems();
  const now = useCountdownToday();
  const active = sortCountdownItems(items.filter((item) => !isArchived(item, now)), now);
  const shown = active.slice(0, 2);
  const open = (): void => openTargetPage('countdown');
  return (
    <div className="ov-dash-widget ov-dash-countdown-widget">
      <div className="ov-dash-widget-header">
        <button className="ov-dash-widget-title ov-dash-widget-title--link ov-dash-countdown-title" type="button" onClick={open}>{t('overview.countdown.title')}</button>
        <button className="cd-widget-link cd-widget-more" type="button" onClick={open}>{t('countdown.manage.viewAll', { count: active.length })}</button>
      </div>
      {shown.length === 0 ? <button className="ov-dash-countdown-empty cd-widget-link" type="button" onClick={open}>
        {t(error ? 'countdown.manage.saveError' : !loaded ? 'countdown.manage.loading' : 'countdown.manage.new')}
      </button> : <div className={`ov-dash-countdown-cards ${shown.length === 1 ? 'single' : ''}`}>
        {shown.map((item) => <CountdownCard key={item.id} item={item} now={now} compact onClick={open} />)}
      </div>}
    </div>
  );
}
