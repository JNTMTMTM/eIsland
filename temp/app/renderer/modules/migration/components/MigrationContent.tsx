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
 * @file MigrationContent.tsx
 * @description 展示真实检测、备份和安装状态，不在 renderer 推断安装成功。
 * @author 鸡哥
 */
import { progressPercent } from '../utils/migrationUtils';
import styles from './migration.module.css';
import type { MigrationContentProps } from '../types/migrationTypes';

/** 显示阶段详情，所有路径均来自只读主进程状态。
 * @param props - 迁移快照与有限界面动作。
 * @returns 当前阶段的内容。
 */
export function MigrationContent(props: MigrationContentProps) {
  const { t, state, error, source, busy, onSource, onLocal, onBackup } = props;
  const phase = state?.phase || 'welcome';
  const review = phase === 'ready';
  const working = ['backing-up', 'downloading', 'verifying', 'installing'].includes(phase);
  return (
    <section className={styles.content} aria-live="polite">
      <h1>{t(`phases.${phase}.title`)}</h1>
      <p className={styles.description}>{t(`phases.${phase}.body`)}</p>
      {['welcome', 'error', 'cancelled'].includes(phase) && (
        <div className={styles.sourceRow}>
          <label htmlFor="source">{t('source')}</label>
          <select id="source" value={source} disabled={busy} onChange={onSource}>
            {(state?.sources || [{ id: 'esa' }]).map((entry) => <option key={entry.id} value={entry.id}>{t(`sources.${entry.id}`)}</option>)}
          </select>
          <button type="button" className={styles.textButton} disabled={busy} onClick={onLocal}>{t('localPackage')}</button>
        </div>
      )}
      {(review || phase === 'prepared') && state?.inspection && state.release && (
        <dl className={styles.details}>
          <div><dt>{t('targetVersion')}</dt><dd>{state.release.version}</dd></div>
          <div><dt>{t('targetDirectory')}</dt><dd>{state.inspection.targetDirectory}</dd></div>
          <div><dt>{t('dataDirectory')}</dt><dd>{state.inspection.selectedStore}</dd></div>
        </dl>
      )}
      {review && Boolean(state?.inspection?.running.length) && <p className={styles.warning}>{t('errors.closeRunning')}</p>}
      {(working || phase === 'prepared') && state && (
        <div className={styles.progress}>
          <progress aria-label={t(`phases.${phase}.title`)} value={phase === 'prepared' ? 100 : progressPercent(state.progress)} max={100} />
          <p>{t('progressBytes', { done: (state.progress.done / 1048576).toFixed(1), total: state.progress.total === null ? t('unknownSize') : (state.progress.total / 1048576).toFixed(1) })}</p>
        </div>
      )}
      {error && <p role="alert" className={styles.error}>{t(`errors.${error}`, { defaultValue: t('errors.operationFailed') })}</p>}
      {state?.backup && <button type="button" onClick={onBackup} className={styles.backup}>{t('openBackup')}<span>{state.backup.directory}</span></button>}
      {['complete', 'installed'].includes(phase) && <p className={styles.note}>{t('startupNotice')}</p>}
      <p className={styles.note}>{t('dataNotice')}</p>
    </section>
  );
}
