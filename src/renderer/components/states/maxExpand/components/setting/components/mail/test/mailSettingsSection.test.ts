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
 * @file mailSettingsSection.test.ts
 * @description MailSettingsSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MailSettingsSection } from '../MailSettingsSection';
import { elementProps, elements, findElement, invoke, resetState, rewindState, textContent } from '../../../../../../../test/elementHarness';
import type { ComponentProps } from 'react';
const account = { id: 'a', label: 'Work', emailAddress: 'name@example.com', imapHost: 'imap.example.com', imapPort: '993', imapSecure: true, authUser: 'name@example.com', authSecret: 'secret' };
/**
 * 构造隔离设置状态和可观察回调的完整配置。
 * @returns 配置状态及可观察回调。
 */
function makeProps(): ComponentProps<typeof MailSettingsSection> {
  return {
    currentMailSettingsPageLabel: '',
    mailSettingsPage: 'account',
    mailAccounts: [],
    activeMailAccountId: '',
    setMailAccounts: vi.fn(),
    setActiveMailAccountId: vi.fn(),
    mailFetchLimit: 10,
    setMailFetchLimit: vi.fn(),
    mailSettingsPages: [],
    mailSettingsPageLabels: { account: 'Account', imap: 'IMAP', preferences: 'Prefs' },
    setMailSettingsPage: vi.fn(),
  };
}
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
describe('MailSettingsSection', () => {
  it('renders empty account state and adds an initialized active account', () => {
    const props = makeProps();
    const tree = MailSettingsSection(props);
    expect(elements(tree).filter((n) => n.type === 'input')).toHaveLength(0);
    invoke(findElement(tree, (n) => elementProps(n).className === 'settings-mail-account-tab-add'), 'onClick');
    expect(props.setMailAccounts).toHaveBeenCalledWith([expect.objectContaining({ imapPort: '993', imapSecure: true, emailAddress: '' })]);
    expect(props.setActiveMailAccountId).toHaveBeenCalledWith(expect.any(String));
  });
  it('edits only active account, removes it and caps account tabs at five', () => {
    const second = { ...account, id: 'b', label: 'Personal' };
    const props = { ...makeProps(), mailAccounts: [account, second], activeMailAccountId: 'a' };
    const tree = MailSettingsSection(props);
    invoke(findElement(tree, (n) => n.type === 'input' && elementProps(n).value === 'Work'), 'onChange', { target: { value: 'Updated' } });
    expect(props.setMailAccounts).toHaveBeenLastCalledWith([{ ...account, label: 'Updated' }, second]);
    invoke(findElement(tree, (n) => elementProps(n).className === 'settings-mail-account-tab-remove'), 'onClick');
    expect(props.setMailAccounts).toHaveBeenLastCalledWith([second]);
    expect(props.setActiveMailAccountId).toHaveBeenLastCalledWith('b');
    resetState();
    const full = MailSettingsSection({ ...props, mailAccounts: [0, 1, 2, 3, 4].map((i) => ({ ...account, id: String(i) })) });
    expect(elements(full).some((n) => elementProps(n).className === 'settings-mail-account-tab-add')).toBe(false);
  });
  it('applies QQ IMAP preset preserving local email name', () => {
    const props = { ...makeProps(), mailSettingsPage: 'imap' as const, mailAccounts: [account], activeMailAccountId: 'a' };
    const tree = MailSettingsSection(props);
    invoke(findElement(tree, (n) => elementProps(n).className === 'settings-mail-preset-trigger'), 'onClick');
    rewindState();
    const opened = MailSettingsSection(props);
    invoke(findElement(opened, (n) => elementProps(n).className === 'settings-mail-preset-option' && textContent(n).includes('imap.qq.com')), 'onClick');
    expect(props.setMailAccounts).toHaveBeenCalledWith([{ ...account, emailAddress: 'name@qq.com', authUser: 'name@qq.com', imapHost: 'imap.qq.com' }]);
  });
  it.each([{ input: '0', expected: 1 }, { input: '40', expected: 30 }, { input: '3.8', expected: 3 }, { input: 'invalid', expected: 1 }])('clamps fetch limit $input', ({ input, expected }) => {
    const props = { ...makeProps(), mailSettingsPage: 'preferences' as const, mailAccounts: [account] };
    const tree = MailSettingsSection(props);
    invoke(findElement(tree, (n) => n.type === 'input' && elementProps(n).type === 'number'), 'onChange', { target: { value: input } });
    expect(props.setMailFetchLimit).toHaveBeenCalledWith(expected);
  });
});
