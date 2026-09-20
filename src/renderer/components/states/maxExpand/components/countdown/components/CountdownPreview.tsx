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
 * @file CountdownPreview.tsx
 * @description 使用共享卡片实时预览草稿。
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { CountdownCard } from './CountdownCard';
import type { ReactElement } from 'react';
import type { CountdownDraft } from '../types/countdownTypes';

/**
 * 预览未保存事件。
 * @param props - 草稿及当前日期
 * @param props.draft - 未保存的事件草稿
 * @param props.now - 当前本地日期
 * @returns 卡片预览
 */
export function CountdownPreview({ draft, now }: { draft: CountdownDraft; now: Date }): ReactElement {
  const { t } = useTranslation();
  return (
    <aside className="cd-preview">
      <div className="cd-preview-label">{t('countdown.preview')}</div>
      <CountdownCard item={{ ...draft, id: 0, name: draft.name.trim() || t('countdown.namePlaceholder') }} now={now} />
    </aside>
  );
}
