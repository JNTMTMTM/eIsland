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
 * @file thinkingReasoning.test.ts
 * @description ThinkingReasoning 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThinkingReasoning } from '../ThinkingReasoning';
import { elementProps, findElement, invoke, resetState, textContent } from '../../../../../test/elementHarness';
const hooks = vi.hoisted(() => ({ expanded: true, elapsedSeconds: null as number | null, viewportRef: { current: null }, toggle: vi.fn() }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../hooks/useThinkingReasoning', () => ({ useThinkingReasoning: () => hooks }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('ThinkingReasoning', () => {
  it('blocks toggling while thinking and keeps incoming text visible', () => {
    const tree = ThinkingReasoning({ content: 'Reasoning text', isThinking: true });
    const header = findElement(tree, (node) => node.type === 'button');
    expect(elementProps(header).onClick).toBeUndefined();
    expect(elementProps(header)['aria-expanded']).toBe(true);
    expect(textContent(tree)).toContain('Reasoning text');
    expect(textContent(tree)).toContain('aiChat.timeline.thinking.thinking');
  });
  it.each([null, 4])('supports collapsed completed thought with duration=%s', (elapsedSeconds) => {
    hooks.expanded = false;
    hooks.elapsedSeconds = elapsedSeconds;
    const tree = ThinkingReasoning({ content: '', isThinking: false });
    const header = findElement(tree, (node) => node.type === 'button');
    expect(elementProps(header)['aria-expanded']).toBe(false);
    invoke(header, 'onClick');
    expect(hooks.toggle).toHaveBeenCalledOnce();
    expect(textContent(tree).includes('aiChat.timeline.thinking.elapsed')).toBe(elapsedSeconds !== null);
  });
});
