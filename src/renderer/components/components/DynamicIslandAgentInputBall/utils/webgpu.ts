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
 * @file utils/webgpu.ts
 * @description WebGPU 初始化与渲染管线创建工具函数。
 * @author 鸡哥
 */

/* eslint-disable @typescript-eslint/no-explicit-any, no-any */
import type { WebGPUContext } from '../types';

/** GPUBufferUsage 标志位常量，兼容缺少 WebGPU 类型定义的环境。 */
const GPU_BUFFER_USAGE_UNIFORM = 0x0040;
const GPU_BUFFER_USAGE_COPY_DST = 0x0008;

/**
 * 初始化 WebGPU 渲染上下文。
 * @param canvas - 目标画布元素。
 * @param shaderCode - WGSL 着色器源码。
 * @param uniformData - uniform 种子数据。
 * @param signal - 生命周期取消信号，取消后释放迟到的 GPU 资源。
 * @returns 初始化完成的 WebGPU 渲染上下文。
 * @throws 环境不支持 WebGPU 或初始化失败时抛出错误。
 */
export async function initWebGPU(
  canvas: HTMLCanvasElement,
  shaderCode: string,
  uniformData: Float32Array,
  signal?: AbortSignal,
): Promise<WebGPUContext> {
  if (!(navigator as any).gpu) {
    throw new Error('当前环境不支持 WebGPU');
  }

  const adapter = await (navigator as any).gpu.requestAdapter();
  if (!adapter) {
    throw new Error('未找到可用的 WebGPU 适配器');
  }

  signal?.throwIfAborted();
  const device = await adapter.requestDevice();
  let context: WebGPUContext['context'] | null = null;
  let uniformBuffer: WebGPUContext['uniformBuffer'] | null = null;
  let configured = false;
  try {
    signal?.throwIfAborted();
    context = canvas.getContext('webgpu');
    if (!context) throw new Error('无法创建 WebGPU 画布上下文');
    const format = (navigator as any).gpu.getPreferredCanvasFormat();
    const shader = device.createShaderModule({ code: shaderCode });
    const compilation = await shader.getCompilationInfo();
    signal?.throwIfAborted();
    const errors = compilation.messages.filter((m: any) => m.type === 'error');
    if (errors.length) {
      throw new Error(errors.map((m: any) => `${m.lineNum}:${m.linePos} ${m.message}`).join('\n'));
    }
    const pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: shader, entryPoint: 'vs_main' },
      fragment: { module: shader, entryPoint: 'fs_main', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });
    const values = new Float32Array(uniformData);
    uniformBuffer = device.createBuffer({
      size: values.byteLength,
      usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST,
    });
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });
    // 最后一次 await 之后才绑定画布；取消的旧初始化不会覆盖新一代设备。
    context.configure({ device, format, alphaMode: 'premultiplied' });
    configured = true;
    return { device, context, pipeline, uniformBuffer, bindGroup, values, startedAt: performance.now(), format };
  } catch (error) {
    if (configured) context?.unconfigure();
    uniformBuffer?.destroy();
    device.destroy?.();
    throw error;
  }
}

/**
 * 执行一帧渲染。
 * @param ctx - WebGPU 渲染上下文。
 * @param canvas - 目标画布元素。
 * @param now - 当前时间戳（performance.now()）。
 */
export function renderFrame(
  ctx: WebGPUContext,
  canvas: HTMLCanvasElement,
  now: number,
): void {
  ctx.values[0] = canvas.width;
  ctx.values[1] = canvas.height;
  ctx.values[2] = (now - ctx.startedAt) / 1000;
  ctx.device.queue.writeBuffer(ctx.uniformBuffer, 0, ctx.values);

  const encoder = ctx.device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: ctx.context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  });

  pass.setPipeline(ctx.pipeline);
  pass.setBindGroup(0, ctx.bindGroup);
  pass.draw(3);
  pass.end();

  ctx.device.queue.submit([encoder.finish()]);
}

/**
 * 仅在尺寸或 DPR 变化时更新画布，避免渲染循环每帧读取布局。
 * @param canvas - 目标画布
 * @returns 画布是否具有可见尺寸
 */
export function resizeCanvas(canvas: HTMLCanvasElement): boolean {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return canvas.clientWidth > 0 && canvas.clientHeight > 0;
}

/**
 * 释放一次完整渲染上下文，重复调用安全。
 * @param ctx - 需要释放的 GPU 资源
 */
export function disposeWebGPU(ctx: WebGPUContext): void {
  if (ctx.disposed) return;
  ctx.disposed = true;
  try { ctx.context.unconfigure(); }
  finally {
    try { ctx.uniformBuffer.destroy?.(); }
    finally { ctx.device.destroy?.(); }
  }
}
