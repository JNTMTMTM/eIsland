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
 * @file wallpaperVideo.ts
 * @description 壁纸视频客户端转码/封面 IPC 处理模块
 *              通过 ffmpeg/ffprobe（系统 PATH）完成：
 *              - probe 检测编码（若视频已是 H.264+AAC 的 mp4/mov 则走 remux）
 *              - 否则转码为 mp4 / libx264 + aac（-crf 16 -preset slow），保持原分辨率与帧率
 *              - 抽取首帧封面
 *              无 ffmpeg 时优雅回退：仅复制源文件，封面由渲染端兜底生成
 * @author 鸡哥
 */

import { app, BrowserWindow, ipcMain, WebContents } from 'electron';
import { spawn } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { basename, join, resolve as resolvePath } from 'path';

interface VideoProbeResult {
  width: number;
  height: number;
  durationMs: number;
  frameRate: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  container: string | null;
}

interface VideoPrepareOptions {
  /** 源文件绝对路径 */
  sourcePath: string;
  /** 若已匹配 remux 条件则跳过重编码 */
  preferRemux?: boolean;
}

interface VideoPrepareResult {
  ok: boolean;
  playbackPath: string | null;
  coverPath: string | null;
  width: number;
  height: number;
  durationMs: number;
  frameRate: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  container: string | null;
  mode: 'remux' | 'transcode' | 'copy';
  ffmpegAvailable: boolean;
  message?: string;
}

const TARGET_VIDEO_EXT = 'mp4';
const TARGET_COVER_EXT = 'jpg';
const FFMPEG_BINARY = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
const FFPROBE_BINARY = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';

/**
 * 执行命令并收集 stdout/stderr
 * @description 简单的 child_process 封装；cmd 不存在时抛出
 */
