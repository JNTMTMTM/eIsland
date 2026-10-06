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
 * @file screenshotSettingsInteractions.test.ts
 * @description 截图设置真实配置生命周期、交换与私有语言菜单事件及清理回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScreenshotSettingsPage } from '../ScreenshotSettingsPage';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './themeHookHarness';
import type { ReactElement } from 'react';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./themeHookHarness')).lifecycleHooks
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));
const api = {
  storeRead: vi.fn<(key: string) => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>()
};
const addEventListener = vi.fn<(name: string, callback: (event: {
  target: Node;
}) => void) => void>();
const removeEventListener = vi.fn<(name: string, callback: (event: {
  target: Node;
}) => void) => void>();
interface DropdownProps {
  options: readonly {
    code: string;
    labelKey: string;
  }[];
  value: string;
  onChange: (code: string) => void;
}
/**
 * 执行实际截图设置组件。
 * @returns 实际元素树。
 */
function render() {
  return renderWithHooks(() => ScreenshotSettingsPage());
}
/**
 * 找到父组件实际创建的语言下拉元素。
 * @param tree - 实际父元素树。
 * @returns 两个实际语言下拉元素。
 */
function dropdowns(tree: ReactElement) {
  return elements(tree).filter((node) => 'options' in elementProps(node) && 'value' in elementProps(node));
}
/**
 * 等待真实持久化读取队列。
 * @returns 当前服务回调完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/**
 * 从父组件实际元素取得未导出的子组件，以其真实props运行。
 * @param value - 从配置读取的源语言，保留损坏运行时值边界。
 * @returns 私有组件实际重绘函数。
 */
