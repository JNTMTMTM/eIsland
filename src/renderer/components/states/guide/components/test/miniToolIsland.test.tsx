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
 * @file miniToolIsland.test.tsx
 * @description MiniToolIsland 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, text } from '../../../test/tree';
import { MiniToolIsland } from '../MiniToolIsland';
import type { TreeElement } from '../../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));
vi.mock('../../../../../i18n', () => ({ default: { t: (key: string) => key } }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('MiniToolIsland', () => {
  it.each([['todo', 'mt-todo'], ['ai', 'mt-chat'], ['timer', 'mt-countdown'], ['pomodoro', 'mt-pomo']] as const)('renders %s demonstration', (demo, expected) => { const root = ((MiniToolIsland({ demo }) as TreeElement)); expect(byClass(root, expected)).toBeDefined(); });
  it('marks completed todo items using the demo tick', () => { slots.values = [2]; const root = ((MiniToolIsland({ demo: 'todo' }) as TreeElement)); expect(elements(root).filter((node) => String(node.props.className).startsWith('mt-todo-item') && String(node.props.className).includes('done'))).toHaveLength(2); });
  it('renders the initial and subsequent pomodoro clock', () => { expect(text(((MiniToolIsland({ demo: 'pomodoro' }) as TreeElement)))).toContain('25:00'); slots.cursor = 0; slots.values = [61]; expect(text(((MiniToolIsland({ demo: 'pomodoro' }) as TreeElement)))).toContain('23:59'); });
});
