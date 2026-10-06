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
 * @file mailSettingsInteractions.test.ts
 * @description 邮件设置真实账户字段、预设、切换与公开账户数组边界回归。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MailSettingsSection } from '../MailSettingsSection';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle } from '../../app/components/test/themeHookHarness';
import type { ComponentProps } from 'react';
vi.mock('react', async (original) => ({ ...(await original<typeof import('react')>()), ...(await import('../../../../../../../test/elementHarness')).hookMocks, ...(await import('../../app/components/test/themeHookHarness')).lifecycleHooks }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
/**
 * 创建符合组件公开契约的独立输入。
 * @returns 完整设置状态与可观察回调。
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

beforeEach(() => { resetLifecycle(); vi.clearAllMocks(); });
/**
 * 执行实际邮件设置并保留导航与预设展开状态。
 * @param props - 公开邮件输入。
 * @returns 实际元素树。
 */
function render(props: ComponentProps<typeof MailSettingsSection>) { return renderWithHooks(() => MailSettingsSection(props)); }
const account = { id: 'a', label: '', emailAddress: '', imapHost: '', imapPort: '993', imapSecure: true, authUser: '', authSecret: '' };
describe('实际邮件账户与字段操作', () => {
  it('全部账户字段及 IMAP 输入只改活动账户并保留其他账户', () => {
    const props = makeProps(); const other = { ...account, id: 'b', label: 'Other' }; props.mailAccounts = [account, other]; props.activeMailAccountId = 'missing';
    const inputs = elements(render(props)).filter((node) => node.type === 'input');
    ['label', 'emailAddress', 'authUser', 'authSecret'].forEach((key, index) => {
      invoke(inputs[index], 'onChange', { target: { value: `${key}-updated` } });
      expect(props.setMailAccounts).toHaveBeenLastCalledWith([{ ...account, [key]: `${key}-updated` }, other]);
    });
    props.mailSettingsPage = 'imap'; const imap = elements(render(props)).filter((node) => node.type === 'input');
    invoke(imap[0], 'onChange', { target: { value: 'imap.test' } }); expect(props.setMailAccounts).toHaveBeenLastCalledWith([{ ...account, imapHost: 'imap.test' }, other]);
    invoke(imap[1], 'onChange', { target: { value: '143' } }); expect(props.setMailAccounts).toHaveBeenLastCalledWith([{ ...account, imapPort: '143' }, other]);
    invoke(imap[2], 'onChange', { target: { checked: false } }); expect(props.setMailAccounts).toHaveBeenLastCalledWith([{ ...account, imapSecure: false }, other]);
  });
  it.each([' user@example.com ', ''])('预设操作邮件名%o时更新服务器并按需修改邮箱', (email) => {
    const props = makeProps(); props.mailSettingsPage = 'imap'; props.activeMailAccountId = 'a'; const current = { ...account, emailAddress: email }; const other = { ...account, id: 'b' }; props.mailAccounts = [current, other];
    invoke(findElement(render(props), (node) => elementProps(node).className === 'settings-mail-preset-trigger'), 'onClick');
    const options = elements(render(props)).filter((node) => elementProps(node).className === 'settings-mail-preset-option'); expect(options).toHaveLength(10);
    invoke(options[9], 'onClick');
    const expected = { ...current, imapHost: 'imap.gmail.com', ...(email ? { emailAddress: 'user@gmail.com', authUser: 'user@gmail.com' } : {}) };
    expect(props.setMailAccounts).toHaveBeenCalledWith([expected, other]);
    expect(elements(render(props)).some((node) => elementProps(node).className === 'settings-mail-preset-dropdown')).toBe(false);
  });
  it('标签按备注、邮箱或未命名兜底展示，切换和移除非活动账户不改变活动编号', () => {
    const props = makeProps(); props.mailAccounts = [{ ...account, label: 'Work' }, { ...account, id: 'b', emailAddress: 'b@example.com' }, { ...account, id: 'c' }]; props.activeMailAccountId = 'a';
    const tree = render(props); const tabs = elements(tree).filter((node) => elementProps(node).className === 'settings-mail-account-tab-btn');
    expect(tabs.map(textContent)).toEqual(['Work', 'b@example.com', 'settings.mail.accounts.unnamed']); invoke(tabs[1], 'onClick'); expect(props.setActiveMailAccountId).toHaveBeenCalledWith('b');
    const remove = elements(tree).filter((node) => elementProps(node).className === 'settings-mail-account-tab-remove'); invoke(remove[1], 'onClick');
    expect(props.setMailAccounts).toHaveBeenCalledWith([props.mailAccounts[0], props.mailAccounts[2]]); expect(props.setActiveMailAccountId).toHaveBeenCalledOnce();
  });
  it('公开数组在点击前达到最大账户数时实际新增回调拒绝继续新增', () => {
    const props = makeProps(); const add = findElement(render(props), (node) => elementProps(node).className === 'settings-mail-account-tab-add');
    props.mailAccounts.push(...Array.from({ length: 5 }, (value, index) => { void value; return { ...account, id: String(index) }; }));
    invoke(add, 'onClick'); expect(props.setMailAccounts).not.toHaveBeenCalled(); expect(props.setActiveMailAccountId).not.toHaveBeenCalled();
  });
  it('导航展开与收起执行真实函数式 updater', () => {
    const props = makeProps(); props.mailAccounts = [account];
    invoke(findElement(render(props), (node) => typeof elementProps(node).onToggle === 'function'), 'onToggle');
    expect(elementProps(findElement(render(props), (node) => typeof elementProps(node).onToggle === 'function')).label).toBe('settings.navigation.collapse');
    invoke(findElement(render(props), (node) => typeof elementProps(node).onToggle === 'function'), 'onToggle');
    expect(elementProps(findElement(render(props), (node) => typeof elementProps(node).onToggle === 'function')).expanded).toBe(false);
  });
});

it('移除回调执行前公开数组仅剩当前账户时清空活动账户', () => {
  const props = makeProps(); props.mailAccounts = [account, { ...account, id: 'b' }]; props.activeMailAccountId = 'a';
  const remove = findElement(render(props), (node) => elementProps(node).className === 'settings-mail-account-tab-remove');
  props.mailAccounts.splice(1, 1); invoke(remove, 'onClick');
  expect(props.setMailAccounts).toHaveBeenCalledWith([]); expect(props.setActiveMailAccountId).toHaveBeenCalledWith('');
});
