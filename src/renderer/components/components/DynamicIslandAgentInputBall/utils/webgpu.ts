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

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { WebGPUContext } from '../types';

/** GPUBufferUsage 标志位常量，兼容缺少 WebGPU 类型定义的环境。 */
const GPU_BUFFER_USAGE_UNIFORM = 0x0040;
const GPU_BUFFER_USAGE_COPY_DST = 0x0008;

/**
 * 初始化 WebGPU 渲染上下文。
 * @param canvas - 目标画布元素。
 * @param shaderCode - WGSL 着色器源码。
 * @param uniformData - uniform 种子数据。
 * @returns 初始化完成的 WebGPU 渲染上下文。
 * @throws 环境不支持 WebGPU 或初始化失败时抛出错误。
 */
export async function initWebGPU(
  canvas: HTMLCanvasElement,
  shaderCode: string,
  uniformData: Float32Array,
): Promise<WebGPUContext> {
  if (!(navigator as any).gpu) {
    throw new Error('当前环境不支持 WebGPU');
  }

  const adapter = await (navigator as any).gpu.requestAdapter();
  if (!adapter) {
    throw new Error('未找到可用的 WebGPU 适配器');
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu') as any;
  if (!context) {
    throw new Error('无法创建 WebGPU 画布上下文');
  }

  const format = (navigator as any).gpu.getPreferredCanvasFormat();
  try { context.unconfigure(); } catch { /* 首次调用可忽略 */ }
  context.configure({ device, format, alphaMode: 'premultiplied' });

  const shader = device.createShaderModule({ code: shaderCode });
  const compilation = await shader.getCompilationInfo();
  const errors = compilation.messages.filter((m: any) => m.type === 'error');
  if (errors.length) {
    throw new Error(
      errors.map((m: any) => `${m.lineNum}:${m.linePos} ${m.message}`).join('\n'),
    );
  }

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shader, entryPoint: 'vs_main' },
    fragment: {
      module: shader,
      entryPoint: 'fs_main',
      targets: [{ format }],
    },
    primitive: { topology: 'triangle-list' },
  });

  const values = new Float32Array(uniformData);
  const uniformBuffer = device.createBuffer({
    size: values.byteLength,
    usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST,
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  return {
    device,
    context,
    pipeline,
    uniformBuffer,
    bindGroup,
    values,
    startedAt: performance.now(),
    format,
  };
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
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  // 每帧重新配置 swap chain，确保纹理与当前设备匹配（Electron GPU 进程同步）
  ctx.context.unconfigure();
  ctx.context.configure({
    device: ctx.device,
    format: ctx.format,
    alphaMode: 'premultiplied',
  });

  ctx.values[0] = width;
  ctx.values[1] = height;
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
