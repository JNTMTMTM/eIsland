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
 * @file themeSettingsPageInteractions.test.ts
 * @description 主题设置真实异步字体、持久化失败、输入边界及视频生命周期回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeSettingsPage } from '../ThemeSettingsPage';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../../test/elementHarness';
import makeAppSettingsProps from './appSettingsFixture';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './themeHookHarness';
import type { ReactNode } from 'react';
const mocks = vi.hoisted(() => ({
  store: {
    setNotification: vi.fn()
  },
  inject: vi.fn<(name: string, data: string, ext: string) => string>(() => 'Injected Font'),
  release: vi.fn<(prefix: string) => void>()
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
  default: (select: (state: typeof mocks.store) => unknown) => select(mocks.store)
}));
vi.mock('../../../../../../../../../utils/font', () => ({
  injectFontFace: mocks.inject,
  releaseCustomFonts: mocks.release
}));
interface FontFile {
  name: string;
  path: string;
  data: string;
  ext: string;
}
const api = {
  storeRead: vi.fn<(key: string) => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<boolean>>(),
  settingsPreview: vi.fn<(channel: string, value: unknown) => Promise<boolean>>(),
  readFontFile: vi.fn<(path: string) => Promise<FontFile | null>>(),
  openFontDialog: vi.fn<() => Promise<FontFile | null>>()
};
const css = vi.fn<(name: string, value: string) => void>();
const dispatch = vi.fn<(event: CustomEvent) => void>();
let props: ReturnType<typeof makeAppSettingsProps>;
const fonts = [{
  name: 'Custom',
  path: 'C:/custom.ttf'
}, {
  name: 'Other',
  path: 'C:/other.otf'
}];
/**
 * 执行组件真实求值并保留局部状态。
 * @returns 实际元素树。
 */
function render(): ReturnType<typeof ThemeSettingsPage> {
  return renderWithHooks(() => ThemeSettingsPage(props));
}
/**
 * 等待组件注册的 Promise 链完成。
 * @returns 异步队列完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/**
 * 按可见文本选择真实按钮。
 * @param tree - 实际元素树。
 * @param label - 可见文本或翻译键。
 * @returns 对应按钮。
 */
function button(tree: ReactNode, label: string) {
  return findElement(tree, (node) => node.type === 'button' && textContent(node) === label);
}
/**
 * 按标签定位真实复选框。
 * @param tree - 实际元素树。
 * @param label - 复选框标签翻译键。
 * @returns 对应输入元素。
 */
function checkbox(tree: ReactNode, label: string) {
  return findElement(findElement(tree, (node) => node.type === 'label' && textContent(node).includes(label)), (node) => node.type === 'input');
}
/**
 * 按标题定位字体卡片。
 * @param kind - UI 或歌词字体。
 * @returns 对应真实卡片。
 */
function fontCard(kind: 'ui' | 'lyrics') {
  return findElement(render(), (node) => elementProps(node).className === 'settings-card' && textContent(node).includes(`settings.app.theme.${kind === 'ui' ? 'uiFontTitle' : 'lyricsFontTitle'}`));
}
/**
 * 通过实际读取 effect 加载自定义字体。
 * @param kind - 字体类别。
 * @param selected - 已选择字体配置。
 * @returns 读取链完成。
 */