function runCommand(cmd: string, args: string[], onProgress?: (line: string) => void): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(cmd, args, { windowsHide: true });
    } catch (err) {
      reject(err);
      return;
    }
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      if (onProgress) {
        text.split(/\r|\n/).forEach((line) => {
          const trimmed = line.trim();
          if (trimmed) onProgress(trimmed);
        });
      }
    });
    child.on('error', (err) => {
      reject(err);
    });
    child.on('close', (code) => {
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

/**
 * 使用 ffprobe 探测视频元数据
 * @description 失败（含 ffprobe 不存在）时返回 null
 */
async function probeVideo(sourcePath: string): Promise<VideoProbeResult | null> {
  try {
    const { code, stdout } = await runCommand(FFPROBE_BINARY, [
      '-v', 'error',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      sourcePath,
    ]);
    if (code !== 0 || !stdout) return null;
    const payload = JSON.parse(stdout) as {
      streams?: Array<{
        codec_type?: string;
        codec_name?: string;
        width?: number;
        height?: number;
        avg_frame_rate?: string;
        r_frame_rate?: string;
      }>;
      format?: { duration?: string; format_name?: string };
    };
    const streams = Array.isArray(payload.streams) ? payload.streams : [];
    const video = streams.find((s) => s.codec_type === 'video');
    const audio = streams.find((s) => s.codec_type === 'audio');
    const durationSec = parseFloat(payload.format?.duration ?? '0');
    const frameRateRaw = video?.avg_frame_rate && video.avg_frame_rate !== '0/0'
      ? video.avg_frame_rate
      : video?.r_frame_rate && video.r_frame_rate !== '0/0'
        ? video.r_frame_rate
        : null;
    let frameRate: number | null = null;
    if (typeof frameRateRaw === 'string' && frameRateRaw.includes('/')) {
      const [num, den] = frameRateRaw.split('/').map((s) => Number(s));
      if (Number.isFinite(num) && Number.isFinite(den) && den > 0) {
        frameRate = Number((num / den).toFixed(3));
      }
    } else if (typeof frameRateRaw === 'string') {
      const parsed = Number(frameRateRaw);
      if (Number.isFinite(parsed) && parsed > 0) frameRate = Number(parsed.toFixed(3));
    }
    return {
      width: typeof video?.width === 'number' ? video.width : 0,
      height: typeof video?.height === 'number' ? video.height : 0,
      durationMs: Number.isFinite(durationSec) ? Math.max(1, Math.round(durationSec * 1000)) : 0,
      frameRate,
      videoCodec: typeof video?.codec_name === 'string' ? video.codec_name.toLowerCase() : null,
      audioCodec: typeof audio?.codec_name === 'string' ? audio.codec_name.toLowerCase() : null,
      container: typeof payload.format?.format_name === 'string' ? payload.format.format_name.toLowerCase() : null,
    };
  } catch {
    return null;
  }
}

/**
 * 计算视频转码 / remux 策略
 */
function shouldRemux(probe: VideoProbeResult | null): boolean {
  if (!probe) return false;
  if (probe.videoCodec !== 'h264') return false;
  if (probe.audioCodec && probe.audioCodec !== 'aac') return false;
  return true;
}

/**
 * 发送 IPC 进度事件到发起方 WebContents
 */
function emitProgress(sender: WebContents | undefined, progressChannel: string | undefined, payload: Record<string, unknown>): void {
  if (!sender || !progressChannel) return;
  try {
    sender.send(progressChannel, payload);
  } catch {
    // ignore
  }
}

/**
 * 基于源文件生成唯一的工作目录
 */
function ensureVideoWorkspace(): { root: string; videoDir: string; coverDir: string } {
  const wallpaperDir = resolvePath(join(app.getPath('userData'), 'wallpapers'));
  const videoDir = resolvePath(join(wallpaperDir, 'video'));
  const coverDir = resolvePath(join(wallpaperDir, 'video-cover'));
  [wallpaperDir, videoDir, coverDir].forEach((dir) => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  });
  return { root: wallpaperDir, videoDir, coverDir };
}

/**
 * 清理给定目录下早于 24 小时的文件
 */
function sweepStaleFiles(dir: string, maxAgeMs = 24 * 60 * 60 * 1000): void {
  try {
    if (!existsSync(dir)) return;
    const now = Date.now();
    readdirSync(dir).forEach((name) => {
      try {
        const p = join(dir, name);
        const stats = statSync(p);
        if (stats.isFile() && now - stats.mtimeMs > maxAgeMs) {
          unlinkSync(p);
        }
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore
  }
}

/**
 * 注册壁纸视频 IPC 处理器
 */
export function registerWallpaperVideoIpcHandlers(): void {
  const { videoDir, coverDir } = ensureVideoWorkspace();

  // 启动时清理过期缓存
  sweepStaleFiles(videoDir);
  sweepStaleFiles(coverDir);

  /**
   * wallpaper:video:probe
   * @description 探测视频元数据；无 ffprobe 时返回 null
   */
  ipcMain.handle('wallpaper:video:probe', async (_event, sourcePath: string): Promise<VideoProbeResult | null> => {
    if (!sourcePath || typeof sourcePath !== 'string' || !existsSync(sourcePath)) return null;
    return probeVideo(sourcePath);
  });

  /**
   * wallpaper:video:prepare
   * @description 探测 + remux/transcode，产出单份播放文件与首帧封面
   *              options.progressChannel 存在则持续发送进度事件
   */
  ipcMain.handle('wallpaper:video:prepare', async (event, options: VideoPrepareOptions & { progressChannel?: string }): Promise<VideoPrepareResult> => {
    const sender = BrowserWindow.fromWebContents(event.sender)?.webContents;
    const progressChannel = typeof options?.progressChannel === 'string' ? options.progressChannel : undefined;

    const fail = (message: string, ffmpegAvailable: boolean): VideoPrepareResult => ({
      ok: false,
      playbackPath: null,
      coverPath: null,
      width: 0,
      height: 0,
      durationMs: 0,
      frameRate: null,
      videoCodec: null,
      audioCodec: null,
      container: null,
      mode: 'copy',
      ffmpegAvailable,
      message,
    });

    if (!options || typeof options !== 'object') {
      return fail('invalid options', false);
    }
    const sourcePath = typeof options.sourcePath === 'string' ? options.sourcePath : '';
    if (!sourcePath || !existsSync(sourcePath)) {
      return fail('source not found', false);
    }

    const probe = await probeVideo(sourcePath);
    const ffmpegAvailable = probe !== null;

    const baseName = basename(sourcePath).replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
    const stamp = Date.now();
    const playbackPath = resolvePath(join(videoDir, `${baseName}-${stamp}.${TARGET_VIDEO_EXT}`));
    const coverPath = resolvePath(join(coverDir, `${baseName}-${stamp}.${TARGET_COVER_EXT}`));

    // 如果探测失败（多半是没装 ffmpeg），降级为复制并放弃封面
    if (!probe) {
      try {
        copyFileSync(sourcePath, playbackPath);
      } catch (err) {
        return fail(err instanceof Error ? err.message : 'copy failed', false);
      }
      return {
        ok: true,
        playbackPath,
        coverPath: null,
        width: 0,
        height: 0,
        durationMs: 0,
        frameRate: null,
        videoCodec: null,
        audioCodec: null,
        container: null,
        mode: 'copy',
        ffmpegAvailable: false,
        message: 'ffmpeg/ffprobe not available, source copied without transcoding',
      };
    }

    const preferRemux = options.preferRemux !== false;
    const useRemux = preferRemux && shouldRemux(probe);

    // 发送开始事件
    if (sender && progressChannel) {
      emitProgress(sender, progressChannel, { stage: 'start', mode: useRemux ? 'remux' : 'transcode' });
    }

    const handleStderrProgress = (line: string): void => {
      if (!sender || !progressChannel) return;
      const frameMatch = line.match(/frame=\s*(\d+)/);
      const timeMatch = line.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      const speedMatch = line.match(/speed=([\d.]+)x/);
      if (frameMatch || timeMatch || speedMatch) {
        let currentMs = 0;
        if (timeMatch) {
          const h = parseInt(timeMatch[1], 10) || 0;
          const m = parseInt(timeMatch[2], 10) || 0;
          const s = parseFloat(timeMatch[3]) || 0;
          currentMs = Math.round((h * 3600 + m * 60 + s) * 1000);
        }
        const percent = probe.durationMs > 0
          ? Math.max(0, Math.min(100, Math.round((currentMs / probe.durationMs) * 100)))
          : 0;
        emitProgress(sender, progressChannel, {
          stage: 'progress',
          percent,
          frame: frameMatch ? Number(frameMatch[1]) : undefined,
          speed: speedMatch ? Number(speedMatch[1]) : undefined,
        });
      }
    };

    try {
      if (useRemux) {
        const result = await runCommand(FFMPEG_BINARY, [
          '-y',
          '-hide_banner',
          '-i', sourcePath,
          '-c', 'copy',
          '-movflags', '+faststart',
          playbackPath,
        ], handleStderrProgress);
        if (result.code !== 0 || !existsSync(playbackPath)) {
          // fallback to transcode
          return await transcode(sourcePath, playbackPath, coverPath, probe, sender, progressChannel, handleStderrProgress);
        }
      } else {
        const outcome = await transcode(sourcePath, playbackPath, coverPath, probe, sender, progressChannel, handleStderrProgress);
        if (!outcome.ok) return outcome;
      }

      // 提取封面
      const coverResult = await runCommand(FFMPEG_BINARY, [
        '-y',
        '-hide_banner',
        '-i', playbackPath,
        '-vf', "select=eq(n\\,0)",
        '-vframes', '1',
        '-q:v', '2',
        coverPath,
      ]);
      const coverOk = coverResult.code === 0 && existsSync(coverPath);

      emitProgress(sender, progressChannel, { stage: 'done', percent: 100 });

      return {
        ok: true,
        playbackPath,
        coverPath: coverOk ? coverPath : null,
        width: probe.width,
        height: probe.height,
        durationMs: probe.durationMs,
        frameRate: probe.frameRate,
        videoCodec: probe.videoCodec,
        audioCodec: probe.audioCodec,
        container: probe.container,
        mode: useRemux ? 'remux' : 'transcode',
        ffmpegAvailable: true,
      };
    } catch (err) {
      emitProgress(sender, progressChannel, { stage: 'error', message: err instanceof Error ? err.message : String(err) });
      // 降级为直接复制
      try {
        copyFileSync(sourcePath, playbackPath);
        return {
          ok: true,
          playbackPath,
          coverPath: null,
          width: probe.width,
          height: probe.height,
          durationMs: probe.durationMs,
          frameRate: probe.frameRate,
          videoCodec: probe.videoCodec,
          audioCodec: probe.audioCodec,
          container: probe.container,
          mode: 'copy',
          ffmpegAvailable,
          message: err instanceof Error ? err.message : 'ffmpeg execution failed, fell back to copy',
        };
      } catch (copyErr) {
        return fail(copyErr instanceof Error ? copyErr.message : 'copy failed', ffmpegAvailable);
      }
    }
  });

  /**
   * wallpaper:video:cover
   * @description 单独抽取首帧封面图；失败时返回 null
   */
  ipcMain.handle('wallpaper:video:cover', async (_event, sourcePath: string): Promise<string | null> => {
    if (!sourcePath || typeof sourcePath !== 'string' || !existsSync(sourcePath)) return null;
    const stamp = Date.now();
    const baseName = basename(sourcePath).replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
    const coverPath = resolvePath(join(coverDir, `${baseName}-${stamp}.${TARGET_COVER_EXT}`));
    try {
      const result = await runCommand(FFMPEG_BINARY, [
        '-y',
        '-hide_banner',
        '-i', sourcePath,
        '-vf', "select=eq(n\\,0)",
        '-vframes', '1',
        '-q:v', '2',
        coverPath,
      ]);
      if (result.code === 0 && existsSync(coverPath)) return coverPath;
      return null;
    } catch {
      return null;
    }
  });

  /**
   * wallpaper:video:clear-cache
   * @description 清理视频/封面缓存目录
   */
  ipcMain.handle('wallpaper:video:clear-cache', async () => {
    [videoDir, coverDir].forEach((dir) => {
      try {
        if (!existsSync(dir)) return;
        readdirSync(dir).forEach((name) => {
          try {
            unlinkSync(join(dir, name));
          } catch {
            // ignore
          }
        });
      } catch {
        // ignore
      }
    });
  });
}

async function transcode(
  sourcePath: string,
  playbackPath: string,
  _coverPath: string,
  _probe: VideoProbeResult,
  sender: WebContents | undefined,
  progressChannel: string | undefined,
  onProgress: (line: string) => void,
): Promise<VideoPrepareResult> {
  try {
    const result = await runCommand(FFMPEG_BINARY, [
      '-y',
      '-hide_banner',
      '-i', sourcePath,
      '-c:v', 'libx264',
      '-crf', '16',
      '-preset', 'slow',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '320k',
      '-movflags', '+faststart',
      playbackPath,
    ], onProgress);
    if (result.code !== 0 || !existsSync(playbackPath)) {
      if (sender && progressChannel) {
        emitProgress(sender, progressChannel, { stage: 'error', message: 'ffmpeg transcode failed' });
      }
      return {
        ok: false,
        playbackPath: null,
        coverPath: null,
        width: 0,
        height: 0,
        durationMs: 0,
        frameRate: null,
        videoCodec: null,
        audioCodec: null,
        container: null,
        mode: 'transcode',
        ffmpegAvailable: true,
        message: 'transcode exited non-zero',
      };
    }
    return {
      ok: true,
      playbackPath,
      coverPath: null,
      width: 0,
      height: 0,
      durationMs: 0,
      frameRate: null,
      videoCodec: null,
      audioCodec: null,
      container: null,
      mode: 'transcode',
      ffmpegAvailable: true,
    };
  } catch (err) {
    return {
      ok: false,
      playbackPath: null,
      coverPath: null,
      width: 0,
      height: 0,
      durationMs: 0,
      frameRate: null,
      videoCodec: null,
      audioCodec: null,
      container: null,
      mode: 'transcode',
      ffmpegAvailable: true,
      message: err instanceof Error ? err.message : 'transcode failed',
    };
  }
}
