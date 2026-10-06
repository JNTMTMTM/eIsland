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
 * @file welcomeStep.test.ts
 * @description WelcomeStep 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WelcomeStep } from '../WelcomeStep';
import { elementProps, elements, findElement, invoke, resetState, textContent } from '../../../../../test/elementHarness';
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
describe('WelcomeStep', () => {
  it('renders an autoplay preview and routes previous and completion actions separately', () => {
    const onComplete = vi.fn();
    const onPrev = vi.fn();
    const tree = WelcomeStep({ onComplete, onPrev });
    expect(elementProps(findElement(tree, (node) => node.type === 'video'))).toMatchObject({ src: '../video/sign.webm', autoPlay: true, muted: true, playsInline: true });
    expect(textContent(tree)).toContain('guide.welcome.title');
    const buttons = elements(tree).filter((node) => node.type === 'button');
    invoke(buttons[0], 'onClick');
    expect(onPrev).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
    invoke(buttons[1], 'onClick');
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
