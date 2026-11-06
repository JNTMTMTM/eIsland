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
 * @file WizardFooter.tsx
 * @description 显式区分检测、准备和用户确认安装，取消不终止系统安装器。
 * @author 鸡哥
 */
import { ArrowRight } from 'lucide-react';
import styles from './migration.module.css';
import type { WizardFooterProps } from '../types/migrationTypes';

/** 展示步骤和当前可执行动作。
 * @param props - 流程状态与主动作。
 * @returns 固定底部导航。
 */
export function WizardFooter(props: WizardFooterProps) {
  const { t, state, busy, onPrimary, onCancel } = props;
  const phase = state?.phase;
  let action = 'inspect';
  if (phase === 'ready') action = 'prepare';
  else if (phase === 'prepared') action = 'install';
  else if (phase === 'complete' || phase === 'installed') action = 'launch';
  return (
    <footer className={styles.footer}>
      <div className={styles.actions}>
        {busy && phase !== 'installing' && <button type="button" onClick={onCancel} className={styles.textButton}>{t('cancel')}</button>}
        <button type="button" className={styles.primary} onClick={onPrimary} disabled={busy || !state}>{t(busy ? 'working' : `actions.${action}`)}<ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /></button>
      </div>
    </footer>
  );
}
