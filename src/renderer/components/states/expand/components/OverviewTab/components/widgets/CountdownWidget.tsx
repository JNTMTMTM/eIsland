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
 * @description Overview 倒数日小组件，展示最近的倒计时事件卡片。
 * @author 鸡哥
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CD_TYPE_LABELS, cdDiffDays, type CountdownDateItem } from '../../utils/overviewUtils';

interface CountdownWidgetProps {
  openTargetPage: (target: 'todo' | 'countdown' | 'settings') => void;
}

/** 倒数日小组件，展示最近的倒计时事件卡片。 */
export function CountdownWidget({ openTargetPage }: CountdownWidgetProps): React.ReactElement {
  const { t } = useTranslation();
  const [cdItems, setCdItems] = useState<CountdownDateItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const applyCountdownData = (data: unknown): void => {
      if (!Array.isArray(data)) return;
      setCdItems(data as CountdownDateItem[]);
    };

    window.api.storeRead('countdown-dates').then((data) => {
      if (cancelled) return;
      applyCountdownData(data);
    }).catch(() => {});

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === 'store:countdown-dates') {
        applyCountdownData(value);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const sorted = [...cdItems].sort((a, b) => {
    const da = Math.abs(cdDiffDays(a.date));
    const db = Math.abs(cdDiffDays(b.date));
    return da - db;
  }).slice(0, 2);

  const goToCountdown = (): void => {
    openTargetPage('countdown');
  };

  return (
    <div className="ov-dash-widget ov-dash-countdown-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title ov-dash-widget-title--link" onClick={goToCountdown}>{t('overview.countdown.title', { defaultValue: '倒数日' })}</span>
      </div>
      {sorted.length === 0 ? (
        <div className="ov-dash-countdown-empty">{t('overview.countdown.empty', { defaultValue: '暂无倒数日' })}</div>
      ) : (
        <div className={`ov-dash-countdown-cards ${sorted.length === 1 ? 'single' : ''}`}>
          {sorted.map((item) => {
            const days = cdDiffDays(item.date);
            const typeLabel = t(`countdown.types.${item.type}`, { defaultValue: CD_TYPE_LABELS[item.type] || item.type });
            return (
              <div
                key={item.id}
                className={`cd-card cd-card-${item.type} ov-cd-card`}
                style={{ borderColor: item.color }}
              >
                {item.backgroundImage && (
                  <div className="cd-card-bg" style={{ backgroundImage: `url(${item.backgroundImage})`, opacity: item.backgroundOpacity ?? 0.5 }} />
                )}
                <div className="cd-card-overlay" style={{ background: `linear-gradient(135deg, ${item.color}30, ${item.color}10)` }} />
                <div className="cd-card-content">
                  <div className="cd-card-top-row">
                    <span className="cd-card-type-badge" style={{ background: `${item.color}50`, color: '#fff' }}>{typeLabel}</span>
                  </div>
                  <div className="cd-card-name">{item.name}</div>
                  {item.description && <div className="cd-card-desc">{item.description}</div>}
                  <div className="cd-card-bottom">
                    <span className="cd-card-date">{item.date}</span>
                    <span className="cd-card-days" style={{ color: item.color }}>
                      {days > 0
                        ? t('countdown.days.after', { defaultValue: '{{days}} 天后', days })
                        : days === 0
                          ? t('countdown.days.today', { defaultValue: '就是今天' })
                          : t('countdown.days.before', { defaultValue: '{{days}} 天前', days: Math.abs(days) })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
