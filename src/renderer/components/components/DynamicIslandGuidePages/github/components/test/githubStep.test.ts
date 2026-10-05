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
 * @file githubStep.test.ts
 * @description GithubStep 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubStep } from '../GithubStep';
import { elementProps, elements, findElement, invoke, resetState } from '../../../../../test/elementHarness';
const api = vi.hoisted(() => ({ clipboardOpenUrl: vi.fn(() => Promise.resolve()) }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  vi.stubGlobal('window', { api });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('GithubStep', () => {
  it('opens repository URLs through Electron and suppresses native anchor navigation', () => {
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const tree = GithubStep({ onNext, onPrev });
    const links = elements(tree).filter((node) => elementProps(node).className === 'guide-github-link-btn');
    expect(links).toHaveLength(4);
    invoke(links[0], 'onClick');
    expect(api.clipboardOpenUrl).toHaveBeenCalledWith('https://github.com/JNTMTMTM/eIsland');
    const anchor = findElement(tree, (node) => node.type === 'a');
    const preventDefault = vi.fn();
    invoke(anchor, 'onClick', { preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(api.clipboardOpenUrl).toHaveBeenLastCalledWith(elementProps(anchor).href);
  });
});
