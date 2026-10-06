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
 * @file languageSettingsPage.test.ts
 * @description LanguageSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageSettingsPage } from '../LanguageSettingsPage';
import { elementProps, elements, invoke, resetState, textContent } from '../../../../../../../../test/elementHarness';
import makeAppSettingsProps from './appSettingsFixture';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const api = {};
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  vi.stubGlobal('window', { api, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('LanguageSettingsPage', () => {
  it.each(['zh-CN', 'en-US', 'zh-TW', 'ja-JP'] as const)('marks %s active and forwards selections', (language) => {
    const props = makeAppSettingsProps();
    props.appLanguage = language;
    const tree = LanguageSettingsPage(props);
    const buttons = elements(tree).filter((node) => node.type === 'button');
    expect(buttons).toHaveLength(4);
    expect(buttons.filter((node) => String(elementProps(node).className).includes('active'))).toHaveLength(1);
    invoke(buttons[3], 'onClick');
    expect(props.applyAppLanguage).toHaveBeenCalledWith('ja-JP');
    expect(textContent(tree)).toContain(`settings.language.current.${language}`);
  });
});
