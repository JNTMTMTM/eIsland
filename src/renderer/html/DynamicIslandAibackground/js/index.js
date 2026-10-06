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
 * @file index.js
 * @description 全屏边缘光效入口，初始化动画并暴露主进程淡出接口。
 * @author 鸡哥
 */

// eslint-disable-next-line import-x/extensions -- 光效页面直接通过 loadFile 加载，浏览器原生模块需要 .js 扩展名。
import createAnimationController from './utils/animationUtils.js';

const canvas = document.getElementById('lightCanvas');
const animation = createAnimationController(canvas);

// 模块内函数不会自动暴露给主进程的 executeJavaScript 调用。
window.startFadeOut = animation.startFadeOut;
animation.start();
