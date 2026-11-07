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
 * @file WizardHeader.tsx
 * @description 无边框向导的拖动标题区、语言和关闭控件。
 * @author 鸡哥
 */
import logo from '../../../../public/image/logo_full.png?url&no-inline';
import LanguageSelect from './LanguageSelect';
import styles from './migration.module.css';
import type { WizardHeaderProps } from '../types/migrationTypes';

/** 提供系统窗口操作和四语言选择。
 * @param props - 翻译及窗口动作。
 * @param props.t - 界面翻译函数。
 * @param props.language - 当前界面语言代码。
 * @param props.onLanguage - 切换语言的动作。
 * @param props.onClose - 关闭窗口的动作。
 * @param props.installing - 安装中禁用关闭。
 * @returns 向导标题栏。
 */
export default function WizardHeader({ t, language, onLanguage, onClose, installing }: WizardHeaderProps) {
  return (
    <header className={styles.header}>
      <img className={styles.brand} src={logo} width={180} height={40} alt={t('brand')} draggable={false} />
      <div className={styles.controls}>
        <LanguageSelect t={t} language={language} onLanguage={onLanguage} />
        <button type="button" onClick={onClose} disabled={installing} className={styles.close} aria-label={t('close')}>×</button>
      </div>
    </header>
  );
}
