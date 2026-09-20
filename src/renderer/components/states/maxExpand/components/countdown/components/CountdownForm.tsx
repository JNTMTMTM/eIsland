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
 * @file CountdownForm.tsx
 * @description 共用事件表单，分别设置分类、计时规则和外观。
 * @author 鸡哥
 */

import { useState, type ReactElement, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { COLOR_PRESETS, EVENT_TYPES } from '../config/countdownConfig';
import { defaultRules, normalizeImageSource } from '../utils/countdownUtils';
import type { CountdownDraft, EventType } from '../types/countdownTypes';

interface CountdownFormProps {
  formId: string;
  draft: CountdownDraft;
  setDraft: Dispatch<SetStateAction<CountdownDraft>>;
  editing: boolean;
  saving: boolean;
  resolvedCoverImage: string | null;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}

/**
 * 编辑事件内容与规则，外观放入可展开区域。
 * @param props - 草稿、保存状态及操作
 * @param props.formId - 关联右侧日期输入的表单标识
 * @param props.draft - 未保存的事件草稿
 * @param props.setDraft - 更新草稿
 * @param props.editing - 是否编辑已有事件
 * @param props.saving - 是否正在保存
 * @param props.resolvedCoverImage - 当前专辑封面
 * @param props.onSave - 保存草稿
 * @param props.onCancel - 取消编辑
 * @param props.onDelete - 删除当前事件
 * @returns 可提交表单
 */
export function CountdownForm({ formId, draft, setDraft, editing, saving, resolvedCoverImage, onSave, onCancel, onDelete }: CountdownFormProps): ReactElement {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);
  const change = (patch: Partial<CountdownDraft>): void => setDraft((value) => ({ ...value, ...patch }));
  const selectImage = async (): Promise<void> => {
    try {
      const path = await window.api.openImageDialog();
      if (path) change({ backgroundImage: await normalizeImageSource(path) });
      setImageError(false);
    } catch { setImageError(true); }
  };
  return (
    <form className="cd-editor-form" id={formId} onSubmit={(e) => { e.preventDefault(); void onSave(); }}>
      <label className="cd-field">{t('countdown.namePlaceholder')}
        <input className="cd-input" required maxLength={120} value={draft.name} onChange={(e) => change({ name: e.target.value })} />
      </label>
      <div className="cd-form-grid">
        <label className="cd-field">{t('countdown.form.type')}
          <select className="cd-input" value={draft.type} onChange={(e) => {
            const type = e.target.value as EventType;
            change({ type, ...defaultRules(type) });
          }}>{EVENT_TYPES.map((type) => <option value={type} key={type}>{t(`countdown.types.${type}`)}</option>)}</select>
        </label>
        <label className="cd-field">{t('countdown.manage.mode')}
          <select className="cd-input" value={draft.mode ?? 'down'} onChange={(e) => change({ mode: e.target.value as 'up' | 'down', repeat: 'none', expiryAction: 'continue' })}>
            <option value="down">{t('countdown.manage.down')}</option><option value="up">{t('countdown.manage.up')}</option>
          </select>
        </label>
        {draft.mode !== 'up' ? <label className="cd-field">{t('countdown.manage.expiry')}
          <select className="cd-input" value={draft.repeat === 'yearly' ? 'yearly' : draft.expiryAction ?? 'continue'}
            onChange={(e) => change({ repeat: e.target.value === 'yearly' ? 'yearly' : 'none', expiryAction: e.target.value === 'archive' ? 'archive' : 'continue' })}>
            <option value="continue">{t('countdown.manage.continue')}</option><option value="yearly">{t('countdown.manage.yearly')}</option><option value="archive">{t('countdown.manage.autoArchive')}</option>
          </select>
        </label> : <label className="cd-check"><input type="checkbox" checked={Boolean(draft.includeToday)} onChange={(e) => change({ includeToday: e.target.checked })} />{t('countdown.manage.includeToday')}</label>}
      </div>
      <label className="cd-field">{t('countdown.descPlaceholder')}
        <textarea className="cd-textarea" value={draft.description ?? ''} rows={2} maxLength={500} onChange={(e) => change({ description: e.target.value })} />
      </label>
      <details className="cd-appearance"><summary>{t('countdown.manage.appearance')}</summary>
        <div className="cd-color-row">{COLOR_PRESETS.map((color) => (<button className={`cd-color-dot${draft.color === color ? ' active' : ''}`} key={color} type="button"
          style={{ background: color }} title={t('countdown.manage.colorValue', { color })} aria-label={t('countdown.manage.colorValue', { color })} aria-pressed={draft.color === color} onClick={() => change({ color })} />))}
        <label className="cd-check">{t('countdown.form.customColor')}<input type="color" value={draft.color} onChange={(e) => change({ color: e.target.value })} /></label>
        </div>
        <div className="cd-form-actions">
          <button className="cd-btn cancel" type="button" disabled={!resolvedCoverImage} onClick={() => { if (resolvedCoverImage) change({ backgroundImage: resolvedCoverImage }); }}>{t('countdown.form.albumBackground')}</button>
          <button className="cd-btn cancel" type="button" onClick={() => void selectImage()}>{t('countdown.form.customBackground')}</button>
          {draft.backgroundImage && <button className="cd-btn cancel" type="button" onClick={() => change({ backgroundImage: undefined })}>{t('countdown.form.clearBackground')}</button>}
        </div>
        {draft.backgroundImage && <label className="cd-field">{t('countdown.form.opacity')}<input type="range" min={0} max={1} step={0.05} value={draft.backgroundOpacity ?? 0.35} onChange={(e) => change({ backgroundOpacity: Number(e.target.value) })} /></label>}
        {imageError && <p role="alert" className="cd-error">{t('countdown.manage.imageError')}</p>}
      </details>
      <div className="cd-form-actions cd-form-submit-actions">
        <button className="cd-btn save" type="submit" disabled={saving || !draft.name.trim()}>{t(saving ? 'countdown.manage.saving' : editing ? 'countdown.actions.save' : 'countdown.actions.add')}</button>
        <button className="cd-btn cancel" type="button" disabled={saving} onClick={onCancel}>{t('countdown.actions.cancel')}</button>
        {onDelete && <button className="cd-btn danger" type="button" disabled={saving} onClick={onDelete}>{t('countdown.manage.delete')}</button>}
      </div>
    </form>
  );
}
