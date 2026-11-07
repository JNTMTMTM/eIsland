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
import { useCallback } from 'react';
import { CircleAlert, X } from 'lucide-react';
import { progressPercent } from '../utils/migrationUtils';
import { SOURCE_ICONS } from '../config/migrationConfig';
import styles from './migration.module.css';
import type { MigrationContentProps } from '../types/migrationTypes';
import type { SourceId } from '../../../../shared/types/adapterTypes';
import type { MouseEvent } from 'react';

/** 显示阶段详情，所有路径均来自只读主进程状态。
 * @param props - 迁移快照与有限界面动作。
 * @param props.t - 界面翻译函数。
 * @param props.state - 主进程状态快照。
 * @param props.error - 当前错误代码。
 * @param props.source - 已选择的在线源。
 * @param props.busy - 是否有操作进行中。
 * @param props.onSource - 选择在线源的动作。
 * @param props.onBackup - 打开备份目录的动作。
 * @param props.onDismissError - 关闭错误提示的动作。
 * @returns 当前阶段的内容。
 */
export default function MigrationContent({ t, state, error, source, busy, onSource, onBackup, onDismissError }: MigrationContentProps) {
  const handleSource = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    onSource(event.currentTarget.value as SourceId);
  }, [onSource]);
  const phase = state?.phase || 'welcome';
  const review = phase === 'ready';
  const working = ['backing-up', 'downloading', 'verifying', 'installing'].includes(phase);
  return (
    <section className={styles.content} aria-live="polite">
      <div className={styles['content-body']}>
        <h1>{t(`phases.${phase}.title`)}</h1>
        <p className={styles.description}>{t(`phases.${phase}.body`)}</p>
        {['welcome', 'error', 'cancelled'].includes(phase) && (
          <fieldset className={styles['source-row']} disabled={busy}>
            <legend>{t('source')}</legend>
            <div className={styles['source-options']}>
              {/* 只展示主进程实际配置的在线源，构建时追加的 COS/OSS 也会出现。 */}
              {state?.sources.filter((entry) => entry.id !== 'local').map((entry) => (
                <button key={entry.id} type="button" className={styles['source-button']} value={entry.id} aria-pressed={source === entry.id} onClick={handleSource}>
                  <img src={SOURCE_ICONS[entry.id]} width={28} height={28} alt="" />
                  <span>{t(`sources.${entry.id}`)}</span>
                </button>
              ))}
            </div>
          </fieldset>
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
        {error && (
          <div role="alert" className={styles.error}>
            <CircleAlert className={styles['error-icon']} size={18} aria-hidden="true" />
            <span className={styles['error-message']}>{t(`errors.${error}`, { defaultValue: t('errors.operationFailed') })}</span>
            <button type="button" className={styles['error-close']} onClick={onDismissError} aria-label={t('dismissError')} title={t('dismissError')}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
        {state?.backup && <button type="button" onClick={onBackup} className={styles.backup}>{t('openBackup')}<span>{state.backup.directory}</span></button>}
        {['complete', 'installed'].includes(phase) && <p className={styles.note}>{t('startupNotice')}</p>}
      </div>
    </section>
  );
}
