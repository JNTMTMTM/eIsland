/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file islandScaleSettingsCard.tsx
 * @description 位置校准中的整体缩放滑条与恢复默认操作。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ISLAND_SCALE_DEFAULT, ISLAND_SCALE_MIN, ISLAND_SCALE_MAX, normalizeIslandScale } from '../../../../../../../../../shared/islandScale';
import type { ChangeEvent, ReactElement } from 'react';

/* eslint-disable better-tailwindcss/no-unknown-classes -- 复用设置页已有的共享 CSS 控件样式。 */
/* eslint @typescript-eslint/no-floating-promises: ["error", { "ignoreVoid": true }] -- effect 和事件入口显式启动内部已处理失败的异步任务。 */

/**
 * 渲染即时生效并保存的灵动岛缩放设置。
 * @returns 缩放设置卡片。
 */
export default function IslandScaleSettingsCard(): ReactElement {
  const { t } = useTranslation();
  const [scale, setScale] = useState(ISLAND_SCALE_DEFAULT);
  const [failed, setFailed] = useState(false);
  const versionRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    const version = versionRef.current;
    const load = async (): Promise<void> => {
      try {
        const value = await window.api.islandScaleGet();
        if (!disposed && version === versionRef.current) setScale(normalizeIslandScale(value));
      } catch {
        if (!disposed && version === versionRef.current) setFailed(true);
      }
    };
    void load();
    const unsubscribe = window.api.onSettingsChanged((channel, data) => {
      if (channel !== 'island:scale') return;
      versionRef.current += 1;
      setScale(normalizeIslandScale(data));
      setFailed(false);
    });
    return () => { disposed = true; versionRef.current += 1; unsubscribe(); };
  }, []);

  const applyScale = useCallback(async (value: number): Promise<void> => {
    const next = normalizeIslandScale(value);
    const previous = scale;
    const version = ++versionRef.current;
    setScale(next);
    setFailed(false);
    let saved = false;
    try { saved = await window.api.islandScaleSet(next); } catch { /* IPC 失败时恢复已保存的比例。 */ }
    if (version !== versionRef.current || saved) return;
    let actual = previous;
    try { actual = normalizeIslandScale(await window.api.islandScaleGet()); } catch { /* 主进程不可用时保留上次显示值。 */ }
    if (version !== versionRef.current) return;
    setScale(actual);
    setFailed(true);
  }, [scale]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    void applyScale(Number(event.target.value));
  }, [applyScale]);
  const handleReset = useCallback((): void => { void applyScale(ISLAND_SCALE_DEFAULT); }, [applyScale]);

  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-title">{t('settings.app.position.scaleTitle')}</div>
        <div className="settings-card-subtitle">{t('settings.app.position.scaleHint')}</div>
      </div>
      <div className="settings-opacity-slider-row">
        <input className="settings-opacity-slider"
          type="range"
          min={ISLAND_SCALE_MIN}
          max={ISLAND_SCALE_MAX}
          step={1}
          value={scale}
          aria-label={t('settings.app.position.scaleTitle')}
          aria-valuetext={`${scale}%`}
          onChange={handleChange}
        />
        <span className="settings-opacity-slider-value">{scale}%</span>
      </div>
      <div className="settings-hotkey-row">
        <button className="settings-hotkey-btn" type="button" disabled={scale === ISLAND_SCALE_DEFAULT} onClick={handleReset}>
          {t('settings.app.position.scaleReset')}
        </button>
      </div>
      {failed && <div className="settings-music-hint" role="alert">{t('settings.app.position.scaleSaveFailed')}</div>}
    </div>
  );
}

/* eslint-enable better-tailwindcss/no-unknown-classes -- 共享设置控件样式的例外范围到此结束。 */
