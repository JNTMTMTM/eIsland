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
 * @file whitelistStep.test.ts
 * @description WhitelistStep 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WhitelistStep } from '../WhitelistStep';
import { elementProps, elements, invoke, resetState } from '../../../../../test/elementHarness';
const hooks = vi.hoisted(() => ({ selected: ['QQMusic.exe'], toggle: vi.fn() }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../hooks/useWhitelistSelect', () => ({ useWhitelistSelect: () => hooks }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('WhitelistStep', () => {
  it('renders configured selections and forwards player toggles', () => {
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const tree = WhitelistStep({ onNext, onPrev });
    const choices = elements(tree).filter((node) => node.type === 'button' && String(elementProps(node).className).startsWith('guide-whitelist-option'));
    expect(choices).toHaveLength(6);
    expect(elementProps(choices[0]).className).toContain('selected');
    expect(elementProps(choices[1]).className).not.toContain('selected');
    invoke(choices[1], 'onClick');
    expect(hooks.toggle).toHaveBeenCalledWith('cloudmusic.exe');
    hooks.selected = [];
    expect(elements(WhitelistStep({ onNext, onPrev })).filter((node) => node.type === 'button' && String(elementProps(node).className).includes('selected'))).toHaveLength(0);
  });
});
