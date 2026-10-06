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
 * @file animationSettingsInteractions.test.ts
 * @description 动画设置真实读取生命周期、持久化错误和视频预览事件回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimationSettingsPage } from '../AnimationSettingsPage';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './themeHookHarness';
const store = vi.hoisted(() => ({
  springAnimation: true,
  animationSpeed: 'medium',
  setSpringAnimation: vi.fn<(value: boolean) => void>(),
  setAnimationSpeed: vi.fn<(value: string) => void>()
}));
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
vi.mock('../../../../../../../../../store/slices', () => ({
  default: {
    getState: () => store
  }
}));
vi.mock('../../../../../../../../components/DynamicIslandSharedWaveEffect', () => ({
  WaveEffect: () => null
}));
const api = {
  storeRead: vi.fn<(key: string) => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  settingsPreview: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  springAnimationSet: vi.fn<(value: boolean) => Promise<void>>(),
  animationSpeedSet: vi.fn<(value: string) => Promise<void>>()
};
/**
 * 重绘真实动画设置组件。
 * @returns 实际组件树。
 */
function render() {
  return renderWithHooks(() => AnimationSettingsPage());
}
/**
 * 等待配置与预览Promise回调完成。
 * @returns 队列处理完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/**
 * 查找实际预览按钮。
 * @param label - 实际按钮翻译键。
 * @returns 实际按钮。
 */
