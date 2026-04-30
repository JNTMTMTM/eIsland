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
 * @file MokugyoWidget.tsx
 * @description Overview 电子木鱼小组件，支持点击敲击动画与功德计数。
 * @author 鸡哥
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
import {
  MOKUGYO_AUDIO_SRC,
  MOKUGYO_FLOAT_DURATION_MS,
  MOKUGYO_HIT_ANIMATION_MS,
} from '../../utils/overviewUtils';

interface MokugyoFloatingMerit {
  id: number;
  driftX: number;
}

/** 电子木鱼小组件，支持点击敲击动画与功德计数。 */
export function MokugyoWidget(): React.ReactElement {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hitResetTimerRef = useRef<number | null>(null);
  const floatingTimerRef = useRef<Record<number, number>>({});
  const [hitting, setHitting] = useState(false);
  const [meritCount, setMeritCount] = useState(0);
  const [floatingMerits, setFloatingMerits] = useState<MokugyoFloatingMerit[]>([]);

  useEffect(() => {
    const audio = new Audio(MOKUGYO_AUDIO_SRC);
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      if (hitResetTimerRef.current !== null) {
        window.clearTimeout(hitResetTimerRef.current);
      }
      Object.values(floatingTimerRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      floatingTimerRef.current = {};
      const current = audioRef.current;
      if (current) {
        current.pause();
        current.src = '';
      }
      audioRef.current = null;
    };
  }, []);

  const handleStrike = useCallback((): void => {
    setMeritCount((prev) => prev + 1);
    setHitting(false);
    window.requestAnimationFrame(() => {
      setHitting(true);
    });

    const floatingId = Date.now() + Math.floor(Math.random() * 1000);
    const driftX = Math.floor(Math.random() * 22) - 11;
    setFloatingMerits((prev) => [...prev, { id: floatingId, driftX }]);
    const timer = window.setTimeout(() => {
      setFloatingMerits((prev) => prev.filter((item) => item.id !== floatingId));
      delete floatingTimerRef.current[floatingId];
    }, MOKUGYO_FLOAT_DURATION_MS);
    floatingTimerRef.current[floatingId] = timer;

    if (hitResetTimerRef.current !== null) {
      window.clearTimeout(hitResetTimerRef.current);
    }
    hitResetTimerRef.current = window.setTimeout(() => {
      setHitting(false);
      hitResetTimerRef.current = null;
    }, MOKUGYO_HIT_ANIMATION_MS);

    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
    } catch {
      // noop
    }
    audio.play().catch(() => {});
  }, []);

  return (
    <div className="ov-dash-widget ov-dash-mokugyo-widget">
      <div className="ov-dash-widget-header">
        <span className="ov-dash-widget-title">{t('overview.mokugyo.title', { defaultValue: '电子木鱼' })}</span>
        <span className="ov-dash-mokugyo-count">
          {t('overview.mokugyo.total', { defaultValue: '累计功德' })} {meritCount}
        </span>
      </div>
      <div className="ov-dash-mokugyo-body">
        <div className="ov-dash-mokugyo-float-layer" aria-hidden="true">
          {floatingMerits.map((item) => (
            <span
              key={item.id}
              className="ov-dash-mokugyo-float"
              style={{ '--mokugyo-float-dx': `${item.driftX}px` } as React.CSSProperties}
            >
              {t('overview.mokugyo.plusOne', { defaultValue: '功德+1' })}
            </span>
          ))}
        </div>
        <button
          className="ov-dash-mokugyo-hit-btn"
          type="button"
          onClick={handleStrike}
          title={t('overview.mokugyo.strike', { defaultValue: '敲一下' })}
          aria-label={t('overview.mokugyo.strike', { defaultValue: '敲一下' })}
        >
          <img
            src={SvgIcon.MOKUGYO}
            alt=""
            aria-hidden="true"
            className={`ov-dash-mokugyo-icon${hitting ? ' ov-dash-mokugyo-icon--hit' : ''}`}
          />
        </button>
      </div>
    </div>
  );
}
