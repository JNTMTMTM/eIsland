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
 * @file questionnaireBanner.test.ts
 * @description QuestionnaireBanner 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionnaireBanner } from '../QuestionnaireBanner';
import { elementProps, elements, invoke, resetState } from '../../../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('QuestionnaireBanner', () => {
  it.each([0, 3])('renders count=%s with independent open and dismiss actions', (count) => {
    const onOpen = vi.fn();
    const onDismiss = vi.fn();
    const tree = QuestionnaireBanner({ count, onOpen, onDismiss });
    expect(elementProps(tree).role).toBe('status');
    const buttons = elements(tree).filter((node) => node.type === 'button');
    expect(buttons).toHaveLength(2);
    invoke(buttons[0], 'onClick');
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
    invoke(buttons[1], 'onClick');
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
