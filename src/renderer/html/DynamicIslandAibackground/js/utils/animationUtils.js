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
 * @file animationUtils.js
 * @description 全屏边缘光效的动画循环、淡入淡出状态和呼吸脉动计算。
 * @author 鸡哥
 */

// eslint-disable-next-line import-x/extensions -- 光效页面直接通过 loadFile 加载，浏览器原生模块需要 .js 扩展名。
import { FADE_IN_DURATION, FADE_OUT_DURATION, CYCLE, BREATH, BREATH2, BREATH3, BLUR_BREATH, COLOR_BREATH, BURST_DURATION, BURST_INTENSITY, PULSE_SPEED } from '../config/animationConfig.js';
// eslint-disable-next-line import-x/extensions -- 光效页面直接通过 loadFile 加载，浏览器原生模块需要 .js 扩展名。
import createCanvasRenderer from './canvasUtils.js';

/**
 * 为光效画布创建动画控制器。
 * @param {HTMLCanvasElement} canvasElement - 页面中的光效画布。
 * @returns {{start: () => void, startFadeOut: () => void}} 动画启动与淡出方法。
 */
export default function createAnimationController(canvasElement) {
  const canvas = canvasElement;
  const renderer = createCanvasRenderer(canvas);
  let fadeInStart = -1;
  let fadeInAlpha = 0;
  let fadeOutStart = -1;
  let fadingOut = false;
  canvas.style.opacity = '0';

  /**
   * 启动淡出，供主进程在关闭光效窗口前调用。
   * @returns {void} 淡出状态在下一动画帧生效。
   */
  function startFadeOut() {
    fadingOut = true;
  }

  /**
   * 根据动画时间计算淡入淡出、呼吸和初始脉冲，并继续请求下一帧。
   * @param {number} t - requestAnimationFrame 提供的时间戳（毫秒）。
   * @returns {void} 更新画布和透明度。
   */
  function animate(t) {
    if (fadeInStart < 0) fadeInStart = t;
    const elapsed = t - fadeInStart;
    if (!fadingOut && fadeInAlpha < 1) {
      const p = Math.min(elapsed / FADE_IN_DURATION, 1);
      fadeInAlpha = 1 - (1 - p) * (1 - p);
      canvas.style.opacity = String(fadeInAlpha);
    }

    if (fadingOut) {
      if (fadeOutStart < 0) fadeOutStart = t;
      const fp = Math.min((t - fadeOutStart) / FADE_OUT_DURATION, 1);
      const fadeOutAlpha = fadeInAlpha * (1 - fp * fp);
      canvas.style.opacity = String(Math.max(fadeOutAlpha, 0));
    }

    const time = t / 1000;
    let breath = 0.70 + 0.18 * Math.sin(time * Math.PI * 2 / BREATH)
      + 0.07 * Math.sin(time * Math.PI * 2 / BREATH2)
      + 0.05 * Math.sin(time * Math.PI * 2 / BREATH3);

    const pulse = 0.85 + 0.15 * Math.sin(time * Math.PI * 2 / PULSE_SPEED);
    const blurBreath = 0.85 + 0.15 * Math.sin(time * Math.PI * 2 / BLUR_BREATH);
    const colorBreath = Math.sin(time * Math.PI * 2 / COLOR_BREATH);

    if (elapsed < BURST_DURATION) {
      const bp = elapsed / BURST_DURATION;
      const burst = 1 + (BURST_INTENSITY - 1) * (1 - bp) * (1 - bp);
      breath *= burst;
    }

    const rotation = (time / CYCLE) * Math.PI * 2;
    renderer.drawNeonBorder(rotation, breath, pulse, blurBreath, colorBreath);
    requestAnimationFrame(animate);
  }

  /**
   * 同步初始尺寸、监听窗口缩放并启动动画循环。
   * @returns {void} 注册监听并请求第一帧。
   */
  function start() {
    renderer.resize();
    window.addEventListener('resize', renderer.resize);
    requestAnimationFrame(animate);
  }

  return { start, startFadeOut };
}
