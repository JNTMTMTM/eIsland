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
 * @file useIslandDrag.test.ts
 * @description 验证灵动岛拖动的系统坐标采样、逐帧合并与手势取消。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useCallbackMock, useEffectMock, useRefMock } = vi.hoisted(() => ({
  useCallbackMock: vi.fn((callback: (...args: never[]) => unknown) => callback),
  useEffectMock: vi.fn(),
  useRefMock: vi.fn((initialValue: unknown) => ({ current: initialValue })),
}));

vi.mock('react', () => ({
  useCallback: useCallbackMock,
  useEffect: useEffectMock,
  useRef: useRefMock,
}));

type Listener = (event: MouseEvent) => void;

interface TestDocument {
  addEventListener: (type: string, listener: Listener) => void;
  removeEventListener: (type: string, listener: Listener) => void;
}

const originalWindow = (globalThis as Record<string, unknown>).window;
const originalDocument = (globalThis as Record<string, unknown>).document;
const originalRequestAnimationFrame = (globalThis as Record<string, unknown>).requestAnimationFrame;
const originalCancelAnimationFrame = (globalThis as Record<string, unknown>).cancelAnimationFrame;

const moveWindowDeltaMock = vi.fn();
const getMousePositionMock = vi.fn();
let cursor = { x: 100, y: 200 };
const listeners = new Map<string, Listener>();
const windowListeners = new Map<string, Listener>();
const frameCallbacks = new Map<number, FrameRequestCallback>();
let nextFrameId = 1;
let cleanup: (() => void) | undefined;

const dispatchMouseEvent = (type: string, event: Partial<MouseEvent> = {}): void => {
  listeners.get(type)?.({ button: 0, buttons: 1, ...event } as MouseEvent);
};

const settlePositionReads = async (): Promise<void> => {
  await new Promise<void>((resolve) => setImmediate(resolve));
};

const flushAnimationFrame = (frameId: number): void => {
  const callback = frameCallbacks.get(frameId);
  frameCallbacks.delete(frameId);
  callback?.(performance.now());
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  listeners.clear();
  windowListeners.clear();
  frameCallbacks.clear();
  cursor = { x: 100, y: 200 };
  getMousePositionMock.mockReset();
  getMousePositionMock.mockImplementation(() => Promise.resolve({ ...cursor }));
  nextFrameId = 1;
  cleanup = undefined;

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      api: { moveWindowDelta: moveWindowDeltaMock, getMousePosition: getMousePositionMock },
      addEventListener: (type: string, listener: Listener) => windowListeners.set(type, listener),
      removeEventListener: (type: string) => windowListeners.delete(type),
    },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
      removeEventListener: (type: string) => listeners.delete(type),
    } satisfies TestDocument,
  });
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (callback: FrameRequestCallback) => {
      const frameId = nextFrameId++;
      frameCallbacks.set(frameId, callback);
      return frameId;
    },
  });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    value: (frameId: number) => frameCallbacks.delete(frameId),
  });
  useEffectMock.mockImplementation((effect: () => (() => void) | undefined) => {
    cleanup = effect();
  });
});

