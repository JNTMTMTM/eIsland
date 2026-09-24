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
 * @file videoProbe.ts
 * @description 使用短生命周期的视频元素探测元数据和缩略封面，完成或取消后释放解码资源。
 * @author 鸡哥
 */

interface VideoProbeResult {
  width: number;
  height: number;
  durationSec: number;
  poster?: string;
}

/**
 * 探测视频元数据，按需生成最长边不超过 640 像素的封面。
 * @param url - 可流式读取的视频地址
 * @param signal - 组件卸载或条目移除时取消探测
 * @param capturePoster - 是否等待首帧并生成预览封面
 * @returns 元数据；失败、超时或取消返回 null
 */
export default function probeVideo(url: string, signal: AbortSignal, capturePoster = false): Promise<VideoProbeResult | null> {
  if (signal.aborted) return Promise.resolve(null);
  return new Promise((resolve) => {
    const probe = document.createElement('video');
    probe.crossOrigin = 'anonymous';
    probe.preload = capturePoster ? 'auto' : 'metadata';
    probe.muted = true;
    probe.playsInline = true;
    let settled = false;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- 取消回调与收尾相互引用，事件仅在初始化完成后触发。
    const onAbort = (): void => finish(null);
    const timeout = setTimeout(onAbort, 15000);
    const finish = (result: VideoProbeResult | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
      probe.onloadedmetadata = null;
      probe.onloadeddata = null;
      probe.onerror = null;
      probe.pause();
      probe.removeAttribute('src');
      probe.load();
      resolve(result);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    const onReady = (): void => {
      const result: VideoProbeResult = {
        width: probe.videoWidth,
        height: probe.videoHeight,
        durationSec: Number.isFinite(probe.duration) ? probe.duration : 0,
      };
      if (capturePoster && result.width > 0 && result.height > 0) {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 640 / Math.max(result.width, result.height));
        canvas.width = Math.max(1, Math.round(result.width * scale));
        canvas.height = Math.max(1, Math.round(result.height * scale));
        try {
          const context = canvas.getContext('2d');
          if (context) {
            context.drawImage(probe, 0, 0, canvas.width, canvas.height);
            result.poster = canvas.toDataURL('image/jpeg', 0.86);
          }
        } catch {
          // 封面失败不影响使用同一地址播放视频。
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
      }
      finish(result);
    };
    if (capturePoster) probe.onloadeddata = onReady;
    else probe.onloadedmetadata = onReady;
    probe.onerror = onAbort;
    probe.src = url;
  });
}
