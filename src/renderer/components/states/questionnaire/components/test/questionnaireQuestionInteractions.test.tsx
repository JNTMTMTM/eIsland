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
 * @file questionnaireQuestionInteractions.test.tsx
 * @description QuestionnaireQuestion interactions 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { elements, find, invoke } from '../../../test/tree';

import { QuestionnaireQuestion } from '../QuestionnaireQuestion';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));

function question(type: Parameters<typeof QuestionnaireQuestion>[0]['question']['type']) { return { type, id: 'q', title: 'Question', required: true, options: ['A', 'B'] }; }
describe('QuestionnaireQuestion interactions', () => {
  it('renders bounded rating options and forwards the selected numeric value', () => { const onChange = vi.fn(); const root = ((QuestionnaireQuestion({ onChange, question: { ...question('rating'), min: 1, max: 3 }, index: 0, answer: 2 }) as TreeElement)); const radios = elements(root).filter((node) => node.props.role === 'radio'); expect(radios).toHaveLength(3); expect(radios[1].props['aria-checked']).toBe(true); invoke(radios[2], 'onClick'); expect(onChange).toHaveBeenCalledWith(3); });
  it('forwards single-choice values and marks selected option', () => { const onChange = vi.fn(); const root = ((QuestionnaireQuestion({ onChange, question: question('single_choice'), index: 1, answer: 'A' }) as TreeElement)); const inputs = elements(root).filter((node) => node.type === 'input'); expect(inputs[0].props.checked).toBe(true); invoke(inputs[1], 'onChange'); expect(onChange).toHaveBeenCalledWith('B'); });
  it('adds and removes multiple-choice values without mutating the previous answer', () => { const answer = ['A']; const onChange = vi.fn(); const root = ((QuestionnaireQuestion({ answer, onChange, question: question('multiple_choice'), index: 0 }) as TreeElement)); const inputs = elements(root).filter((node) => node.type === 'input'); invoke(inputs[0], 'onChange'); invoke(inputs[1], 'onChange'); expect(onChange.mock.calls).toEqual([[[]], [['A', 'B']]]); expect(answer).toEqual(['A']); });
  it('normalizes nontext answer and forwards text updates with configured limit', () => { const onChange = vi.fn(); const root = ((QuestionnaireQuestion({ onChange, question: { ...question('text'), maxLength: 50 }, index: 0, answer: 2 }) as TreeElement)); const textarea = find(root, (node) => node.type === 'textarea'); expect(textarea.props).toMatchObject({ value: '', maxLength: 50 }); invoke(textarea, 'onChange', { target: { value: 'Words' } }); expect(onChange).toHaveBeenCalledWith('Words'); });
  it('guards read-only event callbacks and optional missing onChange', () => { const onChange = vi.fn(); const root = ((QuestionnaireQuestion({ onChange, question: question('rating'), index: 0, readOnly: true }) as TreeElement)); invoke(find(root, (node) => node.props.role === 'radio'), 'onClick'); expect(onChange).not.toHaveBeenCalled(); expect(() => invoke(find(((QuestionnaireQuestion({ question: question('rating'), index: 0 }) as TreeElement)), (node) => node.props.role === 'radio'), 'onClick')).not.toThrow(); });
  it('非数组多选答案作为空选择，缺失文本上限回退并保留已输入长度', () => {
    const onChange = vi.fn();
    const multiple = QuestionnaireQuestion({ onChange, question: question('multiple_choice'), index: 0, answer: 'old' });
    invoke(find(multiple, (node) => node.type === 'input'), 'onChange');
    expect(onChange).toHaveBeenCalledWith(['A']);
    const root = QuestionnaireQuestion({ question: question('text'), index: 0, answer: 'hello' });
    expect(find(root, (node) => node.type === 'textarea').props).toMatchObject({ value: 'hello', maxLength: 2000 });
  });

});
