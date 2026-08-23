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
 * @file useAnnouncementQuestionnaire.ts
 * @description 公告页未完成问卷提醒数据 Hook。
 * @author 鸡哥
 */

import { useCallback, useEffect, useState } from 'react';
import { readLocalToken } from '../../../../utils/userAccount';
import {
  dismissQuestionnaireReminder,
  fetchCurrentQuestionnaire,
  isQuestionnaireCompleted,
  isQuestionnaireReminderDismissed,
  type QuestionnaireData,
} from '../../../../api/questionnaire/questionnaireApi';

/**
 * 公告页挂载时查询一次当前问卷并过滤本机完成或屏蔽标记。
 * @returns 待提醒问卷与关闭提醒操作。
 */
export function useAnnouncementQuestionnaire() {
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);

  useEffect(() => {
    let active = true;
    void fetchCurrentQuestionnaire(readLocalToken()).then((current) => {
      if (!active || !current) return;
      if (isQuestionnaireCompleted(current.id) || isQuestionnaireReminderDismissed(current.id)) return;
      setQuestionnaire(current);
    });
    return () => { active = false; };
  }, []);

  const dismiss = useCallback((): void => {
    if (!questionnaire) return;
    dismissQuestionnaireReminder(questionnaire.id);
    setQuestionnaire(null);
  }, [questionnaire]);

  return { questionnaire, dismiss };
}