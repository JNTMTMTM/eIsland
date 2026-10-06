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
 * @file maxExpandLayoutSettingsInteractions.test.ts
 * @description 全展开布局真实拖拽、可见性、应用模式持久化和订阅清理回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MaxExpandLayoutSettingsPage } from '../MaxExpandLayoutSettingsPage';
import { elementProps, elements, findElement, invoke } from '../../../../../../../../test/elementHarness';
import { DEFAULT_MAXEXPAND_NAV_LAYOUT, MAXEXPAND_APP_MODE_ENABLED_STORE_KEY, MAXEXPAND_APP_MODE_CHANGED_EVENT } from '../../../../utils/settingsConfig';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './themeHookHarness';
import type { ComponentProps } from 'react';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./themeHookHarness')).lifecycleHooks
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: {
      defaultValue?: string;
    }) => options?.defaultValue ?? key
  })
}));
const unsubscribe = vi.fn<() => void>();
const api = {
  storeRead: vi.fn<() => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  settingsPreview: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  onSettingsChanged: vi.fn<(callback: (channel: string, value: unknown) => void) => () => void>()
};
const dispatchEvent = vi.fn<(event: CustomEvent<boolean>) => boolean>();
let props: ComponentProps<typeof MaxExpandLayoutSettingsPage>;
/**
 * 重绘真实布局组件。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => MaxExpandLayoutSettingsPage(props));
}
/**
 * 获取实际可拖拽排序行。
 * @returns 按页面次序排列的行。
 */
