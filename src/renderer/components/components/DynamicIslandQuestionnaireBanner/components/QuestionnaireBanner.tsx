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
 * @file QuestionnaireBanner.tsx
 * @description 未完成问卷提醒横幅。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../utils/SvgIcon';
import type { QuestionnaireBannerProps } from '../types';

/**
 * 渲染未完成问卷提醒与操作按钮。
 * @param props - 待处理问卷数量、打开问卷和关闭当前提醒回调。
 * @returns 问卷提醒横幅。
 */
export function QuestionnaireBanner({
  count,
  onOpen,
  onDismiss,
}: QuestionnaireBannerProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="announcement-questionnaire-banner" role="status">
      <span className="announcement-questionnaire-banner-text">
        <img src={SvgIcon.QUESTIONNAIRE} alt="" draggable={false} />
        {t('announcement.questionnaireBanner.title', { count })}
      </span>
      <div>
        <button type="button" className="primary" onClick={onOpen}>
          {t('announcement.questionnaireBanner.open')}
        </button>
        <button type="button" onClick={onDismiss}>
          {t('announcement.questionnaireBanner.dismiss')}
        </button>
      </div>
    </div>
  );
}
