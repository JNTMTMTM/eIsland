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
 * @file urlParserSettingsPage.test.ts
 * @description UrlParserSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UrlParserSettingsPage } from '../UrlParserSettingsPage';
import { findElement, invoke, resetState, rewindState, textContent } from '../../../../../../../../test/elementHarness';
import makeAppSettingsProps from './appSettingsFixture';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const api = {
  clipboardUrlBlacklistSet: vi.fn(() => Promise.resolve(true)),
  clipboardUrlMonitorSet: vi.fn(() => Promise.resolve(true)),
  clipboardUrlDetectModeSet: vi.fn(() => Promise.resolve(true)),
  storeWrite: vi.fn(() => Promise.resolve(true)),
};
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  api.storeWrite.mockResolvedValue(true);
  vi.stubGlobal('window', { api, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('UrlParserSettingsPage', () => {
  it('rejects empty and duplicate domains with actionable error rendering', () => {
    const props = makeAppSettingsProps();
    invoke(findElement(UrlParserSettingsPage(props), (node) => node.type === 'button' && textContent(node) === 'settings.app.urlParser.addDomain'), 'onClick');
    rewindState();
    expect(textContent(UrlParserSettingsPage(props))).toContain('settings.app.urlParser.errors.invalidDomain');
    props.clipboardUrlBlacklist.push('example.com');
    resetState(['https://example.com/path', '']);
    invoke(findElement(UrlParserSettingsPage(props), (node) => node.type === 'button' && textContent(node) === 'settings.app.urlParser.addDomain'), 'onClick');
    rewindState();
    expect(textContent(UrlParserSettingsPage(props))).toContain('settings.app.urlParser.errors.domainExists');
    expect(props.setClipboardUrlBlacklist).not.toHaveBeenCalled();
  });
  it('normalizes URL to domain and saves a new entry', () => {
    const props = makeAppSettingsProps();
    resetState([' HTTPS://EXAMPLE.COM/path ', '']);
    invoke(findElement(UrlParserSettingsPage(props), (node) => node.type === 'button' && textContent(node) === 'settings.app.urlParser.addDomain'), 'onClick');
    expect(props.setClipboardUrlBlacklist).toHaveBeenCalledWith(['example.com']);
    expect(api.clipboardUrlBlacklistSet).toHaveBeenCalledWith(['example.com']);
  });
});
