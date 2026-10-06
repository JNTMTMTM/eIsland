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
 * @file todoList.test.ts
 * @description TodoList 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TodoList } from '../TodoList';
import { elementProps, elements, findElement, invoke, resetState, rewindState, textContent } from '../../../../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('TodoList', () => {
  it('omits an empty task list', () => {
    expect(elements(TodoList({ items: [] })).filter((node) => node.type === 'section')).toHaveLength(0);
  });
  it('renders all task states and toggles the actual list collapse state', () => {
    const items = [{ id: 'done', content: 'Done', status: 'completed' }, { id: 'active', content: 'Running', status: 'in_progress' }, { id: 'pending', content: 'Waiting', status: 'pending' }] as const;
    const tree = TodoList({ items: [...items], turn: 2 });
    expect(textContent(tree)).toContain('#2');
    expect(elements(tree).filter((node) => node.type === 'li')).toHaveLength(3);
    const header = findElement(tree, (node) => node.type === 'button');
    expect(elementProps(header)['aria-expanded']).toBe(true);
    invoke(header, 'onClick');
    rewindState();
    expect(elementProps(findElement(TodoList({ items: [...items], turn: 0 }), (node) => node.type === 'button'))['aria-expanded']).toBe(false);
    expect(textContent(tree)).toContain('Running');
  });
  it('starts a fully completed list collapsed and omits nonpositive turn badges', () => {
    const tree = TodoList({ items: [{ id: 'done', content: 'Done', status: 'completed' }], turn: 0 });
    expect(elementProps(findElement(tree, (node) => node.type === 'button'))['aria-expanded']).toBe(false);
    expect(textContent(tree)).not.toContain('#0');
  });
});
