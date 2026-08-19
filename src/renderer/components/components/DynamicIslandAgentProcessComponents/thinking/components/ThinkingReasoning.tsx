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
 * @file ThinkingReasoning.tsx
 * @description 可复用的流式思考过程展示组件。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { ThinkingReasoningProps } from '../types/thinkingTypes';
import { useThinkingReasoning } from '../hooks/useThinkingReasoning';
import styles from '../styles/thinking-reasoning.module.css';

/**
 * 渲染可折叠的思考过程。
 * @param content - 当前思考过程文本。
 * @param isThinking - 是否仍在接收思考内容。
 * @returns 思考过程展示组件。
 */
export function ThinkingReasoning({ content, isThinking }: ThinkingReasoningProps): ReactElement {
  const { t } = useTranslation();
  const { expanded, elapsedSeconds, viewportRef, toggle } = useThinkingReasoning(isThinking, content);

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={`${styles.header}${isThinking ? '' : ` ${styles.clickable}`}`}
        aria-expanded={expanded}
        aria-label={t('aiChat.timeline.thinking.toggleThought')}
        onClick={isThinking ? undefined : toggle}
      >
        {isThinking ? (
          <span className={`${styles.label} ${styles.shimmer}`}>
            {t('aiChat.timeline.thinking.thinking')}
          </span>
        ) : (
          <span className={styles.label}>
            <span className={styles.verb}>{t('aiChat.timeline.thinking.thought')}</span>
            {elapsedSeconds === null
              ? null
              : t('aiChat.timeline.thinking.elapsed', { seconds: elapsedSeconds })}
          </span>
        )}
        {!isThinking && (
          <svg className={styles.chevron} viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path d="m4.5 15.75 7.5-7.5 7.5 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className={`${styles.collapsible}${expanded ? '' : ` ${styles.collapsed}`}`}>
        <div className={styles.inner}>
          <div
            ref={viewportRef}
            className={`${styles.viewport}${isThinking ? '' : ` ${styles.scrollable}`}`}
          >
            <p className={styles.content}>{content}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
