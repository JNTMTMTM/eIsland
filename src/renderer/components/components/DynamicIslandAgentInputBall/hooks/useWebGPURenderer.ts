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
import { initWebGPU, renderFrame } from '../utils/webgpu';

/**
 * 将 WebGPU 液态玻璃球渲染绑定到画布生命周期。
 * WebGPU 上下文在首次 playing=true 时创建并复用，后续仅控制 RAF 循环。
 * @param canvasRef - 需要承载液态玻璃球的画布引用。
 * @param playing - 是否播放渲染循环。
 * @param uniformData - uniform 种子数据。
 * @param onReady - 首帧成功提交后的回调。
 * @param onError - 渲染出错时的回调。
 * @returns 无返回值。
 */
export function useWebGPURenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  playing: boolean,
  uniformData: Float32Array,
  onReady?: () => void,
  onError?: (error: Error) => void,
): void {
  const ctxRef = useRef<WebGPUContext | null>(null);
  const rafRef = useRef(0);
  const stoppedRef = useRef(false);
  const uniformDataRef = useRef<Float32Array>(uniformData);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  uniformDataRef.current = uniformData;
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.values.set(uniformData);
    }
  }, [uniformData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !playing) return;

    stoppedRef.current = false;
    let firstFrameReady = false;

    /**
     * 启动 WebGPU 渲染循环。
     * 仅在上下文尚未创建时执行初始化。
     */
    async function start(): Promise<void> {
      if (ctxRef.current) {
        // 上下文已存在，仅恢复渲染循环
        frame(performance.now());
        return;
      }

      try {
        ctxRef.current = await initWebGPU(
          canvas!,
          LIQUID_ORB_SHADER_SOURCE,
          uniformDataRef.current,
        );

        ctxRef.current.device.lost.then((info: { message?: string; reason?: string }) => {
          stop(new Error(`WebGPU 设备已断开：${info.message || info.reason}`));
        });

        ctxRef.current.device.addEventListener('uncapturederror', (event: { error: { message: string }; preventDefault(): void }) => {
          event.preventDefault();
          stop(new Error(`WebGPU 渲染错误：${event.error.message}`));
        });

        // 延迟一帧开始渲染，给 GPU 进程时间完成 swap chain 初始化
        rafRef.current = requestAnimationFrame(() => {
          if (!stoppedRef.current) frame(performance.now());
        });
      } catch (err) {
        stop(err instanceof Error ? err : new Error(String(err)));
      }
    }

    /**
     * 单帧渲染回调。
     * @param now - 当前时间戳。
     */
    function frame(now: number): void {
      if (stoppedRef.current || !ctxRef.current) return;
      try {
        renderFrame(ctxRef.current, canvas!, now);
        if (!firstFrameReady) {
          firstFrameReady = true;
          onReadyRef.current?.();
        }
        rafRef.current = requestAnimationFrame(frame);
      } catch (err) {
        stop(err instanceof Error ? err : new Error(String(err)));
      }
    }

    /**
     * 停止渲染并通知错误。
     * @param error - 触发停止的错误。
     */
    function stop(error: Error): void {
      if (stoppedRef.current) return;
      stoppedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      // GPUDevice.destroy() is in the WebGPU spec but typed as `any` here;
      // guard defensively for environments where the method is absent.
      if (typeof ctxRef.current?.device?.destroy === 'function') {
        ctxRef.current.device.destroy();
      }
      ctxRef.current = null;
      console.error('[LiquidOrb]', error);
      onErrorRef.current?.(error);
    }

    start();

    return () => {
      stoppedRef.current = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [canvasRef, playing]);
}
