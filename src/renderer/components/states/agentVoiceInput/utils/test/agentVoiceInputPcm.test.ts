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
 * @file agentVoiceInputPcm.test.ts
 * @description 语音输入浮点帧到 PCM 的转换测试。
 * @author 鸡哥
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pushFloat32Frames } from '../agentVoiceInputPcm';

describe('pushFloat32Frames', () => {
  let onFrame: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onFrame = vi.fn();
  });

  // --- empty / trivial input ---

  it('returns pending unchanged when input is empty', () => {
    const pending = new Float32Array([0.1, 0.2]);
    const result = pushFloat32Frames({
      input: new Float32Array(0),
      pending,
      frameSize: 4,
      onFrame,
    });
    expect(result).toBe(pending);
    expect(onFrame).not.toHaveBeenCalled();
  });

  it('returns empty array when both input and pending are empty', () => {
    const result = pushFloat32Frames({
      input: new Float32Array(0),
      pending: new Float32Array(0),
      frameSize: 4,
      onFrame,
    });
    expect(result).toEqual(new Float32Array(0));
    expect(onFrame).not.toHaveBeenCalled();
  });

  // --- single exact frame ---

  it('produces one frame when input length equals frameSize with no pending', () => {
    const input = new Float32Array([0, 0.5, -0.5, 1]);
    const result = pushFloat32Frames({
      input,
      pending: new Float32Array(0),
      frameSize: 4,
      onFrame,
    });

    expect(onFrame).toHaveBeenCalledTimes(1);
    const pcm = onFrame.mock.calls[0][0] as Int16Array;
    expect(pcm).toBeInstanceOf(Int16Array);
    expect(pcm.length).toBe(4);
    // 0 -> 0, 0.5 -> round(0.5 * 0x7fff) = round(16383.5) = 16384, -0.5 -> round(-0.5 * 0x8000) = -16384, 1 -> 0x7fff = 32767
    expect(pcm[0]).toBe(0);
    expect(pcm[1]).toBe(16384);
    expect(pcm[2]).toBe(-16384);
    expect(pcm[3]).toBe(32767);
    expect(result).toEqual(new Float32Array(0));
  });

  // --- multiple frames in one call ---

  it('produces multiple frames when input spans several frame boundaries', () => {
    // frameSize=2, 6 samples -> 3 frames, 0 remainder
    const input = new Float32Array([0, 1, -1, 0.5, -0.5, 0]);
    const result = pushFloat32Frames({
      input,
      pending: new Float32Array(0),
      frameSize: 2,
      onFrame,
    });

    expect(onFrame).toHaveBeenCalledTimes(3);
    expect(result).toEqual(new Float32Array(0));

    const f0 = onFrame.mock.calls[0][0] as Int16Array;
    expect(f0[0]).toBe(0);
    expect(f0[1]).toBe(32767);

    const f1 = onFrame.mock.calls[1][0] as Int16Array;
    expect(f1[0]).toBe(-32768);
    expect(f1[1]).toBe(16384);

    const f2 = onFrame.mock.calls[2][0] as Int16Array;
    expect(f2[0]).toBe(-16384);
    expect(f2[1]).toBe(0);
  });

  // --- remainder returned as pending ---

  it('returns remainder samples when input does not fill last frame', () => {
    // frameSize=4, input=3 -> 0 frames, 3 remainder
    const input = new Float32Array([0.1, 0.2, 0.3]);
    const result = pushFloat32Frames({
      input,
      pending: new Float32Array(0),
      frameSize: 4,
      onFrame,
    });

    expect(onFrame).not.toHaveBeenCalled();
    expect(result).toEqual(new Float32Array([0.1, 0.2, 0.3]));
  });

  // --- pending buffer accumulation ---

  it('merges pending with input and crosses frame boundary', () => {
    // pending has 2 samples, input has 3, frameSize=4 -> one frame, 1 remainder
    const pending = new Float32Array([0.25, 0.5]);
    const input = new Float32Array([0.75, -0.25, 0.1]);
    const result = pushFloat32Frames({
      input,
      pending,
      frameSize: 4,
      onFrame,
    });

    expect(onFrame).toHaveBeenCalledTimes(1);
    const pcm = onFrame.mock.calls[0][0] as Int16Array;
    expect(pcm.length).toBe(4);
    // 0.25 -> round(0.25 * 32767) = 8192
    expect(pcm[0]).toBe(8192);
    // 0.5 -> round(0.5 * 32767) = round(16383.5) = 16384
    expect(pcm[1]).toBe(16384);
    // 0.75 -> round(0.75 * 32767) = 24575
    expect(pcm[2]).toBe(24575);
    // -0.25 -> round(-0.25 * 32768) = -8192
    expect(pcm[3]).toBe(-8192);

    // remainder should be the last sample from input
    expect(result.length).toBe(1);
    expect(result[0]).toBeCloseTo(0.1);
  });

  it('accumulates remainder across multiple calls', () => {
    // First call: frameSize=3, input=[0.1, 0.2] -> no frame, returns [0.1, 0.2]
    const pending1 = new Float32Array(0);
    const result1 = pushFloat32Frames({
      input: new Float32Array([0.1, 0.2]),
      pending: pending1,
      frameSize: 3,
      onFrame,
    });
    expect(onFrame).not.toHaveBeenCalled();
    expect(result1.length).toBe(2);

    // Second call: pending=[0.1, 0.2], input=[0.3] -> merged=3 -> 1 frame, 0 remainder
    const result2 = pushFloat32Frames({
      input: new Float32Array([0.3]),
      pending: result1,
      frameSize: 3,
      onFrame,
    });
    expect(onFrame).toHaveBeenCalledTimes(1);
    const pcm = onFrame.mock.calls[0][0] as Int16Array;
    expect(pcm.length).toBe(3);
    expect(pcm[0]).toBe(Math.round(0.1 * 0x7fff));
    expect(pcm[1]).toBe(Math.round(0.2 * 0x7fff));
    expect(pcm[2]).toBe(Math.round(0.3 * 0x7fff));
    expect(result2).toEqual(new Float32Array(0));
  });

  // --- clamping ---

  it('clamps values exceeding [-1, 1] range', () => {
    const input = new Float32Array([1.5, -1.5, 2.0, -3.0]);
    pushFloat32Frames({
      input,
      pending: new Float32Array(0),
      frameSize: 4,
      onFrame,
    });

    const pcm = onFrame.mock.calls[0][0] as Int16Array;
    // 1.5 clamped to 1 -> 32767
    expect(pcm[0]).toBe(32767);
    // -1.5 clamped to -1 -> -32768
    expect(pcm[1]).toBe(-32768);
    // 2.0 clamped to 1 -> 32767
    expect(pcm[2]).toBe(32767);
    // -3.0 clamped to -1 -> -32768
    expect(pcm[3]).toBe(-32768);
  });

  // --- boundary values ---

  it('converts silence (all zeros) correctly', () => {
    const input = new Float32Array([0, 0, 0, 0]);
    pushFloat32Frames({
      input,
      pending: new Float32Array(0),
      frameSize: 4,
      onFrame,
    });

    const pcm = onFrame.mock.calls[0][0] as Int16Array;
    for (let i = 0; i < 4; i++) {
      expect(pcm[i]).toBe(0);
    }
  });

  it('converts max positive (1.0) to 0x7fff', () => {
    const input = new Float32Array([1.0]);
    pushFloat32Frames({
      input,
      pending: new Float32Array(0),
      frameSize: 1,
      onFrame,
    });

    const pcm = onFrame.mock.calls[0][0] as Int16Array;
    expect(pcm[0]).toBe(32767);
  });

  it('converts max negative (-1.0) to -0x8000', () => {
    const input = new Float32Array([-1.0]);
    pushFloat32Frames({
      input,
      pending: new Float32Array(0),
      frameSize: 1,
      onFrame,
    });

    const pcm = onFrame.mock.calls[0][0] as Int16Array;
    expect(pcm[0]).toBe(-32768);
  });

  // --- asymmetric conversion (positive * 0x7fff, negative * 0x8000) ---

  it('applies asymmetric scaling for positive vs negative samples', () => {
    // Positive: sample * 0x7fff, Negative: sample * 0x8000
    const input = new Float32Array([0.5, -0.5]);
    pushFloat32Frames({
      input,
      pending: new Float32Array(0),
      frameSize: 2,
      onFrame,
    });

    const pcm = onFrame.mock.calls[0][0] as Int16Array;
    // positive: round(0.5 * 32767) = round(16383.5) = 16384
    expect(pcm[0]).toBe(16384);
    // negative: round(-0.5 * 32768) = -16384
    expect(pcm[1]).toBe(-16384);
    // The asymmetric multiplier (0x7fff vs 0x8000) is visible at 1.0: 32767 vs -32768
    // At 0.5, rounding happens to produce equal magnitudes (16384 = |−16384|)
    expect(Math.abs(pcm[0])).toBe(Math.abs(pcm[1]));
  });

  // --- frameSize of 1 ---

  it('works with frameSize of 1', () => {
    const input = new Float32Array([0.1, -0.2, 0.3]);
    pushFloat32Frames({
      input,
      pending: new Float32Array(0),
      frameSize: 1,
      onFrame,
    });

    expect(onFrame).toHaveBeenCalledTimes(3);
    expect((onFrame.mock.calls[0][0] as Int16Array).length).toBe(1);
    expect((onFrame.mock.calls[1][0] as Int16Array).length).toBe(1);
    expect((onFrame.mock.calls[2][0] as Int16Array).length).toBe(1);
  });

  // --- large frameSize with insufficient data ---

  it('returns all data as pending when input + pending < frameSize', () => {
    const pending = new Float32Array([0.1]);
    const input = new Float32Array([0.2, 0.3]);
    const result = pushFloat32Frames({
      input,
      pending,
      frameSize: 100,
      onFrame,
    });

    expect(onFrame).not.toHaveBeenCalled();
    expect(result.length).toBe(3);
    expect(result[0]).toBeCloseTo(0.1);
    expect(result[1]).toBeCloseTo(0.2);
    expect(result[2]).toBeCloseTo(0.3);
  });

  // --- each frame callback receives an independent Int16Array ---

  it('passes independent Int16Array instances to each onFrame call', () => {
    const input = new Float32Array([0.5, -0.5, 0.25, -0.25]);
    pushFloat32Frames({
      input,
      pending: new Float32Array(0),
      frameSize: 2,
      onFrame,
    });

    expect(onFrame).toHaveBeenCalledTimes(2);
    const frame0 = onFrame.mock.calls[0][0] as Int16Array;
    const frame1 = onFrame.mock.calls[1][0] as Int16Array;
    expect(frame0).not.toBe(frame1);
    // Mutating one should not affect the other
    frame0[0] = 999;
    expect(frame1[0]).not.toBe(999);
  });
});
