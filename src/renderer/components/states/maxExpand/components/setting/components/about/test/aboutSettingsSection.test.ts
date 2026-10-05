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
 * @file aboutSettingsSection.test.ts
 * @description AboutSettingsSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AboutSettingsSection } from '../AboutSettingsSection';
import { elementProps, findElement, invoke, resetState, textContent } from '../../../../../../../test/elementHarness';
const api = vi.hoisted(() => ({ clipboardOpenUrl: vi.fn(() => Promise.resolve()) }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../../../../../../../utils/userAccount', () => ({ readLocalToken: () => null, readLocalProfile: () => null, subscribeUserAccountSessionChanged: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  vi.stubGlobal('window', { api });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('AboutSettingsSection', () => {
  it('renders version and project attribution', () => { const tree = AboutSettingsSection({ aboutVersion: '1.2.3' }); expect(textContent(tree)).toContain('1.2.3'); expect(textContent(tree)).toContain('eIsland'); });
  it('gates feedback and history for an unauthenticated account', () => {
    const feedback = AboutSettingsSection({ aboutVersion: '', initialPage: 'feedback' });
    expect(textContent(feedback)).toContain('settings.about.feedback.messages.loginRequired');
    resetState();
    const history = AboutSettingsSection({ aboutVersion: '', initialPage: 'feedbackHistory' });
    expect(textContent(history)).toContain('settings.about.feedback.history.loginHint');
    expect(elementProps(findElement(history, (n) => n.type === 'button' && textContent(n) === 'settings.about.feedback.actions.refresh')).disabled).toBe(true);
  });
  it('opens GitHub feedback for an authenticated account', () => {
    resetState(['feedback', false, 'opaque']);
    const tree = AboutSettingsSection({ aboutVersion: '', initialPage: 'feedback' });
    invoke(findElement(tree, (n) => elementProps(n).className === 'settings-user-secondary-btn settings-about-feedback-issue-btn'), 'onClick');
    expect(api.clipboardOpenUrl).toHaveBeenCalledWith('https://github.com/JNTMTMTM/eIsland/issues/new');
  });
});
