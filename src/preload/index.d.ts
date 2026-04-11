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
 * @file index.d.ts
 * @description 渲染进程全局类型声明，扩展 Window 接口以包含 Electron API 和自定义 API
 * @author 鸡哥
 */

import { ElectronAPI } from '@electron-toolkit/preload';

/** 歌曲信息类型（来自 SMTC Worker 主进程推送） */
export interface NowPlayingInfo {
  title: string;
  artist: string;
  album: string;
  duration_ms: number;
  position_ms: number;
  isPlaying: boolean;
  thumbnail: string | null;
  canFastForward: boolean;
  canSkip: boolean;
  canLike: boolean;
  canChangeVolume: boolean;
  canSetOutput: boolean;
}

export interface RunningProcessInfo {
  name: string;
  iconDataUrl: string | null;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      enableMousePassthrough: () => void;
      disableMousePassthrough: () => void;
      expandWindow: () => void;
      expandWindowNotification: () => void;
      expandWindowLyrics: () => void;
      expandWindowFull: () => void;
      expandWindowSettings: () => void;
      collapseWindow: () => void;
      hideWindow: () => void;
      getMousePosition: () => Promise<{ x: number; y: number }>;
      getWindowBounds: () => Promise<{ x: number; y: number; width: number; height: number }>;
      getIslandPositionOffset: () => Promise<{ x: number; y: number }>;
      setIslandPositionOffset: (offset: { x: number; y: number }) => Promise<boolean>;
      onIslandPositionOffsetChanged: (callback: (offset: { x: number; y: number }) => void) => () => void;
      quitApp: () => void;
      restartApp: () => Promise<boolean>;
      openLogsFolder: () => Promise<boolean>;
      /** ===== 音乐相关 API ===== */
      mediaPlayPause: () => Promise<void>;
      mediaNext: () => Promise<void>;
      mediaPrev: () => Promise<void>;
      mediaSeek: (positionMs: number) => Promise<void>;
      mediaGetVolume: () => Promise<number>;
      mediaSetVolume: (volume: number) => Promise<void>;
      /** ===== 歌曲信息监听 API ===== */
      onNowPlayingInfo: (callback: (info: NowPlayingInfo | null) => void) => () => void;
      /** ===== 系统工具 API ===== */
      screenshot: () => Promise<string | null>;
      openTaskManager: () => void;
      getPathForFile: (file: File) => string;
      /** ===== 应用快捷方式 API ===== */
      getFileIcon: (filePath: string) => Promise<string | null>;
      openFile: (filePath: string) => Promise<boolean>;
      resolveShortcut: (lnkPath: string) => Promise<{ target: string; name: string } | null>;
      /** ===== 文件选择对话框 API ===== */
      openImageDialog: () => Promise<string | null>;
      /** ===== HTTP 代理 API ===== */
      netFetch: (url: string, options?: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        timeoutMs?: number;
      }) => Promise<{ ok: boolean; status: number; body: string }>;
      /** ===== 文件存储 API ===== */
      storeRead: (key: string) => Promise<unknown>;
      storeWrite: (key: string, data: unknown) => Promise<boolean>;
      /** ===== 快捷键 API ===== */
      hotkeyGet: () => Promise<string>;
      hotkeySet: (accelerator: string) => Promise<boolean>;
      hotkeySuspend: () => Promise<boolean>;
      hotkeyResume: () => Promise<boolean>;
      quitHotkeyGet: () => Promise<string>;
      quitHotkeySet: (accelerator: string) => Promise<boolean>;
      /** ===== 截图快捷键 API ===== */
      screenshotHotkeyGet: () => Promise<string>;
      screenshotHotkeySet: (accelerator: string) => Promise<boolean>;
      /** ===== 还原位置快捷键 API ===== */
      resetPositionHotkeyGet: () => Promise<string>;
      resetPositionHotkeySet: (accelerator: string) => Promise<boolean>;
      /** ===== 日志文件 API ===== */
      logWrite: (level: string, message: string) => void;
      /** ===== 歌曲设置 API ===== */
      musicWhitelistGet: () => Promise<string[]>;
      musicWhitelistSet: (list: string[]) => Promise<boolean>;
      musicLyricsSourceGet: () => Promise<string>;
      musicLyricsSourceSet: (source: string) => Promise<boolean>;
      musicLyricsKaraokeGet: () => Promise<boolean>;
      musicLyricsKaraokeSet: (enabled: boolean) => Promise<boolean>;
      musicLyricsClockGet: () => Promise<boolean>;
      musicLyricsClockSet: (enabled: boolean) => Promise<boolean>;
      musicSmtcUnsubscribeMsGet: () => Promise<number>;
      musicSmtcUnsubscribeMsSet: (valueMs: number) => Promise<boolean>;
      musicDetectSourceAppId: () => Promise<{ ok: boolean; sourceAppId: string | null; message: string }>;
      getRunningNonSystemProcesses: () => Promise<string[]>;
      getRunningNonSystemProcessesWithIcons: () => Promise<RunningProcessInfo[]>;
      hideProcessListGet: () => Promise<string[]>;
      hideProcessListSet: (list: string[]) => Promise<boolean>;
      /** 订阅播放源切换请求（主进程推送） */
      onSourceSwitchRequest: (callback: (data: { sourceAppId: string; title: string; artist: string }) => void) => () => void;
      /** 接受切换到新播放源 */
      mediaAcceptSourceSwitch: () => Promise<void>;
      /** 拒绝切换播放源 */
      mediaRejectSourceSwitch: () => Promise<void>;
      /** ===== 主题 API ===== */
      themeModeGet: () => Promise<string>;
      themeModeSet: (mode: string) => Promise<boolean>;
      /** ===== 灵动岛透明度 API ===== */
      islandOpacityGet: () => Promise<number>;
      islandOpacitySet: (opacity: number) => Promise<boolean>;
      /** ===== 鼠标移开行为配置 API ===== */
      expandMouseleaveIdleGet: () => Promise<boolean>;
      expandMouseleaveIdleSet: (enabled: boolean) => Promise<boolean>;
      maxexpandMouseleaveIdleGet: () => Promise<boolean>;
      maxexpandMouseleaveIdleSet: (enabled: boolean) => Promise<boolean>;
      /** ===== 开机自启 API ===== */
      autostartGet: () => Promise<string>;
      autostartSet: (mode: string) => Promise<boolean>;
      /** ===== 快速导航顺序 API ===== */
      navOrderGet: () => Promise<{ visibleOrder: string[]; hiddenOrder: string[] }>;
      navOrderSet: (payload: { visibleOrder: string[]; hiddenOrder: string[] }) => Promise<boolean>;
    };
  }
}
