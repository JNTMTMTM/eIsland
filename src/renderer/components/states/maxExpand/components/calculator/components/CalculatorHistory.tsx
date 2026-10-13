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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/**
 * @file CalculatorHistory.tsx
 * @description 统一历史记录的数学卡片、分页与完整输入恢复。
 * @author 鸡哥
 */

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalculatorHistoryEntry } from '../utils/historyUtils';
import { formatHistoryMath } from '../utils/historyMathUtils';
import { CALC_SIDEBAR_NAV_ITEMS } from '../config/calculatorConfig';
import { HistoryMath } from './HistoryMath';

interface HistoryActions {
  onRestore: (entry: CalculatorHistoryEntry) => void;
  onRemove: (id: string) => void;
}

function HistoryRow({ entry, onRestore, onRemove }: { entry: CalculatorHistoryEntry } & HistoryActions): ReactElement {
  const { t } = useTranslation();
  const math = useMemo(() => formatHistoryMath(entry), [entry]);
  const angleUnit = 'angleUnit' in entry ? entry.angleUnit : entry.mode === 'equation' ? entry.input.angleUnit : null;
  return <div className="calc-history-row" data-mode={entry.mode} data-formula={entry.formula}>
    <button className="calc-history-restore" type="button" title={t('calculator.history.restore')} onClick={() => onRestore(entry)}>
      <span className="calc-history-meta">
        {t(CALC_SIDEBAR_NAV_ITEMS.find((item) => item.mode === entry.mode)!.labelKey)}
        {angleUnit && <small>{t(angleUnit === 'degree' ? 'calculator.angleUnit.degreeShort' : 'calculator.angleUnit.radianShort')}</small>}
        {entry.mode === 'matrix' && <small>{entry.formula.split('\n')[0]}</small>}
      </span>
      <span className="calc-history-formula">{math.expression.map((part, index) => <HistoryMath key={index} part={part} />)}</span>
      <strong className="calc-history-result">{math.result.map((part, index) => <HistoryMath key={index} part={part} />)}</strong>
    </button>
    <button className="calc-tool-btn calc-history-delete" type="button" aria-label={t('calculator.history.remove')} onClick={() => onRemove(entry.id)}>×</button>
  </div>;
}

/** 展示按页排列的数学历史卡片并支持恢复、删除及清空。
 * @param props - 记录、存储状态及管理回调
 * @returns 历史面板
 */
export function CalculatorHistory({ entries, storageError, onRestore, onRemove, onClear }: {
  entries: CalculatorHistoryEntry[]; storageError: boolean; onClear: () => void;
} & HistoryActions): ReactElement {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const list = useRef<HTMLDivElement>(null);
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = entries.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { if (page !== currentPage) setPage(currentPage); }, [page, currentPage]);
  useEffect(() => { if (list.current) list.current.scrollTop = 0; }, [currentPage, pageSize]);

  return <section className="calc-history" aria-label={t('calculator.history.title')}>
    <div className="calc-toolbar calc-history-toolbar">
      <h3>{t('calculator.history.title')} ({entries.length})</h3>
      <label className="calc-history-page-size">
        {t('calculator.history.pageSize')}
        <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
          {[5, 10, 20].map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <button className="calc-tool-btn" type="button" disabled={entries.length === 0} onClick={onClear}>{t('calculator.history.clear')}</button>
    </div>
    {storageError && <p role="status">{t('calculator.history.storageError')}</p>}
    <div className="calc-history-list" ref={list}>
      {entries.length === 0 && <p>{t('calculator.history.empty')}</p>}
      {visible.map((entry) => <HistoryRow key={entry.id} entry={entry} onRestore={onRestore} onRemove={onRemove} />)}
    </div>
    <nav className="settings-plugin-market-pagination calc-history-pagination" aria-label={t('calculator.history.pagination')}>
      <button className="settings-hotkey-btn" type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>{t('calculator.history.previousPage')}</button>
      <span className="settings-plugin-market-pagination-text calc-history-page-summary" aria-live="polite">{t('calculator.history.pageSummary', { page: currentPage, pages: pageCount })}</span>
      <button className="settings-hotkey-btn" type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>{t('calculator.history.nextPage')}</button>
    </nav>
  </section>;
}
