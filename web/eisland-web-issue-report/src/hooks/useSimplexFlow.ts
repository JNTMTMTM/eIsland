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
 * @file useSimplexFlow.ts
 * @description Simplex 噪声流动背景渲染 hook
 * @author 鸡哥
 */

import { useEffect, useRef, type RefObject } from 'react'
import { clamp, simplexNoise, fbm, samplePalette, drawPointerCaustics } from '../utils/simplexFlow'
import { FIELD_SCALE, SAMPLE_RATIO, POINTER_RADIUS } from '../config/simplexFlow'
import type { PointerState } from '../types/simplexFlow'

/**
 * 维护画布动画及鼠标、尺寸变化的订阅。
 * @param canvasRef - 背景画布引用。
 * @returns 无返回值。
 */
export default function useSimplexFlow(canvasRef: RefObject<HTMLCanvasElement | null>): void {
  const pointerRef = useRef<PointerState>({ x: 0, y: 0, active: false, influence: 0 })

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    const context = canvas.getContext('2d', { alpha: false })

    if (!context) {
      return undefined
    }

    const buffer = document.createElement('canvas')
    const bufferContext = buffer.getContext('2d', { alpha: false })

    if (!bufferContext) {
      return undefined
    }

    let width = 0
    let height = 0
    let bufferWidth = 0
    let bufferHeight = 0
    let imageData = bufferContext.createImageData(1, 1)
    let animationId = 0
    const originTime = performance.now()

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      bufferWidth = Math.max(96, Math.ceil(width * SAMPLE_RATIO))
      bufferHeight = Math.max(64, Math.ceil(height * SAMPLE_RATIO))
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      buffer.width = bufferWidth
      buffer.height = bufferHeight
      imageData = bufferContext.createImageData(bufferWidth, bufferHeight)
    }

    const movePointer = (event: PointerEvent) => {
      pointerRef.current.x = event.clientX
      pointerRef.current.y = event.clientY
      pointerRef.current.active = true
    }

    const leavePointer = () => {
      pointerRef.current.active = false
    }

    const render = (time: number) => {
      const flowTime = (time - originTime) * 0.00016
      const { current: pointer } = pointerRef
      const { data } = imageData
      pointer.influence += ((pointer.active ? 1 : 0) - pointer.influence) * 0.055

      for (let y = 0; y < bufferHeight; y += 1) {
        const screenY = y / SAMPLE_RATIO

        for (let x = 0; x < bufferWidth; x += 1) {
          const screenX = x / SAMPLE_RATIO
          let sampleX = screenX
          let sampleY = screenY

          if (pointer.influence > 0.01) {
            const dx = pointer.x - screenX
            const dy = pointer.y - screenY
            const distance = Math.hypot(dx, dy)

            if (distance < POINTER_RADIUS && distance > 0.01) {
              const pull = (1 - distance / POINTER_RADIUS) ** 2 * pointer.influence
              const angle = Math.atan2(dy, dx)
              const swirl = pull * 32
              sampleX += Math.cos(angle) * pull * 82 - Math.sin(angle) * swirl
              sampleY += Math.sin(angle) * pull * 82 + Math.cos(angle) * swirl
            }
          }

          const domainWarpX = simplexNoise(sampleX * FIELD_SCALE + 12.6 + flowTime * 0.36, sampleY * FIELD_SCALE - 7.8) * 112
          const domainWarpY = simplexNoise(sampleX * FIELD_SCALE - 3.4, sampleY * FIELD_SCALE + 8.2 - flowTime * 0.32) * 112
          const flow = fbm((sampleX + domainWarpX) * FIELD_SCALE, (sampleY + domainWarpY) * FIELD_SCALE, flowTime)
          const warm = simplexNoise(sampleX * 0.00086 - flowTime * 0.12, sampleY * 0.00086 + flowTime * 0.1)
          const value = clamp(0.5 + flow * 0.2 + warm * 0.08, 0, 1)
          const color = samplePalette(value)
          const mist = 0.94 + simplexNoise(sampleX * 0.0032 + flowTime * 0.34, sampleY * 0.0032 - flowTime * 0.3) * 0.035
          const index = (y * bufferWidth + x) * 4

          data[index] = clamp(color[0] * mist, 0, 255)
          data[index + 1] = clamp(color[1] * mist, 0, 255)
          data[index + 2] = clamp(color[2] * mist, 0, 255)
          data[index + 3] = 255
        }
      }

      bufferContext.putImageData(imageData, 0, 0)
      context.clearRect(0, 0, width, height)
      context.drawImage(buffer, 0, 0, bufferWidth, bufferHeight, 0, 0, width, height)
      drawPointerCaustics(context, pointer, flowTime * 4)
      animationId = window.requestAnimationFrame(render)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', movePointer)
    window.addEventListener('pointerleave', leavePointer)
    animationId = window.requestAnimationFrame(render)

    return () => {
      window.cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', movePointer)
      window.removeEventListener('pointerleave', leavePointer)
    }
  }, [canvasRef])
}
