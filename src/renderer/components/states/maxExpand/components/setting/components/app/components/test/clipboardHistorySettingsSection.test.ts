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
 * @file clipboardHistorySettingsSection.test.ts
 * @description ClipboardHistorySettingsSection 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClipboardHistorySettingsSection } from '../ClipboardHistorySettingsSection';
import { elementProps, findElement, invoke, resetState, rewindState, textContent } from '../../../../../../../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const api = {
  storeRead: vi.fn(() => Promise.resolve(true)),
  storeWrite: vi.fn(() => Promise.resolve(true)),
};
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  api.storeWrite?.mockResolvedValue(true);
  vi.stubGlobal('window', { api, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('ClipboardHistorySettingsSection', () => {
  it('renders default limit and toggles history recording', () => {
    const tree = ClipboardHistorySettingsSection();
    invoke(findElement(tree, (node) => elementProps(node).type === 'checkbox'), 'onChange', { target: { checked: false } });
    expect(api.storeWrite).toHaveBeenCalledWith('clipboard-history-enabled', false);
    invoke(findElement(tree, (node) => node.type === 'button' && textContent(node) === 'settings.clipboardHistory.limit.options.50'), 'onClick');
    expect(api.storeWrite).toHaveBeenCalledWith('clipboard-history-limit', 50);
  });
  it('clears both persisted copies and shows completion feedback', async () => {
    const removeItem = vi.fn();
    vi.stubGlobal('localStorage', { removeItem });
    invoke(findElement(ClipboardHistorySettingsSection(), (node) => node.type === 'button' && textContent(node) === 'settings.clipboardHistory.actions.clear'), 'onClick');
    await Promise.resolve();
    rewindState();
    expect(removeItem).toHaveBeenCalledWith('eIsland_clipboard_history_recent');
    expect(api.storeWrite).toHaveBeenCalledWith('clipboard-history-recent', []);
    expect(textContent(ClipboardHistorySettingsSection())).toContain('settings.clipboardHistory.messages.clearSuccess');
  });
});
