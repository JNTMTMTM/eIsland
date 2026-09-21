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
 * @file CountdownCard.tsx
 * @description 主页面、预览和 expand 共用的倒数日卡片。
 * @author 鸡哥
 */

import { useEffect, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Pin, Repeat2 } from 'lucide-react';
import { countdownText, occurrenceDate, normalizeImageSource, diffDays } from '../utils/countdownUtils';
import type { CountdownItem } from '../types/countdownTypes';

interface CountdownCardProps {
  item: CountdownItem;
  now: Date;
  compact?: boolean;
  onClick?: () => void;
}

/**
 * 渲染以天数为主视觉的共享卡片。
 * @param props - 事件、当前日期及紧凑模式
 * @param props.item - 事件及计时规则
 * @param props.now - 当前本地日期
 * @param props.compact - 是否使用小组件紧凑布局
 * @param props.onClick - 打开事件的回调
 * @returns 卡片内容
 */
export function CountdownCard({ item, now, compact, onClick }: CountdownCardProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [background, setBackground] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    normalizeImageSource(item.backgroundImage).then((image) => {
      if (!cancelled) setBackground(image);
    }).catch(() => { if (!cancelled) setBackground(undefined); });
    return () => { cancelled = true; };
  }, [item.backgroundImage]);
  const date = new Date(`${occurrenceDate(item, now)}T00:00:00`);
  const dateText = new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }).format(date);
  const dayDifference = diffDays(occurrenceDate(item, now), now);
  const countingUp = item.mode === 'up' && dayDifference <= 0;
  const dayNumber = Math.abs(dayDifference) + Number(countingUp && Boolean(item.includeToday));
  const showNumber = countingUp || Math.abs(dayDifference) > 1;
  const captionKey = countingUp ? 'countdown.days.elapsedUnit' : dayDifference > 0 ? 'countdown.days.remainingUnit' : 'countdown.days.pastUnit';
  const content = (
    <>
      {background && <div className="cd-card-bg" style={{ backgroundImage: `url(${background})`, opacity: item.backgroundOpacity ?? 0.35 }} />}
      <div className="cd-card-overlay" />
      <div className="cd-card-content">
        <div className="cd-card-top-row">
          <span className="cd-card-type-badge">{t(`countdown.types.${item.type}`)}</span>
          <span className="cd-card-markers">
            {item.pinned && <Pin size={12} aria-label={t('countdown.manage.pinned')} />}
            {item.repeat === 'yearly' && <Repeat2 size={12} aria-label={t('countdown.manage.yearly')} />}
          </span>
        </div>
        <div className="cd-card-days" aria-label={countdownText(item, t, now)}>
          {showNumber ? <><span>{dayNumber}</span><span className="cd-day-caption">{t(captionKey)}</span></> : countdownText(item, t, now)}
        </div>
        <div className="cd-card-name" title={item.name}>{item.name}</div>
        {!compact && item.description && <div className="cd-card-desc" title={item.description}>{item.description}</div>}
        <div className="cd-card-date">{dateText}</div>
      </div>
    </>
  );
  const className = `cd-card cd-card-${item.type}${compact ? ' ov-cd-card' : ''}`;
  return onClick ? (
    <button className={className} type="button" style={{ borderColor: `var(--cd-card-action-border, ${item.color})` }} onClick={onClick}
      title={`${item.name} · ${countdownText(item, t, now)} · ${dateText}`}>{content}</button>
  ) : <div className={className} style={{ borderColor: `var(--cd-card-action-border, ${item.color})` }}>{content}</div>;
}
