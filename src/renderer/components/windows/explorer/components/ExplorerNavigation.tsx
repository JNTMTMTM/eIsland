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
 * @file ExplorerNavigation.tsx
 * @description 呈现快速访问、磁盘和路径导航。
 * @author 鸡哥
 */
/* eslint project/filename: "off" -- 窗口组件使用 PascalCase。 */
/* eslint react/jsx-no-bind: ["error", { "ignoreDOMComponents": true }] -- 原生控件接收行与表单事件；子组件仍使用稳定属性。 */
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, FileText, Folder, HardDrive, House, Monitor, RefreshCw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/explorer.module.css';
import type { ChangeEvent, FormEvent } from 'react';
import type { ExplorerViewProps } from '../types/explorerTypes';

const icons = { home: House, desktop: Monitor, documents: FileText, downloads: ArrowDownToLine, drive: HardDrive };

/**
 * 显示系统返回的常用目录和盘符。
 * @param props - 组件参数。
 * @param props.explorer - 当前 Explorer 状态。
 * @returns 侧边位置栏。
 */
export function ExplorerPlaces({ explorer }: ExplorerViewProps) {
  const { t } = useTranslation();
  return (
    <aside className={styles.places}>
      {[false, true].map((drives) => (<section key={String(drives)}>
        <h2>{drives ? t('explorer.drives') : t('explorer.quickAccess')}</h2>
        {explorer.places.filter((place) => (place.kind === 'drive') === drives).map((place) => {
          const Icon = icons[place.kind];
          const visit = () => explorer.navigate(place.path);
          return (
            <button key={place.kind + place.path} type="button" title={place.path}
              aria-current={explorer.directory?.path === place.path ? 'location' : undefined}
              disabled={explorer.busy} onClick={visit}>
              <Icon size={16} /><span>{place.kind === 'drive' ? place.path : t(`explorer.${place.kind}`)}</span>
            </button>
          );
        })}
      </section>))}
    </aside>
  );
}

/**
 * 允许键入路径、遍历访问历史和筛选当前目录。
 * @param props - 组件参数。
 * @param props.explorer - 当前 Explorer 状态。
 * @returns 顶部导航栏。
 */
export function ExplorerNavigation({ explorer: e }: ExplorerViewProps) {
  const { t } = useTranslation();
  const back = () => e.travel(-1);
  const forward = () => e.travel(1);
  const up = () => { if (e.directory?.parent) e.navigate(e.directory.parent); };
  const setAddress = (event: ChangeEvent<HTMLInputElement>) => e.setAddress(event.target.value);
  const filter = (event: ChangeEvent<HTMLInputElement>) => e.setQuery(event.target.value);
  const submit = (event: FormEvent) => { event.preventDefault(); e.navigate(e.address); };

  return (
    <header className={styles.navigation}>
      <div className={styles.arrows}>
        <button type="button" title={t('explorer.back')} aria-label={t('explorer.back')} disabled={e.busy || !e.back} onClick={back}><ArrowLeft /></button>
        <button type="button" title={t('explorer.forward')} aria-label={t('explorer.forward')} disabled={e.busy || !e.forward} onClick={forward}><ArrowRight /></button>
        <button type="button" title={t('explorer.up')} aria-label={t('explorer.up')} disabled={e.busy || !e.directory?.parent} onClick={up}><ArrowUp /></button>
        <button type="button" title={t('explorer.refresh')} aria-label={t('explorer.refresh')} disabled={e.busy || !e.directory} onClick={e.refresh}><RefreshCw /></button>
      </div>
      <form className={`${styles.field} ${styles.address}`} onSubmit={submit}>
        <Folder size={16} /><input id="explorer-address" aria-label={t('explorer.address')} placeholder={t('explorer.address')}
          value={e.address} onChange={setAddress} spellCheck={false} />
      </form>
      <label className={`${styles.field} ${styles.filter}`}><Search size={15} /><input type="search" aria-label={t('explorer.filter')}
        placeholder={t('explorer.filter')} value={e.query} onChange={filter} /></label>
    </header>
  );
}
