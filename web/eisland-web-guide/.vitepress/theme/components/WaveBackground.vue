<!--
  eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
  https://github.com/JNTMTMTM/eIsland

  Copyright (C) 2026 JNTMTMTM
  Copyright (C) 2026 pyisland.com

  Original author: JNTMTMTM[](https://github.com/JNTMTMTM)

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.
-->

<script setup lang="ts">
/**
 * @file WaveBackground.vue
 * @description 首页波浪背景组件，移植自 eIsland DynamicIslandSharedWaveEffect。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let rafId = 0

/** 着色器原始背景颜色 */
const DEFAULT_BG_RGB: [number, number, number] = [0.002, 0.004, 0.005]
/** 默认强调色 */
const DEFAULT_ACCENT_COLOR: [number, number, number] = [0.439, 0.627, 1.0]

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;
void main(){
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uBgColor;
uniform vec3 uAccentColor;

float saturate(float v){ return clamp(v, 0.0, 1.0); }
float ease(float v){ v = saturate(v); return v * v * (3.0 - 2.0 * v); }
mat2 rot(float a){ float c = cos(a); float s = sin(a); return mat2(c, -s, s, c); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), u.x), mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
}

float animatedLoop(vec2 uv, float t, float channel){
  vec2 q = uv;
  q *= rot(0.28 + sin(t * 0.18) * 0.12);
  q.x += 0.055 * sin(t * 0.30 + channel);
  q.y += 0.040 * cos(t * 0.24 + channel * 1.7);
  float ang = atan(q.y, q.x);
  float angularShift = sin(ang * 3.0 + t * 0.72 + channel * 1.9) * 0.078;
  angularShift += sin(ang * 7.0 - t * 0.54 + channel) * 0.020;
  float neonD = length(q) + angularShift;
  float warpD = length(q * vec2(1.34 + 0.06 * sin(t * 0.25), 0.82 + 0.04 * cos(t * 0.31)));
  warpD += 0.026 * sin(q.x * 4.4 + t * 0.62) + 0.018 * sin(q.y * 5.2 - t * 0.45);
  float diamondD = abs(q.x) * 1.20 + abs(q.y) * 0.84;
  float d = mix(warpD, diamondD, 0.32);
  d = mix(d, neonD, 0.20 + 0.04 * sin(t * 0.18 + channel));
  float pattern = mod((q.x + q.y) * 0.62 + sin(q.x * 5.5 + t) * 0.015 + sin(q.y * 7.0 - t * 0.75) * 0.012, 0.20);
  float acc = 0.0;
  for (int i = 1; i <= 6; i++) {
    float fi = float(i);
    float f = fract(t * 0.152 - channel * 0.018 + 0.011 * fi) * 4.70 - d + pattern;
    acc += 0.00110 * fi * fi / max(abs(f), 0.0065);
  }
  float threadCoord = q.x * 0.92 - q.y * 0.58 + 0.030 * sin(q.x * 5.2 + t * 0.72);
  float threadLines = 0.0065 / max(abs(sin((threadCoord + t * 0.10 + channel * 0.035) * 27.0)), 0.070);
  acc += threadLines * (0.50 + 0.30 * sin(ang * 1.2 + t + channel));
  return min(acc, 1.95);
}

