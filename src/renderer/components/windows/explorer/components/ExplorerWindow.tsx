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
 * @file ExplorerWindow.tsx
 * @description 组合独立文件管理器的导航、文件列表和编辑操作。
 * @author 鸡哥
 */
/* eslint project/filename: "off" -- 窗口模块规范要求组件文件使用 PascalCase。 */
import { useTranslation } from 'react-i18next';
import styles from '../styles/explorer.module.css';
import useExplorer from '../hooks/useExplorer';
import useExplorerKeys from '../hooks/useExplorerKeys';
import { ExplorerDialog, ExplorerError } from './ExplorerDialog';
import { ExplorerActions, ExplorerFiles } from './ExplorerFiles';
import { ExplorerNavigation, ExplorerPlaces } from './ExplorerNavigation';

/**
 * 渲染独立窗口的内容区。
 * @returns 随应用主题切换的文件管理器。
 */
export default function ExplorerWindow() {
  const explorer = useExplorer();
  const { t } = useTranslation();
  useExplorerKeys(explorer);
  const path = explorer.directory?.path ?? '';
  const place = explorer.places.find((p) => p.path === path && p.kind !== 'drive');
  const folder = explorer.directory?.parent ? path.split(/[\\/]/u).filter(Boolean).pop() : path;
  const title = place ? t(`explorer.${place.kind}`) : folder;
  return (
    <main className={styles.root}>
      <ExplorerNavigation explorer={explorer} />
      <div className={styles.body}>
        <ExplorerPlaces explorer={explorer} />
        <section className={styles.content}>
          <h1 title={path}>{title || t('explorer.title')}</h1>
          <ExplorerActions explorer={explorer} />
          {!explorer.dialog && <ExplorerError explorer={explorer} />}
          <ExplorerFiles explorer={explorer} />
        </section>
      </div>
      {explorer.dialog && <ExplorerDialog explorer={explorer} />}
    </main>
  );
}
