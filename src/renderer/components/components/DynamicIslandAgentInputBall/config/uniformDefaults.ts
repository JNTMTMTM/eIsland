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
 * @file config/uniformDefaults.ts
 * @description 液态玻璃球 WGSL 着色器的默认 uniform 种子数据。
 * @author 鸡哥
 */

/**
 * 默认 uniform 种子数据。
 *
 * 布局与 WGSL `Uniforms` 结构体一一对应：
 * - [0..1]  size (vec2<f32>)
 * - [2]     time
 * - [3..31] 标量控制参数（speed, radius, zoom, warp, …）
 * - [32..63] 颜色组（colorA~D, highlight, shell, sheen, spec, canvas, glow）
 * - [64..111] 调色板停靠点（paletteStop0~11，每组 4 个 f32）
 */
export const LIQUID_ORB_UNIFORM_SEED: readonly number[] = [
  1, 1, 0, 0.8199999928474426, 0.7200000286102295, 0.36000001430511475,
  3.200000047683716, 0.5, 2.200000047683716, 0.11999999731779099,
  0.2800000011920929, 0.23999999463558197, 0.18000000715255737,
  0, 2, 9, 0.004999999888241291, 0, 0, 0,
  0.4399999976158142, 0, 2, 0.41999998688697815, 0.7699999809265137,
  0.23000000417232513, 65, 0, 0, 1, 0.2199999988079071, 0.25, 1,
  0.8470588326454163, 0.41960784792900085, 1, 0.5098039507865906,
  0.95686274766922, 1, 1, 1, 0.48235294222831726, 0.8352941274642944, 1,
  0.5568627715110779, 0.42352941632270813, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  0.6078431606292725, 0.95686274766922, 1, 1, 0.772549033164978,
  0.6627451181411743, 1, 1, 0.9176470637321472, 0.95686274766922, 1, 1,
  0.8627451062202454, 0.9176470637321472, 1, 1,
  0.0117647061124444, 0.01568627543747425, 0.03529411926865578, 1,
  0.5843137502670288, 0.42352941632270813, 1, 1,
  0.9686274528503418, 0.9843137264251709, 1, 1,
  0.9372549057006836, 0.9647058844566345, 0.9921568632125854, 1,
  0.8784313797950745, 0.9333333373069763, 0.9764705896377563, 1,
  0.8313725590705872, 0.9019607901573181, 0.9686274528503418, 1,
  0.7333333492279053, 0.8352941274642944, 0.9529411792755127, 1,
  0.6509804129600525, 0.7803921699523926, 0.9411764740943909, 1,
  0.529411792755127, 0.6901960968971252, 0.9215686321258545, 1,
  0.43529412150382996, 0.6196078658103943, 0.9098039269447327, 1,
  0.43529412150382996, 0.6196078658103943, 0.9098039269447327, 1,
  0.43529412150382996, 0.6196078658103943, 0.9098039269447327, 1,
  0.43529412150382996, 0.6196078658103943, 0.9098039269447327, 1,
  0.43529412150382996, 0.6196078658103943, 0.9098039269447327, 1,
];

/** colorA 在 uniform 种子中的起始偏移量。 */
export const ORB_COLOR_A_OFFSET = 32;
/** colorB 在 uniform 种子中的起始偏移量。 */
export const ORB_COLOR_B_OFFSET = 36;
