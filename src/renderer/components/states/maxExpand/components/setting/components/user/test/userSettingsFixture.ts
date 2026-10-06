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
 * @file userSettingsFixture.ts
 * @description 用户中心私有真实组件/生命周期输入与叶接口测试环境。
 * @author 鸡哥
 */

import { vi } from 'vitest';
import { UserSettingsSection } from '../UserSettingsSection';
import { elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../app/components/test/themeHookHarness';
import type { UserAccountProfile } from '../../../../../../../../utils/userAccount';
import type { Mock } from 'vitest';
const apiNames = ['closeUserPaymentOrder', 'deleteImageTranslationHistory', 'deleteOcrHistory', 'fetchUserPaymentOrders', 'fetchProMonthPricing', 'fetchAgentBalance', 'fetchImageTranslationHistory', 'fetchOcrHistory', 'fetchOAuthBindings', 'fetchUserProfile', 'logoutUser', 'refreshUserToken', 'sendUserEmailCode', 'unbindOAuth', 'unregisterUser', 'updateUserPassword', 'updateUserProfile', 'uploadUserAvatar', 'fetchQuestionnaireHistory', 'deleteQuestionnaireHistory'] as const;
type ApiName = typeof apiNames[number];
type ApiMock = Mock<(...args: unknown[]) => Promise<unknown>>;
const mocks = vi.hoisted(() => ({
  api: {} as Record<ApiName, ApiMock>,
  token: null as string | null,
  profile: null as UserAccountProfile | null,
  listener: null as (() => void) | null,
  unsubscribe: vi.fn(),
  writeProfile: vi.fn<(profile: UserAccountProfile) => void>(),
  writeToken: vi.fn<(token: string) => void>(),
  clear: vi.fn(),
  captcha: vi.fn<(account: string) => Promise<unknown>>(),
  t: vi.fn<(key: string, options?: Record<string, unknown>) => string>((key) => key),
  store: {
    setLogin: vi.fn(),
    setRegister: vi.fn(),
    setPayment: vi.fn(),
    setQuestionnaire: vi.fn()
  },
  reminder: {
    questionnaire: null as Record<string, unknown> | null,
    count: 0,
    dismiss: vi.fn(),
    reload: vi.fn<() => Promise<void>>(() => Promise.resolve())
  },
  recordDay: vi.fn(),
  language: 'en-US'
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../app/components/test/themeHookHarness')).lifecycleHooks
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mocks.t,
    i18n: {
      resolvedLanguage: mocks.language,
      language: 'zh-CN'
    }
  })
}));
vi.mock('../../../../../../../../api/user/userAccountApi', () => ({
  ...Object.fromEntries(['closeUserPaymentOrder', 'deleteImageTranslationHistory', 'deleteOcrHistory', 'fetchUserPaymentOrders', 'fetchProMonthPricing', 'fetchAgentBalance', 'fetchImageTranslationHistory', 'fetchOcrHistory', 'fetchOAuthBindings', 'fetchUserProfile', 'logoutUser', 'refreshUserToken', 'sendUserEmailCode', 'unbindOAuth', 'unregisterUser', 'updateUserPassword', 'updateUserProfile', 'uploadUserAvatar'].map((name) => {
    const callback = vi.fn<(...args: unknown[]) => Promise<unknown>>();
    mocks.api[name as ApiName] = callback;
    return [name, callback];
  })),
  PAYMENT_ORDERS_DEFAULT_PAGE_SIZE: 5
}));
vi.mock('../../../../../../../../api/questionnaire/questionnaireApi', () => {
  mocks.api.fetchQuestionnaireHistory = vi.fn();
  mocks.api.deleteQuestionnaireHistory = vi.fn();
  return {
    fetchQuestionnaireHistory: mocks.api.fetchQuestionnaireHistory,
    deleteQuestionnaireHistory: mocks.api.deleteQuestionnaireHistory
  };
});
vi.mock('../../../../../../../../utils/sliderCaptcha', () => ({
  runSliderCaptcha: mocks.captcha
}));
vi.mock('../../../../../../../../utils/userAccount', () => ({
  readLocalToken: () => mocks.token,
  readLocalProfile: () => mocks.profile,
  writeLocalProfile: mocks.writeProfile,
  writeLocalToken: mocks.writeToken,
  clearLocalAccount: mocks.clear,
  subscribeUserAccountSessionChanged: (callback: () => void) => {
    mocks.listener = callback;
    return mocks.unsubscribe;
  }
}));
vi.mock('../../../../../../../../store/slices', () => ({
  default: () => mocks.store
}));
vi.mock('../../../../../../../components/DynamicIslandQuestionnaireBanner', () => ({
  QuestionnaireBanner: () => null,
  useAnnouncementQuestionnaire: () => mocks.reminder
}));
vi.mock('../utils/loginHeatmapStorage', () => ({
  readLoginDays: () => new Set(['2026-10-06']),
  recordLoginDay: mocks.recordDay
}));
export const transport = {
  downloadPickSavePath: vi.fn<(name: string) => Promise<string | null>>(),
  downloadStart: vi.fn<(options: unknown) => Promise<unknown>>(),
  clipboardOpenUrl: vi.fn<(url: string) => Promise<void>>(),
  copy: vi.fn<(text: string) => Promise<void>>()
};
export const profile: UserAccountProfile = {
  username: 'reader',
  email: 'Reader@Example.com',
  avatar: null,
  gender: 'undisclosed',
  genderCustom: null,
  birthday: null,
  createdAt: '2026-01-01T08:00:00',
  balanceFen: 1234,
  proExpireAt: null
};
type Page = NonNullable<Parameters<typeof UserSettingsSection>[0]['initialProfilePage']>;
let initialPage: Page = 'info';
/**
 * 建立独立账号、接口和浏览器叶服务环境。
 * @returns 无返回值。
 */
