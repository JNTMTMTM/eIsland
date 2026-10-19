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
 * @file simplexFlow.ts
 * @description Simplex 噪声流动效果的工具函数
 * @description 提供噪声计算、颜色采样、Canvas 绘制等功能
 * @author 鸡哥
 */

import { SIMPLEX_SKEW, SIMPLEX_UNSKEW, GRADIENTS, PALETTE, PERMUTATION, POINTER_RADIUS } from '../config/simplexFlow'
import type { RgbColor } from '../types/simplexFlow'

// ── Math helpers ───────────────────────────────────────

/**
 * 将数值限制在指定范围内
 * @param value - 输入值
 * @param min - 最小值
 * @param max - 最大值
 * @returns 限制后的值
 */
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return x * x * (3 - 2 * x)
}

// ── Simplex noise ──────────────────────────────────────

const dot = (gradient: readonly [number, number], x: number, y: number) => gradient[0] * x + gradient[1] * y

/**
 * 计算二维 Simplex 噪声。
 * @param x - 横向采样坐标。
 * @param y - 纵向采样坐标。
 * @returns 连续噪声值。
 */
export const simplexNoise = (x: number, y: number): number => {
  const skew = (x + y) * SIMPLEX_SKEW
  const i = Math.floor(x + skew)
  const j = Math.floor(y + skew)
  const unskew = (i + j) * SIMPLEX_UNSKEW
  const x0 = x - (i - unskew)
  const y0 = y - (j - unskew)
  const i1 = x0 > y0 ? 1 : 0
  const j1 = x0 > y0 ? 0 : 1
  const x1 = x0 - i1 + SIMPLEX_UNSKEW
  const y1 = y0 - j1 + SIMPLEX_UNSKEW
  const x2 = x0 - 1 + 2 * SIMPLEX_UNSKEW
  const y2 = y0 - 1 + 2 * SIMPLEX_UNSKEW
  const ii = i & 255
  const jj = j & 255
  const gi0 = PERMUTATION[ii + PERMUTATION[jj]] % GRADIENTS.length
  const gi1 = PERMUTATION[ii + i1 + PERMUTATION[jj + j1]] % GRADIENTS.length
  const gi2 = PERMUTATION[ii + 1 + PERMUTATION[jj + 1]] % GRADIENTS.length
  let n0 = 0
  let n1 = 0
  let n2 = 0
  const t0 = 0.5 - x0 * x0 - y0 * y0
  const t1 = 0.5 - x1 * x1 - y1 * y1
  const t2 = 0.5 - x2 * x2 - y2 * y2

  if (t0 >= 0) {
    const t = t0 * t0
    n0 = t * t * dot(GRADIENTS[gi0], x0, y0)
  }

  if (t1 >= 0) {
    const t = t1 * t1
    n1 = t * t * dot(GRADIENTS[gi1], x1, y1)
  }

  if (t2 >= 0) {
    const t = t2 * t2
    n2 = t * t * dot(GRADIENTS[gi2], x2, y2)
  }

  return 70 * (n0 + n1 + n2)
}

// ── Color / palette ────────────────────────────────────

const mixColor = (from: RgbColor, to: RgbColor, progress: number): RgbColor => [
  from[0] + (to[0] - from[0]) * progress,
  from[1] + (to[1] - from[1]) * progress,
  from[2] + (to[2] - from[2]) * progress,
]

/**
 * 在调色板相邻颜色间平滑插值。
 * @param value - 归一化采样值，自动限制到调色板范围。
 * @returns 插值后的 RGB 颜色。
 */
export const samplePalette = (value: number): RgbColor => {
  const scaled = clamp(value, 0, 0.999) * (PALETTE.length - 1)
  const index = Math.floor(scaled)
  const progress = smoothstep(0, 1, scaled - index)
  return mixColor(PALETTE[index], PALETTE[index + 1], progress)
}

// ── FBM ────────────────────────────────────────────────

/**
 * 叠加三层随时间流动的噪声。
 * @param x - 横向采样坐标。
 * @param y - 纵向采样坐标。
 * @param time - 动画时间。
 * @returns 叠加后的噪声值。
 */
export const fbm = (x: number, y: number, time: number): number => {
  const first = simplexNoise(x + time * 0.34, y - time * 0.22)
  const second = simplexNoise(x * 1.92 - time * 0.18, y * 1.92 + time * 0.3) * 0.46
  const third = simplexNoise(x * 3.7 + time * 0.12, y * 3.7 - time * 0.16) * 0.22
  return first + second + third
}

// ── Pointer caustics ───────────────────────────────────

/**
 * 在鼠标附近绘制光晕，结束后恢复画布状态。
 * @param context - 当前画布的二维绘图上下文。
 * @param pointer - 鼠标位置和影响强度。
 * @param pointer.x - 鼠标横坐标。
 * @param pointer.y - 鼠标纵坐标。
 * @param pointer.influence - 光晕影响强度。
 * @param time - 动画时间。
 * @returns 无返回值。
 */
export const drawPointerCaustics = (
  context: CanvasRenderingContext2D,
  pointer: { x: number; y: number; influence: number },
  time: number,
): void => {
  if (pointer.influence < 0.02) {
    return
  }

  const TAU = Math.PI * 2

  context.save()
  Object.assign(context, { globalCompositeOperation: 'soft-light' })

  const shadow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, POINTER_RADIUS * 0.78)
  shadow.addColorStop(0, `rgba(86, 142, 232, ${0.14 * pointer.influence})`)
  shadow.addColorStop(0.32, `rgba(52, 104, 190, ${0.07 * pointer.influence})`)
  shadow.addColorStop(1, 'rgba(255, 255, 255, 0)')
  Object.assign(context, { fillStyle: shadow })
  context.beginPath()
  context.arc(pointer.x, pointer.y, POINTER_RADIUS * 0.78, 0, TAU)
  context.fill()

  Object.assign(context, { globalCompositeOperation: 'screen', lineCap: 'round', lineJoin: 'round' })

  for (let ring = 0; ring < 3; ring += 1) {
    const radius = 72 + ring * 68 + Math.sin(time * 1.2 + ring) * 10
    const alpha = (0.09 - ring * 0.02) * pointer.influence

    context.beginPath()

    for (let segment = 0; segment <= 120; segment += 1) {
      const angle = segment / 120 * TAU
      const noise = simplexNoise(Math.cos(angle) * 1.8 + time * 0.7 + ring, Math.sin(angle) * 1.8 - time * 0.6)
      const warped = radius + noise * (14 + ring * 5) * pointer.influence
      const px = pointer.x + Math.cos(angle + noise * 0.18) * warped
      const py = pointer.y + Math.sin(angle + noise * 0.18) * warped

      if (segment === 0) {
        context.moveTo(px, py)
      } else {
        context.lineTo(px, py)
      }
    }

    Object.assign(context, { strokeStyle: `rgba(255, 255, 255, ${alpha})`, lineWidth: 1.1 + ring * 0.25 })
    context.stroke()
  }

  context.restore()
}