describe('useIslandDrag', () => {
  it('coalesces mouse movement until the next animation frame', async () => {
    const { useIslandDrag } = await import('../useIslandDrag');
    const positionLockedRef = { current: false };
    useIslandDrag({ positionLockedRef, shapeMode: 'pill', state: 'idle' });

    dispatchMouseEvent('mousedown', { button: 0, screenX: 100, screenY: 200 });
    dispatchMouseEvent('mousemove', { screenX: 110, screenY: 205 });
    dispatchMouseEvent('mousemove', { screenX: 118, screenY: 211 });
    cursor = { x: 118, y: 211 };

    expect(moveWindowDeltaMock).not.toHaveBeenCalled();
    expect(frameCallbacks.size).toBe(1);

    const [frameId] = frameCallbacks.keys();
    flushAnimationFrame(frameId);
    await settlePositionReads();

    expect(moveWindowDeltaMock).toHaveBeenCalledTimes(1);
    expect(moveWindowDeltaMock).toHaveBeenCalledWith(18, 11);
    expect(getMousePositionMock).toHaveBeenCalledTimes(2);
  });

  it('flushes pending movement when the mouse is released', async () => {
    const { useIslandDrag } = await import('../useIslandDrag');
    const positionLockedRef = { current: false };
    useIslandDrag({ positionLockedRef, shapeMode: 'pill', state: 'idle' });

    dispatchMouseEvent('mousedown', { button: 0, screenX: 100, screenY: 200 });
    dispatchMouseEvent('mousemove', { screenX: 110, screenY: 205 });
    cursor = { x: 110, y: 205 };
    dispatchMouseEvent('mouseup');
    await settlePositionReads();

    expect(moveWindowDeltaMock).toHaveBeenCalledTimes(1);
    expect(moveWindowDeltaMock).toHaveBeenCalledWith(10, 5);
    expect(frameCallbacks.size).toBe(0);
  });

  it('does not move the island while its position is locked', async () => {
    const { useIslandDrag } = await import('../useIslandDrag');
    const positionLockedRef = { current: true };
    useIslandDrag({ positionLockedRef, shapeMode: 'pill', state: 'idle' });

    dispatchMouseEvent('mousedown', { button: 0, screenX: 100, screenY: 200 });
    dispatchMouseEvent('mousemove', { screenX: 120, screenY: 220 });

    expect(moveWindowDeltaMock).not.toHaveBeenCalled();
    expect(frameCallbacks.size).toBe(0);
  });
  it('does not attach drag listeners for non-draggable states', async () => {
    const { useIslandDrag } = await import('../useIslandDrag');
    const positionLockedRef = { current: false };
    useIslandDrag({ positionLockedRef, shapeMode: 'notch', state: 'idle' });

    expect(listeners.size).toBe(0);
  });

  it('ignores screen-coordinate jumps when the native cursor stays still after collapse', async () => {
    const getMousePosition = vi.fn().mockResolvedValue({ x: 100, y: 200 });
    Object.assign(window.api, { getMousePosition });
    const { useIslandDrag } = await import('../useIslandDrag');
    const { wrapClick } = useIslandDrag({ shapeMode: 'pill', state: 'idle', positionLockedRef: { current: false } });
    const click = vi.fn();

    dispatchMouseEvent('mousedown', { button: 0, screenX: 100, screenY: 200 });
    dispatchMouseEvent('mousemove', { buttons: 1, screenX: 450, screenY: 200 });
    flushAnimationFrame([...frameCallbacks.keys()][0]);
    await settlePositionReads();
    dispatchMouseEvent('mouseup');
    wrapClick(click)();
    await settlePositionReads();

    expect(moveWindowDeltaMock).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
  });

  it('cancels queued movement if mouseup was missed and the left button is no longer held', async () => {
    const { useIslandDrag } = await import('../useIslandDrag');
    useIslandDrag({ shapeMode: 'pill', state: 'idle', positionLockedRef: { current: false } });

    dispatchMouseEvent('mousedown', { button: 0, screenX: 100, screenY: 200 });
    dispatchMouseEvent('mousemove', { buttons: 1, screenX: 110, screenY: 205 });
    dispatchMouseEvent('mousemove', { buttons: 0, screenX: 450, screenY: 205 });
    expect(frameCallbacks.size).toBe(0);
    expect(moveWindowDeltaMock).not.toHaveBeenCalled();
  });

  it('uses native movement across frames and stops moving when the cursor stops', async () => {
    const { useIslandDrag } = await import('../useIslandDrag');
    useIslandDrag({ shapeMode: 'pill', state: 'idle', positionLockedRef: { current: false } });
    dispatchMouseEvent('mousedown', { button: 0, screenX: 100, screenY: 200 });

    cursor = { x: 110, y: 205 };
    dispatchMouseEvent('mousemove', { screenX: 460, screenY: 205 });
    flushAnimationFrame([...frameCallbacks.keys()][0]);
    await settlePositionReads();
    cursor = { x: 105, y: 195 };
    dispatchMouseEvent('mousemove', { screenX: 805, screenY: 195 });
    flushAnimationFrame([...frameCallbacks.keys()][0]);
    await settlePositionReads();
    dispatchMouseEvent('mousemove', { screenX: 1155, screenY: 195 });
    flushAnimationFrame([...frameCallbacks.keys()][0]);
    await settlePositionReads();

    expect(moveWindowDeltaMock.mock.calls).toEqual([[10, 5], [-5, -10]]);
  });

  it('accumulates small native movements until the drag threshold is crossed', async () => {
    const { useIslandDrag } = await import('../useIslandDrag');
    useIslandDrag({ shapeMode: 'pill', state: 'idle', positionLockedRef: { current: false } });
    dispatchMouseEvent('mousedown');

    cursor = { x: 103, y: 202 };
    dispatchMouseEvent('mousemove');
    flushAnimationFrame([...frameCallbacks.keys()][0]);
    await settlePositionReads();
    expect(moveWindowDeltaMock).not.toHaveBeenCalled();

    cursor = { x: 105, y: 202 };
    dispatchMouseEvent('mousemove');
    flushAnimationFrame([...frameCallbacks.keys()][0]);
    await settlePositionReads();
    expect(moveWindowDeltaMock).toHaveBeenCalledExactlyOnceWith(5, 2);
  });

  it('waits for the final native sample before deciding whether to click', async () => {
    const { useIslandDrag } = await import('../useIslandDrag');
    const { wrapClick } = useIslandDrag({ shapeMode: 'pill', state: 'idle', positionLockedRef: { current: false } });
    const click = vi.fn();
    dispatchMouseEvent('mousedown');
    cursor = { x: 120, y: 200 };
    dispatchMouseEvent('mousemove');
    dispatchMouseEvent('mouseup');
    wrapClick(click)();
    await settlePositionReads();

    expect(moveWindowDeltaMock).toHaveBeenCalledExactlyOnceWith(20, 0);
    expect(click).not.toHaveBeenCalled();
  });

  it.each(['blur', 'cleanup', 'lock', 'release'])('discards an in-flight sample after %s', async (reason) => {
    const { useIslandDrag } = await import('../useIslandDrag');
    const positionLockedRef = { current: false };
    useIslandDrag({ positionLockedRef, shapeMode: 'pill', state: 'idle' });
    dispatchMouseEvent('mousedown');
    const sample = Promise.withResolvers<{ x: number; y: number }>();
    getMousePositionMock.mockReturnValueOnce(sample.promise);
    dispatchMouseEvent('mousemove');
    flushAnimationFrame([...frameCallbacks.keys()][0]);

    if (reason === 'blur') windowListeners.get('blur')?.({} as MouseEvent);
    if (reason === 'cleanup') cleanup?.();
    if (reason === 'lock') positionLockedRef.current = true;
    if (reason === 'release') dispatchMouseEvent('mousemove', { buttons: 0 });
    sample.resolve({ x: 500, y: 200 });
    await settlePositionReads();

    expect(moveWindowDeltaMock).not.toHaveBeenCalled();
    expect(frameCallbacks.size).toBe(0);
  });

  it('does not apply an old gesture sample to a new drag', async () => {
    const { useIslandDrag } = await import('../useIslandDrag');
    useIslandDrag({ shapeMode: 'pill', state: 'idle', positionLockedRef: { current: false } });
    dispatchMouseEvent('mousedown');
    const oldSample = Promise.withResolvers<{ x: number; y: number }>();
    getMousePositionMock.mockReturnValueOnce(oldSample.promise);
    dispatchMouseEvent('mousemove');
    flushAnimationFrame([...frameCallbacks.keys()][0]);
    dispatchMouseEvent('mouseup');

    cursor = { x: 300, y: 200 };
    dispatchMouseEvent('mousedown');
    cursor = { x: 310, y: 200 };
    dispatchMouseEvent('mousemove');
    flushAnimationFrame([...frameCallbacks.keys()][0]);
    oldSample.resolve({ x: 200, y: 200 });
    await settlePositionReads();

    expect(moveWindowDeltaMock).toHaveBeenCalledExactlyOnceWith(10, 0);
  });

  it('processes native samples in order even if later responses arrive first', async () => {
    const { useIslandDrag } = await import('../useIslandDrag');
    useIslandDrag({ shapeMode: 'pill', state: 'idle', positionLockedRef: { current: false } });
    const start = Promise.withResolvers<{ x: number; y: number }>();
    getMousePositionMock.mockReturnValueOnce(start.promise);
    dispatchMouseEvent('mousedown');
    cursor = { x: 110, y: 200 };
    dispatchMouseEvent('mousemove');
    flushAnimationFrame([...frameCallbacks.keys()][0]);
    cursor = { x: 120, y: 200 };
    dispatchMouseEvent('mousemove');
    flushAnimationFrame([...frameCallbacks.keys()][0]);
    await settlePositionReads();
    expect(moveWindowDeltaMock).not.toHaveBeenCalled();

    start.resolve({ x: 100, y: 200 });
    await settlePositionReads();
    expect(moveWindowDeltaMock.mock.calls).toEqual([[10, 0], [10, 0]]);
  });

  it('cancels dragging when native cursor sampling fails', async () => {
    const { useIslandDrag } = await import('../useIslandDrag');
    useIslandDrag({ shapeMode: 'pill', state: 'idle', positionLockedRef: { current: false } });
    dispatchMouseEvent('mousedown');
    getMousePositionMock.mockRejectedValueOnce(new Error('Window closed'));
    dispatchMouseEvent('mousemove');
    flushAnimationFrame([...frameCallbacks.keys()][0]);
    await settlePositionReads();
    dispatchMouseEvent('mousemove');

    expect(moveWindowDeltaMock).not.toHaveBeenCalled();
    expect(frameCallbacks.size).toBe(0);
  });
});

afterEach(() => {
  cleanup?.();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
  Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: originalRequestAnimationFrame });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', { configurable: true, value: originalCancelAnimationFrame });
});
