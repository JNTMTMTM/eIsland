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
 */

/**
 * @file AnnouncementQuestionnaireBanner.tsx
 * @description 公告正文顶部未完成问卷提醒横幅。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

interface AnnouncementQuestionnaireBannerProps {
  onOpen: () => void;
  onDismiss: () => void;
}

/**
 * 渲染未完成问卷提醒与操作按钮。
 * @param props - 打开问卷和关闭提醒回调。
 * @returns 公告正文顶部提醒横幅。
 */
export function AnnouncementQuestionnaireBanner({
  onOpen,
  onDismiss,
}: AnnouncementQuestionnaireBannerProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="announcement-questionnaire-banner" role="status">
      <span>{t('announcement.questionnaireBanner.title')}</span>
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