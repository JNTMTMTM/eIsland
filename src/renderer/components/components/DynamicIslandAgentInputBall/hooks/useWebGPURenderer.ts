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
 * @file hooks/useWebGPURenderer.ts
 * @description 液态玻璃球 WebGPU 渲染生命周期 Hook。
 * @author 鸡哥
 */

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { WebGPUContext } from '../types';
import { LIQUID_ORB_SHADER_SOURCE } from '../config/shaderSource';
import { disposeWebGPU, initWebGPU, renderFrame, resizeCanvas } from '../utils/webgpu';

const FRAME_INTERVAL_MS = 1000 / 30;

/**
 * 将装饰球绑定到画布生命周期；暂停复用资源，卸载或错误完整释放。
 * @param canvasRef - 目标画布引用
 * @param playing - 是否需要动画
 * @param uniformData - uniform 种子数据
 * @param onReady - 首帧成功后的回调
 * @param onError - GPU 初始化或渲染错误回调
 */
export function useWebGPURenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  playing: boolean,
  uniformData: Float32Array,
  onReady?: () => void,
  onError?: (error: Error) => void,
): void {
  const ctxRef = useRef<WebGPUContext | null>(null);
  const syncRef = useRef<(() => void) | null>(null);
  const playingRef = useRef(playing);
  const uniformDataRef = useRef(uniformData);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  playingRef.current = playing;
  uniformDataRef.current = uniformData;
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let failed = false;
    let raf = 0;
    let firstFrameReady = false;
    let lastFrameAt = -Infinity;
    let hasSize = resizeCanvas(canvas);
    let inViewport = true;
    let generation = 0;
    let pending: AbortController | null = null;
    let removeDeviceError: (() => void) | null = null;
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const canRender = (): boolean => !disposed && !failed && playingRef.current
      && !document.hidden && hasSize && inViewport;
    const pause = (): void => {
      cancelAnimationFrame(raf);
      raf = 0;
      lastFrameAt = -Infinity;
      firstFrameReady = false;
      pending?.abort();
      pending = null;
      generation += 1;
    };
    const release = (): void => {
      removeDeviceError?.();
      removeDeviceError = null;
      const ctx = ctxRef.current;
      ctxRef.current = null;
      if (ctx) disposeWebGPU(ctx);
    };
    const fail = (error: unknown): void => {
      if (disposed || failed) return;
      failed = true;
      pause();
      release();
      const normalized = error instanceof Error ? error : new Error(String(error));
      console.error('[LiquidOrb]', normalized);
      onErrorRef.current?.(normalized);
    };
    const frame = (now: number): void => {
      raf = 0;
      if (!canRender() || !ctxRef.current) return;
      try {
        const elapsed = now - lastFrameAt;
        if (elapsed >= FRAME_INTERVAL_MS - 0.1) {
          renderFrame(ctxRef.current, canvas, now);
          lastFrameAt = Number.isFinite(lastFrameAt)
            ? lastFrameAt + Math.max(1, Math.floor((elapsed + 0.1) / FRAME_INTERVAL_MS)) * FRAME_INTERVAL_MS : now;
          if (!firstFrameReady) { firstFrameReady = true; onReadyRef.current?.(); }
        }
        if (!motion?.matches && canRender()) raf = requestAnimationFrame(frame);
      } catch (error) { fail(error); }
    };
    const start = async (): Promise<void> => {
      if (pending || ctxRef.current || !canRender()) return;
      const controller = new AbortController();
      pending = controller;
      const currentGeneration = ++generation;
      try {
        const ctx = await initWebGPU(canvas, LIQUID_ORB_SHADER_SOURCE, uniformDataRef.current, controller.signal);
        if (disposed || controller.signal.aborted || currentGeneration !== generation) {
          disposeWebGPU(ctx);
          return;
        }
        ctxRef.current = ctx;
        ctx.values.set(uniformDataRef.current);
        ctx.device.lost.then((info: { message?: string; reason?: string }) => {
          if (ctxRef.current === ctx) fail(new Error(`WebGPU 设备已断开：${info.message || info.reason}`));
        });
        const onDeviceError = (event: { error: { message: string }; preventDefault(): void }): void => {
          event.preventDefault();
          if (ctxRef.current === ctx) fail(new Error(`WebGPU 渲染错误：${event.error.message}`));
        };
        ctx.device.addEventListener('uncapturederror', onDeviceError);
        removeDeviceError = () => ctx.device.removeEventListener('uncapturederror', onDeviceError);
        if (canRender()) raf = requestAnimationFrame(frame);
      } catch (error) {
        if (!controller.signal.aborted && currentGeneration === generation) fail(error);
      } finally {
        if (pending === controller) pending = null;
      }
    };
    const sync = (): void => {
      if (!canRender()) { pause(); return; }
      if (!ctxRef.current) { void start(); return; }
      if (!raf) { lastFrameAt = -Infinity; raf = requestAnimationFrame(frame); }
    };
    const resize = (): void => {
      hasSize = resizeCanvas(canvas);
      sync();
    };
    syncRef.current = sync;
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersectionObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      inViewport = entries[0]?.isIntersecting ?? true;
      sync();
    });
    intersectionObserver?.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('resize', resize);
    motion?.addEventListener('change', sync);
    sync();
    return () => {
      disposed = true;
      syncRef.current = null;
      pause();
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('resize', resize);
      motion?.removeEventListener('change', sync);
      release();
    };
  }, [canvasRef]);

  useEffect(() => {
    if (ctxRef.current) ctxRef.current.values.set(uniformData);
    syncRef.current?.();
  }, [playing, uniformData]);
}
