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
 * @file hideProcessSettingsInteractions.test.ts
 * @description 进程隐藏实际过滤、选择、图标、空名称与刷新失败回归。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { HideProcessSettingsPage } from '../HideProcessSettingsPage';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../../test/elementHarness';
import makeAppSettingsProps from './appSettingsFixture';
import type { AppRunningWindow } from '../types';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
/**
 * 构造来自运行进程接口的窗口输入。
 * @param name - 进程名称。
 * @param title - 窗口标题。
 * @param icon - 可选图标数据。
 * @returns 实际契约允许的运行窗口信息。
 */
function running(name: string, title: string, icon: string | null = null): AppRunningWindow {
  return { title, id: `${name}-${title}`, processName: name, processPath: null, processId: null, iconDataUrl: icon };
}
describe('实际进程隐藏列表', () => {
  it('大小写过滤、选择比较忽略首尾空白，图标与标题正确渲染并转交原始名称', () => {
    const props = makeAppSettingsProps();
    props.runningProcesses = [running('EDITOR.exe', 'Document', 'data:image/png;base64,icon'), running('editor-helper.exe', ''), running('other.exe', 'Other')];
    props.hideProcessKeyword = 'editor';
    props.hideProcessList = [' editor.EXE '];
    const tree = HideProcessSettingsPage(props);
    const rows = elements(tree).filter((node) => node.type === 'button' && String(elementProps(node).className).includes('settings-hide-process-item'));
    expect(rows).toHaveLength(2);
    expect(elementProps(rows[0]).className).toContain('active');
    expect(elementProps(rows[1]).className).not.toContain('active');
    expect(textContent(rows[0])).toContain('Document');
    expect(textContent(rows[0])).toContain('✓');
    expect(textContent(rows[1])).toContain('E');
    expect(textContent(tree)).not.toContain('Other');
    expect(elements(rows[0]).find((node) => node.type === 'img')?.props.src).toBe('data:image/png;base64,icon');
    rows.forEach((node) => invoke(node, 'onClick'));
    expect(props.toggleHideProcess).toHaveBeenNthCalledWith(1, 'EDITOR.exe');
    expect(props.toggleHideProcess).toHaveBeenNthCalledWith(2, 'editor-helper.exe');
  });
  it('空进程名称通过空关键词过滤后不产生按钮', () => {
    const props = makeAppSettingsProps();
    props.runningProcesses = [running('', 'Title without executable')];
    const tree = HideProcessSettingsPage(props);
    expect(textContent(tree)).not.toContain('Title without executable');
    expect(elements(tree).filter((node) => String(elementProps(node).className).includes('settings-hide-process-item'))).toHaveLength(0);
  });
  it.each([false, true])('全屏自动隐藏=%s的真实开关转交新值', (enabled) => {
    const props = makeAppSettingsProps();
    props.autoHideFullscreenWindows = enabled;
    const input = findElement(HideProcessSettingsPage(props), (node) => node.type === 'input' && elementProps(node).type === 'checkbox');
    expect(elementProps(input).checked).toBe(enabled);
    invoke(input, 'onChange', { target: { checked: !enabled } });
    expect(props.setAutoHideFullscreenWindows).toHaveBeenCalledWith(!enabled);
  });
  it.each([false, true])('刷新失败=%s时真实处理器完成且无未处理拒绝', async (failure) => {
    const props = makeAppSettingsProps();
    props.refreshRunningProcesses = vi.fn(() => failure ? Promise.reject(new Error('offline')) : Promise.resolve());
    const button = findElement(HideProcessSettingsPage(props), (node) => node.type === 'button' && textContent(node).includes('settings.app.hideProcess.refresh'));
    invoke(button, 'onClick');
    await Promise.resolve();
    await Promise.resolve();
    expect(props.refreshRunningProcesses).toHaveBeenCalledOnce();
  });
});
