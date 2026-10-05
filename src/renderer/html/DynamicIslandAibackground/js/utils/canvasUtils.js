/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 silenthim JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: silenthim[](https://github.com/silenthim18303)
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
 * @file canvasUtils.js
 * @description 全屏边缘光效的 Canvas 尺寸同步、圆角路径与辉光层绘制。
 * @author 鸡哥
 */

// eslint-disable-next-line import-x/extensions -- 光效页面直接通过 loadFile 加载，浏览器原生模块需要 .js 扩展名。
import { CORNER, INSET, GRADIENT_STOPS, GLOW_LAYERS } from '../config/animationConfig.js';

/**
 * 为光效画布创建尺寸同步与绘制方法。
 * @param {HTMLCanvasElement} canvasElement - 页面中的光效画布。
 * @returns {{resize: () => void, drawNeonBorder: (rotation: number, breath: number, pulse: number, blurBreath: number, colorBreath: number) => void}} 画布尺寸与辉光绘制方法。
 */
export default function createCanvasRenderer(canvasElement) {
  const canvas = canvasElement;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  let w;
  let h;

  /**
   * 根据窗口尺寸与设备像素比同步 Canvas 的显示和绘制尺寸。
   * @returns {void} 更新画布尺寸和绘制变换。
   */
  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * 创建用于描边的圆角矩形路径。
   * @param {number} x - 矩形左边界。
   * @param {number} y - 矩形上边界。
   * @param {number} rw - 矩形宽度。
   * @param {number} rh - 矩形高度。
   * @param {number} r - 圆角半径。
   * @returns {void} 将路径写入当前 Canvas 上下文。
   */
  function roundedRectPath(x, y, rw, rh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + rw - r, y);
    ctx.quadraticCurveTo(x + rw, y, x + rw, y + r);
    ctx.lineTo(x + rw, y + rh - r);
    ctx.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
    ctx.lineTo(x + r, y + rh);
    ctx.quadraticCurveTo(x, y + rh, x, y + rh - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * 叠加柔光与核心描边，绘制霓虹边缘。
   * @param {number} rotation - 色环旋转角度（弧度）。
   * @param {number} breath - 辉光透明度呼吸倍率。
   * @param {number} pulse - 描边宽度脉动倍率。
   * @param {number} blurBreath - 模糊半径呼吸倍率。
   * @param {number} colorBreath - 色彩饱和度与亮度变化因子。
   * @returns {void} 清空画布并绘制所有辉光层。
   */
  function drawNeonBorder(rotation, breath, pulse, blurBreath, colorBreath) {
    ctx.clearRect(0, 0, w, h);
    const x = -INSET;
    const y = -INSET;
    const rw = w + INSET * 2;
    const rh = h + INSET * 2;
    const cx = w / 2;
    const cy = h / 2;

    GLOW_LAYERS.forEach(([baseBlur, baseLineWidth, baseAlpha, animated]) => {
      const lineWidth = animated ? baseLineWidth * pulse : baseLineWidth;
      const alpha = animated ? baseAlpha * breath : baseAlpha;
      ctx.save();
      const animatedBlur = baseBlur > 0 ? baseBlur * blurBreath : 0;
      ctx.filter = animatedBlur > 0 ? `blur(${animatedBlur}px)` : 'none';
      ctx.globalAlpha = alpha;

      roundedRectPath(x, y, rw, rh, CORNER + INSET);

      const gradient = ctx.createConicGradient(rotation, cx, cy);
      GRADIENT_STOPS.forEach(([stop, hue, sat, lum]) => {
        const aSat = Math.min(100, sat + 10 * colorBreath);
        const aLum = lum + 5 * colorBreath;
        gradient.addColorStop(stop, `hsl(${hue}, ${aSat}%, ${aLum}%)`);
      });

      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = gradient;
      ctx.stroke();
      ctx.restore();
    });
  }

  return { resize, drawNeonBorder };
}
