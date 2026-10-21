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
 * @file useWebGPURendererRuntime.test.ts
 * @description WebGPU Hook 与真实 initWebGPU/renderFrame 的初始化、帧循环、恢复、设备错误和清理测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../states/maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { useWebGPURenderer } from '../useWebGPURenderer';
import type { RefObject } from 'react';
interface NativeErrorEvent {
  error: {
    message: string;
  };
  preventDefault: () => void;
}
const ready = vi.fn();
const error = vi.fn<(value: Error) => void>();
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let now: number;
let resize: () => void;
let visibility: EventTarget & { hidden: boolean };
let motion: EventTarget & { matches: boolean };
const disconnectResize = vi.fn();
const cancel = vi.fn<(id: number) => void>();
let gpu: ReturnType<typeof nativeGpu>;
let lost: ReturnType<typeof deferred<{
  message?: string;
  reason?: string;
}>>;
let uncaptured: ((event: NativeErrorEvent) => void) | undefined;
let canvasRef: RefObject<HTMLCanvasElement | null>;
let uniform: Float32Array;
/** 构造原生 GPU 边界，所有应用工具函数仍真实执行。
 * @returns 原生适配器、设备、画布和可观测命令
 */
function nativeGpu() {
  const pass = {
    setPipeline: vi.fn<(value: unknown) => void>(),
    setBindGroup: vi.fn<(index: number, value: unknown) => void>(),
    draw: vi.fn<(vertices: number) => void>(),
    end: vi.fn()
  };
  const encoder = {
    beginRenderPass: vi.fn<(options: unknown) => typeof pass>().mockReturnValue(pass),
    finish: vi.fn<() => string>().mockReturnValue('commands')
  };
  const device = {
    lost: lost.promise,
    destroy: vi.fn<() => void>() as (() => void) | undefined,
    addEventListener: vi.fn<(name: string, listener: (event: NativeErrorEvent) => void) => void>((...[, listener]) => {
      uncaptured = listener;
    }),
    removeEventListener: vi.fn(),
    createShaderModule: vi.fn<(options: {
      code: string;
    }) => {
      getCompilationInfo: () => Promise<{
        messages: unknown[];
      }>;
    }>().mockReturnValue({
      getCompilationInfo: () => Promise.resolve({
        messages: []
      })
    }),
    createRenderPipelineAsync: vi.fn<(options: unknown) => Promise<{
      getBindGroupLayout: (index: number) => object;
    }>>().mockResolvedValue({
      getBindGroupLayout: () => ({})
    }),
    createBuffer: vi.fn<(options: unknown) => { destroy: ReturnType<typeof vi.fn> }>().mockReturnValue({ destroy: vi.fn() }),
    createBindGroup: vi.fn<(options: unknown) => object>().mockReturnValue({}),
    createCommandEncoder: vi.fn<() => typeof encoder>().mockReturnValue(encoder),
    queue: {
      writeBuffer: vi.fn<(buffer: unknown, offset: number, values: Float32Array) => void>(),
      submit: vi.fn<(commands: unknown[]) => void>()
    }
  };
  const context = {
    unconfigure: vi.fn(),
    configure: vi.fn<(options: unknown) => void>(),
    getCurrentTexture: vi.fn<() => {
      createView: () => object;
    }>().mockReturnValue({
      createView: () => ({})
    })
  };
  const canvas = {
    _width: 12,
    get clientWidth() { return this._width; },
    set clientWidth(value: number) { this._width = value; },
    clientHeight: 8,
    width: 0,
    height: 0,
    getContext: vi.fn<(name: string) => typeof context | null>().mockReturnValue(context)
  };
  const adapter = {
    requestDevice: vi.fn<() => Promise<typeof device>>().mockResolvedValue(device)
  };
  const requestAdapter = vi.fn<() => Promise<typeof adapter | null>>().mockResolvedValue(adapter);
  return {
    pass,
    encoder,
    device,
    context,
    canvas,
    adapter,
    requestAdapter
  };
}
/** 渲染真实 Hook 并提交 effect。
 * @param playing - 是否播放
 * @param onReady - 实际业务回调
 * @param onError - 实际错误回调
 */
function run(playing = true, onReady: (() => void) | undefined = ready, onError: ((value: Error) => void) | undefined = error): void {
  renderHook(useWebGPURenderer, canvasRef, playing, uniform, onReady, onError);
  flushHookEffects();
}
/** 完成真实异步 GPU 初始化。
 */
async function mount(): Promise<void> {
  run();
  await settleHook();
  await settleHook();
}
/** 执行浏览器下一帧。
 */
