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
 * @file localApp.tsx
 * @description dev:local 的阶段选择工具栏，复用实际向导并仅操作内存模拟状态。
 * @author 鸡哥
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdapterWizard from '../modules/migration';
import { LOCAL_PHASES, localPreview } from './localPreview';
import styles from './local.module.css';
import type { Phase } from '../../shared/types/adapterTypes';
import type { ChangeEvent } from 'react';

/** 展示本地前端预览，可直接切换全部迁移阶段。
 * @returns 工具栏及现有迁移向导。
 */
export default function LocalApp() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('welcome');
  useEffect(() => localPreview.api.onState((state) => setPhase(state.phase)), []);
  const changePhase = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    localPreview.setPhase(event.target.value as Phase);
  }, []);
  return (
    <div className={styles.frame}>
      <aside className={styles.toolbar} aria-label={t('localPreview.title')}>
        <strong>{t('localPreview.title')}</strong>
        <label htmlFor="local-phase">{t('localPreview.phase')}</label>
        <select id="local-phase" value={phase} onChange={changePhase}>
          {LOCAL_PHASES.map((item) => <option key={item} value={item}>{t(`phases.${item}.title`)}</option>)}
        </select>
        <span>{t('localPreview.simulated')}</span>
      </aside>
      <AdapterWizard />
    </div>
  );
}
