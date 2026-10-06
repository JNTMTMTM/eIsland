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
 * @file aiSettingsSection.test.ts
 * @description AiSettingsSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { AiSettingsSection } from '../AiSettingsSection';
import { elementProps, elements, findElement, invoke, resetState, rewindState, textContent } from '../../../../../../../test/elementHarness';
import type { ComponentProps } from 'react';
/**
 * 构造隔离设置状态和可观察回调的完整配置。
 * @returns 配置状态及可观察回调。
 */
function makeProps(): ComponentProps<typeof AiSettingsSection> {
  return {
    currentAiSettingsPageLabel: '',
    aiSettingsPage: 'general',
    aiConfig: { apiKey: '', endpoint: '', model: '', customApiModel: '', workspaces: [], r1pxcAvatar: '', ollamaModel: '', ollamaBaseUrl: '', sttOrbEnabled: false, orbColorA: '', orbColorB: '' },
    setAiConfig: vi.fn(),
    onAddWorkspace: vi.fn(),
    onRemoveWorkspace: vi.fn(),
    SettingsFieldComponent: vi.fn(() => createElement('input')),
    aiSettingsPages: [],
    aiSettingsPageLabels: { general: 'General', r1pxc: 'Avatar', ollama: 'Local', 'orb-style': 'Orb' },
    setAiSettingsPage: vi.fn(),
    isProUser: false,
  };
}
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../../../../../../components/DynamicIslandAgentInputBall', () => ({ LiquidOrbCanvas: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('AiSettingsSection', () => {
  it.each([false, true])('renders Pro credentials gate and forwards field and workspace edits for Pro=%s', (isProUser) => {
    const props = { ...makeProps(), aiConfig: { ...makeProps().aiConfig, workspaces: ['C:/work'] } };
    props.isProUser = isProUser;
    const tree = AiSettingsSection(props);
    expect(elementProps(findElement(tree, (n) => 'aria-disabled' in n.props))['aria-disabled']).toBe(!isProUser);
    invoke(findElement(tree, (n) => elementProps(n).label === 'settings.ai.apiEndpoint'), 'onChange', 'https://example.com/v1');
    expect(props.setAiConfig).toHaveBeenCalledWith({ endpoint: 'https://example.com/v1' });
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.ai.workspaceAdd'), 'onClick');
    expect(props.onAddWorkspace).toHaveBeenCalledOnce();
    invoke(findElement(tree, (n) => elementProps(n).className === 'settings-ai-workspace-remove-btn'), 'onClick');
    expect(props.onRemoveWorkspace).toHaveBeenCalledWith(0);
  });
  it('clears existing avatar and resets orb color with preview completion', () => {
    const props = { ...makeProps(), aiSettingsPage: 'r1pxc' as const, aiConfig: { ...makeProps().aiConfig, r1pxcAvatar: 'data:image/png;base64,test' } };
    const avatar = AiSettingsSection(props);
    invoke(findElement(avatar, (n) => n.type === 'button' && textContent(n) === 'settings.ai.r1pxcAvatarClear'), 'onClick');
    expect(props.setAiConfig).toHaveBeenCalledWith({ r1pxcAvatar: '' });
    resetState();
    const orbProps = { ...props, aiSettingsPage: 'orb-style' as const, aiConfig: { ...props.aiConfig, orbColorA: '#123456' } };
    const orb = AiSettingsSection(orbProps);
    invoke(findElement(orb, (n) => n.type === 'input' && elementProps(n).type === 'checkbox'), 'onChange', { target: { checked: true } });
    expect(props.setAiConfig).toHaveBeenCalledWith({ sttOrbEnabled: true });
    invoke(findElement(orb, (n) => elementProps(n).title === 'settings.ai.orbColorReset'), 'onClick');
    expect(props.setAiConfig).toHaveBeenCalledWith({ orbColorA: '' });
    invoke(findElement(orb, (n) => 'onReady' in elementProps(n)), 'onReady');
    rewindState();
    expect(elements(AiSettingsSection(orbProps)).some((n) => elementProps(n).className === 'settings-orb-preview-loading')).toBe(false);
  });
  it('renders local model fields independently from cloud credentials', () => {
    const props = { ...makeProps(), aiSettingsPage: 'ollama' as const };
    const tree = AiSettingsSection(props);
    invoke(findElement(tree, (n) => elementProps(n).label === 'settings.ai.ollamaModel'), 'onChange', 'local:latest');
    expect(props.setAiConfig).toHaveBeenCalledWith({ ollamaModel: 'local:latest' });
    expect(textContent(tree)).toContain('settings.ai.ollamaFetchBtn');
    expect(textContent(tree)).not.toContain('settings.ai.apiEndpoint');
  });
});
