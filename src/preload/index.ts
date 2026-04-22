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
 * @file index.ts
 * @description 预加载脚本，安全地将主进程能力桥接到渲染进程
 * @author 鸡哥
 */

import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

/** 自定义 API，供渲染进程调用 */
const api = {
  /**
   * 启用鼠标穿透透明区域
   * @description 允许鼠标事件穿透窗口透明部分，传递到下层应用
   */
  enableMousePassthrough: (): void => {
    ipcRenderer.send('window:enable-mouse-passthrough');
  },
  /**
   * 禁用鼠标穿透，恢复窗口捕获鼠标事件
   * @description 使窗口能够接收鼠标事件，触发 hover/leave 等交互
   */
  disableMousePassthrough: (): void => {
    ipcRenderer.send('window:disable-mouse-passthrough');
  },
  /**
   * 展开窗口到 hover 状态尺寸
   * @description 基于初始中心点，向两边均匀扩展
   */
  expandWindow: (): void => {
    ipcRenderer.send('window:expand');
  },
  /**
   * 展开窗口到 notification 状态尺寸
   * @description 使用通知专用尺寸（500x88）
   */
  expandWindowNotification: (): void => {
    ipcRenderer.send('window:expand-notification');
  },
  /**
   * 展开窗口到歌词状态尺寸
   * @description 宽度 500，高度与 idle 一致（42）
   */
  expandWindowLyrics: (): void => {
    ipcRenderer.send('window:expand-lyrics');
  },
  /**
   * 完整展开窗口到 expanded 状态尺寸
   * @description 单击灵动岛后展开为完整操作面板（560x200）
   */
  expandWindowFull: (): void => {
    ipcRenderer.send('window:expand-full');
  },
  /**
   * 展开窗口到设置面板尺寸
   * @description 比 expanded 更大的独立设置界面（860x400）
   */
  expandWindowSettings: (): void => {
    ipcRenderer.send('window:expand-settings');
  },
  /**
   * 收缩窗口到 idle 状态尺寸
   * @description 收缩回原始尺寸，保持中心对齐
   */
  collapseWindow: (): void => {
    ipcRenderer.send('window:collapse');
  },
  /**
   * 隐藏窗口
   */
  hideWindow: (): void => {
    ipcRenderer.send('window:hide');
  },
  /**
   * 获取当前鼠标位置（屏幕坐标）
   * @returns 包含 x、y 坐标的对象
   */
  getMousePosition: (): Promise<{ x: number; y: number }> => {
    return ipcRenderer.invoke('window:get-mouse-position');
  },
  /**
   * 获取窗口边界信息
   * @returns 包含 x、y、width、height 的边界对象
   */
  getWindowBounds: (): Promise<{ x: number; y: number; width: number; height: number }> => {
    return ipcRenderer.invoke('window:get-bounds');
  },
  /**
   * 获取可用于灵动岛显示的显示器列表
   */
  getIslandDisplays: (): Promise<Array<{ id: string; width: number; height: number; isPrimary: boolean }>> => {
    return ipcRenderer.invoke('window:island-displays:list');
  },
  /**
   * 获取灵动岛显示器选择配置
   */
  getIslandDisplaySelection: (): Promise<string> => {
    return ipcRenderer.invoke('window:island-display:get');
  },
  /**
   * 设置并保存灵动岛显示器选择配置
   */
  setIslandDisplaySelection: (selection: string): Promise<boolean> => {
    return ipcRenderer.invoke('window:island-display:set', selection);
  },
  /**
   * 获取灵动岛位置偏移
   * @returns 相对主屏工作区顶部居中的偏移
   */
  getIslandPositionOffset: (): Promise<{ x: number; y: number }> => {
    return ipcRenderer.invoke('window:island-position:get');
  },
  /**
   * 设置并保存灵动岛位置偏移
   * @param offset - 相对主屏工作区顶部居中的偏移
   */
  setIslandPositionOffset: (offset: { x: number; y: number }): Promise<boolean> => {
    return ipcRenderer.invoke('window:island-position:set', offset);
  },
  /**
   * 订阅灵动岛位置偏移变更
   * @param callback - 回调函数
   * @returns 取消订阅函数
   */
  onIslandPositionOffsetChanged: (callback: (offset: { x: number; y: number }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, offset: { x: number; y: number }) => {
      callback(offset);
    };
    ipcRenderer.on('window:island-position:changed', handler);
    return () => {
      ipcRenderer.removeListener('window:island-position:changed', handler);
    };
  },
  /**
   * 退出应用
   */
  quitApp: (): void => {
    ipcRenderer.send('app:quit');
  },
  /**
   * 重启应用
   */
  restartApp: (): Promise<boolean> => {
    return ipcRenderer.invoke('app:restart');
  },
  /**
   * 打开日志文件夹
   */
  openLogsFolder: (): Promise<boolean> => {
    return ipcRenderer.invoke('app:open-logs-folder');
  },
  /**
   * 选择反馈日志文件（默认定位日志目录）
   */
  pickFeedbackLogFile: (): Promise<string | null> => {
    return ipcRenderer.invoke('app:pick-feedback-log-file');
  },
  /**
   * 选择反馈截图文件
   */
  pickFeedbackScreenshotFile: (): Promise<string | null> => {
    return ipcRenderer.invoke('app:pick-feedback-screenshot-file');
  },
  /**
   * 清理日志缓存
   */
  clearLogsCache: (): Promise<{ success: boolean; freedBytes: number }> => {
    return ipcRenderer.invoke('app:clear-logs-cache');
  },
  /**
   * 最小化当前窗口
   */
  windowMinimize: (): void => {
    ipcRenderer.send('window:minimize');
  },
  /**
   * 最大化/还原当前窗口
   */
  windowMaximize: (): void => {
    ipcRenderer.send('window:maximize');
  },
  /**
   * 关闭当前窗口
   */
  windowClose: (): void => {
    ipcRenderer.send('window:close');
  },
  /**
   * 打开倒数日/TODOs 独立窗口
   */
  openStandaloneWindow: (): Promise<boolean> => {
    return ipcRenderer.invoke('app:open-standalone-window');
  },
  /**
   * 关闭倒数日/TODOs 独立窗口
   */
  closeStandaloneWindow: (): Promise<boolean> => {
    return ipcRenderer.invoke('app:close-standalone-window');
  },
  /** ===== 音乐相关 API ===== */
  /**
   * 播放/暂停
   */
  mediaPlayPause: (): Promise<void> => {
    return ipcRenderer.invoke('media:play-pause');
  },
  /**
   * 下一曲
   */
  mediaNext: (): Promise<void> => {
    return ipcRenderer.invoke('media:next');
  },
  /**
   * 上一曲
   */
  mediaPrev: (): Promise<void> => {
    return ipcRenderer.invoke('media:prev');
  },
  /**
   * 跳转到指定位置
   * @param positionMs - 目标位置（毫秒）
   */
  mediaSeek: (positionMs: number): Promise<void> => {
    return ipcRenderer.invoke('media:seek', positionMs);
  },
  /**
   * 获取系统音量
   * @returns 当前音量值（0.0 ~ 1.0）
   */
  mediaGetVolume: (): Promise<number> => {
    return ipcRenderer.invoke('media:get-volume');
  },
  /**
   * 设置系统音量 (0.0 ~ 1.0)
   * @param volume 目标音量
   */
  mediaSetVolume: (volume: number): Promise<void> => {
    return ipcRenderer.invoke('media:set-volume', volume);
  },
  /**
   * 获取当前正在播放歌曲信息（用于初始化）
   */
  mediaCurrentInfoGet: (): Promise<NowPlayingInfo | null> => {
    return ipcRenderer.invoke('media:current-info:get');
  },
  /** ===== 歌曲信息监听 API ===== */
  /**
   * 订阅歌曲信息变更事件
   * @param callback 回调函数，接收歌曲信息对象或 null（无播放时）
   */
  onNowPlayingInfo: (callback: (info: NowPlayingInfo | null) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: NowPlayingInfo | null) => {
      callback(info);
    };
    ipcRenderer.on('nowplaying:info', handler);
    // 返回取消订阅函数
    return () => {
      ipcRenderer.removeListener('nowplaying:info', handler);
    };
  },
  /** ===== 系统工具 API ===== */
  /**
   * 截图并返回 Base64 图片数据
   * @returns Base64 编码的 PNG 图片数据，或 null（失败时）
   */
  screenshot: (): Promise<string | null> => {
    return ipcRenderer.invoke('system:screenshot');
  },
  /**
   * 打开任务管理器
   * @returns 无返回值
   */
  openTaskManager: (): void => {
    ipcRenderer.send('system:open-task-manager');
  },
  /**
   * 获取拖拽文件的本地路径（contextIsolation 下 file.path 不可用）
   * @param file - File 对象
   * @returns 文件的完整本地路径
   */
  getPathForFile: (file: File): string => {
    return webUtils.getPathForFile(file);
  },
  /** ===== 应用快捷方式 API ===== */
  /**
   * 获取文件图标（base64 PNG）
   * @param filePath - 文件路径
   * @returns base64 编码的 PNG 图标数据，或 null
   */
  getFileIcon: (filePath: string): Promise<string | null> => {
    return ipcRenderer.invoke('app:get-file-icon', filePath);
  },
  /**
   * 打开文件/应用
   * @param filePath - 文件路径
   * @returns 是否成功
   */
  openFile: (filePath: string): Promise<boolean> => {
    return ipcRenderer.invoke('app:open-file', filePath);
  },
  /**
   * 解析快捷方式 (.lnk)
   * @param lnkPath - .lnk 文件路径
   * @returns 目标路径和名称，或 null
   */
  resolveShortcut: (lnkPath: string): Promise<{ target: string; name: string } | null> => {
    return ipcRenderer.invoke('app:resolve-shortcut', lnkPath);
  },
  /** ===== 文件选择对话框 API ===== */
  /**
   * 打开图片文件选择对话框
   * @returns 文件路径，取消返回 null
   */
  openImageDialog: (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:open-image');
  },
  /**
   * 打开视频文件选择对话框
   * @returns 文件路径，取消返回 null
   */
  openVideoDialog: (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:open-video');
  },
  /**
   * 读取缓存的壁纸文件并返回 base64 data URL
   * @param filePath - 壁纸文件绝对路径
   * @returns data URL 字符串，失败返回 null
   */
  loadWallpaperFile: (filePath: string): Promise<string | null> => {
    return ipcRenderer.invoke('wallpaper:load-file', filePath);
  },
  /**
   * 清理 userData/wallpapers/ 下的自定义壁纸缓存
   */
  clearWallpaperCache: (): Promise<void> => {
    return ipcRenderer.invoke('wallpaper:clear-cache');
  },
  /**
   * 读取本地文件并以 Blob/Uint8Array 形式返回（保留以供其它功能使用）
   * @param filePath - 文件绝对路径
   */
  readLocalFileAsBuffer: (filePath: string): Promise<Uint8Array | null> => {
    return ipcRenderer.invoke('wallpaper:read-file-buffer', filePath);
  },
  /** ===== HTTP 代理 API（绕过 CORS） ===== */
  /**
   * 通过主进程代理 HTTP 请求（绕过浏览器 CORS 限制）
   * @param url - 请求 URL
   * @param options - 请求选项
   * @returns 响应结果
   */
  netFetch: (url: string, options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }): Promise<{ ok: boolean; status: number; body: string }> => {
    return ipcRenderer.invoke('net:fetch', url, options);
  },
  /** ===== 文件存储 API ===== */
  /**
   * 从文件读取 JSON 数据
   * @param key - 存储键名（对应文件名）
   * @returns 解析后的数据，不存在时返回 null
   */
  storeRead: (key: string): Promise<unknown> => {
    return ipcRenderer.invoke('store:read', key);
  },
  /**
   * 将数据写入 JSON 文件
   * @param key - 存储键名（对应文件名）
   * @param data - 要存储的数据
   * @returns 是否写入成功
   */
  storeWrite: (key: string, data: unknown): Promise<boolean> => {
    return ipcRenderer.invoke('store:write', key, data);
  },
  /** ===== 快捷键 API ===== */
  /**
   * 获取当前隐藏灵动岛的快捷键
   * @returns 当前快捷键字符串
   */
  hotkeyGet: (): Promise<string> => {
    return ipcRenderer.invoke('hotkey:get');
  },
  /**
   * 设置隐藏灵动岛的快捷键
   * @param accelerator - Electron accelerator 字符串（如 "Alt+X"）
   * @returns 是否注册成功
   */
  hotkeySet: (accelerator: string): Promise<boolean> => {
    return ipcRenderer.invoke('hotkey:set', accelerator);
  },
  /**
   * 暂停所有快捷键响应（用于录入快捷键）
   */
  hotkeySuspend: (): Promise<boolean> => {
    return ipcRenderer.invoke('hotkey:suspend');
  },
  /**
   * 恢复所有快捷键响应（录入结束后）
   */
  hotkeyResume: (): Promise<boolean> => {
    return ipcRenderer.invoke('hotkey:resume');
  },
  /**
   * 获取当前关闭灵动岛的快捷键
   * @returns 当前快捷键字符串
   */
  quitHotkeyGet: (): Promise<string> => {
    return ipcRenderer.invoke('quit-hotkey:get');
  },
  /**
   * 设置关闭灵动岛的快捷键
   * @param accelerator - Electron accelerator 字符串（如 "Alt+Q"）
   * @returns 是否注册成功
   */
  quitHotkeySet: (accelerator: string): Promise<boolean> => {
    return ipcRenderer.invoke('quit-hotkey:set', accelerator);
  },
  /**
   * 获取当前截图快捷键
   * @returns 当前快捷键字符串
   */
  screenshotHotkeyGet: (): Promise<string> => {
    return ipcRenderer.invoke('screenshot-hotkey:get');
  },
  /**
   * 设置截图快捷键
   * @param accelerator - Electron accelerator 字符串（如 "Alt+A"）
   * @returns 是否注册成功
   */
  screenshotHotkeySet: (accelerator: string): Promise<boolean> => {
    return ipcRenderer.invoke('screenshot-hotkey:set', accelerator);
  },
  /**
   * 获取当前切歌快捷键
   */
  nextSongHotkeyGet: (): Promise<string> => {
    return ipcRenderer.invoke('next-song-hotkey:get');
  },
  /**
   * 设置切歌快捷键
   */
  nextSongHotkeySet: (accelerator: string): Promise<boolean> => {
    return ipcRenderer.invoke('next-song-hotkey:set', accelerator);
  },
  /**
   * 获取当前暂停/播放快捷键
   */
  playPauseSongHotkeyGet: (): Promise<string> => {
    return ipcRenderer.invoke('play-pause-song-hotkey:get');
  },
  /**
   * 设置暂停/播放快捷键
   */
  playPauseSongHotkeySet: (accelerator: string): Promise<boolean> => {
    return ipcRenderer.invoke('play-pause-song-hotkey:set', accelerator);
  },
  /**
   * 获取当前还原默认位置快捷键
   * @returns 当前快捷键字符串
   */
  resetPositionHotkeyGet: (): Promise<string> => {
    return ipcRenderer.invoke('reset-position-hotkey:get');
  },
  /**
   * 设置还原默认位置快捷键
   * @param accelerator - Electron accelerator 字符串
   * @returns 是否注册成功
   */
  resetPositionHotkeySet: (accelerator: string): Promise<boolean> => {
    return ipcRenderer.invoke('reset-position-hotkey:set', accelerator);
  },
  /**
   * 获取当前切换托盘图标快捷键
   * @returns 当前快捷键字符串
   */
  toggleTrayHotkeyGet: (): Promise<string> => {
    return ipcRenderer.invoke('toggle-tray-hotkey:get');
  },
  /**
   * 设置切换托盘图标快捷键
   * @param accelerator - Electron accelerator 字符串
   * @returns 是否注册成功
   */
  toggleTrayHotkeySet: (accelerator: string): Promise<boolean> => {
    return ipcRenderer.invoke('toggle-tray-hotkey:set', accelerator);
  },
  /**
   * 获取当前显示配置窗口快捷键
   * @returns 当前快捷键字符串
   */
  showSettingsWindowHotkeyGet: (): Promise<string> => {
    return ipcRenderer.invoke('show-settings-window-hotkey:get');
  },
  /**
   * 设置显示配置窗口快捷键
   * @param accelerator - Electron accelerator 字符串
   * @returns 是否注册成功
   */
  showSettingsWindowHotkeySet: (accelerator: string): Promise<boolean> => {
    return ipcRenderer.invoke('show-settings-window-hotkey:set', accelerator);
  },
  /**
   * 获取当前打开剪贴板历史快捷键
   * @returns 当前快捷键字符串
   */
  openClipboardHistoryHotkeyGet: (): Promise<string> => {
    return ipcRenderer.invoke('open-clipboard-history-hotkey:get');
  },
  /**
   * 设置打开剪贴板历史快捷键
   * @param accelerator - Electron accelerator 字符串
   * @returns 是否注册成功
   */
  openClipboardHistoryHotkeySet: (accelerator: string): Promise<boolean> => {
    return ipcRenderer.invoke('open-clipboard-history-hotkey:set', accelerator);
  },
  /** ===== 日志文件 API ===== */
  /**
   * 写入日志到文件
   * @param level - 日志级别（info/warn/error）
   * @param message - 日志内容
   */
  logWrite: (level: string, message: string): void => {
    ipcRenderer.send('log:write', level, message);
  },
  /** ===== 歌曲设置 API ===== */
  /**
   * 获取播放器白名单
   * @returns 白名单数组
   */
  musicWhitelistGet: (): Promise<string[]> => {
    return ipcRenderer.invoke('music:whitelist:get');
  },
  /**
   * 设置播放器白名单
   * @param list - 新的白名单数组
   * @returns 是否保存成功
   */
  musicWhitelistSet: (list: string[]): Promise<boolean> => {
    return ipcRenderer.invoke('music:whitelist:set', list);
  },
  /**
   * 获取歌词源配置
   * @returns 歌词源标识字符串
   */
  musicLyricsSourceGet: (): Promise<string> => {
    return ipcRenderer.invoke('music:lyrics-source:get');
  },
  /**
   * 设置歌词源
   * @param source - 歌词源标识
   * @returns 是否保存成功
   */
  musicLyricsSourceSet: (source: string): Promise<boolean> => {
    return ipcRenderer.invoke('music:lyrics-source:set', source);
  },
  /**
   * 获取逐字扫光开关
   * @returns 是否启用逐字扫光
   */
  musicLyricsKaraokeGet: (): Promise<boolean> => {
    return ipcRenderer.invoke('music:lyrics-karaoke:get');
  },
  /**
   * 设置逐字扫光开关
   * @param enabled - 是否启用
   * @returns 是否保存成功
   */
  musicLyricsKaraokeSet: (enabled: boolean): Promise<boolean> => {
    return ipcRenderer.invoke('music:lyrics-karaoke:set', enabled);
  },
  /**
   * 获取歌词界面时钟开关
   * @returns 是否显示时钟
   */
  musicLyricsClockGet: (): Promise<boolean> => {
    return ipcRenderer.invoke('music:lyrics-clock:get');
  },
  /**
   * 设置歌词界面时钟开关
   * @param enabled - 是否显示
   * @returns 是否保存成功
   */
  musicLyricsClockSet: (enabled: boolean): Promise<boolean> => {
    return ipcRenderer.invoke('music:lyrics-clock:set', enabled);
  },
  /**
   * 获取 SMTC 自动取消订阅时间（毫秒），0 表示永不取消
   */
  musicSmtcUnsubscribeMsGet: (): Promise<number> => {
    return ipcRenderer.invoke('music:smtc-unsubscribe-ms:get');
  },
  /**
   * 设置 SMTC 自动取消订阅时间（毫秒），0 表示永不取消
   */
  musicSmtcUnsubscribeMsSet: (valueMs: number): Promise<boolean> => {
    return ipcRenderer.invoke('music:smtc-unsubscribe-ms:set', valueMs);
  },
  /**
   * 查询当前所有 SMTC 媒体会话播放源
   * @returns 检测到的播放源列表
   */
  musicDetectSourceAppId: (): Promise<{ ok: boolean; sources: Array<{ sourceAppId: string; isPlaying: boolean; hasTitle: boolean; thumbnail: string | null }>; message: string }> => {
    return ipcRenderer.invoke('music:detect-source-app-id');
  },
  /** 获取当前运行中的非系统进程列表 */
  getRunningNonSystemProcesses: (): Promise<string[]> => {
    return ipcRenderer.invoke('system:running-processes:get');
  },
  /** 获取当前运行中的非系统进程列表（包含图标） */
  getRunningNonSystemProcessesWithIcons: (): Promise<Array<{ name: string; iconDataUrl: string | null }>> => {
    return ipcRenderer.invoke('system:running-processes:with-icons:get');
  },
  /** 获取当前打开窗口列表（包含图标） */
  getOpenWindowsWithIcons: (): Promise<Array<{ id: string; title: string; processName: string; processPath: string | null; processId: number | null; iconDataUrl: string | null }>> => {
    return ipcRenderer.invoke('system:open-windows:with-icons:get');
  },
  /** 获取当前焦点窗口 */
  getFocusedWindow: (): Promise<{ id: string; title: string; processName: string; processPath: string | null; processId: number | null; iconDataUrl: string | null } | null> => {
    return ipcRenderer.invoke('system:focused-window:get');
  },
  /** 获取隐藏进程名单 */
  hideProcessListGet: (): Promise<string[]> => {
    return ipcRenderer.invoke('hide-process-list:get');
  },
  /** 设置隐藏进程名单 */
  hideProcessListSet: (list: string[]): Promise<boolean> => {
    return ipcRenderer.invoke('hide-process-list:set', list);
  },
  /** 订阅播放源切换请求（主进程推送） */
  onSourceSwitchRequest: (callback: (data: { sourceAppId: string; title: string; artist: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { sourceAppId: string; title: string; artist: string }) => {
      callback(data);
    };
    ipcRenderer.on('media:source-switch-request', handler);
    return () => {
      ipcRenderer.removeListener('media:source-switch-request', handler);
    };
  },
  /** 接受切换到新播放源 */
  mediaAcceptSourceSwitch: (): Promise<void> => {
    return ipcRenderer.invoke('media:accept-source-switch');
  },
  /** 拒绝切换播放源 */
  mediaRejectSourceSwitch: (): Promise<void> => {
    return ipcRenderer.invoke('media:reject-source-switch');
  },
  /**
   * 获取主题模式
   * @returns 'dark' | 'light' | 'system'
   */
  themeModeGet: (): Promise<string> => {
    return ipcRenderer.invoke('theme:mode:get');
  },
  /**
   * 设置主题模式
   * @param mode - 'dark' | 'light' | 'system'
   * @returns 是否保存成功
   */
  themeModeSet: (mode: string): Promise<boolean> => {
    return ipcRenderer.invoke('theme:mode:set', mode);
  },
  /**
   * 实时预览广播（不持久化），用于拖动条等场景
   * @param channel - 设置频道标识
   * @param value - 预览值
   */
  settingsPreview: (channel: string, value: unknown): Promise<boolean> => {
    return ipcRenderer.invoke('settings:preview', channel, value);
  },
  onSettingsChanged: (callback: (channel: string, value: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, channel: string, value: unknown): void => {
      callback(channel, value);
    };
    ipcRenderer.on('settings:changed', handler);
    return () => {
      ipcRenderer.removeListener('settings:changed', handler);
    };
  },
  /**
   * 获取灵动岛透明度
   * @returns 透明度值 10-100
   */
  islandOpacityGet: (): Promise<number> => {
    return ipcRenderer.invoke('island:opacity:get');
  },
  /**
   * 设置灵动岛透明度
   * @param opacity - 透明度值 10-100
   * @returns 是否保存成功
   */
  islandOpacitySet: (opacity: number): Promise<boolean> => {
    return ipcRenderer.invoke('island:opacity:set', opacity);
  },
  /**
   * 获取 expand 鼠标移开回 idle 开关
   */
  expandMouseleaveIdleGet: (): Promise<boolean> => {
    return ipcRenderer.invoke('island:expand-mouseleave-idle:get');
  },
  /**
   * 设置 expand 鼠标移开回 idle 开关
   */
  expandMouseleaveIdleSet: (enabled: boolean): Promise<boolean> => {
    return ipcRenderer.invoke('island:expand-mouseleave-idle:set', enabled);
  },
  /**
   * 获取 maxExpand 鼠标移开回 idle 开关
   */
  maxexpandMouseleaveIdleGet: (): Promise<boolean> => {
    return ipcRenderer.invoke('island:maxexpand-mouseleave-idle:get');
  },
  /**
   * 设置 maxExpand 鼠标移开回 idle 开关
   */
  maxexpandMouseleaveIdleSet: (enabled: boolean): Promise<boolean> => {
    return ipcRenderer.invoke('island:maxexpand-mouseleave-idle:set', enabled);
  },
  /**
   * 获取是否启用弹性动画
   */
  springAnimationGet: (): Promise<boolean> => {
    return ipcRenderer.invoke('island:spring-animation:get');
  },
  /**
   * 设置是否启用弹性动画
   */
  springAnimationSet: (enabled: boolean): Promise<boolean> => {
    return ipcRenderer.invoke('island:spring-animation:set', enabled);
  },
  /**
   * 读取当前剪贴板文本
   */
  clipboardReadText: (): Promise<string> => {
    return ipcRenderer.invoke('clipboard:read-text');
  },
  /**
   * 写入文本到剪贴板
   */
  clipboardWriteText: (text: string): Promise<boolean> => {
    return ipcRenderer.invoke('clipboard:write-text', text);
  },
  /**
   * 获取剪贴板 URL 监听开关
   */
  clipboardUrlMonitorGet: (): Promise<boolean> => {
    return ipcRenderer.invoke('clipboard:url-monitor:get');
  },
  /**
   * 设置剪贴板 URL 监听开关
   */
  clipboardUrlMonitorSet: (enabled: boolean): Promise<boolean> => {
    return ipcRenderer.invoke('clipboard:url-monitor:set', enabled);
  },
  /**
   * 获取剪贴板 URL 识别模式
   */
  clipboardUrlDetectModeGet: (): Promise<'https-only' | 'http-https' | 'domain-only'> => {
    return ipcRenderer.invoke('clipboard:url-detect-mode:get');
  },
  /**
   * 设置剪贴板 URL 识别模式
   */
  clipboardUrlDetectModeSet: (mode: 'https-only' | 'http-https' | 'domain-only'): Promise<boolean> => {
    return ipcRenderer.invoke('clipboard:url-detect-mode:set', mode);
  },
  /**
   * 获取剪贴板 URL 黑名单（域名）
   */
  clipboardUrlBlacklistGet: (): Promise<string[]> => {
    return ipcRenderer.invoke('clipboard:url-blacklist:get');
  },
  /**
   * 设置剪贴板 URL 黑名单（域名）
   */
  clipboardUrlBlacklistSet: (list: string[]): Promise<boolean> => {
    return ipcRenderer.invoke('clipboard:url-blacklist:set', list);
  },
  /**
   * 追加单个域名到剪贴板 URL 黑名单
   */
  clipboardUrlBlacklistAddDomain: (domain: string): Promise<boolean> => {
    return ipcRenderer.invoke('clipboard:url-blacklist:add-domain', domain);
  },
  /**
   * 获取开机自启模式
   */
  autostartGet: (): Promise<string> => {
    return ipcRenderer.invoke('island:autostart:get');
  },
  /**
   * 设置开机自启模式
   */
  autostartSet: (mode: string): Promise<boolean> => {
    return ipcRenderer.invoke('island:autostart:set', mode);
  },
  /**
   * 获取快速导航卡片配置
   */
  navOrderGet: (): Promise<{ visibleOrder: string[]; hiddenOrder: string[] }> => {
    return ipcRenderer.invoke('island:nav-order:get');
  },
  /**
   * 设置快速导航卡片配置
   */
  navOrderSet: (payload: { visibleOrder: string[]; hiddenOrder: string[] }): Promise<boolean> => {
    return ipcRenderer.invoke('island:nav-order:set', payload);
  },

  // ===== 自动更新 =====

  /**
   * 检查更新
   * @returns 更新信息（是否有新版、版本号等）
   */
  updaterCheck: (source?: string, resolvedUrl?: string): Promise<{ available: boolean; version?: string; releaseNotes?: string; currentVersion?: string; error?: string }> => {
    return ipcRenderer.invoke('updater:check', source, resolvedUrl);
  },
  /**
   * 下载更新
   * @returns 是否成功开始下载
   */
  updaterDownload: (source?: string, resolvedUrl?: string): Promise<boolean> => {
    return ipcRenderer.invoke('updater:download', source, resolvedUrl);
  },
  /**
   * 安装更新并重启
   */
  updaterInstall: (): Promise<boolean> => {
    return ipcRenderer.invoke('updater:install');
  },
  /**
   * 获取当前版本号
   */
  updaterVersion: (): Promise<string> => {
    return ipcRenderer.invoke('updater:version');
  },
  /**
   * 监听下载进度
   * @param callback - 下载进度回调
   * @returns 取消监听函数
   */
  onUpdaterProgress: (callback: (progress: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { percent: number; transferred: number; total: number; bytesPerSecond: number }): void => {
      callback(data);
    };
    ipcRenderer.on('updater:download-progress', handler);
    return () => {
      ipcRenderer.removeListener('updater:download-progress', handler);
    };
  },
  /**
   * 监听更新下载完成事件
   * @param callback - 回调函数，接收版本号
   * @returns 取消监听函数
   */
  onUpdaterDownloaded: (callback: (data: { version: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { version: string }): void => {
      callback(data);
    };
    ipcRenderer.on('updater:update-downloaded', handler);
    return () => {
      ipcRenderer.removeListener('updater:update-downloaded', handler);
    };
  },
  /**
   * 监听有新版本可用事件
   * @param callback - 回调函数，接收版本号和更新说明
   * @returns 取消监听函数
   */
  onUpdaterAvailable: (callback: (data: { version: string; releaseNotes: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { version: string; releaseNotes: string }): void => {
      callback(data);
    };
    ipcRenderer.on('updater:update-available', handler);
    return () => {
      ipcRenderer.removeListener('updater:update-available', handler);
    };
  },
  /** ===== 剪贴板 URL 监听 API ===== */
  /**
   * 监听剪贴板中检测到的 URL
   * @param callback - 回调函数，接收 URL 数组
   * @returns 取消监听函数
   */
  onClipboardUrlsDetected: (callback: (data: { urls: string[]; title: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { urls: string[]; title: string }): void => {
      callback(data);
    };
    ipcRenderer.on('clipboard:urls-detected', handler);
    return () => {
      ipcRenderer.removeListener('clipboard:urls-detected', handler);
    };
  },
  /**
   * 用外部浏览器打开指定 URL
   * @param url - 要打开的 URL
   * @returns 是否成功
   */
  clipboardOpenUrl: (url: string): Promise<boolean> => {
    return ipcRenderer.invoke('clipboard:open-url', url);
  }
};

/** 歌曲信息类型（与主进程发送的数据格式一致） */
interface NowPlayingInfo {
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

/** 注入到 window 对象，供渲染进程访问 */
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (err) {
    console.error('[Preload] contextBridge 注入失败:', err);
  }
} else {
  // @ts-expect-error 全局暴露兼容非隔离上下文
  window.electron = electronAPI;
  // @ts-expect-error 同上
  window.api = api;
}
