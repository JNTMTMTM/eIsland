/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 */

/**
 * @file AlarmWidget.tsx
 * @description Overview 闹钟小组件，展示所选闹钟的时间及启用状态。
 * @author 鸡哥
 */

import { useEffect, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
import { useOverviewAlarmConfig } from '../../../../../maxExpand/components/alarm/hooks/useOverviewAlarmConfig';
import { STORE_KEY, type AlarmItem } from '../../../../../maxExpand/components/alarm/types/alarmTypes';
import { formatTime, normalizeAlarms } from '../../../../../maxExpand/components/alarm/utils/alarmUtils';

/** 渲染选中的闹钟，并通过标题进入闹钟管理页。 */
export function AlarmWidget({ onOpenAlarmPage }: { onOpenAlarmPage: () => void }): ReactElement {
  const { t } = useTranslation();
  const { alarmIds } = useOverviewAlarmConfig();
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    let updated = false;
    const apply = (value: unknown): void => {
      if (!cancelled) setAlarms(Array.isArray(value) ? normalizeAlarms(value) : []);
    };
    const unsubscribe = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (channel !== `store:${STORE_KEY}`) return;
      updated = true;
      apply(value);
    });
    window.api.storeRead(STORE_KEY).then((value) => { if (!updated) apply(value); }).catch(() => {});
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const selected = alarmIds.flatMap((id) => {
    const alarm = alarms.find((item) => item.id === id);
    return alarm ? [alarm] : [];
  });

  return (
    <div className="ov-dash-widget ov-dash-alarm-widget">
      <div className="ov-dash-widget-header">
        <button className="ov-dash-widget-title ov-dash-widget-title--link ov-dash-alarm-title" type="button" onClick={onOpenAlarmPage}>
          {t('overview.alarm.title')}
        </button>
      </div>
      <div className="ov-dash-world-clock-list">
        {selected.length === 0 && <span className="ov-dash-world-clock-empty">{t('overview.alarm.empty')}</span>}
        {selected.map((alarm) => (
          <div key={alarm.id} className={`ov-dash-world-clock-item ov-dash-alarm-item${alarm.enabled ? '' : ' ov-dash-alarm-item--disabled'}`}>
            <span className="ov-dash-world-clock-city">{alarm.label || t('overview.alarm.title')}</span>
            <span className="ov-dash-world-clock-time">{formatTime(alarm.hour, alarm.minute, alarm.second)}</span>
            <span className="ov-dash-alarm-status">{alarm.enabled ? t('overview.alarm.enabled') : t('maxExpand.alarm.disabled')}</span>
            <img className="ov-dash-alarm-bg-icon" src={SvgIcon.TIMER} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}
