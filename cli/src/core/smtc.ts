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
 * @file smtc.ts
 * @description 本机 SMTC（系统媒体传输控件）播放信息读取
 * @description 完全自包含：不依赖仓库插件或原生模块，通过系统自带的 Windows PowerShell 调用 WinRT 接口，
 * 常驻进程每秒输出一行 JSON，CLI 解析后实时渲染
 * @author 鸡哥
 */

import { spawn } from 'node:child_process';

/** 当前媒体会话 */
export interface SmtcSession {
  /** 来源应用的 AppUserModelId */
  app: string;
  /** 标题 */
  title: string;
  /** 艺术家 */
  artist: string;
  /** 专辑 */
  album: string;
  /** 播放状态，如 Playing、Paused */
  status: string;
  /** 时间线位置（秒），对应 updated 时刻 */
  position: number;
  /** 总时长（秒），应用未提供时间线时为 0 */
  duration: number;
  /** 时间线最后更新时刻（Unix 毫秒），未提供时为非正数 */
  updated: number;
}

/** 单次读取结果，null 表示当前没有媒体会话 */
export type SmtcSnapshot = SmtcSession | null;

/** 读取进程句柄 */
export interface SmtcWatcher {
  /** 结束读取进程 */
  stop: () => void;
}

/** 刷新间隔，与脚本中的 Start-Sleep 一致 */
export const SMTC_INTERVAL_MS = 1000;

// PowerShell 5.1 没有 await，借助 AsTask 把 WinRT 异步操作转为 Task 后同步等待。
const SMTC_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
  'Add-Type -AssemblyName System.Runtime.WindowsRuntime',
  "$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1",
  'function Await($operation, [Type]$type) { $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation)); $null = $task.Wait(-1); $task.Result }',
  '$managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]',
  '$propsType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]',
  '$manager = Await ($managerType::RequestAsync()) $managerType',
  'while ($true) {',
  '  $session = $manager.GetCurrentSession()',
  '  if ($null -eq $session) { $payload = @{ active = $false } } else {',
  '    $props = Await ($session.TryGetMediaPropertiesAsync()) $propsType',
  '    $playback = $session.GetPlaybackInfo()',
  '    $timeline = $session.GetTimelineProperties()',
  '    $payload = @{ active = $true; app = $session.SourceAppUserModelId; title = $props.Title; artist = $props.Artist; album = $props.AlbumTitle; status = [string]$playback.PlaybackStatus; position = $timeline.Position.TotalSeconds; duration = $timeline.EndTime.TotalSeconds; updated = $timeline.LastUpdatedTime.ToUnixTimeMilliseconds() }',
  '  }',
  '  [Console]::Out.WriteLine(($payload | ConvertTo-Json -Compress))',
  '  [Console]::Out.Flush()',
  `  Start-Sleep -Milliseconds ${SMTC_INTERVAL_MS}`,
  '}',
].join('\n');

/**
 * 是否支持读取 SMTC
 * @param platform - 运行平台
 * @returns 仅 Windows 支持
 */
export function isSmtcSupported(platform: NodeJS.Platform = process.platform): boolean {
  return platform === 'win32';
}

/**
 * 解析脚本输出的一行
 * @param line - JSON 文本
 * @returns 读取结果；无法解析时返回 undefined
 */
export function parseSmtcLine(line: string): SmtcSnapshot | undefined {
  try {
    const value = JSON.parse(line) as Record<string, unknown>;
    if (value.active !== true) return null;
    const text = (key: string): string => (typeof value[key] === 'string' ? value[key] : '');
    const num = (key: string): number => (typeof value[key] === 'number' ? value[key] : 0);
    return {
      app: text('app'),
      title: text('title'),
      artist: text('artist'),
      album: text('album'),
      status: text('status'),
      position: num('position'),
      duration: num('duration'),
      updated: num('updated'),
    };
  } catch {
    return undefined;
  }
}

/**
 * 启动常驻读取进程
 * @description 脚本以 -EncodedCommand 传入，避免命令行转义问题；进程异常退出时回调错误
 * @param onUpdate - 每次读取到结果时回调
 * @param onError - 进程启动失败或异常退出时回调
 * @returns 读取进程句柄
 */
export function watchSmtc(onUpdate: (snapshot: SmtcSnapshot) => void, onError: (message: string) => void): SmtcWatcher {
  const encoded = Buffer.from(SMTC_SCRIPT, 'utf16le').toString('base64');
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let stopped = false;
  let pending = '';
  let stderr = '';

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    const lines = `${pending}${chunk}`.split(/\r?\n/);
    pending = lines.pop() ?? '';
    lines.forEach((line) => {
      const snapshot = parseSmtcLine(line);
      if (snapshot !== undefined) onUpdate(snapshot);
    });
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });
  child.on('error', (error) => {
    if (!stopped) onError(error.message);
  });
  child.on('close', (code) => {
    if (stopped) return;
    const [detail] = stderr.trim().split(/\r?\n/);
    onError(detail || `exit ${code}`);
  });

  return {
    stop: () => {
      stopped = true;
      child.kill();
    },
  };
}
