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
 * @file useIslandDragRuntime.test.ts
 * @description 灵动岛拖动真实系统坐标、阈值/位置锁/按键边界、原生失败和点击等待清理补充测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { useIslandDrag } from '../useIslandDrag';
import { deferredBackground, settleBackground } from './standaloneIpcHarness';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
type Options = Parameters<typeof useIslandDrag>[0];
let documentEvents: EventTarget; let windowEvents: EventTarget;
const frames = new Map<number, FrameRequestCallback>(); let nextFrame = 0;
let position = { x: 100, y: 200 };
const getMousePosition = vi.fn(() => Promise.resolve({ ...position }));
const moveWindowDelta = vi.fn<(x: number, y: number) => void>();
const cancelFrame = vi.fn((id: number) => { frames.delete(id); });
beforeEach(() => {
  resetLifecycle(); vi.clearAllMocks(); frames.clear(); nextFrame = 0; position = { x: 100, y: 200 };
  getMousePosition.mockReset().mockImplementation(() => Promise.resolve({ ...position })); moveWindowDelta.mockReset();
  documentEvents = new EventTarget(); windowEvents = new EventTarget();
  vi.stubGlobal('document', documentEvents); vi.stubGlobal('window', Object.assign(windowEvents, { api: { getMousePosition, moveWindowDelta } }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++nextFrame; frames.set(id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', cancelFrame);
});
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
/**
 * 运行真实拖动 Hook 的状态引用、订阅和清理。
 * @param input - 实际形态和位置锁参数。
 * @returns 实际点击包装函数。
 */
function mount(input: Options = { shapeMode: 'pill', state: 'idle', positionLockedRef: { current: false } }) {
  const result = renderWithHooks(() => useIslandDrag(input)); runEffects(); return result;
}
/**
 * 用原生事件目标发送鼠标叶接口，不模拟窗口位置计算。
 * @param type - 鼠标事件名称。
 * @param button - 发生动作的鼠标按键。
 * @param buttons - 当前按住的鼠标按键位集合。
 */
function mouse(type: string, button = 0, buttons = 1): void {
  documentEvents.dispatchEvent(Object.assign(new Event(type), { button, buttons }));
}
/**
 * 浏览器只运行仍在请求队列中的下一帧，保留取消动画帧的语义。
 */
function frame(): void {
  const entry = frames.entries().next().value; if (!entry) return;
  const [id, callback] = entry; frames.delete(id); callback(16);
}
describe('真实拖动生命周期补充分支', () => {
  it.each(['idle', 'lyrics', 'lyricsTranslation', 'agentVoiceInput'] as const)('pill状态%s用系统DIP坐标执行移动', async (state) => {
    mount({ state, shapeMode: 'pill', positionLockedRef: { current: false } });
    mouse('mousedown'); position = { x: 100, y: 206 }; mouse('mousemove'); frame(); await settleBackground();
    expect(moveWindowDelta).toHaveBeenCalledExactlyOnceWith(0, 6);
  });
  it.each([{ shapeMode: 'notch', state: 'idle' }, { shapeMode: 'pill', state: 'hover' }, { shapeMode: 'pill', state: 'cli' }] satisfies Array<Pick<Options, 'shapeMode' | 'state'>>)('不可拖动$shapeMode/$state不订阅鼠标', ({ shapeMode, state }) => {
    const click = vi.fn(); const result = mount({ shapeMode, state, positionLockedRef: { current: false } });
    mouse('mousedown'); mouse('mousemove'); expect(getMousePosition).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
    result.wrapClick(click)(); expect(click).toHaveBeenCalledOnce();
  });
  it('右键按下和非左键释放不启动或中断左键手势', async () => {
    mount(); mouse('mousedown', 2); mouse('mousemove'); expect(getMousePosition).not.toHaveBeenCalled();
    mouse('mousedown'); position = { x: 110, y: 200 }; mouse('mousemove'); mouse('mouseup', 2); frame(); await settleBackground();
    expect(moveWindowDelta).toHaveBeenCalledExactlyOnceWith(10, 0);
  });
  it.each(['down', 'move', 'frame', 'await'] as const)('位置锁在%s阶段改变时停止移动且保留点击可用性', async (stage) => {
    const locked = { current: stage === 'down' }; const input = { shapeMode: 'pill' as const, state: 'idle' as const, positionLockedRef: locked };
    const result = mount(input); mouse('mousedown'); position = { x: 120, y: 200 };
    if (stage === 'move') locked.current = true;
    mouse('mousemove');
    if (stage === 'frame') locked.current = true;
    frame(); if (stage === 'await') locked.current = true; await settleBackground();
    expect(moveWindowDelta).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
    const click = vi.fn(); await Promise.resolve(result.wrapClick(click)()); expect(click).toHaveBeenCalledOnce();
  });
  it.each([{ x: 4, y: 4, moves: 0 }, { x: -4, y: -4, moves: 0 }, { x: 4, y: 5, moves: 1 }, { x: 5, y: 4, moves: 1 }])('阈值边界$x/$y控制拖动和点击', async ({ x, y, moves }) => {
    const result = mount(); mouse('mousedown'); position = { x: 100 + x, y: 200 + y }; mouse('mousemove'); frame(); await settleBackground();
    expect(moveWindowDelta).toHaveBeenCalledTimes(moves);
    const click = vi.fn(); await Promise.resolve(result.wrapClick(click)()); expect(click).toHaveBeenCalledTimes(moves === 0 ? 1 : 0);
  });
  it.each(['initial', 'movement'] as const)('系统坐标%s读取抛错后取消手势，后续鼠标移动不排帧', async (failure) => {
    mount(); if (failure === 'initial') getMousePosition.mockRejectedValueOnce(new Error('closed'));
    mouse('mousedown'); if (failure === 'movement') getMousePosition.mockRejectedValueOnce(new Error('closed'));
    mouse('mousemove'); frame(); await settleBackground(); mouse('mousemove');
    expect(moveWindowDelta).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
  });
  it('原生窗口移动同步抛错由真实applyMovement处理，取消手势且不传播错误', async () => {
    const result = mount(); moveWindowDelta.mockImplementationOnce(() => { throw new Error('window-destroyed'); });
    mouse('mousedown'); position = { x: 120, y: 200 }; mouse('mousemove'); frame(); await settleBackground();
    mouse('mousemove'); expect(frames.size).toBe(0); expect(moveWindowDelta).toHaveBeenCalledOnce();
    const click = vi.fn(); await Promise.resolve(result.wrapClick(click)()); expect(click).not.toHaveBeenCalled();
  });
  it('鼠标释放同步刷新最后一帧，尚未完成的坐标读取让点击等待真实结果', async () => {
    const result = mount(); const sample = deferredBackground<{ x: number; y: number }>();
    getMousePosition.mockReturnValueOnce(sample.promise); mouse('mousedown'); mouse('mousemove'); mouse('mouseup');
    expect(cancelFrame).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    const click = vi.fn(); const completion = Promise.resolve(result.wrapClick(click)());
    expect(click).not.toHaveBeenCalled(); sample.resolve({ x: 100, y: 200 }); await completion; await settleBackground();
    expect(click).toHaveBeenCalledOnce(); expect(moveWindowDelta).not.toHaveBeenCalled();
  });
  it('等待点击期间窗口失焦取消手势，已取消采样不会触发点击', async () => {
    const result = mount(); const sample = deferredBackground<{ x: number; y: number }>();
    getMousePosition.mockReturnValueOnce(sample.promise); mouse('mousedown');
    const click = vi.fn(); const completion = Promise.resolve(result.wrapClick(click)()); windowEvents.dispatchEvent(new Event('blur'));
    sample.resolve({ x: 100, y: 200 }); await completion; await settleBackground();
    expect(click).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
  });
  it('调用方点击动作抛错时实际包装器安全处理，有无手势均不传播', async () => {
    const result = mount(); const click = vi.fn(() => { throw new Error('native-resize-failed'); });
    await Promise.resolve(result.wrapClick(click)()); mouse('mousedown'); await Promise.resolve(result.wrapClick(click)());
    expect(click).toHaveBeenCalledTimes(2);
  });
  it('从pill切换notch执行真实cleanup，已拖动标记重置且无监听残留', async () => {
    const locked = { current: false }; mount({ shapeMode: 'pill', state: 'idle', positionLockedRef: locked });
    mouse('mousedown'); position = { x: 120, y: 200 }; mouse('mousemove'); frame(); await settleBackground();
    const result = mount({ shapeMode: 'notch', state: 'idle', positionLockedRef: locked });
    const click = vi.fn(); await Promise.resolve(result.wrapClick(click)()); expect(click).toHaveBeenCalledOnce();
    getMousePosition.mockClear(); mouse('mousedown'); mouse('mousemove'); expect(getMousePosition).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
  });
});
