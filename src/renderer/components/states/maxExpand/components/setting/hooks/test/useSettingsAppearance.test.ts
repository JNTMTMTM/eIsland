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
 * @file useSettingsAppearance.test.ts
 * @description 外观 Hook 实际导航推导、布局保存、位置输入和窗口显示器变更回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsAppearance } from '../useSettingsAppearance';
import { renderWithHooks, resetLifecycle } from './settingsCoverageHarness';
const language = vi.hoisted(() => ({
  getLanguage: vi.fn(() => 'en-US'),
  setLanguage: vi.fn<() => Promise<void>>()
}));
vi.mock('../../../../../../../i18n', () => language);
vi.mock('../../../../../../../utils/theme', () => ({
  getThemeMode: () => 'system'
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
type Options = Parameters<typeof useSettingsAppearance>[0];
const notify = vi.fn<Options['setNotification']>();
const api = {
  islandOpacitySet: vi.fn<() => Promise<void>>(),
  storeWrite: vi.fn<(...args: unknown[]) => Promise<void>>(),
  settingsPreview: vi.fn<(...args: unknown[]) => Promise<void>>(),
  navOrderSet: vi.fn<(...args: unknown[]) => Promise<void>>(),
  setIslandPositionOffset: vi.fn<(...args: unknown[]) => Promise<void>>(),
  setIslandDisplaySelection: vi.fn<(...args: unknown[]) => Promise<void>>()
};
const dispatchEvent = vi.fn<(event: CustomEvent) => void>();
const t = ((key: string) => key) as Options['t'];
/**
 * 重新求值真实外观 Hook。
 * @returns 实际配置状态与操作。
 */
function render() {
  return renderWithHooks(() => useSettingsAppearance({
    t,
    setNotification: notify
  }));
}
/**
 * 等待持久化失败和备用存储回调。
 * @returns 异步回调处理完毕。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  Object.values(api).forEach((fn) => {
    fn.mockReset().mockResolvedValue(undefined);
  });
  language.setLanguage.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('window', {
    api,
    dispatchEvent
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('实际导航和布局推导', () => {
  it('可见/隐藏卡片去重、过滤未知项并补其余入口', () => {
    render().setNavOrder(['user-pro', 'music-lyrics', 'music-lyrics', 'unknown']);
    render().setHiddenNavOrder(['music-smtc', 'music-smtc', 'music-lyrics', 'unknown']);
    const state = render();
    expect(state.visibleCards.map(({
      id
    }) => id)).toEqual(['user-pro', 'music-lyrics']);
    expect(state.hiddenCards[0].id).toBe('music-smtc');
    expect(state.hiddenCards.map(({
      id
    }) => id)).not.toContain('music-lyrics');
    expect(new Set(state.hiddenCards.map(({
      id
    }) => id)).size).toBe(state.hiddenCards.length);
  });
  it('重置导航配置恢复默认并保存，同时隔离保存失败', async () => {
    const initial = render().navOrder;
    render().setNavOrder(['music-smtc']);
    render().setHiddenNavOrder(['user-pro']);
    api.navOrderSet.mockRejectedValue(new Error('save'));
    render().resetNavConfig();
    await settle();
    expect(render().navOrder).toEqual(initial);
    expect(render().hiddenNavOrder).toEqual([]);
    expect(api.navOrderSet).toHaveBeenCalledWith({
      visibleOrder: initial,
      hiddenOrder: []
    });
  });
  it('左右控件/时钟和有效渐变逐次更新布局，无效渐变不写入', async () => {
    api.storeWrite.mockRejectedValue(new Error('store'));
    render().updateLayout('left', 'song');
    render().updateLayout('right', 'album');
    render().updateClockStyle('minimal');
    expect(render().layoutConfig).toEqual(expect.objectContaining({
      left: 'song',
      right: 'album',
      clockStyle: 'minimal'
    }));
    api.storeWrite.mockClear();
    render().updateGradientColor('bad');
    expect(api.storeWrite).not.toHaveBeenCalled();
    render().updateGradientColor('#336699');
    await settle();
    expect(render().layoutConfig.gradientColors.middle).toBe('#336699');
    expect(api.storeWrite).toHaveBeenCalledWith('overview-layout', expect.objectContaining({
      left: 'song',
      right: 'album',
      clockStyle: 'minimal'
    }));
  });
  it('展开和全展开布局规范化后持久化并广播实际事件', async () => {
    api.storeWrite.mockRejectedValue(new Error('save'));
    render().updateExpandNavLayout([{
      id: 'overview',
      visible: false
    }, {
      id: 'song',
      visible: false
    }]);
    render().updateMaxExpandNavLayout([{
      id: 'todo',
      visible: false
    }]);
    await settle();
    expect(render().expandNavLayout).toEqual(expect.arrayContaining([{
      id: 'overview',
      visible: true
    }, {
      id: 'song',
      visible: false
    }]));
    expect(render().maxExpandNavLayout[0]).toEqual({
      id: 'todo',
      visible: false
    });
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'expand-nav-layout-changed',
      detail: render().expandNavLayout
    }));
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'maxexpand-nav-layout-changed',
      detail: render().maxExpandNavLayout
    }));
  });
});
describe('实际外观设置操作', () => {
  it('透明度持久化、语言切换失败不阻断本地状态', async () => {
    api.islandOpacitySet.mockRejectedValue(new Error('opacity'));
    api.settingsPreview.mockRejectedValue(new Error('preview'));
    language.setLanguage.mockRejectedValue(new Error('language'));
    render().persistIslandOpacity(45);
    render().applyAppLanguage('zh-TW');
    await settle();
    expect(api.islandOpacitySet).toHaveBeenCalledOnce();
    expect(render().appLanguage).toBe('zh-TW');
    expect(language.setLanguage).toHaveBeenCalledWith('zh-TW');
    expect(api.settingsPreview).toHaveBeenCalledWith('i18n:language', 'zh-TW');
  });
  it('自动变暗/延时和锁定位置本地、持久化、预览与事件保持一致', async () => {
    api.storeWrite.mockRejectedValue(new Error('write'));
    api.settingsPreview.mockRejectedValue(new Error('preview'));
    render().handleAutoDimEnabledChange(true);
    render().handleAutoDimDelayChange(999);
    render().handleIslandPositionLockedChange(true);
    await settle();
    expect(render().autoDimEnabled).toBe(true);
    expect(render().autoDimDelaySec).toBe(120);
    expect(render().islandPositionLocked).toBe(true);
    expect(api.storeWrite).toHaveBeenCalledWith('island-auto-dim-enabled', true);
    expect(api.storeWrite).toHaveBeenCalledWith('island-auto-dim-delay', 120);
    expect(api.storeWrite).toHaveBeenCalledWith('island-position-locked', true);
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'island-auto-dim-local-sync',
      detail: {
        autoDimEnabled: true
      }
    }));
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'island-position-lock-local-sync',
      detail: {
        locked: true
      }
    }));
  });
  it('合法坐标解析取整并限制范围；取消及非法坐标恢复当前值', async () => {
    api.setIslandPositionOffset.mockRejectedValue(new Error('position'));
    expect(render().islandPositionInputChanged).toBe(false);
    render().setIslandPositionInput({
      x: ' 9999 ',
      y: ' -9999 '
    });
    expect(render().islandPositionInputChanged).toBe(true);
    render().applyIslandPositionInput();
    await settle();
    expect(render().islandPositionOffset).toEqual({
      x: 2000,
      y: -1200
    });
    expect(api.setIslandPositionOffset).toHaveBeenCalledWith({
      x: 2000,
      y: -1200
    });
    render().setIslandPositionInput({
      x: 'bad',
      y: '0'
    });
    render().applyIslandPositionInput();
    expect(render().islandPositionInput).toEqual({
      x: '2000',
      y: '-1200'
    });
    render().setIslandPositionInput({
      x: '2000',
      y: 'Infinity'
    });
    expect(render().islandPositionInputChanged).toBe(true);
    render().applyIslandPositionInput();
    expect(render().islandPositionInput).toEqual({
      x: '2000',
      y: '-1200'
    });
    render().setIslandPositionInput({
      x: '1',
      y: '2'
    });
    render().cancelIslandPositionInput();
    expect(render().islandPositionInputChanged).toBe(false);
  });
  it.each(['primary', 'invalid'])('相同或无效显示器%s不重复请求', (selection) => {
    render().handleIslandDisplaySelectionChange(selection);
    expect(api.setIslandDisplaySelection).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
  it.each([true, false])('显示器选择API成功=%s，失败回退存储并提示重启', async (success) => {
    if (!success) api.setIslandDisplaySelection.mockRejectedValue(new Error('preload'));
    api.storeWrite.mockRejectedValue(new Error('store'));
    api.settingsPreview.mockRejectedValue(new Error('preview'));
    render().handleIslandDisplaySelectionChange(' 2 ');
    await settle();
    expect(render().islandDisplaySelection).toBe('2');
    expect(api.setIslandDisplaySelection).toHaveBeenCalledWith('2');
    expect(api.storeWrite).toHaveBeenCalledTimes(success ? 0 : 1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'restart-required',
      title: 'settings.app.notifications.configChanged.title',
      body: 'settings.app.notifications.displayChanged.body'
    }));
    expect(api.settingsPreview).toHaveBeenCalledWith('notification:show', expect.objectContaining({
      type: 'restart-required'
    }));
  });
});
