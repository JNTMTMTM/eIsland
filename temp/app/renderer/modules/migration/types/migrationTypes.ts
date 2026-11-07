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
 * @file migrationTypes.ts
 * @description 向导全部组件属性与 hook 返回类型。
 * @author 鸡哥
 */
import type { TFunction } from 'i18next';
import type { AdapterState, SourceId } from '../../../../shared/types/adapterTypes';
export interface UseMigrationReturn {
  state: AdapterState | null; t: TFunction; language: string; source: SourceId;
  busy: boolean; step: number; error: string | null;
  setSource: (source: SourceId) => void; setLanguage: (language: string) => void;
  primary: () => void; cancel: () => void; close: () => void; openBackup: () => void; dismissError: () => void;
}
export interface LanguageSelectProps { t: TFunction; language: string; onLanguage: (language: string) => void; }
export interface WizardHeaderProps extends LanguageSelectProps { onClose: () => void; installing: boolean; }
export interface MigrationContentProps { t: TFunction; state: AdapterState | null; error: string | null; source: SourceId; busy: boolean; onSource: (source: SourceId) => void; onBackup: () => void; onDismissError: () => void; }
export interface WizardFooterProps { t: TFunction; state: AdapterState | null; busy: boolean; onPrimary: () => void; onCancel: () => void; }