function button(label: string) {
  return findElement(render(), (node) => node.type === 'button' && textContent(node) === label);
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  store.springAnimation = true;
  store.animationSpeed = 'medium';
  api.storeRead.mockResolvedValue(undefined);
  [api.storeWrite, api.settingsPreview, api.springAnimationSet, api.animationSpeedSet].forEach((mock) => {
    mock.mockResolvedValue(undefined);
  });
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('真实配置读取与取消', () => {
  it.each([false, true, 'damaged'])('已保存动画%o仅使用合法布尔值', async (value) => {
    api.storeRead.mockImplementation((key) => Promise.resolve(key === 'splash-bg-color' ? '#112233' : value));
    render();
    runEffects();
    await settle();
    expect(elements(render()).filter((node) => elementProps(node).type === 'checkbox').slice(1)
      .map((node) => elementProps(node).checked)).toEqual([value !== false, value !== false, typeof value === 'boolean' ? value : true]);
    expect(elementProps(findElement(render(), (node) => elementProps(node).type === 'color')).value).toBe('#112233');
    expect(api.storeRead).toHaveBeenCalledTimes(4);
  });
  it('所有配置读取失败保留默认并吞掉拒绝', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(elements(render()).filter((node) => elementProps(node).type === 'checkbox').slice(1)
      .map((node) => elementProps(node).checked)).toEqual([true, true, true]);
    expect(elementProps(findElement(render(), (node) => elementProps(node).type === 'color')).value).toBe('#000000');
  });
  it('非字符串背景值不替换默认颜色', async () => {
    api.storeRead.mockResolvedValue(42);
    render();
    runEffects();
    await settle();
    expect(elementProps(findElement(render(), (node) => elementProps(node).type === 'color')).value).toBe('#000000');
  });
  it.each([true, false])('卸载后延迟配置拒绝=%s不写入组件状态', async (failure) => {
    const pending = new Map<string, {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }>();
    api.storeRead.mockImplementation((key) => new Promise((resolve, reject) => {
      pending.set(key, {
        resolve,
        reject
      });
    }));
    render();
    runEffects();
    unmountHooks();
    pending.forEach((operation) => {
      if (failure) operation.reject(new Error('offline'));else operation.resolve(false);
    });
    await settle();
    expect(elements(render()).filter((node) => elementProps(node).type === 'checkbox').slice(1)
      .map((node) => elementProps(node).checked)).toEqual([true, true, true]);
    expect(elementProps(findElement(render(), (node) => elementProps(node).type === 'color')).value).toBe('#000000');
  });
});
describe('实际动画和颜色持久化', () => {
  it.each([true, false])('动画与颜色写入失败=%s时本地反馈即时更新', async (failure) => {
    if (failure) {
      [api.storeWrite, api.settingsPreview, api.springAnimationSet, api.animationSpeedSet].forEach((mock) => {
        mock.mockRejectedValue(new Error('offline'));
      });
    }
    const boxes = elements(render()).filter((node) => elementProps(node).type === 'checkbox');
    boxes.forEach((node) => {
      invoke(node, 'onChange', {
        target: {
          checked: false
        }
      });
    });
    expect(store.setSpringAnimation).toHaveBeenCalledWith(false);
    expect(api.springAnimationSet).toHaveBeenCalledWith(false);
    expect(api.storeWrite).toHaveBeenCalledWith('expand-tab-animation', false);
    expect(api.storeWrite).toHaveBeenCalledWith('maxexpand-tab-animation', false);
    expect(api.storeWrite).toHaveBeenCalledWith('startup-animation-enabled', false);
    expect(api.settingsPreview).toHaveBeenCalledWith('settings:expand-tab-animation', false);
    expect(api.settingsPreview).toHaveBeenCalledWith('settings:maxexpand-tab-animation', false);
    elements(render()).filter((node) => elementProps(node).type === 'radio').forEach((node) => {
      invoke(node, 'onChange');
    });
    expect(store.setAnimationSpeed.mock.calls.map(([value]) => value)).toEqual(['slow', 'medium', 'fast']);
    expect(api.animationSpeedSet.mock.calls.map(([value]) => value)).toEqual(['slow', 'medium', 'fast']);
    invoke(findElement(render(), (node) => elementProps(node).type === 'color'), 'onChange', {
      target: {
        value: '#123456'
      }
    });
    expect(elementProps(findElement(render(), (node) => elementProps(node).type === 'color')).value).toBe('#123456');
    expect(api.storeWrite).toHaveBeenCalledWith('splash-bg-color', '#123456');
    invoke(button('settings.app.animation.resetDefault'), 'onClick');
    expect(api.storeWrite).toHaveBeenCalledWith('splash-bg-color', null);
    expect(elementProps(findElement(render(), (node) => elementProps(node).type === 'color')).value).toBe('#000000');
    await settle();
  });
});
describe('真实视频预览Ref和结束事件', () => {
  it.each([true, false])('视频播放失败=%s仍更新等待和停止状态', async (failure) => {
    const video = findElement(render(), (node) => node.type === 'video');
    const ref = elementProps(video).ref as {
      current: HTMLVideoElement | null;
    };
    const play = vi.fn<() => Promise<void>>();
    const pause = vi.fn();
    if (failure) play.mockRejectedValue(new Error('codec'));else play.mockResolvedValue(undefined);
    const media = {
      play,
      pause,
      currentTime: 45
    };
    ref.current = media as unknown as HTMLVideoElement;
    expect(elementProps(button('settings.app.animation.previewStop')).disabled).toBe(true);
    invoke(button('settings.app.animation.previewPlay'), 'onClick');
    expect(media.currentTime).toBe(0);
    expect(play).toHaveBeenCalledOnce();
    expect(elementProps(button('settings.app.animation.previewPlay')).disabled).toBe(true);
    invoke(button('settings.app.animation.previewStop'), 'onClick');
    expect(pause).toHaveBeenCalledOnce();
    expect(elementProps(button('settings.app.animation.previewPlay')).disabled).toBe(false);
    invoke(button('settings.app.animation.previewPlay'), 'onClick');
    invoke(findElement(render(), (node) => node.type === 'video'), 'onEnded');
    expect(elementProps(button('settings.app.animation.previewPlay')).disabled).toBe(false);
    await settle();
  });
  it('缺少视频Ref时播放和停止都保持初始状态', () => {
    invoke(button('settings.app.animation.previewPlay'), 'onClick');
    invoke(button('settings.app.animation.previewStop'), 'onClick');
    expect(elementProps(button('settings.app.animation.previewPlay')).disabled).toBe(false);
    expect(elementProps(button('settings.app.animation.previewStop')).disabled).toBe(true);
  });
});
