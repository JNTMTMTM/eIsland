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
 * @file indexSettingsSearch.test.ts
 * @description indexSettingsSearch 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IndexSettingsSearch from '../indexSettingsSearch';
import { elementProps, elements, findElement, invoke, resetState, rewindState, textContent } from '../../../../../../../test/elementHarness';
import type { ReactElement, ComponentProps } from 'react';
const render = (props: ComponentProps<typeof IndexSettingsSearch>): ReactElement => (IndexSettingsSearch as unknown as {
  type: (value: ComponentProps<typeof IndexSettingsSearch>) => ReactElement;
}).type(props);
/**
 * 构造隔离设置状态和可观察回调的完整配置。
 * @returns 配置状态及可观察回调。
 */
function makeProps(): ComponentProps<typeof IndexSettingsSearch> {
  return {
    setAppSettingsPage: vi.fn(),
    setMusicSettingsPage: vi.fn(),
    setAiSettingsPage: vi.fn(),
    setNetworkSettingsPage: vi.fn(),
    setActiveTab: vi.fn(),
    onAction: vi.fn(),
  };
}
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../../utils/settingsConfig', () => ({ SETTINGS_TAB_ICONS: {}, SEARCHABLE_SETTINGS: [{ label: 'Theme', desc: 'Appearance', tab: 'app', appPage: 'theme' }, { label: 'Lyrics', desc: 'Music', tab: 'music', musicPage: 'lyrics' }, { label: 'AI', desc: 'Models', tab: 'ai', aiPage: 'general' }, { label: 'Network', desc: 'Timeout', tab: 'network', networkPage: 'timeout' }, { label: 'Open', desc: 'Action', tab: 'index', actionId: 'open' }] }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('indexSettingsSearch', () => {
  it.each([{ query: 'theme', callback: 'setAppSettingsPage', value: 'theme' }, { query: 'LYRICS', callback: 'setMusicSettingsPage', value: 'lyrics' }, { query: 'models', callback: 'setAiSettingsPage', value: 'general' }, { query: 'timeout', callback: 'setNetworkSettingsPage', value: 'timeout' }, { query: 'action', callback: 'onAction', value: 'open' }] as const)('searches label or description $query and dispatches navigation', ({ query, callback, value }) => {
    const props = makeProps();
    const initial = render(props);
    expect(elements(initial).some((n) => elementProps(n).className === 'settings-index-search-dropdown')).toBe(false);
    invoke(findElement(initial, (n) => n.type === 'input'), 'onChange', { target: { value: query } });
    rewindState();
    const results = render(props);
    invoke(findElement(results, (n) => elementProps(n).className === 'settings-index-search-dropdown-item'), 'onClick');
    expect(props[callback]).toHaveBeenCalledWith(value);
    rewindState();
    expect(elementProps(findElement(render(props), (n) => n.type === 'input')).value).toBe('');
  });
  it('shows unmatched query, clears it and falls back to tab when optional callback is absent', () => {
    const props = { ...makeProps(), setAiSettingsPage: undefined };
    resetState(['missing', true]);
    expect(textContent(render(props))).toContain('settings.index.searchEmpty');
    resetState(['AI', true]);
    const tree = render(props);
    invoke(findElement(tree, (n) => elementProps(n).className === 'settings-index-search-dropdown-item'), 'onClick');
    expect(props.setActiveTab).toHaveBeenCalledWith('ai');
    resetState(['missing', true]);
    invoke(findElement(render(props), (n) => elementProps(n).className === 'settings-index-search-clear'), 'onClick');
    rewindState();
    expect(elementProps(findElement(render(props), (n) => n.type === 'input')).value).toBe('');
  });
});
