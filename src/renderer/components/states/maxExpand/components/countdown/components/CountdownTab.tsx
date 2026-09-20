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
 * @file CountdownTab.tsx
 * @description 事件优先的倒数日管理页，与 expand 共用数据和日期规则。
 * @author 鸡哥
 */

import { useEffect, useId, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import useIslandStore from '../../../../../../store/slices';
import { useCountdownItems } from '../hooks/useCountdownItems';
import { useCountdownForm } from '../hooks/useCountdownForm';
import { useCountdownToday } from '../hooks/useCountdownToday';
import { normalizeImageSource, occurrenceDate, isArchived, sortCountdownItems, toLocalDateStr } from '../utils/countdownUtils';
import { EVENT_TYPES } from '../config/countdownConfig';
import { CountdownDrawer } from './CountdownDrawer';
import { CountdownCalendar } from './CountdownCalendar';
import { CountdownForm } from './CountdownForm';
import { CountdownPreview } from './CountdownPreview';
import { CountdownCardList } from './CountdownCardList';
import type { CountdownItem } from '../types/countdownTypes';

/**
 * 组合事件筛选、编辑与实时预览。
 * @returns 倒数日页面
 */
export function CountdownTab(): ReactElement {
  const { t } = useTranslation();
  const { items, loaded, saving, error, updateItems } = useCountdownItems();
  const form = useCountdownForm(updateItems);
  const now = useCountdownToday();
  const formId = useId();
  const coverImage = useIslandStore((s) => s.coverImage);
  const [resolvedCoverImage, setResolvedCoverImage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('nearest');
  const [deleted, setDeleted] = useState<CountdownItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    normalizeImageSource(coverImage ?? undefined).then((image) => {
      if (!cancelled) setResolvedCoverImage(image ?? null);
    }).catch(() => { if (!cancelled) setResolvedCoverImage(null); });
    return () => { cancelled = true; };
  }, [coverImage]);

  const visible = items.filter((item) => {
    const archived = isArchived(item, now);
    return (filter === 'archived' ? archived : !archived && (filter !== 'pinned' || item.pinned))
      && (category === 'all' || item.type === category)
      && `${item.name} ${item.description ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  });
  const sorted = sort === 'nearest' ? sortCountdownItems(visible, now) : [...visible].sort((a, b) =>
    Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (sort === 'name' ? a.name.localeCompare(b.name)
      : occurrenceDate(a, now).localeCompare(occurrenceDate(b, now))));

  const handleAction = (item: CountdownItem, action: 'pin' | 'copy' | 'archive'): void => {
    void updateItems((current) => {
      const latest = current.find((value) => value.id === item.id);
      if (!latest) return current;
      if (action === 'copy') {return [...current, { ...latest, id: Date.now() + Math.random(),
        name: t('countdown.manage.copyName', { name: latest.name }), pinned: false, archived: false, expiryAction: 'continue' }];}
      return current.map((value) => value.id !== item.id ? value : action === 'pin' ? { ...value, pinned: !value.pinned }
        : { ...value, archived: !isArchived(value, now), expiryAction: 'continue' });
    });
  };
  const remove = async (): Promise<void> => {
    const item = items.find((value) => value.id === form.editingId);
    if (!item) return;
    if (await updateItems((current) => current.filter((value) => value.id !== item.id))) {
      setDeleted(item);
      form.setOpen(false);
    }
  };
  const undo = async (): Promise<void> => {
    if (deleted && await updateItems((current) => current.some((item) => item.id === deleted.id) ? current : [...current, deleted])) setDeleted(null);
  };

  const activeCount = items.filter((item) => !isArchived(item, now)).length;
  const closeEditor = (): void => form.setOpen(false);

  return (
    <section className="max-expand-tab-panel countdown-panel-v2" onWheel={(e) => e.stopPropagation()}>
      <div className="cd-page" inert={form.open}>
        <header className="cd-toolbar">
          <h2 className="cd-title">{t('overview.countdown.title')}</h2>
          <span className="cd-stat">{t('countdown.manage.summary', { count: activeCount })}</span>
        </header>
        <div className="cd-filters">
          <input
            className="cd-input cd-search"
            type="search"
            aria-label={t('countdown.manage.search')}
            placeholder={t('countdown.manage.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="cd-filter-tabs" aria-label={t('countdown.manage.filter')}>
            {['active', 'pinned', 'archived'].map((value) => (
              <button
                className={filter === value ? 'active' : ''}
                type="button"
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >{t(`countdown.manage.${value}`)}</button>
            ))}
          </div>
          <select className="cd-input" aria-label={t('countdown.form.type')} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">{t('countdown.manage.allTypes')}</option>
            {EVENT_TYPES.map((type) => <option key={type} value={type}>{t(`countdown.types.${type}`)}</option>)}
          </select>
          <select className="cd-input" aria-label={t('countdown.manage.sort')} value={sort} onChange={(e) => setSort(e.target.value)}>
            {['nearest', 'name', 'date'].map((value) => <option value={value} key={value}>{t(`countdown.manage.sort_${value}`)}</option>)}
          </select>
          <button className="cd-new-event" type="button" disabled={!loaded || saving} onClick={form.startNew}>
            <Plus size={14} />{t('countdown.manage.new')}
          </button>
        </div>
        {error && !form.open && <p className="cd-error" role="alert">{t('countdown.manage.saveError')}</p>}
        {deleted && (
          <div className="cd-feedback" role="status">
            {t('countdown.manage.deleted', { name: deleted.name })}
            <button type="button" disabled={saving} onClick={() => void undo()}>{t('countdown.manage.undo')}</button>
          </div>
        )}
        <div className="cd-result-count">{t('countdown.manage.resultCount', { count: sorted.length })}</div>
        {!loaded ? <div className="cd-cards-empty">{t('countdown.manage.loading')}</div>
          : <CountdownCardList items={sorted} now={now} saving={saving} onStartEdit={form.startEdit} onAction={handleAction} />}
      </div>
      <CountdownDrawer open={form.open} saving={saving} onClose={closeEditor}
        title={t(form.editingId === null ? 'countdown.manage.new' : 'countdown.editTitle')}>
        {error && <p className="cd-error" role="alert">{t('countdown.manage.saveError')}</p>}
        <div className="cd-editor-layout">
          <CountdownForm
            formId={formId}
            draft={form.draft}
            setDraft={form.setDraft}
            editing={form.editingId !== null}
            saving={saving}
            resolvedCoverImage={resolvedCoverImage}
            onSave={form.save}
            onCancel={closeEditor}
            onDelete={form.editingId !== null ? () => void remove() : undefined}
          />
          <div className="cd-editor-aside">
            <CountdownCalendar
              formId={formId}
              selectedDate={new Date(`${form.draft.date}T00:00:00`)}
              onSelectDate={(date) => form.setDraft((value) => ({ ...value, date: toLocalDateStr(date) }))}
              highlightDates={items.filter((item) => !isArchived(item, now)).map((item) => new Date(`${occurrenceDate(item, now)}T00:00:00`))}
            />
            <CountdownPreview draft={form.draft} now={now} />
          </div>
        </div>
      </CountdownDrawer>
    </section>
  );
}
