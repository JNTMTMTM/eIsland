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
 * @file ExplorerDialog.tsx
 * @description 文件夹命名和移入回收站的确认对话框。
 * @author 鸡哥
 */
/* eslint project/filename: "off" -- 窗口组件使用 PascalCase。 */
/* eslint react/jsx-no-bind: ["error", { "ignoreDOMComponents": true }] -- 原生控件接收行与表单事件；子组件仍使用稳定属性。 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/explorer.module.css';
import type { ChangeEvent, FormEvent, SyntheticEvent } from 'react';
import type { ExplorerViewProps } from '../types/explorerTypes';

/**
 * 映射原生校验错误，保留系统提供的具体原因。
 * @param props - 组件参数。
 * @param props.explorer - 当前 Explorer 状态。
 * @returns 可供辅助技术读取的错误。
 */
export function ExplorerError({ explorer }: ExplorerViewProps) {
  const { t } = useTranslation();
  if (!explorer.error) return null;
  const key = `explorer.errors.${explorer.error}`;
  return <p className={styles.error} role="alert">{t(key, { defaultValue: explorer.error })}</p>;
}

/**
 * 使用模态对话框隔离后台快捷键并支持 Escape 取消。
 * @param props - 组件参数。
 * @param props.explorer - 当前 Explorer 状态。
 * @returns 当前操作的确认表单。
 */
export function ExplorerDialog({ explorer: e }: ExplorerViewProps) {
  const { t } = useTranslation();
  const modal = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    modal.current?.showModal();
    input.current?.select();
  }, []);
  const cancel = () => e.showDialog(null);
  const dismiss = (event: SyntheticEvent) => { event.preventDefault(); cancel(); };
  const submit = (event: FormEvent) => { event.preventDefault(); e.confirm(); };
  const changeName = (event: ChangeEvent<HTMLInputElement>) => e.setName(event.target.value);
  const trash = e.dialog === 'trash';
  return (
    <dialog className={styles.dialog} ref={modal} aria-labelledby="explorer-dialog-title"
      onCancel={dismiss}>
      <form onSubmit={submit}>
        <h2 id="explorer-dialog-title">{t(`explorer.${e.dialog}`)}</h2>
        {trash ? <p>{t('explorer.confirmTrash', { name: e.selection?.name })}</p>
          : <label>{t('explorer.name')}<input ref={input} value={e.name} required maxLength={255} onChange={changeName} disabled={e.busy} /></label>}
        <ExplorerError explorer={e} />
        <div className={styles['dialog-actions']}>
          <button type="button" disabled={e.busy} onClick={cancel}>{t('explorer.cancel')}</button>
          <button className={styles.primary} type="submit" disabled={e.busy || (!trash && !e.name.trim())}>
            {trash ? t('explorer.trash') : t('explorer.save')}
          </button>
        </div>
      </form>
    </dialog>
  );
}
