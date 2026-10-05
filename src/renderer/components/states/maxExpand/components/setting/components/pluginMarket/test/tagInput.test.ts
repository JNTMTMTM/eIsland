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
 * @file tagInput.test.ts
 * @description TagInput 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TagInput } from '../TagInput';
import { elementProps, elements, findElement, invoke, resetState } from '../../../../../../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('TagInput', () => {
  it('normalizes duplicate chips and disables input at the tag limit', () => {
    const tree = TagInput({ value: ' Nature, nature，City ', onChange: vi.fn(), maxTags: 2 });
    const removeButtons = elements(tree).filter((node) => elementProps(node)['aria-label'] === 'settings.pluginMarket.tag.removeTag');
    expect(removeButtons).toHaveLength(2);
    expect(elementProps(findElement(tree, (node) => node.type === 'input')).disabled).toBe(true);
  });
  it('adds trimmed chips on Enter, suppresses duplicates, and removes the last chip with Backspace', () => {
    const onChange = vi.fn();
    resetState(['  Sky  ', [], false, -1]);
    let tree = TagInput({ onChange, value: 'Nature' });
    const preventDefault = vi.fn();
    invoke(findElement(tree, (node) => node.type === 'input'), 'onKeyDown', { preventDefault, key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('Nature,Sky');
    resetState(['nature', [], false, -1]);
    tree = TagInput({ onChange, value: 'Nature' });
    onChange.mockClear();
    invoke(findElement(tree, (node) => node.type === 'input'), 'onKeyDown', { preventDefault, key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    resetState(['', [], false, -1]);
    tree = TagInput({ onChange, value: 'Nature,City' });
    invoke(findElement(tree, (node) => node.type === 'input'), 'onKeyDown', { preventDefault, key: 'Backspace' });
    expect(onChange).toHaveBeenCalledWith('Nature');
  });
  it('does not react to keyboard submission while disabled', () => {
    resetState(['Sky', [], false, -1]);
    const onChange = vi.fn();
    invoke(findElement(TagInput({ onChange, value: '', disabled: true }), (node) => node.type === 'input'), 'onKeyDown', { key: 'Enter', preventDefault: vi.fn() });
    expect(onChange).not.toHaveBeenCalled();
  });
});