function tick(elapsed = 34): void {
  const first = frames.entries().next().value;
  expect(first).toBeDefined();
  if (!first) return;
  const [id, callback] = first;
  frames.delete(id);
  now += elapsed;
  callback(now);
}
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  frames = new Map();
  nextFrame = 0;
  now = 0;
  visibility = Object.assign(new EventTarget(), { hidden: false });
  motion = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal('document', visibility);
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resize = callback; }
    observe(): void {}
    disconnect = disconnectResize;
  });
  uncaptured = undefined;
  lost = deferred();
  gpu = nativeGpu();
  uniform = new Float32Array([0, 0, 0, 4, 5, 6, 7, 8]);
  canvasRef = {
    current: gpu.canvas as unknown as HTMLCanvasElement
  };
  cancel.mockImplementation((id) => {
    frames.delete(id);
  });
  vi.stubGlobal('navigator', {
    gpu: {
      requestAdapter: gpu.requestAdapter,
      getPreferredCanvasFormat: () => 'bgra8unorm'
    }
  });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { devicePixelRatio: 2, matchMedia: () => motion }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', cancel);
});
afterEach(() => {
  unmountHook();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('useWebGPURenderer runtime', () => {
  it('keeps frames and canvas configuration pending until asynchronous pipeline compilation completes', async () => {
    const pending = deferred<Awaited<ReturnType<typeof gpu.device.createRenderPipelineAsync>>>();
    gpu.device.createRenderPipelineAsync.mockReturnValueOnce(pending.promise);
    run();
    await settleHook();
    expect(gpu.device.createRenderPipelineAsync).toHaveBeenCalledTimes(1);
    expect(gpu.context.configure).not.toHaveBeenCalled();
    expect(gpu.device.createBuffer).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
    expect(ready).not.toHaveBeenCalled();
    pending.resolve({ getBindGroupLayout: () => ({}) });
    await settleHook();
    tick();
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it.each(['pause', 'unmount'] as const)('cancellation during pipeline compilation releases the device after %s', async (action) => {
    const pending = deferred<Awaited<ReturnType<typeof gpu.device.createRenderPipelineAsync>>>();
    gpu.device.createRenderPipelineAsync.mockReturnValueOnce(pending.promise);
    run();
    await settleHook();
    if (action === 'pause') run(false);
    else unmountHook();
    pending.resolve({ getBindGroupLayout: () => ({}) });
    await settleHook();
    expect(gpu.context.configure).not.toHaveBeenCalled();
    expect(gpu.context.unconfigure).not.toHaveBeenCalled();
    expect(gpu.device.createBuffer).not.toHaveBeenCalled();
    expect(gpu.device.destroy).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    expect(ready).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('pipeline compilation rejection releases the device and reports the error', async () => {
    gpu.device.createRenderPipelineAsync.mockRejectedValueOnce(new Error('pipeline compilation'));
    await mount();
    expect(error.mock.calls[0]?.[0].message).toBe('pipeline compilation');
    expect(gpu.device.destroy).toHaveBeenCalledTimes(1);
    expect(gpu.context.configure).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });

  it('missing canvas and inactive state do not allocate native GPU', async () => {
    canvasRef.current = null;
    run();
    await settleHook();
    expect(gpu.requestAdapter).not.toHaveBeenCalled();
    canvasRef.current = gpu.canvas as unknown as HTMLCanvasElement;
    run(false);
    expect(gpu.requestAdapter).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });
  it('real GPU initialization defers first frame, emits ready once and writes real dimensions and uniforms', async () => {
    await mount();
    expect(gpu.canvas.getContext).toHaveBeenCalledWith('webgpu');
    expect(gpu.device.createShaderModule.mock.calls[0]?.[0].code).toContain('fs_main');
    expect(ready).not.toHaveBeenCalled();
    tick();
    expect(ready).toHaveBeenCalledTimes(1);
    expect(gpu.canvas).toMatchObject({
      width: 24,
      height: 16
    });
    expect(gpu.pass.draw).toHaveBeenCalledWith(3);
    expect(gpu.device.queue.submit).toHaveBeenCalledWith(['commands']);
    const [[,, values]] = gpu.device.queue.writeBuffer.mock.calls;
    expect(Array.from(values).slice(0, 2)).toEqual([24, 16]);
    expect(Array.from(values).slice(3)).toEqual([4, 5, 6, 7, 8]);
    tick();
    expect(ready).toHaveBeenCalledTimes(1);
    expect(gpu.device.queue.submit).toHaveBeenCalledTimes(2);
    unmountHook();
    expect(frames.size).toBe(0);
  });
  it('uniform seed changes update existing real context and pause/resume reuse adapter with latest callback', async () => {
    await mount();
    tick();
    run(false);
    expect(frames.size).toBe(0);
    uniform = new Float32Array([0, 0, 0, 40, 50, 60, 70, 80]);
    const latest = vi.fn();
    run(false, latest);
    run(true, latest);
    tick();
    expect(gpu.requestAdapter).toHaveBeenCalledTimes(1);
    expect(gpu.device.queue.writeBuffer.mock.lastCall?.[2][3]).toBe(40);
    expect(latest).toHaveBeenCalledTimes(1);
    expect(ready).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(1);
  });
  it.each(['message', 'reason'] as const)('device loss %s stops once and duplicate native errors are ignored', async (stage) => {
    await mount();
    tick();
    lost.resolve(stage === 'message' ? {
      message: 'lost',
      reason: 'unknown'
    } : {
      message: '',
      reason: 'destroyed'
    });
    await settleHook();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0].message).toContain(stage === 'message' ? 'lost' : 'destroyed');
    const preventDefault = vi.fn();
    uncaptured?.({
      preventDefault,
      error: {
        message: 'later'
      }
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect(gpu.device.destroy).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });
  it('native uncaptured error prevents default and notifies latest error callback', async () => {
    await mount();
    const latest = vi.fn<(value: Error) => void>();
    run(true, ready, latest);
    const preventDefault = vi.fn();
    uncaptured?.({
      preventDefault,
      error: {
        message: 'validation'
      }
    });
    expect(latest.mock.calls[0]?.[0].message).toBe('WebGPU 渲染错误：validation');
    expect(error).not.toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });
  it.each([new Error('adapter'), 'native rejection'] as const)('initialization rejection %s is normalized and stops safely without context', async (reason) => {
    gpu.requestAdapter.mockRejectedValue(reason);
    await mount();
    expect(error.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(error.mock.calls[0]?.[0].message).toBe(reason instanceof Error ? reason.message : reason);
    expect(gpu.device.destroy).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });
  it.each([new Error('draw'), 'draw rejection'] as const)('real renderFrame native rejection %s destroys context', async (reason) => {
    await mount();
    gpu.context.getCurrentTexture.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- 原生异常边界可能抛出任意 JS 值，验证 Hook 将其规范化为 Error。
      throw reason;
    });
    tick();
    expect(error.mock.calls[0]?.[0].message).toBe(reason instanceof Error ? reason.message : reason);
    expect(gpu.device.destroy).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });
  it('older GPU device without destroy and absent optional callbacks stop without extra effects', async () => {
    gpu.device.destroy = undefined;
    renderHook(useWebGPURenderer, canvasRef, true, uniform);
    flushHookEffects();
    await settleHook();
    tick();
    expect(ready).not.toHaveBeenCalled();
    uncaptured?.({
      error: {
        message: 'validation'
      },
      preventDefault: vi.fn()
    });
    expect(error).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });
  it('unmount during asynchronous initialization prevents late first frame and later loss notifications', async () => {
    const pending = deferred<Awaited<ReturnType<typeof gpu.adapter.requestDevice>>>();
    gpu.adapter.requestDevice.mockReturnValueOnce(pending.promise);
    run();
    await settleHook();
    unmountHook();
    pending.resolve(gpu.device);
    await settleHook();
    expect(frames.size).toBe(0);
    expect(gpu.device.destroy).toHaveBeenCalledTimes(1);
    expect(gpu.device.queue.submit).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
    lost.resolve({
      message: 'late'
    });
    await settleHook();
    expect(error).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });
  it.each(['unsupported', 'adapter', 'context', 'shader'] as const)('real initWebGPU native %s failure is forwarded by Hook', async (stage) => {
    if (stage === 'unsupported') vi.stubGlobal('navigator', {});else if (stage === 'adapter') gpu.requestAdapter.mockResolvedValue(null);else if (stage === 'context') gpu.canvas.getContext.mockReturnValue(null);else {gpu.device.createShaderModule.mockReturnValue({
      getCompilationInfo: () => Promise.resolve({
        messages: [{
          type: 'warning',
          message: 'warning',
          lineNum: 1,
          linePos: 1
        }, {
          type: 'error',
          message: 'invalid shader',
          lineNum: 3,
          linePos: 4
        }]
      })
    });}
    await mount();
    const messages = {
      unsupported: '当前环境不支持 WebGPU',
      adapter: '未找到可用的 WebGPU 适配器',
      context: '无法创建 WebGPU 画布上下文',
      shader: '3:4 invalid shader'
    };
    expect(error.mock.calls[0]?.[0].message).toBe(messages[stage]);
    expect(frames.size).toBe(0);
  });
  it('zero-sized canvas waits for resize before allocating GPU', async () => {
    gpu.canvas.clientWidth = 0;
    gpu.canvas.clientHeight = -1;
    await mount();
    expect(gpu.requestAdapter).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
    gpu.canvas.clientWidth = 12;
    gpu.canvas.clientHeight = 8;
    resize();
    await settleHook();
    tick();
    expect(gpu.canvas).toMatchObject({ width: 24, height: 16 });
  });

  it('600 frames configure once; only resize reads layout and adjusts dimensions', async () => {
    await mount();
    const readWidth = vi.spyOn(gpu.canvas, 'clientWidth', 'get');
    for (let index = 0; index < 600; index += 1) tick();
    expect(gpu.context.configure).toHaveBeenCalledTimes(1);
    expect(gpu.context.unconfigure).not.toHaveBeenCalled();
    expect(readWidth).not.toHaveBeenCalled();
    readWidth.mockRestore();
    gpu.canvas.clientWidth = 20;
    resize();
    tick();
    expect(gpu.canvas.width).toBe(40);
    expect(gpu.context.configure).toHaveBeenCalledTimes(1);
    unmountHook();
    expect(gpu.context.unconfigure).toHaveBeenCalledTimes(1);
    expect(gpu.device.createBuffer.mock.results[0].value.destroy).toHaveBeenCalledTimes(1);
    expect(gpu.device.destroy).toHaveBeenCalledTimes(1);
  });

  it('caps GPU submissions at 30 FPS even on a 240 Hz display', async () => {
    await mount();
    for (let index = 0; index < 240; index += 1) tick(1000 / 240);
    expect(gpu.device.queue.submit.mock.calls.length).toBeGreaterThanOrEqual(29);
    expect(gpu.device.queue.submit.mock.calls.length).toBeLessThanOrEqual(31);
  });

  it('document hiding cancels frames and visibility resumes one loop', async () => {
    await mount();
    tick();
    visibility.hidden = true;
    visibility.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(0);
    expect(gpu.device.destroy).not.toHaveBeenCalled();
    visibility.hidden = false;
    visibility.dispatchEvent(new Event('visibilitychange'));
    visibility.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(1);
    tick();
    expect(gpu.requestAdapter).toHaveBeenCalledTimes(1);
  });

  it('reduced motion draws a static frame and redraws only on resize or uniform updates', async () => {
    motion.matches = true;
    await mount();
    tick();
    expect(frames.size).toBe(0);
    resize();
    tick();
    expect(frames.size).toBe(0);
    uniform = new Float32Array([0, 0, 0, 1, 2, 3, 4, 5]);
    run();
    tick();
    expect(gpu.device.queue.submit).toHaveBeenCalledTimes(3);
    motion.matches = false;
    motion.dispatchEvent(new Event('change'));
    tick();
    expect(frames.size).toBe(1);
  });

  it('pause/resume during initialization never lets the old generation configure the canvas', async () => {
    const oldDevice = { ...gpu.device, destroy: vi.fn() };
    const pending = deferred<typeof oldDevice>();
    gpu.adapter.requestDevice.mockReturnValueOnce(pending.promise);
    run();
    await settleHook();
    run(false);
    run(true);
    await settleHook();
    expect(gpu.context.configure).toHaveBeenCalledTimes(1);
    pending.resolve(oldDevice);
    await settleHook();
    expect(oldDevice.destroy).toHaveBeenCalledTimes(1);
    expect(gpu.context.configure).toHaveBeenCalledTimes(1);
    expect(gpu.context.unconfigure).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
    tick();
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('failed bind-group creation frees a partially initialized buffer and device', async () => {
    gpu.device.createBindGroup.mockImplementation(() => { throw new Error('bind group'); });
    await mount();
    expect(gpu.device.createBuffer.mock.results[0].value.destroy).toHaveBeenCalledTimes(1);
    expect(gpu.device.destroy).toHaveBeenCalledTimes(1);
    expect(gpu.context.configure).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('100 mount/unmount cycles release every device, buffer, observer and frame', async () => {
    for (let index = 0; index < 100; index += 1) {
      resetHook();
      await mount();
      tick();
      unmountHook();
      expect(frames.size).toBe(0);
    }
    expect(gpu.device.destroy).toHaveBeenCalledTimes(100);
    expect(gpu.device.createBuffer.mock.results[0].value.destroy).toHaveBeenCalledTimes(100);
    expect(gpu.device.removeEventListener).toHaveBeenCalledTimes(100);
    expect(disconnectResize).toHaveBeenCalledTimes(100);
  });
});