async function loadFonts(kind: 'ui' | 'lyrics', selected = 'default'): Promise<void> {
  api.storeRead.mockImplementation((key) => {
    if (key === `${kind}-custom-fonts`) return Promise.resolve(fonts);
    if (key === `${kind}-font-family`) return Promise.resolve(selected);
    return Promise.resolve(undefined);
  });
  render();
  runEffects();
  await settle();
}
beforeEach(() => {
  vi.clearAllMocks();
  resetLifecycle();
  props = makeAppSettingsProps();
  api.storeRead.mockResolvedValue(undefined);
  api.storeWrite.mockResolvedValue(true);
  api.settingsPreview.mockResolvedValue(true);
  api.readFontFile.mockResolvedValue({
    ...fonts[0],
    data: 'base64',
    ext: 'ttf'
  });
  api.openFontDialog.mockResolvedValue({
    name: 'Added',
    path: 'C:/added.ttf',
    data: 'new-data',
    ext: 'ttf'
  });
  vi.stubGlobal('window', {
    api,
    dispatchEvent: dispatch
  });
  vi.stubGlobal('document', {
    documentElement: {
      style: {
        setProperty: css
      }
    }
  });
  vi.stubGlobal('CustomEvent', class {
    type: string;

    detail: unknown;

    constructor(type: string, options: {
      detail: unknown;
    }) {
      this.type = type;
      this.detail = options.detail;
    }
  });
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('主题读取与生命周期', () => {
  it.each([true, false, 'invalid'])('只接受布尔光圈值 %s 和有效字体配置', async (enabled) => {
    api.storeRead.mockImplementation((key) => {
      if (key === 'music-outer-glow-effect-enabled') return Promise.resolve(enabled);
      if (key.endsWith('custom-fonts')) return Promise.resolve(fonts);
      return Promise.resolve('simhei');
    });
    render();
    runEffects();
    await settle();
    expect(elementProps(checkbox(render(), 'settings.app.theme.musicOuterGlowToggle')).checked).toBe(typeof enabled === 'boolean' ? enabled : true);
    expect(textContent(render())).toContain('Custom');
    expect(elements(fontCard('ui')).some((node) => node.key === 'simhei' && String(elementProps(node).className).includes('active'))).toBe(true);
  });
  it('忽略非法字体配置，并处理读取拒绝', async () => {
    api.storeRead.mockResolvedValue(42);
    render();
    runEffects();
    await settle();
    expect(elements(render()).some((node) => node.key === fonts[0].path)).toBe(false);
    resetLifecycle();
    api.storeRead.mockRejectedValue(new Error('read failed'));
    render();
    runEffects();
    await settle();
    expect(elementProps(checkbox(render(), 'settings.app.theme.musicOuterGlowToggle')).checked).toBe(true);
  });
  it('卸载后忽略迟到的光圈和字体读取结果', async () => {
    let resolve: ((value: unknown) => void) | undefined;
    const pending = new Promise<unknown>((done) => {
      resolve = done;
    });
    api.storeRead.mockReturnValue(pending);
    render();
    runEffects();
    unmountHooks();
    resolve?.(false);
    await settle();
    expect(elementProps(checkbox(render(), 'settings.app.theme.musicOuterGlowToggle')).checked).toBe(true);
  });
});
describe('字体真实异步交互', () => {
  it.each(['ui', 'lyrics'] as const)('%s预设字体释放自定义字体并持久化CSS', async (kind) => {
    api.storeWrite.mockRejectedValue(new Error('write'));
    elements(fontCard(kind)).filter((entry) => entry.type === 'button' && entry.key).forEach((node) => {
      invoke(node, 'onClick');
      expect(mocks.release).toHaveBeenLastCalledWith(kind === 'ui' ? 'eIsland-UI' : 'eIsland-Lyrics');
      expect(api.storeWrite).toHaveBeenLastCalledWith(`${kind}-font-family`, node.key);
    });
    expect(css).toHaveBeenCalled();
    await settle();
  });
  it.each(['ui', 'lyrics'] as const)('%s自定义字体读取成功、缺失及拒绝', async (kind) => {
    await loadFonts(kind);
    invoke(findElement(fontCard(kind), (node) => node.type === 'button' && node.key === fonts[0].path), 'onClick');
    await settle();
    expect(mocks.inject).toHaveBeenCalledWith(`eIsland-${kind === 'ui' ? 'UI' : 'Lyrics'}-Custom`, 'base64', 'ttf');
    expect(css).toHaveBeenCalledWith(`--island-${kind === 'ui' ? 'ui' : 'lyrics'}-font`, 'Injected Font');
    api.readFontFile.mockResolvedValue(null);
    invoke(findElement(fontCard(kind), (node) => node.type === 'button' && node.key === fonts[1].path), 'onClick');
    await settle();
    expect(mocks.inject).toHaveBeenCalledTimes(1);
    api.readFontFile.mockRejectedValue(new Error('missing'));
    api.storeWrite.mockRejectedValue(new Error('write'));
    invoke(findElement(fontCard(kind), (node) => node.type === 'button' && node.key === fonts[0].path), 'onClick');
    await settle();
    expect(mocks.inject).toHaveBeenCalledTimes(1);
  });
  it.each(['ui', 'lyrics'] as const)('%s删除非选中及当前字体时阻止冒泡并回退', async (kind) => {
    await loadFonts(kind, `custom:${fonts[0].path}`);
    const stop = vi.fn();
    const second = findElement(fontCard(kind), (node) => node.key === fonts[1].path);
    invoke(findElement(second, (node) => elementProps(node).className === 'settings-font-delete'), 'onClick', {
      stopPropagation: stop
    });
    expect(api.storeWrite).toHaveBeenLastCalledWith(`${kind}-custom-fonts`, [fonts[0]]);
    expect(mocks.release).not.toHaveBeenCalled();
    api.storeWrite.mockRejectedValue(new Error('write'));
    const first = findElement(fontCard(kind), (node) => node.key === fonts[0].path);
    invoke(findElement(first, (node) => elementProps(node).className === 'settings-font-delete'), 'onClick', {
      stopPropagation: stop
    });
    await settle();
    expect(stop).toHaveBeenCalledTimes(2);
    expect(api.storeWrite).toHaveBeenLastCalledWith(`${kind}-font-family`, 'default');
    expect(elements(fontCard(kind)).some((node) => node.key === fonts[0].path)).toBe(false);
  });
  it.each(['ui', 'lyrics'] as const)('%s导入字体支持取消、重复、成功及失败', async (kind) => {
    await loadFonts(kind);
    const add = () => invoke(button(fontCard(kind), '+ settings.app.theme.addCustomFont'), 'onClick');
    api.openFontDialog.mockResolvedValue(null);
    add();
    await settle();
    expect(api.storeWrite).not.toHaveBeenCalled();
    api.openFontDialog.mockResolvedValue({
      ...fonts[0],
      data: 'base64',
      ext: 'ttf'
    });
    add();
    await settle();
    expect(api.storeWrite).not.toHaveBeenCalled();
    api.openFontDialog.mockResolvedValue({
      name: 'Added',
      path: 'C:/added.ttf',
      data: 'new-data',
      ext: 'ttf'
    });
    api.storeWrite.mockRejectedValue(new Error('write'));
    add();
    await settle();
    expect(api.storeWrite).toHaveBeenCalledWith(`${kind}-custom-fonts`, [...fonts, {
      name: 'Added',
      path: 'C:/added.ttf'
    }]);
    expect(api.storeWrite).toHaveBeenCalledWith(`${kind}-font-family`, 'custom:C:/added.ttf');
    expect(textContent(fontCard(kind))).toContain('Added');
    api.openFontDialog.mockRejectedValue(new Error('dialog'));
    add();
    await settle();
    expect(mocks.inject).toHaveBeenCalledTimes(1);
  });
});
describe('设置回调与背景输入边界', () => {
  it('主题切换转发指针位置、窗口控件同值忽略、光圈通知和背景同步', async () => {
    api.storeWrite.mockRejectedValue(new Error('write'));
    api.settingsPreview.mockRejectedValue(new Error('preview'));
    props.applyThemeMode = vi.fn(() => Promise.reject(new Error('theme')));
    const tree = render();
    ['dark', 'light', 'system'].forEach((mode) => {
      invoke(button(tree, `settings.app.theme.${mode}`), 'onClick', {
        clientX: 23,
        clientY: 45
      });
      expect(props.applyThemeMode).toHaveBeenLastCalledWith(mode, {
        x: 23,
        y: 45
      });
    });
    const controls = checkbox(tree, 'settings.app.theme.windowControlsMacToggle');
    invoke(controls, 'onChange', {
      target: {
        checked: false
      }
    });
    expect(props.setStandaloneMacControls).not.toHaveBeenCalled();
    invoke(controls, 'onChange', {
      target: {
        checked: true
      }
    });
    expect(mocks.store.setNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'restart-required'
    }));
    invoke(checkbox(tree, 'settings.app.theme.musicOuterGlowToggle'), 'onChange', {
      target: {
        checked: false
      }
    });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      detail: false,
      type: 'music-outer-glow-effect-changed'
    }));
    invoke(checkbox(tree, 'settings.app.theme.syncDesktopWallpaperToggle'), 'onChange', {
      target: {
        checked: true
      }
    });
    expect(props.setSyncDesktopWallpaperOnBackgroundChange).toHaveBeenCalledWith(true);
    await settle();
  });
  it('内置图片选择、图片和视频导入失败、清除和图片预览', async () => {
    props.bgMediaType = 'image';
    props.bgMediaPreviewUrl = 'image-url';
    props.handleSelectBgImage = vi.fn(() => Promise.reject(new Error('image')));
    props.handleSelectBgVideo = vi.fn(() => Promise.reject(new Error('video')));
    const tree = render();
    const wallpaper = findElement(tree, (node) => node.type === 'button' && String(elementProps(node).className).includes('settings-bg-gallery-item'));
    invoke(wallpaper, 'onClick');
    const source = elementProps(findElement(wallpaper, (node) => node.type === 'img')).src;
    expect(props.handleSelectBuiltinBgImage).toHaveBeenCalledWith(source, expect.any(Number));
    props.bgMediaPreviewUrl = String(source);
    expect(String(elementProps(findElement(render(), (node) => node.key === wallpaper.key)).className)).toContain('active');
    invoke(button(tree, 'settings.app.theme.changeImage'), 'onClick');
    invoke(button(tree, 'settings.app.theme.selectVideo'), 'onClick');
    invoke(button(tree, 'settings.app.theme.clearBackground'), 'onClick');
    expect(props.handleClearBgImage).toHaveBeenCalledOnce();
    await settle();
  });
  it.each([{
    max: 100,
    min: 0,
    set: 'setBgImageOpacity',
    apply: 'applyBgOpacity',
    persist: 'persistBgOpacity',
    ref: 'bgOpacitySaveTimerRef',
    initial: 100,
    fallback: 30
  }, {
    max: 20,
    min: 0,
    set: 'setBgImageBlur',
    apply: 'applyBgBlur',
    persist: 'persistBgBlur',
    ref: 'bgBlurSaveTimerRef',
    initial: 100,
    fallback: 0
  }, {
    max: 100,
    min: 10,
    set: 'setIslandOpacity',
    apply: 'applyIslandOpacity',
    persist: 'persistIslandOpacity',
    ref: 'opacitySaveTimerRef',
    initial: 100,
    fallback: 100
  }] as const)('$apply限制输入并去重保存，失焦清除待保存定时器', async ({
    max,
    min,
    set,
    apply,
    persist,
    ref,
    initial,
    fallback
  }) => {
    vi.useFakeTimers();
    api.settingsPreview.mockRejectedValue(new Error('preview'));
    props.bgMediaType = 'image';
    props.bgMediaPreviewUrl = 'image-url';
    const slider = findElement(render(), (node) => node.type === 'input' && elementProps(node).type === 'range' && elementProps(node).min === min && elementProps(node).max === max);
    ([['-10', min], ['1000', max], ['12.7', 13], ['NaN', fallback]] as const).forEach(([value, expected]) => {
      invoke(slider, 'onChange', {
        target: {
          value
        }
      });
      expect(props[set]).toHaveBeenLastCalledWith(expected);
      expect(props[apply]).toHaveBeenLastCalledWith(expected);
    });
    vi.advanceTimersByTime(220);
    expect(props[persist]).toHaveBeenCalledOnce();
    expect(props[persist]).toHaveBeenCalledWith(fallback);
    expect(props[ref].current).toBeNull();
    invoke(slider, 'onBlur');
    expect(props[persist]).toHaveBeenLastCalledWith(initial);
    invoke(slider, 'onChange', {
      target: {
        value: '25'
      }
    });
    invoke(slider, 'onBlur');
    vi.runAllTimers();
    expect(props[persist]).toHaveBeenCalledTimes(3);
    await settle();
  });
  it('视频声音、循环、硬解码、填充和播放速度即时预览并持久化', async () => {
    props.bgMediaType = 'video';
    props.bgMediaPreviewUrl = 'video-url';
    api.settingsPreview.mockRejectedValue(new Error('preview'));
    const tree = render();
    ([['videoMutedToggle', 'applyBgVideoMuted', 'persistBgVideoMuted'], ['videoLoopToggle', 'applyBgVideoLoop', 'persistBgVideoLoop'], ['videoHwDecodeToggle', 'applyBgVideoHwDecode', 'persistBgVideoHwDecode']] as const).forEach(([label, apply, persist]) => {
      invoke(checkbox(tree, `settings.app.theme.${label}`), 'onChange', {
        target: {
          checked: true
        }
      });
      expect(props[apply]).toHaveBeenCalledWith(true);
      expect(props[persist]).toHaveBeenCalledWith(true);
    });
    ['cover', 'contain'].forEach((fit) => {
      invoke(button(tree, `settings.app.theme.videoFit${fit === 'cover' ? 'Cover' : 'Contain'}`), 'onClick');
      expect(props.persistBgVideoFit).toHaveBeenLastCalledWith(fit);
    });
    [0.5, 0.75, 1, 1.25, 1.5, 2].forEach((rate) => {
      invoke(button(tree, `${rate === 1 || rate === 2 ? rate.toFixed(1) : String(rate)}x`), 'onClick');
      expect(props.persistBgVideoRate).toHaveBeenLastCalledWith(rate);
    });
    const sliders = elements(tree).filter((node) => node.type === 'input' && elementProps(node).type === 'range' && elementProps(node).max === 100 && elementProps(node).min === 0);
    const [, volume] = sliders;
    ([['-1', 0], ['200', 1], ['30', 0.3], ['NaN', 0.6]] as const).forEach(([value, expected]) => {
      invoke(volume, 'onChange', {
        target: {
          value
        }
      });
      expect(props.persistBgVideoVolume).toHaveBeenLastCalledWith(expected);
    });
    expect(textContent(tree)).toContain('settings.app.theme.changeVideo');
    await settle();
  });
  it('自动变暗启停及延迟输入边界', () => {
    props.autoDimEnabled = true;
    const tree = render();
    invoke(checkbox(tree, 'settings.app.theme.autoDimToggle'), 'onChange', {
      target: {
        checked: false
      }
    });
    expect(props.handleAutoDimEnabledChange).toHaveBeenCalledWith(false);
    const slider = findElement(tree, (node) => node.type === 'input' && elementProps(node).max === 120);
    ([['-1', 1], ['200', 120], ['3.7', 4], ['NaN', 10]] as const).forEach(([value, expected]) => {
      invoke(slider, 'onChange', {
        target: {
          value
        }
      });
      expect(props.handleAutoDimDelayChange).toHaveBeenLastCalledWith(expected);
    });
  });
});
interface VideoFixture {
  loop: boolean;
  volume: number;
  playbackRate: number;
  currentTime: number;
  duration: number;
  ended: boolean;
  play: ReturnType<typeof vi.fn<() => Promise<void>>>;
  addEventListener: ReturnType<typeof vi.fn<(name: string, callback: () => void) => void>>;
  removeEventListener: ReturnType<typeof vi.fn<(name: string, callback: () => void) => void>>;
}
describe('视频预览生命周期', () => {
  it.each([true, false])('循环=%s处理ended/timeupdate、属性同步及监听清理', async (loop) => {
    props.bgMediaType = 'video';
    props.bgMediaPreviewUrl = 'video-url';
    props.bgVideoLoop = loop;
    props.bgVideoVolume = 2;
    props.bgVideoRate = 5;
    const listeners = new Map<string, () => void>();
    const video: VideoFixture = {
      loop: true,
      volume: 0,
      playbackRate: 1,
      currentTime: 9.95,
      duration: 10,
      ended: true,
      play: vi.fn(() => Promise.reject(new Error('autoplay denied'))),
      addEventListener: vi.fn((name, callback) => {
        listeners.set(name, callback);
      }),
      removeEventListener: vi.fn((name, callback) => {
        if (listeners.get(name) === callback) listeners.delete(name);
      })
    };
    const tree = render();
    const node = findElement(tree, (entry) => entry.type === 'video');
    const ref = elementProps(node).ref as {
      current: VideoFixture | null;
    };
    ref.current = video;
    runEffects();
    await settle();
    expect(video.volume).toBe(1);
    expect(video.playbackRate).toBe(3);
    expect(video.loop).toBe(false);
    listeners.get('ended')?.();
    listeners.get('timeupdate')?.();
    expect(video.play).toHaveBeenCalledTimes(loop ? 2 : 0);
    if (loop) {
      [Number.NaN, 0, -2, Number.POSITIVE_INFINITY].forEach((duration) => {
        video.duration = duration;
        listeners.get('timeupdate')?.();
      });
      video.duration = 10;
      video.currentTime = 4;
      listeners.get('timeupdate')?.();
      expect(video.play).toHaveBeenCalledTimes(2);
      video.currentTime = 9.99;
      listeners.get('timeupdate')?.();
      expect(video.play).toHaveBeenCalledTimes(3);
      Object.defineProperty(video, 'currentTime', {
        configurable: true,
        get: () => 9.99,
        set: () => {
          throw new Error('not seekable');
        }
      });
      listeners.get('ended')?.();
      expect(video.play).toHaveBeenCalledTimes(4);
      props.bgVideoLoop = false;
      render();
      runEffects();
      listeners.get('ended')?.();
      listeners.get('timeupdate')?.();
      expect(video.play).toHaveBeenCalledTimes(4);
    }
    invoke(node, 'onLoadedMetadata', {
      currentTarget: video
    });
    invoke(node, 'onCanPlay', {
      currentTarget: video
    });
    await settle();
    expect(video.volume).toBe(1);
    expect(video.playbackRate).toBe(3);
    unmountHooks();
    expect(listeners.size).toBe(0);
    expect(video.removeEventListener).toHaveBeenCalledTimes(2);
  });
  it('无元素、缺预览地址和未结束视频不播放；循环切换时处理不可seek媒体', async () => {
    props.bgMediaType = 'video';
    props.bgMediaPreviewUrl = null;
    props.bgVideoLoop = true;
    render();
    runEffects();
    props.bgMediaPreviewUrl = 'url';
    render();
    runEffects();
    const video = {
      loop: true,
      volume: 1,
      playbackRate: 1,
      currentTime: 4,
      duration: 10,
      ended: false,
      play: vi.fn(() => Promise.reject(new Error('denied'))),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    const node = findElement(render(), (entry) => entry.type === 'video');
    (elementProps(node).ref as {
      current: typeof video;
    }).current = video;
    props.bgVideoVolume = -2;
    props.bgVideoRate = 0;
    props.bgVideoLoop = false;
    render();
    runEffects();
    expect(video.volume).toBe(0);
    expect(video.playbackRate).toBe(0.25);
    props.bgVideoLoop = true;
    render();
    runEffects();
    expect(video.play).not.toHaveBeenCalled();
    props.bgVideoLoop = false;
    render();
    runEffects();
    video.ended = true;
    Object.defineProperty(video, 'currentTime', {
      get: () => 0,
      set: () => {
        throw new Error('not seekable');
      }
    });
    props.bgVideoLoop = true;
    render();
    runEffects();
    await settle();
    expect(video.play).toHaveBeenCalledOnce();
  });
});