export function setupUser(): void {
  vi.resetAllMocks();
  resetLifecycle();
  mocks.t.mockImplementation((key) => key);
  mocks.token = 'opaque';
  mocks.profile = {
    ...profile
  };
  mocks.listener = null;
  mocks.language = 'en-US';
  mocks.reminder.questionnaire = null;
  mocks.reminder.count = 0;
  mocks.reminder.reload.mockResolvedValue();
  apiNames.forEach((name) => {
    mocks.api[name].mockResolvedValue({
      ok: true,
      data: undefined
    });
  });
  mocks.api.fetchUserProfile.mockResolvedValue({
    ok: true,
    data: {
      ...profile
    }
  });
  mocks.api.fetchProMonthPricing.mockResolvedValue({
    ok: false
  });
  mocks.api.fetchAgentBalance.mockResolvedValue({
    ok: true,
    data: {
      balanceYuan: '12.34'
    }
  });
  ['fetchUserPaymentOrders', 'fetchImageTranslationHistory', 'fetchOcrHistory'].forEach((name) => {
    mocks.api[name as ApiName].mockResolvedValue({
      ok: true,
      data: {
        items: [],
        page: 1,
        total: 0,
        totalPages: 0
      }
    });
  });
  mocks.api.fetchOAuthBindings.mockResolvedValue({
    ok: true,
    data: []
  });
  mocks.api.fetchQuestionnaireHistory.mockResolvedValue({
    ok: true,
    data: []
  });
  mocks.api.refreshUserToken.mockResolvedValue({
    ok: true,
    data: {
      token: 'fresh-token'
    }
  });
  mocks.captcha.mockResolvedValue({
    ticket: 'ticket',
    randstr: 'rand',
    sign: 'sign'
  });
  transport.downloadPickSavePath.mockResolvedValue('C:/download/image.jpg');
  transport.downloadStart.mockResolvedValue({
    ok: true
  });
  transport.clipboardOpenUrl.mockResolvedValue();
  transport.copy.mockResolvedValue();
  vi.stubGlobal('window', {
    api: transport,
    atob: (value: string) => Buffer.from(value, 'base64').toString('utf8'),
    setTimeout: (callback: () => void, delay: number) => globalThis.setTimeout(callback, delay),
    clearTimeout: (timer: ReturnType<typeof setTimeout>) => globalThis.clearTimeout(timer)
  });
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: transport.copy
    }
  });
  initialPage = 'info';
}
/**
 * 等待实际组件异步操作链。
 * @returns 异步队列完成。
 */
export async function settleUser(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/**
 * 执行真实组件，保留局部状态和 ref。
 * @returns 实际元素树。
 */
export function renderUser(): ReturnType<typeof UserSettingsSection> {
  return renderWithHooks(() => UserSettingsSection({
    initialProfilePage: initialPage
  }));
}
/**
 * 挂载并执行实际账号/页面读取 effect。
 * @param page - 初始用户中心页。
 * @returns 已加载的实际元素树。
 */
export async function bootUser(page: Page = 'info'): Promise<ReturnType<typeof UserSettingsSection>> {
  initialPage = page;
  renderUser();
  runEffects();
  await settleUser();
  renderUser();
  runEffects();
  await settleUser();
  return renderUser();
}
/**
 * 通过导航真实回调切换用户页面。
 * @param page - 目标页面。
 * @returns 已加载的页面。
 */
export async function navigateUser(page: Page): Promise<ReturnType<typeof UserSettingsSection>> {
  const navigation = findElement(renderUser(), (node) => 'activePage' in node.props);
  invoke(navigation, 'onSelectPage', page);
  renderUser();
  runEffects();
  await settleUser();
  return renderUser();
}
/**
 * 点击实际可见按钮，等待其异步链。
 * @param label - 可见按钮翻译键。
 * @returns 无返回值。
 */
export async function clickUser(label: string): Promise<void> {
  const button = findElement(renderUser(), (node) => node.type === 'button' && textContent(node).includes(label));
  await Promise.resolve(invoke(button, 'onClick'));
  await settleUser();
}
/**
 * 修改按标签定位的真实输入。
 * @param label - 字段标签翻译键。
 * @param value - 输入值。
 * @returns 无返回值。
 */
export function inputUser(label: string, value: string): void {
  const field = findElement(renderUser(), (node) => node.type === 'label' && textContent(node).includes(label));
  invoke(findElement(field, (node) => node.type === 'input'), 'onChange', {
    target: {
      value
    }
  });
}
/**
 * 通过真实字段索引输入密码等成组值。
 * @param values - 按页面字段顺序排列的输入。
 * @returns 无返回值。
 */
export function fillInputs(values: string[]): void {
  const fields = elements(renderUser()).filter((node) => node.type === 'input' && node.props.type !== 'file');
  values.forEach((value, index) => {
    invoke(fields[index], 'onChange', {
      target: {
        value
      }
    });
  });
}
/**
 * 清理实际组件生命周期及浏览器桩。
 * @returns 无返回值。
 */
export function cleanupUser(): void {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
}
export { mocks };
