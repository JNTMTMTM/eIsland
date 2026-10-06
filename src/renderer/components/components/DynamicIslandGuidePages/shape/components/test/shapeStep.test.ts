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
 * @file shapeStep.test.ts
 * @description ShapeStep 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShapeStep } from '../ShapeStep';
import { elementProps, elements, findElement, invoke, resetState } from '../../../../../test/elementHarness';
const hooks = vi.hoisted(() => ({ mode: 'notch', setMode: vi.fn() }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../hooks/useShapeSetting', () => ({ useShapeSetting: () => hooks }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('ShapeStep', () => {
  it.each(['notch', 'pill'])('renders both previews and selects %s', (mode) => {
    hooks.mode = mode;
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const tree = ShapeStep({ onNext, onPrev });
    const choices = elements(tree).filter((node) => String(elementProps(node).className).startsWith('guide-shape-card') && node.type === 'button');
    expect(choices).toHaveLength(2);
    expect(choices.filter((node) => String(elementProps(node).className).includes('selected'))).toHaveLength(1);
    invoke(choices[1], 'onClick');
    expect(hooks.setMode).toHaveBeenCalledWith('pill');
    const previews = elements(tree).filter((node) => typeof node.type === 'function');
    expect(previews).toHaveLength(2);
    invoke(findElement(tree, (node) => elementProps(node).className === 'guide-prev-btn'), 'onClick');
    expect(onPrev).toHaveBeenCalledOnce();
  });
});

it('executes both actual preview components in the rendered markup', () => {
  const markup = renderToStaticMarkup(ShapeStep({ onNext: vi.fn(), onPrev: vi.fn() }));
  expect(markup).toContain('guide-shape-preview-svg');
  expect(markup).toContain('M30 0 H90');
});
