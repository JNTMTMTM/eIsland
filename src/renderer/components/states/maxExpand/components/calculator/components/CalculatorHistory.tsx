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
 * @file CalculatorHistory.tsx
 * @description 可恢复结构化公式的计算历史面板。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalculatorHistoryEntry } from '../utils/historyUtils';

/** 展示计算历史并支持恢复完整公式。
 * @param props - 记录、存储状态及管理回调
 * @returns 历史面板
 */
export function CalculatorHistory({ entries, storageError, onRestore, onRemove, onClear }: {
  entries: CalculatorHistoryEntry[]; storageError: boolean;
  onRestore: (entry: CalculatorHistoryEntry) => void; onRemove: (id: string) => void; onClear: () => void;
}): ReactElement {
  const { t } = useTranslation();
  return <details className="calc-history">
    <summary>{t('calculator.history.title')} ({entries.length})</summary>
    {storageError && <p role="status">{t('calculator.history.storageError')}</p>}
    <div className="calc-history-list">
      {entries.length === 0 && <p>{t('calculator.history.empty')}</p>}
      {entries.map((entry) => <div className="calc-history-row" key={entry.id}>
        <button className="calc-history-restore" type="button" title={t('calculator.history.restore')} onClick={() => onRestore(entry)}>
          <span>{entry.formula}</span><strong>{entry.result}</strong><small>{t(`calculator.angleUnit.${entry.angleUnit}Short`)}</small>
        </button>
        <button className="calc-tool-btn" type="button" aria-label={t('calculator.history.remove')} onClick={() => onRemove(entry.id)}>×</button>
      </div>)}
    </div>
    {entries.length > 0 && <button className="calc-tool-btn" type="button" onClick={onClear}>{t('calculator.history.clear')}</button>}
  </details>;
}
