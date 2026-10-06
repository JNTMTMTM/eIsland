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
 * @file networkSettingsSection.test.ts
 * @description NetworkSettingsSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkSettingsSection } from '../NetworkSettingsSection';
import { elementProps, findElement, invoke, resetState, textContent } from '../../../../../../../test/elementHarness';
import type { ComponentProps } from 'react';
/**
 * 构造隔离设置状态和可观察回调的完整配置。
 * @returns 配置状态及可观察回调。
 */
function makeProps(): ComponentProps<typeof NetworkSettingsSection> {
  return {
    isProUser: false,
    networkTimeoutMs: 5000,
    customTimeoutInput: '5',
    staticAssetNode: 'r2',
    networkTimeoutOptions: [{ label: 'Five', value: 5000 }],
    staticAssetNodeOptions: [{ label: 'R2', value: 'r2' }, { label: 'COS', value: 'cos', proOnly: true }],
    setNetworkTimeoutMs: vi.fn(),
    setCustomTimeoutInput: vi.fn(),
    setStaticAssetNode: vi.fn(),
    saveNetworkConfig: vi.fn(),
    currentNetworkSettingsPageLabel: '',
    networkSettingsPage: 'timeout',
    networkSettingsPages: [],
    networkSettingsPageLabels: { timeout: 'Timeout', 'data-center': 'Nodes' },
    setNetworkSettingsPage: vi.fn(),
    updateSource: '',
    updateSources: [{ key: 'github', label: 'GitHub' }, { key: 'tencent-cos', label: 'COS', proOnly: true }],
    onUpdateSourceChange: vi.fn(),
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
describe('NetworkSettingsSection', () => {
  it('applies presets and handles invalid custom timeout by restoring the current value', () => {
    const props = makeProps();
    const tree = NetworkSettingsSection(props);
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.network.timeout.options.ms5000'), 'onClick');
    expect(props.saveNetworkConfig).toHaveBeenCalledWith({ timeoutMs: 5000, staticAssetNode: 'r2' });
    resetState();
    const invalid = NetworkSettingsSection({ ...props, customTimeoutInput: 'invalid' });
    invoke(findElement(invalid, (n) => n.type === 'input'), 'onBlur');
    expect(props.setCustomTimeoutInput).toHaveBeenLastCalledWith('5');
    resetState();
    const valid = NetworkSettingsSection({ ...props, customTimeoutInput: '1.25' });
    invoke(findElement(valid, (n) => n.type === 'input'), 'onBlur');
    expect(props.setNetworkTimeoutMs).toHaveBeenLastCalledWith(1250);
  });
  it.each([false, true])('gates Pro nodes and supplies selected update source for Pro=%s', (isProUser) => {
    const props = { ...makeProps(), networkSettingsPage: 'data-center' as const };
    props.isProUser = isProUser;
    const tree = NetworkSettingsSection(props);
    const cos = findElement(tree, (n) => n.type === 'button' && textContent(n) === 'COS');
    expect(elementProps(cos).disabled).toBe(!isProUser);
    invoke(cos, 'onClick');
    expect(props.setStaticAssetNode).toHaveBeenCalledTimes(isProUser ? 1 : 0);
    const github = findElement(tree, (n) => n.type === 'input' && elementProps(n).value === 'github');
    invoke(github, 'onChange');
    expect(props.onUpdateSourceChange).toHaveBeenCalledWith('github');
  });
});
