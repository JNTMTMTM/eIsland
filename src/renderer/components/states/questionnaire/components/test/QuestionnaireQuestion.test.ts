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
 * @file QuestionnaireQuestion.test.ts
 * @description 问卷题型只读渲染测试。
 * @author 鸡哥
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { QuestionnaireQuestion } from '../QuestionnaireQuestion';

const noop = (): void => {};

describe('QuestionnaireQuestion read-only mode', () => {
  it('disables selected rating and choice controls', () => {
    const rating = renderToStaticMarkup(createElement(QuestionnaireQuestion, {
      question: { id: 'rating', title: 'Score', type: 'rating', required: true, options: [] },
      index: 0,
      answer: 5,
      readOnly: true,
      onChange: noop,
    }));
    const choice = renderToStaticMarkup(createElement(QuestionnaireQuestion, {
      question: { id: 'choice', title: 'Choice', type: 'single_choice', required: true, options: ['A', 'B'] },
      index: 1,
      answer: 'A',
      readOnly: true,
      onChange: noop,
    }));

    expect(rating).toContain('disabled=""');
    expect(rating).toContain('aria-checked="true"');
    expect(choice).toContain('checked=""');
    expect(choice).toContain('disabled=""');
  });

  it('renders text answers as read-only', () => {
    const markup = renderToStaticMarkup(createElement(QuestionnaireQuestion, {
      question: { id: 'text', title: 'Text', type: 'text', required: false, options: [], maxLength: 50 },
      index: 0,
      answer: 'Saved answer',
      readOnly: true,
      onChange: noop,
    }));

    expect(markup).toContain('readOnly=""');
    expect(markup).toContain('Saved answer');
  });
});
