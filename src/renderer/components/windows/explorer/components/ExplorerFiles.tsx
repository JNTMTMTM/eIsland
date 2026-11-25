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
 * @file ExplorerFiles.tsx
 * @description 呈现文件列表、操作工具栏、分页和错误反馈。
 * @author 鸡哥
 */
/* eslint project/filename: "off" -- 窗口组件使用 PascalCase。 */
/* eslint react/jsx-no-bind: ["error", { "ignoreDOMComponents": true }] -- 原生控件接收行与表单事件；子组件仍使用稳定属性。 */
import { ChevronLeft, ChevronRight, ClipboardPaste, Copy, File, Folder, FolderPlus, Pencil, Scissors, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/explorer.module.css';
import formatSize from '../utils/explorerFormat';
import type { KeyboardEvent } from 'react';
import type { ExplorerViewProps } from '../types/explorerTypes';

/**
 * 显示当前选择可用的文件操作。
 * @param props - 组件参数。
 * @param props.explorer - 当前 Explorer 状态。
 * @returns 文件操作工具栏。
 */
export function ExplorerActions({ explorer: e }: ExplorerViewProps) {
  const { t } = useTranslation();
  const create = () => e.showDialog('create');
  const copy = () => e.prepare('copy');
  const cut = () => e.prepare('move');
  const rename = () => e.showDialog('rename');
  const trash = () => e.showDialog('trash');
  const selected = Boolean(e.selection);
  return (
    <div className={styles.actions}>
      <button type="button" disabled={e.busy || !e.directory} onClick={create}><FolderPlus />{t('explorer.create')}</button>
      <button type="button" disabled={e.busy || !selected} onClick={copy}><Copy />{t('explorer.copy')}</button>
      <button type="button" disabled={e.busy || !selected} onClick={cut}><Scissors />{t('explorer.cut')}</button>
      <button type="button" disabled={e.busy || !e.transfer || !e.directory} onClick={e.paste}><ClipboardPaste />{t('explorer.paste')}</button>
      <button type="button" disabled={e.busy || !selected} onClick={rename}><Pencil />{t('explorer.rename')}</button>
      <button type="button" disabled={e.busy || !selected} onClick={trash}><Trash2 />{t('explorer.trash')}</button>
    </div>
  );
}

/**
 * 显示单页目录项目，支持键盘选择和打开。
 * @param props - 组件参数。
 * @param props.explorer - 当前 Explorer 状态。
 * @returns 文件列表和状态栏。
 */
export function ExplorerFiles({ explorer: e }: ExplorerViewProps) {
  const { t, i18n } = useTranslation();
  const previous = () => e.changePage(e.page - 1);
  const nextPage = () => e.changePage(e.page + 1);
  let empty = t('explorer.chooseLocation');
  if (e.directory) empty = t('explorer.empty');
  if (e.query) empty = t('explorer.noMatches');
  if (e.busy) empty = t('explorer.loading');
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' });
  return (
    <>
      <div className={styles.scroll} aria-busy={e.busy}>
        <table className={styles.table}>
          <thead><tr><th scope="col">{t('explorer.name')}</th><th scope="col">{t('explorer.modified')}</th><th scope="col">{t('explorer.size')}</th></tr></thead>
          <tbody>{e.entries.map((entry) => {
            const select = () => e.select(entry);
            const open = () => e.open(entry);
            function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
              if (event.key === 'Enter') { event.preventDefault(); e.open(entry); }
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                const row = event.currentTarget.closest('tr');
                const next = event.key === 'ArrowDown' ? row?.nextElementSibling : row?.previousElementSibling;
                next?.querySelector('button')?.focus();
              }
            }
            return (
              <tr key={entry.path} data-selected={e.selection?.path === entry.path}
                onClick={select} onDoubleClick={open}>
                <td><button type="button" className={styles.entry} title={entry.name} onFocus={select}
                  onKeyDown={onKeyDown}>
                  {entry.directory ? <Folder className={styles['folder-icon']} /> : <File />}<span>{entry.name}</span>
                </button></td>
                <td>{entry.modified === null ? '' : date.format(entry.modified)}</td><td>{formatSize(entry.size, i18n.language)}</td>
              </tr>
            );
          })}</tbody>
        </table>
        {!e.entries.length && <div className={styles.empty} role="status"><Folder size={32} />
          {empty}
        </div>}
      </div>
      <footer className={styles.status} role="status">
        <span>{t('explorer.items', { count: e.total })}</span>
        {e.busy && e.directory && <span>{t('explorer.working')}</span>}
        {e.transfer && <span className={styles.transfer} title={e.transfer.entry.path}>
          {t(e.transfer.action === 'copy' ? 'explorer.copyPending' : 'explorer.movePending', { name: e.transfer.entry.name })}
        </span>}
        {e.pages > 1 && <div className={styles.pages}>
          <button type="button" aria-label={t('explorer.previousPage')} disabled={e.page === 0} onClick={previous}><ChevronLeft /></button>
          <span>{e.page + 1} / {e.pages}</span>
          <button type="button" aria-label={t('explorer.nextPage')} disabled={e.page + 1 >= e.pages} onClick={nextPage}><ChevronRight /></button>
        </div>}
      </footer>
    </>
  );
}
