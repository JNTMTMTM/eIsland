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
 * @file MemoEditorEmpty.tsx
 * @description 未选中备忘录时的空白占位状态
 * @author 鸡哥
 */

import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';

/**
 * 编辑区空白占位
 */
export function MemoEditorEmpty(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="memo-tab-editor-empty">
      <div className="memo-tab-editor-empty-icon">
        <img src={SvgIcon.MEMO} alt="" width="48" height="48" draggable={false} />
      </div>
      <div className="memo-tab-editor-empty-text">{t('maxExpand.memo.selectHint', { defaultValue: '选择或新建一条备忘录' })}</div>
    </div>
  );
}
