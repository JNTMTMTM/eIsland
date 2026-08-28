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
 * @description Tests for frame-coalesced island dragging.
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

type TestDocument = {
  addEventListener: (type: string, listener: Listener) => void;
  removeEventListener: (type: string, listener: Listener) => void;
};

const originalWindow = (globalThis as Record<string, unknown>).window;
const originalDocument = (globalThis as Record<string, unknown>).document;
const originalRequestAnimationFrame = (globalThis as Record<string, unknown>).requestAnimationFrame;
const originalCancelAnimationFrame = (globalThis as Record<string, unknown>).cancelAnimationFrame;

const moveWindowDeltaMock = vi.fn();
const listeners = new Map<string, Listener>();
const frameCallbacks = new Map<number, FrameRequestCallback>();
let nextFrameId = 1;
let cleanup: (() => void) | undefined;

const dispatchMouseEvent = (type: string, event: Partial<MouseEvent> = {}): void => {
  listeners.get(type)?.(event as MouseEvent);
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
  frameCallbacks.clear();
  nextFrameId = 1;
  cleanup = undefined;

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { api: { moveWindowDelta: moveWindowDeltaMock } },
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
    useIslandDrag({ shapeMode: 'pill', state: 'idle' });

    dispatchMouseEvent('mousedown', { button: 0, screenX: 100, screenY: 200 });
    dispatchMouseEvent('mousemove', { screenX: 110, screenY: 205 });
    dispatchMouseEvent('mousemove', { screenX: 118, screenY: 211 });

    expect(moveWindowDeltaMock).not.toHaveBeenCalled();
    expect(frameCallbacks.size).toBe(1);

    const frameId = [...frameCallbacks.keys()][0];
    flushAnimationFrame(frameId);

    expect(moveWindowDeltaMock).toHaveBeenCalledTimes(1);
    expect(moveWindowDeltaMock).toHaveBeenCalledWith(18, 11);
  });

  it('flushes pending movement when the mouse is released', async () => {
    const { useIslandDrag } = await import('../useIslandDrag');
    useIslandDrag({ shapeMode: 'pill', state: 'idle' });

    dispatchMouseEvent('mousedown', { button: 0, screenX: 100, screenY: 200 });
    dispatchMouseEvent('mousemove', { screenX: 110, screenY: 205 });
    dispatchMouseEvent('mouseup');

    expect(moveWindowDeltaMock).toHaveBeenCalledTimes(1);
    expect(moveWindowDeltaMock).toHaveBeenCalledWith(10, 5);
    expect(frameCallbacks.size).toBe(0);
  });

  it('does not attach drag listeners for non-draggable states', async () => {
    const { useIslandDrag } = await import('../useIslandDrag');
    useIslandDrag({ shapeMode: 'notch', state: 'idle' });

    expect(listeners.size).toBe(0);
  });
});

afterEach(() => {
  cleanup?.();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
  Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: originalRequestAnimationFrame });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', { configurable: true, value: originalCancelAnimationFrame });
});
