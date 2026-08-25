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
 * @file useAnnouncementQuestionnaire.ts
 * @description 未完成问卷提醒数据 Hook。
 * @author 鸡哥
 */

import { useCallback, useEffect, useState } from 'react';
import { readLocalToken } from '../../../../utils/userAccount';
import {
  dismissQuestionnaireReminder,
  fetchActiveQuestionnaires,
  isQuestionnaireCompleted,
  isQuestionnaireReminderDismissed,
  type QuestionnaireData,
} from '../../../../api/questionnaire/questionnaireApi';

/**
 * 挂载时查询一次当前问卷并过滤本机完成或屏蔽标记。
 * @returns 待提醒问卷与关闭提醒操作。
 */
export function useAnnouncementQuestionnaire() {
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireData[]>([]);

  const reload = useCallback(async (): Promise<void> => {
    const items = await fetchActiveQuestionnaires(readLocalToken());
    setQuestionnaires(items.filter((item) => (
      !isQuestionnaireCompleted(item.id) && !isQuestionnaireReminderDismissed(item.id)
    )));
  }, []);

  useEffect(() => {
    let active = true;
    void fetchActiveQuestionnaires(readLocalToken()).then((items) => {
      if (!active) return;
      setQuestionnaires(items.filter((item) => (
        !isQuestionnaireCompleted(item.id) && !isQuestionnaireReminderDismissed(item.id)
      )));
    });
    return () => { active = false; };
  }, []);

  const dismiss = useCallback((): void => {
    const questionnaire = questionnaires[0];
    if (!questionnaire) return;
    dismissQuestionnaireReminder(questionnaire.id);
    setQuestionnaires((current) => current.filter((item) => item.id !== questionnaire.id));
  }, [questionnaires]);

  return {
    questionnaire: questionnaires[0] ?? null,
    count: questionnaires.length,
    dismiss,
    reload,
  };
}
