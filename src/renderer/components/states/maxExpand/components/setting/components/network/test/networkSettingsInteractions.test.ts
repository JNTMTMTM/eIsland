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
 * @file networkSettingsInteractions.test.ts
 * @description 网络配置实际输入、导航与扩展选项边界回归。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkSettingsSection } from '../NetworkSettingsSection';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle } from '../../app/components/test/themeHookHarness';
import type { ComponentProps } from 'react';
vi.mock('react', async (original) => ({ ...(await original<typeof import('react')>()), ...(await import('../../../../../../../test/elementHarness')).hookMocks, ...(await import('../../app/components/test/themeHookHarness')).lifecycleHooks }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
/**
 * 创建符合组件公开契约的独立输入。
 * @returns 完整设置状态与可观察回调。
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

beforeEach(() => { resetLifecycle(); vi.clearAllMocks(); });
/**
 * 执行实际网络设置并保留导航状态。
 * @param props - 公开设置输入。
 * @returns 实际元素树。
 */
function render(props: ComponentProps<typeof NetworkSettingsSection>) { return renderWithHooks(() => NetworkSettingsSection(props)); }
describe('实际网络输入与导航', () => {
  it.each(['0', '-1', '', 'invalid', '121', 'Infinity', '-Infinity', 'NaN', '1.256'])('自定义秒数%s输入更新、失焦应用及仅 Enter 触发失焦', (value) => {
    const props = makeProps(); props.customTimeoutInput = value;
    const input = findElement(render(props), (node) => node.type === 'input');
    invoke(input, 'onChange', { target: { value: '2' } }); expect(props.setCustomTimeoutInput).toHaveBeenCalledWith('2');
    const blur = vi.fn(); invoke(input, 'onKeyDown', { key: 'Escape', target: { blur } }); expect(blur).not.toHaveBeenCalled();
    invoke(input, 'onKeyDown', { key: 'Enter', target: { blur } }); expect(blur).toHaveBeenCalledOnce();
    invoke(input, 'onBlur');
    if (value === '1.256') expect(props.saveNetworkConfig).toHaveBeenCalledWith({ staticAssetNode: 'r2', timeoutMs: 1256 });
    else { expect(props.saveNetworkConfig).not.toHaveBeenCalled(); expect(props.setCustomTimeoutInput).toHaveBeenLastCalledWith('5'); }
  });
  it('公开预设允许新数值，未知标签键走默认兜底，导航切换执行实际 updater', () => {
    const props = makeProps(); props.networkTimeoutOptions.push({ label: 'Seven', value: 7000 });
    let tree = render(props); const buttons = elements(tree).filter((node) => node.type === 'button');
    invoke(buttons[1], 'onClick'); expect(props.setNetworkTimeoutMs).toHaveBeenCalledWith(7000); expect(props.setCustomTimeoutInput).toHaveBeenCalledWith('7');
    invoke(findElement(tree, (node) => typeof elementProps(node).onToggle === 'function'), 'onToggle');
    tree = render(props); expect(elementProps(findElement(tree, (node) => typeof elementProps(node).onToggle === 'function')).label).toBe('settings.navigation.collapse');
    invoke(findElement(tree, (node) => typeof elementProps(node).onToggle === 'function'), 'onToggle');
    expect(elementProps(findElement(render(props), (node) => typeof elementProps(node).onToggle === 'function')).expanded).toBe(false);
  });
  it.each([false, true])('Pro=%s节点、未知节点图标及已选更新源正确呈现并转交', (pro) => {
    const props = makeProps(); props.networkSettingsPage = 'data-center'; props.isProUser = pro; props.updateSource = 'github';
    props.staticAssetNodeOptions.push({ label: 'Unknown', value: 'unknown-runtime-node' as typeof props.staticAssetNode });
    props.updateSources.push({ key: 'unknown-update-source', label: 'Unknown' });
    const tree = render(props); const unknown = findElement(tree, (node) => node.type === 'button' && textContent(node) === 'Unknown');
    expect(elements(unknown).some((node) => node.type === 'img')).toBe(false); invoke(unknown, 'onClick'); expect(props.setStaticAssetNode).toHaveBeenCalledWith('unknown-runtime-node');
    const source = findElement(tree, (node) => node.type === 'input' && elementProps(node).value === 'github'); expect(elementProps(source).checked).toBe(true);
    const missingIcon = findElement(tree, (node) => node.type === 'input' && elementProps(node).value === 'unknown-update-source'); invoke(missingIcon, 'onChange'); expect(props.onUpdateSourceChange).toHaveBeenCalledWith('unknown-update-source');
  });
});

it('公开超时值不在预设列表时渲染自定义激活状态', () => {
  const props = makeProps(); props.networkTimeoutMs = 12345;
  expect(elementProps(findElement(render(props), (node) => elementProps(node).className === 'settings-network-custom active')).className).toBe('settings-network-custom active');
});

it.each([1, 120])('合法秒数边界%s正常保存', (seconds) => {
  const props = makeProps(); props.customTimeoutInput = String(seconds);
  invoke(findElement(render(props), (node) => node.type === 'input'), 'onBlur');
  expect(props.setNetworkTimeoutMs).toHaveBeenCalledWith(seconds * 1000);
  expect(props.saveNetworkConfig).toHaveBeenCalledWith({ timeoutMs: seconds * 1000, staticAssetNode: 'r2' });
});