void main(){
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float t = uTime;
  float intro = ease(t / 0.72);
  float bloomIn = ease((t - 0.10) / 1.10);
  float climax = exp(-pow((t - 3.62) / 0.58, 2.0));
  float preClimax = ease((t - 2.15) / 1.25) * (1.0 - ease((t - 3.86) / 0.72));
  float afterglow = exp(-pow((t - 4.14) / 0.62, 2.0));
  float calm = 1.0 - 0.22 * ease((t - 4.75) / 0.70);
  float settle = 1.0 - 0.34 * ease((t - 5.05) / 0.52);
  vec2 uv = p * (0.98 + 0.05 * sin(t * 0.25));
  uv += vec2(0.0, -0.025);
  vec2 flowAxis = normalize(vec2(0.86, -0.50));
  vec2 crossAxis = vec2(-flowAxis.y, flowAxis.x);
  float lane = dot(p, flowAxis);
  float crossLane = dot(p, crossAxis);
  float syncWave = sin(crossLane * 5.4 + lane * 1.1 - t * 1.85);
  uv += flowAxis * syncWave * 0.055 * climax;
  uv += crossAxis * sin(lane * 7.2 + t * 1.25) * 0.034 * climax;
  uv *= 1.0 + 0.045 * preClimax - 0.020 * climax;
  vec3 ch1 = mix(vec3(0.043, 0.173, 0.380), uAccentColor * 0.15, 0.6);
  vec3 ch2 = mix(vec3(0.439, 0.627, 1.000), uAccentColor, 0.5);
  vec3 ch3 = mix(vec3(0.439, 0.502, 0.824), uAccentColor * 0.8, 0.4);
  float a = animatedLoop(uv, t, 0.0);
  float b = animatedLoop(uv * 1.018 + vec2(0.012, -0.008), t + 0.18, 1.0);
  float c = animatedLoop(uv * 0.986 + vec2(-0.010, 0.010), t + 0.35, 2.0);
  vec3 loopCol = ch1 * a + ch2 * b + ch3 * c;
  float tunnel = animatedLoop(uv * 1.42 + vec2(sin(t * 0.2) * 0.08, cos(t * 0.17) * 0.05), t * 1.12 + 1.7, 2.7);
  loopCol += mix(ch2, ch3, 0.35 + 0.25 * sin(t)) * tunnel * (0.30 + 0.24 * preClimax);
  float syncBand = exp(-pow((lane + 0.08 * sin(t * 0.72)) / 0.62, 2.0));
  float phaseThread = pow(0.5 + 0.5 * sin(crossLane * 13.5 + lane * 2.2 - t * 3.1), 8.0);
  float phaseThread2 = pow(0.5 + 0.5 * sin(crossLane * 9.0 - lane * 5.4 + t * 2.4), 10.0);
  vec3 climaxCol = (mix(ch2, ch3, 0.36) * phaseThread + ch1 * phaseThread2 * 0.52) * syncBand * climax;
  float afterBand = exp(-pow((lane - 0.34) / 0.72, 2.0));
  climaxCol += mix(ch1, ch2, vUv.x) * afterBand * afterglow * 0.13;
  float centerBeam = exp(-abs(p.y + 0.005 * sin(t * 3.0)) * 24.0) * (0.14 + 0.52 * exp(-pow((t - 0.74) / 0.34, 2.0)));
  float bladeMask = smoothstep(-1.55, -0.08, p.x) * (1.0 - smoothstep(0.08, 1.55, p.x));
  vec3 blade = mix(ch1, ch2, vUv.x) * centerBeam * bladeMask * (0.40 + 0.28 * climax);
  float flare = exp(-dot(p, p) * 3.6) * exp(-pow((t - 0.88) / 0.40, 2.0));
  vec3 col = uBgColor;
  col += loopCol * (0.56 + 0.46 * bloomIn) * calm * settle;
  col += climaxCol * 0.22;
  float diagonalGlint = exp(-pow(lane * 1.2 + crossLane * 0.10, 2.0) / 0.030) * climax;
  col += blade + mix(ch2, ch3, 0.5) * flare * 0.18 + ch2 * diagonalGlint * 0.07;
  float scan = 0.92 + 0.08 * sin((vUv.y * uResolution.y + t * 52.0) * 0.72);
  float grain = noise(vUv * uResolution.xy * 0.52 + t * 17.0) - 0.5;
  col *= scan;
  col += grain * 0.018;
  col *= intro;
  col = max(col - vec3(0.010, 0.012, 0.012), 0.0);
  col = vec3(1.0) - exp(-max(col, 0.0) * (0.62 + 0.18 * climax));
  float vignette = smoothstep(1.52, 0.20, length(p * vec2(0.78, 1.04)));
  col *= 0.38 + 0.86 * vignette;
  col += vec3(0.020, 0.010, 0.014) * (1.0 - vignette);
  gl_FragColor = vec4(col, 1.0);
}
`

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[WaveBackground] shader compile failed:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  })
  if (!gl) return

  const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  if (!vert || !frag) return

  const program = gl.createProgram()!
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  gl.deleteShader(vert)
  gl.deleteShader(frag)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[WaveBackground] shader link failed:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return
  }

  const buffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.disable(gl.DEPTH_TEST)
  gl.disable(gl.CULL_FACE)

  const posLoc = gl.getAttribLocation(program, 'aPosition')
  const resLoc = gl.getUniformLocation(program, 'uResolution')
  const timeLoc = gl.getUniformLocation(program, 'uTime')
  const bgColorLoc = gl.getUniformLocation(program, 'uBgColor')
  const accentColorLoc = gl.getUniformLocation(program, 'uAccentColor')
  const startTime = performance.now()

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.floor(canvas!.clientWidth * dpr))
    const h = Math.max(1, Math.floor(canvas!.clientHeight * dpr))
    if (canvas!.width !== w || canvas!.height !== h) {
      canvas!.width = w
      canvas!.height = h
    }
    gl!.viewport(0, 0, w, h)
    gl!.useProgram(program)
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer)
    gl!.enableVertexAttribArray(posLoc)
    gl!.vertexAttribPointer(posLoc, 2, gl!.FLOAT, false, 0, 0)
    gl!.uniform2f(resLoc, w, h)
    gl!.uniform1f(timeLoc, (performance.now() - startTime) / 1000)
    gl!.uniform3f(bgColorLoc, DEFAULT_BG_RGB[0], DEFAULT_BG_RGB[1], DEFAULT_BG_RGB[2])
    gl!.uniform3f(accentColorLoc, DEFAULT_ACCENT_COLOR[0], DEFAULT_ACCENT_COLOR[1], DEFAULT_ACCENT_COLOR[2])
    gl!.drawArrays(gl!.TRIANGLES, 0, 3)
    rafId = requestAnimationFrame(draw)
  }

  rafId = requestAnimationFrame(draw)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <canvas ref="canvasRef" class="wave-bg" />
</template>

<style scoped>
.wave-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}
</style>