async function mountSourceDropdown(value: string) {
  api.storeRead.mockImplementation((key) => Promise.resolve(key === 'screenshot-translate-source-lang' ? value : undefined));
  render();
  runEffects();
  await settle();
  const [element] = dropdowns(render());
  const component = element.type as (props: DropdownProps) => ReactElement;
  const props = elementProps(element) as unknown as DropdownProps;
  resetLifecycle();
  return () => renderWithHooks(() => component(props));
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  api.storeRead.mockResolvedValue(undefined);
  api.storeWrite.mockResolvedValue(undefined);
  vi.stubGlobal('window', {
    api
  });
  vi.stubGlobal('document', {
    addEventListener,
    removeEventListener
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('真实配置读取和提交', () => {
  it.each([{
    source: 'zh',
    target: 'en',
    engine: 'js',
    ocr: 'local'
  }, {
    source: 42,
    target: null,
    engine: 'damaged',
    ocr: 'damaged'
  }])('配置$engine/$ocr使用合法值或默认', async ({
    source,
    target,
    engine,
    ocr
  }) => {
    const values: Record<string, unknown> = {
      'screenshot-translate-source-lang': source,
      'screenshot-translate-target-lang': target,
      'screenshot-engine': engine,
      'screenshot-ocr-engine': ocr
    };
    api.storeRead.mockImplementation((key) => Promise.resolve(values[key]));
    render();
    runEffects();
    await settle();
    expect(dropdowns(render()).map((node) => elementProps(node).value)).toEqual([typeof source === 'string' ? source : 'auto', typeof target === 'string' ? target : 'en']);
    expect(elements(render()).filter((node) => elementProps(node).name === 'screenshot-engine').map((node) => elementProps(node).checked)).toEqual(engine === 'js' ? [false, true] : [true, false]);
    expect(elements(render()).filter((node) => elementProps(node).name === 'screenshot-ocr-engine').map((node) => elementProps(node).checked)).toEqual(ocr === 'local' ? [true, false] : [false, true]);
  });
  it('读取拒绝保留默认且不触发写入', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(dropdowns(render()).map((node) => elementProps(node).value)).toEqual(['auto', 'en']);
    expect(api.storeWrite).not.toHaveBeenCalled();
  });
  it('卸载后四个延迟读取均取消状态更新', async () => {
    const pending = new Map<string, (value: unknown) => void>();
    api.storeRead.mockImplementation((key) => new Promise((resolve) => {
      pending.set(key, resolve);
    }));
    render();
    runEffects();
    unmountHooks();
    pending.forEach((resolve) => {
      resolve('js');
    });
    await settle();
    expect(dropdowns(render()).map((node) => elementProps(node).value)).toEqual(['auto', 'en']);
    expect(elements(render()).filter((node) => elementProps(node).name === 'screenshot-engine').map((node) => elementProps(node).checked)).toEqual([true, false]);
  });
  it('两组引擎和源目标语言实际提交，交换auto不写入而有效语言交换', () => {
    invoke(findElement(render(), (node) => elementProps(node).className === 'translate-swap-btn'), 'onClick');
    expect(api.storeWrite).not.toHaveBeenCalled();
    const radios = elements(render()).filter((node) => node.type === 'input');
    radios.forEach((node) => {
      invoke(node, 'onChange');
    });
    expect(api.storeWrite).toHaveBeenCalledWith('screenshot-engine', 'plugin');
    expect(api.storeWrite).toHaveBeenCalledWith('screenshot-engine', 'js');
    expect(api.storeWrite).toHaveBeenCalledWith('screenshot-ocr-engine', 'local');
    expect(api.storeWrite).toHaveBeenCalledWith('screenshot-ocr-engine', 'server');
    const [source, target] = dropdowns(render());
    invoke(source, 'onChange', 'zh');
    invoke(target, 'onChange', 'fr');
    expect(dropdowns(render()).map((node) => elementProps(node).value)).toEqual(['zh', 'fr']);
    api.storeWrite.mockClear();
    invoke(findElement(render(), (node) => elementProps(node).className === 'translate-swap-btn'), 'onClick');
    expect(dropdowns(render()).map((node) => elementProps(node).value)).toEqual(['fr', 'zh']);
    expect(api.storeWrite).toHaveBeenCalledWith('screenshot-translate-source-lang', 'fr');
    expect(api.storeWrite).toHaveBeenCalledWith('screenshot-translate-target-lang', 'zh');
  });
});
describe('父树取得的实际语言下拉', () => {
  it.each(['auto', 'en', 'unknown'])('实际配置语言%s使用AI/旗帜/未知文字', async (value) => {
    const child = await mountSourceDropdown(value);
    const tree = child();
    expect(textContent(tree)).toContain(value === 'unknown' ? 'unknown' : `maxExpand.toolbox.translate.lang.${value}`);
    expect(elements(tree).filter((node) => elementProps(node).className === 'translate-lang-flag-placeholder')).toHaveLength(value === 'unknown' ? 1 : 0);
    expect(elements(tree).filter((node) => node.type === 'img')).toHaveLength(value === 'unknown' ? 0 : 1);
    invoke(findElement(tree, (node) => node.type === 'button'), 'onClick');
    expect(elements(child()).filter((node) => elementProps(node).className === 'translate-lang-dropdown-menu')).toHaveLength(1);
    const options = elements(child()).filter((node) => String(elementProps(node).className).startsWith('translate-lang-dropdown-item'));
    expect(options).toHaveLength(9);
    invoke(options[1], 'onClick');
    expect(api.storeWrite).toHaveBeenCalledWith('screenshot-translate-source-lang', 'zh');
    expect(elements(child()).filter((node) => elementProps(node).className === 'translate-lang-dropdown-menu')).toHaveLength(0);
  });
  it.each(['inside', 'outside', 'no-ref'])('菜单点击%s运行真实监听回调并清理', async (mode) => {
    const child = await mountSourceDropdown('en');
    child();
    runEffects();
    expect(addEventListener).not.toHaveBeenCalled();
    invoke(findElement(child(), (node) => node.type === 'button'), 'onClick');
    child();
    runEffects();
    expect(addEventListener).toHaveBeenCalledOnce();
    const ref = elementProps(findElement(child(), (node) => elementProps(node).className === 'translate-lang-dropdown')).ref as {
      current: HTMLDivElement | null;
    };
    const contains = vi.fn(() => mode === 'inside');
    ref.current = mode === 'no-ref' ? null : {
      contains
    } as unknown as HTMLDivElement;
    const target = {} as Node;
    const [[, listener]] = addEventListener.mock.calls;
    listener({
      target
    });
    expect(elements(child()).some((node) => elementProps(node).className === 'translate-lang-dropdown-menu')).toBe(mode !== 'outside');
    expect(contains).toHaveBeenCalledTimes(mode === 'no-ref' ? 0 : 1);
    unmountHooks();
    expect(removeEventListener).toHaveBeenCalledWith('mousedown', listener);
  });
});