function rows() {
  return elements(render()).filter((node) => elementProps(node).draggable === true);
}
/**
 * 等待真实配置读取与写入回调。
 * @returns 当前服务队列完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  props = {
    maxExpandNavLayout: [{
      id: 'todo',
      visible: true
    }, {
      id: 'album',
      visible: false
    }, {
      id: 'unknown-runtime-tab',
      visible: true
    }],
    updateMaxExpandNavLayout: vi.fn()
  };
  vi.mocked(props.updateMaxExpandNavLayout).mockImplementation((value) => {
    props.maxExpandNavLayout = value;
  });
  api.storeRead.mockResolvedValue(undefined);
  api.storeWrite.mockResolvedValue(undefined);
  api.settingsPreview.mockResolvedValue(undefined);
  api.onSettingsChanged.mockReturnValue(unsubscribe);
  vi.stubGlobal('window', {
    api,
    dispatchEvent
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('真实应用模式读取和订阅', () => {
  it.each([true, false, 'damaged'])('模式保存值%o仅true启用', async (value) => {
    api.storeRead.mockResolvedValue(value);
    render();
    runEffects();
    await settle();
    expect(elementProps(findElement(render(), (node) => node.type === 'input')).checked).toBe(value === true);
  });
  it('读取拒绝保留默认且解除订阅', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(elementProps(findElement(render(), (node) => node.type === 'input')).checked).toBe(false);
    unmountHooks();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it('卸载后迟到读取和订阅事件均忽略', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    api.storeRead.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    render();
    runEffects();
    const [[listener]] = api.onSettingsChanged.mock.calls;
    unmountHooks();
    resolve(true);
    listener(`store:${MAXEXPAND_APP_MODE_ENABLED_STORE_KEY}`, true);
    await settle();
    expect(elementProps(findElement(render(), (node) => node.type === 'input')).checked).toBe(false);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it.each([true, false, 'unknown'])('真实外部模式事件%o更新，其他频道忽略', async (value) => {
    render();
    runEffects();
    await settle();
    const [[listener]] = api.onSettingsChanged.mock.calls;
    listener(`store:${MAXEXPAND_APP_MODE_ENABLED_STORE_KEY}`, value);
    expect(elementProps(findElement(render(), (node) => node.type === 'input')).checked).toBe(value === true);
    listener('unrelated', true);
    expect(elementProps(findElement(render(), (node) => node.type === 'input')).checked).toBe(value === true);
  });
  it.each([true, false])('应用模式持久化失败=%s仍本地更新并分发事件', async (failure) => {
    if (failure) {
      api.storeWrite.mockRejectedValue(new Error('offline'));
      api.settingsPreview.mockRejectedValue(new Error('offline'));
    }
    invoke(findElement(render(), (node) => node.type === 'input'), 'onChange', {
      target: {
        checked: true
      }
    });
    expect(elementProps(findElement(render(), (node) => node.type === 'input')).checked).toBe(true);
    expect(api.storeWrite).toHaveBeenCalledWith(MAXEXPAND_APP_MODE_ENABLED_STORE_KEY, true);
    expect(api.settingsPreview).toHaveBeenCalledWith(`store:${MAXEXPAND_APP_MODE_ENABLED_STORE_KEY}`, true);
    const [[event]] = dispatchEvent.mock.calls;
    expect(event.type).toBe(MAXEXPAND_APP_MODE_CHANGED_EVENT);
    expect(event.detail).toBe(true);
    await settle();
  });
});
describe('真实排序与可见性', () => {
  it('空布局仍显示控制，未知运行时ID使用自身作标签', () => {
    expect(elements(render()).filter((node) => elementProps(node).title === 'unknown-runtime-tab')).toHaveLength(1);
    props.maxExpandNavLayout = [];
    expect(rows()).toHaveLength(0);
    expect(elements(render()).some((node) => elementProps(node).className === 'maxexpand-layout-reset-btn')).toBe(true);
  });
  it('可见切换保留其它项，恢复默认使用独立数组', () => {
    const toggles = () => elements(render()).filter((node) => String(elementProps(node).className).startsWith('maxexpand-layout-item-toggle'));
    invoke(toggles()[0], 'onClick');
    expect(props.maxExpandNavLayout.map((item) => item.visible)).toEqual([false, false, true]);
    invoke(toggles()[1], 'onClick');
    expect(props.maxExpandNavLayout.map((item) => item.visible)).toEqual([false, true, true]);
    invoke(findElement(render(), (node) => elementProps(node).className === 'maxexpand-layout-reset-btn'), 'onClick');
    expect(props.maxExpandNavLayout).toEqual(DEFAULT_MAXEXPAND_NAV_LAYOUT);
    expect(props.maxExpandNavLayout).not.toBe(DEFAULT_MAXEXPAND_NAV_LAYOUT);
  });
  it('上移下移保留项数据，首尾越界不更新', () => {
    const moves = (index: number) => elements(rows()[index]).filter((node) => elementProps(node).className === 'maxexpand-layout-item-move-btn');
    expect(elementProps(moves(0)[0]).disabled).toBe(true);
    invoke(moves(0)[0], 'onClick');
    invoke(moves(2)[1], 'onClick');
    expect(props.updateMaxExpandNavLayout).not.toHaveBeenCalled();
    invoke(moves(1)[0], 'onClick');
    expect(props.maxExpandNavLayout.map((item) => item.id)).toEqual(['album', 'todo', 'unknown-runtime-tab']);
    invoke(moves(0)[1], 'onClick');
    expect(props.maxExpandNavLayout.map((item) => item.id)).toEqual(['todo', 'album', 'unknown-runtime-tab']);
    expect(props.maxExpandNavLayout[1].visible).toBe(false);
  });
  it('真实拖拽更换顺序，高亮及leave/end取消状态', () => {
    const preventDefault = vi.fn();
    invoke(rows()[0], 'onDragStart');
    invoke(rows()[2], 'onDragOver', {
      preventDefault
    });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(String(elementProps(rows()[2]).className)).toContain('drag-over');
    invoke(rows()[2], 'onDragLeave');
    expect(String(elementProps(rows()[2]).className)).not.toContain('drag-over');
    invoke(rows()[2], 'onDragOver', {
      preventDefault
    });
    invoke(rows()[2], 'onDrop');
    expect(props.maxExpandNavLayout.map((item) => item.id)).toEqual(['album', 'unknown-runtime-tab', 'todo']);
    expect(rows().some((node) => String(elementProps(node).className).includes('drag-over'))).toBe(false);
    invoke(rows()[0], 'onDragStart');
    invoke(rows()[1], 'onDragOver', {
      preventDefault
    });
    invoke(rows()[0], 'onDragEnd');
    expect(rows().some((node) => String(elementProps(node).className).includes('drag-over'))).toBe(false);
  });
  it('未开始或同项拖放不更新且清除高亮', () => {
    invoke(rows()[1], 'onDrop');
    expect(props.updateMaxExpandNavLayout).not.toHaveBeenCalled();
    invoke(rows()[0], 'onDragStart');
    invoke(rows()[0], 'onDragOver', {
      preventDefault: vi.fn()
    });
    invoke(rows()[0], 'onDrop');
    expect(props.updateMaxExpandNavLayout).not.toHaveBeenCalled();
    expect(rows().some((node) => String(elementProps(node).className).includes('drag-over'))).toBe(false);
    invoke(rows()[1], 'onDrop');
    expect(props.updateMaxExpandNavLayout).not.toHaveBeenCalled();
  });
});
