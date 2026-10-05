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
 * @file dynamicIslandStateContent.test.ts
 * @description DynamicIslandStateContent 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DynamicIslandStateContent } from '../DynamicIslandStateContent';
import { elementProps, resetState } from '../../test/elementHarness';
import type { ComponentProps } from 'react';
const props: Omit<ComponentProps<typeof DynamicIslandStateContent>, 'state'> = { timeStr: '12:00', dayStr: 'Tuesday', weather: { temperature: 20, description: 'Clear', humidity: 50, windSpeed: 1, uvIndex: 1, iconCode: 0, forecast: [{ temperature: 20, description: 'Clear', temperatureMax: 25, temperatureMin: 15, windSpeed: 1, uvIndex: 1, precipitationProbability: 0, iconCode: 0 }, { temperature: 20, description: 'Clear', temperatureMax: 25, temperatureMin: 15, windSpeed: 1, uvIndex: 1, precipitationProbability: 0, iconCode: 0 }] }, timerState: 'paused', remainingSeconds: 20, pomodoroRunning: true, pomodoroRemaining: 60, fullTimeStr: '12:00:00', lunarStr: 'Lunar', notification: { title: 'Title', body: 'Body', type: 'default' } };
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../states/idle', () => ({ IdleContent: Object.assign(vi.fn(), { displayName: 'IdleContent' }) }));
vi.mock('../../states/hover', () => ({ HoverContent: Object.assign(vi.fn(), { displayName: 'HoverContent' }) }));
vi.mock('../../states/notification/NotificationContent', () => ({ NotificationContent: Object.assign(vi.fn(), { displayName: 'NotificationContent' }) }));
vi.mock('../../states/expand/ExpandedContent', () => ({ ExpandedContent: Object.assign(vi.fn(), { displayName: 'ExpandedContent' }) }));
vi.mock('../../states/maxExpand/MaxExpandContent', () => ({ MaxExpandContent: Object.assign(vi.fn(), { displayName: 'MaxExpandContent' }) }));
vi.mock('../../states/lyrics/LyricsContent', () => ({ LyricsContent: Object.assign(vi.fn(), { displayName: 'LyricsContent' }) }));
vi.mock('../../states/lyricsTranslation/LyricsTranslationContent', () => ({ LyricsTranslationContent: Object.assign(vi.fn(), { displayName: 'LyricsTranslationContent' }) }));
vi.mock('../../states/guide/GuideContent', () => ({ GuideContent: Object.assign(vi.fn(), { displayName: 'GuideContent' }) }));
vi.mock('../../states/login', () => ({ LoginContent: Object.assign(vi.fn(), { displayName: 'LoginContent' }) }));
vi.mock('../../states/register/RegisterContent', () => ({ RegisterContent: Object.assign(vi.fn(), { displayName: 'RegisterContent' }) }));
vi.mock('../../states/resetPassword', () => ({ ResetPasswordContent: Object.assign(vi.fn(), { displayName: 'ResetPasswordContent' }) }));
vi.mock('../../states/payment/PaymentContent', () => ({ PaymentContent: Object.assign(vi.fn(), { displayName: 'PaymentContent' }) }));
vi.mock('../../states/questionnaire', () => ({ QuestionnaireContent: Object.assign(vi.fn(), { displayName: 'QuestionnaireContent' }) }));
vi.mock('../../states/announcement/AnnouncementContent', () => ({ AnnouncementContent: Object.assign(vi.fn(), { displayName: 'AnnouncementContent' }) }));
vi.mock('../../states/agentVoiceInput/AgentVoiceInputContent', () => ({ AgentVoiceInputContent: Object.assign(vi.fn(), { displayName: 'AgentVoiceInputContent' }) }));
vi.mock('../../states/agent/AgentContent', () => ({ AgentContent: Object.assign(vi.fn(), { displayName: 'AgentContent' }) }));
vi.mock('../../states/stt/SttContent', () => ({ SttContent: Object.assign(vi.fn(), { displayName: 'SttContent' }) }));
vi.mock('../../states/cli/CliContent', () => ({ CliContent: Object.assign(vi.fn(), { displayName: 'CliContent' }) }));
vi.mock('../../states/setPassword', () => ({ SetPasswordContent: Object.assign(vi.fn(), { displayName: 'SetPasswordContent' }) }));
vi.mock('../../states/bindOAuth', () => ({ BindOAuthContent: Object.assign(vi.fn(), { displayName: 'BindOAuthContent' }) }));
vi.mock('../../states/bindEmail', () => ({ BindEmailContent: Object.assign(vi.fn(), { displayName: 'BindEmailContent' }) }));
vi.mock('../../states/musicProvidersLogin', () => ({ MusicProvidersLoginContent: Object.assign(vi.fn(), { displayName: 'MusicProvidersLoginContent' }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('DynamicIslandStateContent', () => {
  it.each([['idle', 'IdleContent'], ['hover', 'HoverContent'], ['expanded', 'ExpandedContent'], ['notification', 'NotificationContent'], ['maxExpand', 'MaxExpandContent'], ['lyrics', 'LyricsContent'], ['lyricsTranslation', 'LyricsTranslationContent'], ['guide', 'GuideContent'], ['login', 'LoginContent'], ['register', 'RegisterContent'], ['resetPassword', 'ResetPasswordContent'], ['setPassword', 'SetPasswordContent'], ['bindOAuth', 'BindOAuthContent'], ['bindEmail', 'BindEmailContent'], ['musicProvidersLogin', 'MusicProvidersLoginContent'], ['payment', 'PaymentContent'], ['announcement', 'AnnouncementContent'], ['questionnaire', 'QuestionnaireContent'], ['agentVoiceInput', 'AgentVoiceInputContent'], ['agent', 'AgentContent'], ['stt', 'SttContent'], ['cli', 'CliContent']] as const)('routes %s to its matching %s component', (state, expected) => {
    const tree = DynamicIslandStateContent({ state, ...props });
    expect((tree?.type as unknown as {
      displayName: string;
    }).displayName).toBe(expected);
  });
  it('preserves idle timer values and notification payload fields', () => {
    expect(elementProps(DynamicIslandStateContent({ ...props, state: 'idle' }))).toMatchObject({ remainingSeconds: 20, timerState: 'paused', pomodoroRunning: true });
    expect(elementProps(DynamicIslandStateContent({ ...props, state: 'notification' }))).toMatchObject({ title: 'Title', body: 'Body', type: 'default' });
  });
});
