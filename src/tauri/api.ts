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
 * @file api.ts
 * @description 原生 Tauri 桌面 API，直接调用 Rust 命令和桌面事件。
 * @author 鸡哥
 */

import { TRAY_MENU_CHANNELS } from '../shared/trayMenu';
import subscribeCliStatus from './cliStatusSubscription';
import { desktop, getNativeFilePath, invokeBytes, onNativeDragEnter, selectNativeFiles } from './runtime';
import subscribeSettings from './settingsSubscription';
import type {
  Point,
  Bounds,
  IslandDisplayInfo,
  SearchLocalFilesOptions,
  SearchLocalFileResult,
  SaveTextFilePayload,
  SaveTextFileResult,
  ComputeFileHashResult,
  ExecuteAgentLocalToolRequest,
  ExecuteAgentLocalToolResult,
  OllamaChatRequest,
  ChatEvent,
  ChatStartResult,
  ChatAbortResult,
  CustomDirectChatRequest,
  NowPlayingInfo,
  MediaCommandResult,
  SmtcTimestampResult,
  DetectSourceAppIdResult,
  ImageCompressionStartPayload,
  ImageCompressionStartResult,
  ImageCompressionTask,
  SaveImageAsResult,
  ResolveShortcutResult,
  ExtractVideoTrackOptions,
  ExtractVideoTrackResult,
  PickVideoForExtractResult,
  NetFetchOptions,
  NetFetchResult,
  MailInboxResult,
  NavOrderPayload,
  SetWallpaperPayload,
  DownloadStartPayload,
  DownloadStartResult,
  DownloadTask,
  UpdaterCheckResult,
  UpdaterProgress,
  UpdaterDownloadedData,
  UpdaterAvailableData,
  UpdaterNotAvailableData,
  UpdaterStartupAutoCheckRequestData,
  ClipboardUrlsDetectedData,
  MusicProviderAuthStatus,
  MusicProviderId,
  MusicProviderQrCodeResult,
  QishuiBusinessRequestOptions,
  QishuiBusinessStatus,
  QishuiLyricsResult,
  QishuiSongsResult,
  QishuiSongUrlResult,
  ExternalAgentData,
  SourceSwitchRequestData,
  RunningProcessInfo,
  RunningWindowInfo,
  ClaudeCodeStatusSnapshot,
  CliDetailPage,
  ClaudeCodeHookMutationResult,
  CodexStatusSnapshot,
  CodexMonitorMutationResult,
  AgentUsageSnapshot,
  PerformanceSnapshot,
} from './types';
import type { TrayMenuAction, TrayMenuState } from '../shared/trayMenu';

/** 自定义 API，供渲染进程调用 */
const api = {
  /**
   * 启用鼠标穿透透明区域
   * @description 允许鼠标事件穿透窗口透明部分，传递到下层应用
   */
  enableMousePassthrough: (): void => {
    desktop.send('window:enable-mouse-passthrough');
  },
  /**
   * 禁用鼠标穿透，恢复窗口捕获鼠标事件
   * @description 使窗口能够接收鼠标事件，触发 hover/leave 等交互
   */
  disableMousePassthrough: (): void => {
    desktop.send('window:disable-mouse-passthrough');
  },
  /**
   * 在尺寸请求之前登记本次渲染过渡，防止忙帧期间原生窗口先行收缩。
   * @param id - 当前渲染进程递增的正整数过渡标识。
   */
  beginWindowTransition: (id: number): void => {
    desktop.send('window:transition:begin', id);
  },
  /**
   * 动画最终帧绘制后确认本次过渡，允许原生窗口收敛裁剪范围。
   * @param id - 与 beginWindowTransition 对应的过渡标识。
   */
  completeWindowTransition: (id: number): void => {
    desktop.send('window:transition:complete', id);
  },
  /**
   * 展开窗口到 hover 状态尺寸
   * @description 基于初始中心点，向两边均匀扩展
   * @param delayMs - 窗口变更前等待的毫秒数。
   */
  expandWindow: (delayMs = 0): void => {
    desktop.send('window:expand', delayMs);
  },
  /**
   * 展开窗口到 notification 状态尺寸
   * @description 使用通知专用尺寸（500x88）
   * @param delayMs - 窗口变更前等待的毫秒数。
   */
  expandWindowNotification: (delayMs = 0): void => {
    desktop.send('window:expand-notification', delayMs);
  },
  /**
   * 展开窗口到歌词状态尺寸
   * @description 宽度 500，高度与 idle 一致（42）
   * @param delayMs - 窗口变更前等待的毫秒数。
   */
  expandWindowLyrics: (delayMs = 0): void => {
    desktop.send('window:expand-lyrics', delayMs);
  },
  /**
   * 展开窗口到歌词+翻译歌词状态尺寸
   * @description 宽度 500，高度 60（与 hover 一致）
   * @param delayMs - 窗口变更前等待的毫秒数。
   */
  expandWindowLyricsTranslation: (delayMs = 0): void => {
    desktop.send('window:expand-lyrics-translation', delayMs);
  },
  /**
   * 完整展开窗口到 expanded 状态尺寸
   * @description 单击灵动岛后展开为完整操作面板（560x200）
   * @param delayMs - 窗口变更前等待的毫秒数。
   */
  expandWindowFull: (delayMs = 0): void => {
    desktop.send('window:expand-full', delayMs);
  },
  /**
   * 展开窗口到设置面板尺寸
   * @description 比 expanded 更大的独立设置界面（860x400）
   * @param delayMs - 窗口变更前等待的毫秒数。
   */
  expandWindowSettings: (delayMs = 0): void => {
    desktop.send('window:expand-settings', delayMs);
  },
  /**
   * 收缩窗口到 idle 状态尺寸
   * @description 收缩回原始尺寸，保持中心对齐
   * @param delayMs - 窗口变更前等待的毫秒数。
   */
  collapseWindow: (delayMs = 0): void => {
    desktop.send('window:collapse', delayMs);
  },
  /**
   * 按像素偏移移动窗口（用于拖动）
   * @param dx - 水平偏移量
   * @param dy - 垂直偏移量
   */
  moveWindowDelta: (dx: number, dy: number): void => {
    desktop.send('window:move-delta', dx, dy);
  },
  /**
   * 隐藏窗口
   */
  hideWindow: (): void => {
    desktop.send('window:hide');
  },
  /**
   * 获取当前鼠标位置（屏幕坐标）
   * @returns 包含 x、y 坐标的对象
   */
  getMousePosition: (): Promise<Point> => desktop.invoke('window:get-mouse-position'),
  /**
   * 获取鼠标位置和灵动岛窗口边界（单次 IPC）
   * @returns 当前鼠标位置与窗口边界，窗口不可用时返回 null
   */
  getMouseWindowState: (): Promise<{ mousePosition: Point; bounds: Bounds } | null> => desktop.invoke('window:get-mouse-window-state'),
  /**
   * 获取窗口边界信息
   * @returns 包含 x、y、width、height 的边界对象
   */
  getWindowBounds: (): Promise<Bounds> => desktop.invoke('window:get-bounds'),
  /**
   * 获取可用于灵动岛显示的显示器列表
   * @returns 异步原生操作的IslandDisplayInfo[] 结果。
   */
  getIslandDisplays: (): Promise<IslandDisplayInfo[]> => desktop.invoke('window:island-displays:list'),
  /**
   * 获取灵动岛显示器选择配置
   * @returns 异步原生操作的string 结果。
   */
  getIslandDisplaySelection: (): Promise<string> => desktop.invoke('window:island-display:get'),
  /**
   * 设置并保存灵动岛显示器选择配置
   * @param selection - 本次选择的显示器或硬件标识。
   * @returns 异步原生操作的boolean 结果。
   */
  setIslandDisplaySelection: (selection: string): Promise<boolean> => desktop.invoke('window:island-display:set', selection),
  /**
   * 获取灵动岛位置偏移
   * @returns 相对主屏工作区顶部居中的偏移
   */
  getIslandPositionOffset: (): Promise<Point> => desktop.invoke('window:island-position:get'),
  /**
   * 设置并保存灵动岛位置偏移
   * @param offset - 相对主屏工作区顶部居中的偏移
   * @returns 异步原生操作的boolean 结果。
   */
  setIslandPositionOffset: (offset: Point): Promise<boolean> => desktop.invoke('window:island-position:set', offset),
  /**
   * 订阅灵动岛位置偏移变更
   * @param callback - 回调函数
   * @returns 取消订阅函数
   */
  onIslandPositionOffsetChanged: (callback: (offset: Point) => void): (() => void) => {
    const handler = (offset: Point) => {
      callback(offset);
    };
    desktop.on('window:island-position:changed', handler);
    return () => {
      desktop.off('window:island-position:changed', handler);
    };
  },
  /**
   * 退出应用
   */
  quitApp: (): void => {
    desktop.send('app:quit');
  },
  /**
   * 重启应用
   * @returns 异步原生操作的boolean 结果。
   */
  restartApp: (): Promise<boolean> => desktop.invoke('app:restart'),
  /**
   * 打开日志文件夹
   * @returns 异步原生操作的boolean 结果。
   */
  openLogsFolder: (): Promise<boolean> => desktop.invoke('app:open-logs-folder'),
  /**
   * 选择反馈日志文件（默认定位日志目录）
   * @returns 异步原生操作的string | null 结果。
   */
  pickFeedbackLogFile: (): Promise<string | null> => desktop.invoke('app:pick-feedback-log-file'),
  /**
   * 选择反馈截图文件
   * @returns 异步原生操作的string | null 结果。
   */
  pickFeedbackScreenshotFile: (): Promise<string | null> => desktop.invoke('app:pick-feedback-screenshot-file'),
  /**
   * 选择本地文件搜索目录
   * @returns 异步原生操作的string | null 结果。
   */
  pickLocalSearchDirectory: (): Promise<string | null> => desktop.invoke('app:pick-local-search-directory'),
  /**
   * 选择 Skill 文件 (.md)
   * @returns 异步原生操作的string | null 结果。
   */
  pickSkillFile: (): Promise<string | null> => desktop.invoke('app:pick-skill-file'),
  /**
   * 读取文本文件内容
   * @param filePath - 目标文件的本机绝对路径。
   * @returns 异步原生操作的string | null 结果。
   */
  readTextFile: (filePath: string): Promise<string | null> => desktop.invoke('app:read-text-file', filePath),
  /**
   * 保存文本文件内容
   * @param payload - 提交给 Rust 宿主的业务数据。
   * @returns 异步原生操作的SaveTextFileResult 结果。
   */
  saveTextFile: (payload: SaveTextFilePayload): Promise<SaveTextFileResult> => desktop.invoke('app:save-text-file', payload),
  /**
   * 搜索本地文件（名称匹配）
   * @param rootDir - 本机搜索根目录。
   * @param keyword - 用于匹配的关键词。
   * @param options - 本次操作的可选参数。
   * @returns 异步原生操作的SearchLocalFileResult[] 结果。
   */
  searchLocalFiles: (
    rootDir: string,
    keyword: string,
    options?: SearchLocalFilesOptions,
  ): Promise<SearchLocalFileResult[]> => desktop.invoke('app:search-local-files', rootDir, keyword, options),
  /**
   * 执行本地 Agent 工具（主进程执行）
   * @param request - 本次原生业务请求。
   * @returns 异步原生操作的ExecuteAgentLocalToolResult 结果。
   */
  executeAgentLocalTool: (request: ExecuteAgentLocalToolRequest): Promise<ExecuteAgentLocalToolResult> => desktop.invoke('agent:local-tool:execute', request),
  /**
   * 检测本地 Ollama 服务是否可用
   * @param baseUrl - 服务的 HTTP 基础地址。
   * @returns 异步原生操作的boolean 结果。
   */
  ollamaPing: (baseUrl?: string): Promise<boolean> => desktop.invoke('ollama:ping', baseUrl),
  /**
   * 获取 Ollama 本地可用模型列表
   * @param baseUrl - 服务的 HTTP 基础地址。
   * @returns 异步原生操作的string[] 结果。
   */
  ollamaModels: (baseUrl?: string): Promise<string[]> => desktop.invoke('ollama:models', baseUrl),
  /**
   * 自动检测本地 Ollama 服务运行的端口（baseUrl）
   * @returns 异步原生操作的string | null 结果。
   */
  ollamaDetectBaseUrl: (): Promise<string | null> => desktop.invoke('ollama:detectBaseUrl'),
  /**
   * 启动 Ollama 本地 ReAct 编排会话
   * @param sessionId - 目标会话的唯一标识。
   * @param request - 本次原生业务请求。
   * @returns 异步原生操作的ChatStartResult 结果。
   */
  ollamaChatStart: (
    sessionId: string,
    request: OllamaChatRequest,
  ): Promise<ChatStartResult> => desktop.invoke('ollama:chat:start', sessionId, request),
  /**
   * 中止 Ollama 本地编排会话
   * @param sessionId - 目标会话的唯一标识。
   * @returns 异步原生操作的ChatAbortResult 结果。
   */
  ollamaChatAbort: (sessionId: string): Promise<ChatAbortResult> => desktop.invoke('ollama:chat:abort', sessionId),
  /**
   * 监听 Ollama 编排会话事件
   * @param sessionId - 会话 ID
   * @param callback - 事件回调
   * @returns 取消监听函数
   */
  onOllamaChatEvent: (
    sessionId: string,
    callback: (event: ChatEvent) => void,
  ): (() => void) => {
    const channel = `ollama:chat:event:${sessionId}`;
    const handler = (
      data: ChatEvent,
    ): void => {
      callback(data);
    };
    desktop.on(channel, handler);
    return () => {
      desktop.off(channel, handler);
    };
  },
  /**
   * 启动自定义 API 直连 ReAct 编排会话
   * @param sessionId - 目标会话的唯一标识。
   * @param request - 本次原生业务请求。
   * @returns 异步原生操作的ChatStartResult 结果。
   */
  customDirectChatStart: (
    sessionId: string,
    request: CustomDirectChatRequest,
  ): Promise<ChatStartResult> => desktop.invoke('customDirect:chat:start', sessionId, request),
  /**
   * 中止自定义 API 直连编排会话
   * @param sessionId - 目标会话的唯一标识。
   * @returns 异步原生操作的ChatAbortResult 结果。
   */
  customDirectChatAbort: (sessionId: string): Promise<ChatAbortResult> => desktop.invoke('customDirect:chat:abort', sessionId),
  /**
   * 监听自定义 API 直连编排会话事件
   * @param sessionId - 目标会话的唯一标识。
   * @param callback - 接收对应原生事件业务数据的回调。
   * @returns 本次操作的事件取消订阅函数。
   */
  onCustomDirectChatEvent: (
    sessionId: string,
    callback: (event: ChatEvent) => void,
  ): (() => void) => {
    const channel = `customDirect:chat:event:${sessionId}`;
    const handler = (
      data: ChatEvent,
    ): void => {
      callback(data);
    };
    desktop.on(channel, handler);
    return () => {
      desktop.off(channel, handler);
    };
  },
  /**
   * 清理日志缓存
   * @returns 异步原生操作的{ success: boolean; freedBytes: number } 结果。
   */
  clearLogsCache: (): Promise<{ success: boolean; freedBytes: number }> => desktop.invoke('app:clear-logs-cache'),
  /**
   * 最小化当前窗口
   */
  windowMinimize: (): void => {
    desktop.send('window:minimize');
  },
  /**
   * 最大化/还原当前窗口
   */
  windowMaximize: (): void => {
    desktop.send('window:maximize');
  },
  /**
   * 关闭当前窗口
   */
  windowClose: (): void => {
    desktop.send('window:close');
  },
  /**
   * 打开倒数日/TODOs 独立窗口
   * @returns 异步原生操作的boolean 结果。
   */
  openStandaloneWindow: (): Promise<boolean> => desktop.invoke('app:open-standalone-window'),
  /**
   * 关闭倒数日/TODOs 独立窗口
   * @returns 异步原生操作的boolean 结果。
   */
  closeStandaloneWindow: (): Promise<boolean> => desktop.invoke('app:close-standalone-window'),
  /** ===== 音乐相关 API ===== */
  /**
   * 播放/暂停
   * @returns 异步原生操作的void 结果。
   */
  mediaPlayPause: (): Promise<void> => desktop.invoke('media:play-pause'),
  /**
   * 下一曲
   * @returns 异步原生操作的void 结果。
   */
  mediaNext: (): Promise<void> => desktop.invoke('media:next'),
  /**
   * 上一曲
   * @returns 异步原生操作的void 结果。
   */
  mediaPrev: (): Promise<void> => desktop.invoke('media:prev'),
  /**
   * 跳转到指定位置
   * @param positionMs - 目标位置（毫秒）
   * @returns 跳转结果；当前播放源不在白名单或位置无效时主进程不执行跳转，返回 undefined
   */
  mediaSeek: (positionMs: number): Promise<MediaCommandResult | undefined> => desktop.invoke('media:seek', positionMs),
  /**
   * 获取系统音量
   * @returns 当前音量值（0.0 ~ 1.0）
   */
  mediaGetVolume: (): Promise<number> => desktop.invoke('media:get-volume'),
  /**
   * 设置系统音量 (0.0 ~ 1.0)
   * @param volume - 目标音量
   * @returns 异步原生操作的void 结果。
   */
  mediaSetVolume: (volume: number): Promise<void> => desktop.invoke('media:set-volume', volume),
  /**
   * 获取当前默认播放设备的静音状态
   * @returns 当前静音状态，读取失败时返回 null
   */
  mediaGetMuted: (): Promise<boolean | null> => desktop.invoke('media:get-muted'),
  /**
   * 切换当前默认播放设备的静音状态
   * @returns 切换后的静音状态，操作失败时返回 null
   */
  mediaToggleMuted: (): Promise<boolean | null> => desktop.invoke('media:toggle-muted'),
  /**
   * 获取当前正在播放歌曲信息（用于初始化）
   * @returns 异步原生操作的NowPlayingInfo | null 结果。
   */
  mediaCurrentInfoGet: (): Promise<NowPlayingInfo | null> => desktop.invoke('media:current-info:get'),
  /** ===== 歌曲信息监听 API ===== */
  /**
   * 订阅歌曲信息变更事件
   * @param callback - 回调函数，接收歌曲信息对象或 null（无播放时）
   * @returns 本次操作的事件取消订阅函数。
   */
  onNowPlayingInfo: (callback: (info: NowPlayingInfo | null) => void): (() => void) => {
    const handler = (info: NowPlayingInfo | null) => {
      callback(info);
    };
    desktop.on('nowplaying:info', handler);
    // 返回取消订阅函数
    return () => {
      desktop.off('nowplaying:info', handler);
    };
  },
  /** ===== 系统工具 API ===== */
  /**
   * 截图并返回原始 PNG 字节
   * @returns PNG 二进制图片数据，或 null（失败时）
   */
  screenshot: (): Promise<Uint8Array | null> => invokeBytes('system:screenshot'),
  /**
   * 启动选区截图流程
   * @returns 是否成功启动
   */
  startRegionScreenshot: (): Promise<boolean> => desktop.invoke('system:screenshot:region:start'),
  /**
   * 打开任务管理器
   * @returns 无返回值
   */
  openTaskManager: (): void => {
    desktop.send('system:open-task-manager');
  },
  /**
   * 获取当前屏幕亮度
   * @returns 当前亮度百分比，不支持时返回 null
   */
  getBrightness: (): Promise<number | null> => desktop.invoke('system:brightness:get'),
  /**
   * 设置当前屏幕亮度
   * @param brightness - 目标亮度百分比（0-100）
   * @returns 是否设置成功
   */
  setBrightness: (brightness: number): Promise<boolean> => desktop.invoke('system:brightness:set', brightness),
  /**
   * 获取当前默认播放设备音量
   * @returns 当前音量百分比，不支持时返回 null
   */
  getVolume: (): Promise<number | null> => desktop.invoke('system:volume:get'),
  /**
   * 设置当前默认播放设备音量
   * @param volume - 目标音量百分比（0-100）
   * @returns 是否设置成功
   */
  setVolume: (volume: number): Promise<boolean> => desktop.invoke('system:volume:set', volume),
  /** 原生桌面操作 getPerformanceSnapshot（system:performance-snapshot:get）。
   * @param selection - 本次选择的显示器或硬件标识。
   * @param selection.cpu - CPU 硬件标识。
   * @param selection.gpu - GPU 硬件标识。
   * @param selection.disk - 磁盘硬件标识。
   * @param includeHardwareOptions - system:performance-snapshot:get 操作使用的 includeHardwareOptions 参数。
   * @returns 当前设备性能和所选硬件的采样结果。
   */
  getPerformanceSnapshot: (
    selection?: { cpu?: string; gpu?: string; disk?: string },
    includeHardwareOptions = true,
  ): Promise<PerformanceSnapshot> => desktop.invoke('system:performance-snapshot:get', selection, includeHardwareOptions),
  /** 使用原生文件选择器，返回绑定真实本机路径的 File。
   * @returns 用户选择的文件，取消时为空。
   */
  selectFiles: (): Promise<File[]> => selectNativeFiles(),
  /** 读取原生拖放或文件选择器附带的真实本机路径。
   * @param file - 原生文件引用。
   * @returns 已绑定的本机路径；浏览器自行创建的文件返回空字符串。
   */
  getPathForFile: (file: File): string => getNativeFilePath(file),
  /** ===== 应用快捷方式 API ===== */
  /**
   * 获取文件图标（base64 PNG）
   * @param filePath - 文件路径
   * @returns base64 编码的 PNG 图标数据，或 null
   */
  getFileIcon: (filePath: string): Promise<string | null> => desktop.invoke('app:get-file-icon', filePath),
  /**
   * 打开文件/应用
   * @param filePath - 文件路径
   * @returns 是否成功
   */
  openFile: (filePath: string): Promise<boolean> => desktop.invoke('app:open-file', filePath),
  /**
   * 在系统资源管理器中定位指定文件
   * @param filePath - 文件路径
   * @returns 是否成功（路径不存在或非法时返回 false）
   */
  openInExplorer: (filePath: string): Promise<boolean> => desktop.invoke('app:open-in-explorer', filePath),
  /**
   * 将文件以系统拖放方式拖出到其他应用
   * @param filePaths - 待拖出文件的本机绝对路径
   * @returns 是否已发起拖拽（无可用文件时返回 false）
   */
  startFileDrag: (filePaths: string[]): Promise<boolean> => desktop.invoke('app:start-file-drag', filePaths),
  /**
   * 监听系统文件拖入灵动岛窗口
   * @param callback - 接收拖入文件本机路径的回调
   * @returns 取消监听函数
   */
  onNativeDragEnter: (callback: (paths: string[]) => void): (() => void) => onNativeDragEnter(callback),
  /**
   * 选择任意文件用于哈希校验
   * @returns 异步原生操作的string | null 结果。
   */
  pickFileForHash: (): Promise<string | null> => desktop.invoke('app:pick-file-for-hash'),
  /**
   * 计算文件哈希值
   * @param filePath - 文件绝对路径
   * @param algorithm - 哈希算法 (md5 | sha1 | sha256 | sha512)
   * @returns 异步原生操作的ComputeFileHashResult | null 结果。
   */
  computeFileHash: (filePath: string, algorithm: string): Promise<ComputeFileHashResult | null> => desktop.invoke('app:compute-file-hash', filePath, algorithm),
  /**
   * 选择待压缩图片（支持多选）
   * @returns 异步原生操作的string[] 结果。
   */
  imageCompressionPickImages: (): Promise<string[]> => desktop.invoke('image-compression:pick-images'),
  /**
   * 选择图片压缩输出目录
   * @returns 异步原生操作的string | null 结果。
   */
  imageCompressionPickOutputDir: (): Promise<string | null> => desktop.invoke('image-compression:pick-output-dir'),
  /**
   * 启动图片压缩任务（输出格式与原格式一致）
   * @param payload - 提交给 Rust 宿主的业务数据。
   * @returns 异步原生操作的ImageCompressionStartResult 结果。
   */
  imageCompressionStart: (payload: ImageCompressionStartPayload): Promise<ImageCompressionStartResult> => desktop.invoke('image-compression:start', payload),
  /** 原生桌面操作 imageCompressionList（image-compression:list）。
   * @returns 异步原生操作的ImageCompressionTask[] 结果。
   */
  imageCompressionList: (): Promise<ImageCompressionTask[]> => desktop.invoke('image-compression:list'),
  /** 原生桌面操作 imageCompressionRemove（image-compression:remove）。
   * @param taskId - image-compression:remove 操作使用的 taskId 参数。
   * @returns 异步原生操作的boolean 结果。
   */
  imageCompressionRemove: (taskId: string): Promise<boolean> => desktop.invoke('image-compression:remove', taskId),
  /** 原生桌面操作 onImageCompressionTaskUpdated（image-compression:task-updated）。
   * @param callback - 接收对应原生事件业务数据的回调。
   * @returns 本次操作的事件取消订阅函数。
   */
  onImageCompressionTaskUpdated: (callback: (task: ImageCompressionTask) => void): (() => void) => {
    const handler = (task: ImageCompressionTask): void => {
      callback(task);
    };
    desktop.on('image-compression:task-updated', handler);
    return () => {
      desktop.off('image-compression:task-updated', handler);
    };
  },
  /**
   * 将图片另存到用户指定路径
   * @param sourcePath - 源图片绝对路径
   * @returns 保存结果（ok/canceled/filePath）
   */
  saveImageAs: (sourcePath: string): Promise<SaveImageAsResult> => desktop.invoke('app:save-image-as', sourcePath),
  /**
   * 解析快捷方式 (.lnk)
   * @param lnkPath - .lnk 文件路径
   * @returns 目标路径和名称，或 null
   */
  resolveShortcut: (lnkPath: string): Promise<ResolveShortcutResult | null> => desktop.invoke('app:resolve-shortcut', lnkPath),
  /** ===== 文件选择对话框 API ===== */
  /**
   * 打开图片文件选择对话框
   * @returns 文件路径，取消返回 null
   */
  openImageDialog: (): Promise<string | null> => desktop.invoke('dialog:open-image'),
  /**
   * 打开视频文件选择对话框
   * @returns 文件路径，取消返回 null
   */
  openVideoDialog: (): Promise<string | null> => desktop.invoke('dialog:open-video'),
  /**
   * 打开字体文件选择对话框
   * @returns 字体文件信息（path, data, ext, name），取消返回 null
   */
  openFontDialog: (): Promise<{ path: string; data: string; url?: string; ext: string; name: string } | null> => desktop.invoke('dialog:open-font'),
  /**
   * 读取字体元数据并返回受控本地 URL
   * @param filePath - 字体文件绝对路径
   * @returns 字体文件信息，失败返回 null
   */
  readFontFile: (filePath: string): Promise<{ path: string; data: string; url?: string; ext: string; name: string } | null> => desktop.invoke('font:read-file', filePath),
  /**
   * 读取壁纸元数据并返回受控本地 URL
   * @param filePath - 壁纸文件绝对路径
   * @returns data URL 字符串，失败返回 null
   * @param preview - wallpaper:load-file 操作使用的 preview 参数。
   */
  loadWallpaperFile: (filePath: string, preview?: boolean): Promise<string | null> => preview === true ? desktop.invoke('wallpaper:load-file', filePath, true) : desktop.invoke('wallpaper:load-file', filePath),
  /**
   * 生成相册网格缩略图，避免批量传输和解码原图
   * @param filePath - 图片文件绝对路径
   * @returns 缩略图 data URL，失败返回 null
   */
  loadAlbumThumbnail: (filePath: string): Promise<string | null> => desktop.invoke('album:load-thumbnail', filePath),
  /**
   * 获取相册视频流式地址和大小，不跨 IPC 传输完整视频。
   * @param filePath - 已保存的相册视频绝对路径
   * @returns 异步原生操作的{ url: string; sizeBytes: number } | null 结果。
   */
  getAlbumMediaInfo: (filePath: string): Promise<{ url: string; sizeBytes: number } | null> => desktop.invoke('album:media-info', filePath),
  /**
   * 清理 userData/wallpapers/ 下的自定义壁纸缓存
   * @returns 异步原生操作的void 结果。
   */
  clearWallpaperCache: (): Promise<void> => desktop.invoke('wallpaper:clear-cache'),
  /**
   * 将当前背景同步设置为 Windows 系统桌面壁纸
   * @param payload - 背景源路径和预览地址
   * @returns 异步原生操作的boolean 结果。
   */
  setSystemDesktopWallpaper: (payload: SetWallpaperPayload): Promise<boolean> => desktop.invoke('wallpaper:system:set', payload),
  /**
   * 从视频中提取封面图路径
   * @param sourcePath - 视频文件绝对路径
   * @returns 异步原生操作的string | null 结果。
   */
  wallpaperVideoCover: (sourcePath: string): Promise<string | null> => desktop.invoke('wallpaper:video:cover', sourcePath),
  /**
   * 读取本地文件并以 Blob/Uint8Array 形式返回（保留以供其它功能使用）
   * @param filePath - 文件绝对路径
   * @returns 异步原生操作的Uint8Array | null 结果。
   */
  readLocalFileAsBuffer: (filePath: string): Promise<Uint8Array | null> => invokeBytes('wallpaper:read-file-buffer', filePath),
  /** ===== 格式工厂 API ===== */
  /**
   * 选择视频文件对话框
   * @returns 文件路径和大小，取消返回 null
   */
  pickVideoForExtract: (): Promise<PickVideoForExtractResult | null> => desktop.invoke('format-factory:pick-video'),
  /**
   * 提取视频文件的音轨或视频轨
   * @param options - 提取选项
   * @returns 提取结果
   */
  extractVideoTrack: (options: ExtractVideoTrackOptions): Promise<ExtractVideoTrackResult> => desktop.invoke('format-factory:extract-track', options),
  /** ===== HTTP 代理 API（绕过 CORS） ===== */
  /**
   * 通过主进程代理 HTTP 请求（绕过浏览器 CORS 限制）
   * @param url - 请求 URL
   * @param options - 请求选项
   * @returns 响应结果
   */
  netFetch: (url: string, options?: NetFetchOptions): Promise<NetFetchResult> => desktop.invoke('net:fetch', url, options),
  /** ===== 邮件 API ===== */
  /**
   * 读取收件箱邮件列表
   */
  /** 按需读取单封邮件正文，不下载附件。
   * @param config - 对应功能的配置。
   * @param uid - mail:message:get 操作使用的 uid 参数。
   * @param validity - mail:message:get 操作使用的 validity 参数。
   * @returns 异步原生操作的MailInboxResult 结果。
   */
  mailMessageGet: (config: Record<string, unknown>, uid: string, validity?: string): Promise<MailInboxResult> => desktop.invoke('mail:message:get', config, uid, validity),
  /** 原生桌面操作 mailInboxList（mail:inbox:list）。
   * @param configOrLimit - mail:inbox:list 操作使用的 configOrLimit 参数。
   * @param limit - 返回记录数量上限。
   * @returns 异步原生操作的MailInboxResult 结果。
   */
  mailInboxList: (configOrLimit?: Record<string, unknown> | number, limit?: number): Promise<MailInboxResult> => desktop.invoke('mail:inbox:list', configOrLimit, limit),
  /** ===== 文件存储 API ===== */
  /**
   * 安排由原生宿主唤醒页面的业务截止时间。
   * @param id - 目标业务记录或请求标识。
   * @param deadline - runtime:schedule-wakeup 操作使用的 deadline 参数。
   * @returns 是否成功更新唤醒计划。
   */
  scheduleWakeup: (id: string, deadline: number | null): Promise<boolean> => desktop.invoke('runtime:schedule-wakeup', id, deadline),
  /** 原生桌面操作 storeRead（store:read）。
   * @param key - 配置项键名。
   * @param strict - store:read 操作使用的 strict 参数。
   * @returns 异步原生操作的unknown 结果。
   */
  storeRead: (key: string, strict = false): Promise<unknown> => strict ? desktop.invoke('store:read', key, true) : desktop.invoke('store:read', key),
  /**
   * 将数据写入 JSON 文件
   * @param key - 存储键名（对应文件名）
   * @param data - 要存储的数据
   * @returns 是否写入成功
   */
  storeWrite: (key: string, data: unknown): Promise<boolean> => desktop.invoke('store:write', key, data),
  /**
   * 仅当前存储匹配预期快照时写入，并同步所有窗口。
   * @param key - 存储键名（对应文件名）
   * @param expected - 修改前读取的原始 JSON 快照
   * @param data - 要存储的新数据
   * @returns 写入成功、快照冲突或存储错误
   */
  storeCompareAndSwap: (key: string, expected: unknown, data: unknown): Promise<'updated' | 'conflict' | 'error'> => desktop.invoke('store:compare-and-swap', key, expected, data),
  /** 设置单个闹钟的开关状态，并同步所有窗口。
   * @param id - 目标业务记录或请求标识。
   * @param enabled - 是否启用对应功能。
   * @returns 异步原生操作的boolean 结果。
   */
  setAlarmEnabled: (id: number, enabled: boolean): Promise<boolean> => desktop.invoke('alarm:set-enabled', id, enabled),
  /** ===== 快捷键 API ===== */
  /**
   * 获取当前隐藏灵动岛的快捷键
   * @returns 当前快捷键字符串
   */
  hotkeyGet: (): Promise<string> => desktop.invoke('hotkey:get'),
  /**
   * 设置隐藏灵动岛的快捷键
   * @param accelerator - Electron accelerator 字符串（如 "Alt+X"）
   * @returns 是否注册成功
   */
  hotkeySet: (accelerator: string): Promise<boolean> => desktop.invoke('hotkey:set', accelerator),
  /**
   * 暂停所有快捷键响应（用于录入快捷键）
   * @returns 异步原生操作的boolean 结果。
   */
  hotkeySuspend: (): Promise<boolean> => desktop.invoke('hotkey:suspend'),
  /**
   * 恢复所有快捷键响应（录入结束后）
   * @returns 异步原生操作的boolean 结果。
   */
  hotkeyResume: (): Promise<boolean> => desktop.invoke('hotkey:resume'),
  /**
   * 获取当前关闭灵动岛的快捷键
   * @returns 当前快捷键字符串
   */
  quitHotkeyGet: (): Promise<string> => desktop.invoke('quit-hotkey:get'),
  /**
   * 设置关闭灵动岛的快捷键
   * @param accelerator - Electron accelerator 字符串（如 "Alt+Q"）
   * @returns 是否注册成功
   */
  quitHotkeySet: (accelerator: string): Promise<boolean> => desktop.invoke('quit-hotkey:set', accelerator),
  /**
   * 获取当前截图快捷键
   * @returns 当前快捷键字符串
   */
  screenshotHotkeyGet: (): Promise<string> => desktop.invoke('screenshot-hotkey:get'),
  /**
   * 设置截图快捷键
   * @param accelerator - Electron accelerator 字符串（如 "Alt+A"）
   * @returns 是否注册成功
   */
  screenshotHotkeySet: (accelerator: string): Promise<boolean> => desktop.invoke('screenshot-hotkey:set', accelerator),
  /**
   * 获取当前切歌快捷键
   * @returns 异步原生操作的string 结果。
   */
  nextSongHotkeyGet: (): Promise<string> => desktop.invoke('next-song-hotkey:get'),
  /**
   * 设置切歌快捷键
   * @param accelerator - next-song-hotkey:set 操作使用的 accelerator 参数。
   * @returns 异步原生操作的boolean 结果。
   */
  nextSongHotkeySet: (accelerator: string): Promise<boolean> => desktop.invoke('next-song-hotkey:set', accelerator),
  /**
   * 获取当前暂停/播放快捷键
   * @returns 异步原生操作的string 结果。
   */
  playPauseSongHotkeyGet: (): Promise<string> => desktop.invoke('play-pause-song-hotkey:get'),
  /**
   * 设置暂停/播放快捷键
   * @param accelerator - play-pause-song-hotkey:set 操作使用的 accelerator 参数。
   * @returns 异步原生操作的boolean 结果。
   */
  playPauseSongHotkeySet: (accelerator: string): Promise<boolean> => desktop.invoke('play-pause-song-hotkey:set', accelerator),
  /**
   * 获取当前还原默认位置快捷键
   * @returns 当前快捷键字符串
   */
  resetPositionHotkeyGet: (): Promise<string> => desktop.invoke('reset-position-hotkey:get'),
  /**
   * 设置还原默认位置快捷键
   * @param accelerator - Electron accelerator 字符串
   * @returns 是否注册成功
   */
  resetPositionHotkeySet: (accelerator: string): Promise<boolean> => desktop.invoke('reset-position-hotkey:set', accelerator),
  /**
   * 获取当前切换托盘图标快捷键
   * @returns 当前快捷键字符串
   */
  toggleTrayHotkeyGet: (): Promise<string> => desktop.invoke('toggle-tray-hotkey:get'),
  /**
   * 设置切换托盘图标快捷键
   * @param accelerator - Electron accelerator 字符串
   * @returns 是否注册成功
   */
  toggleTrayHotkeySet: (accelerator: string): Promise<boolean> => desktop.invoke('toggle-tray-hotkey:set', accelerator),
  /**
   * 获取当前显示配置窗口快捷键
   * @returns 当前快捷键字符串
   */
  showSettingsWindowHotkeyGet: (): Promise<string> => desktop.invoke('show-settings-window-hotkey:get'),
  /**
   * 设置显示配置窗口快捷键
   * @param accelerator - Electron accelerator 字符串
   * @returns 是否注册成功
   */
  showSettingsWindowHotkeySet: (accelerator: string): Promise<boolean> => desktop.invoke('show-settings-window-hotkey:set', accelerator),
  /**
   * 获取当前打开剪贴板历史快捷键
   * @returns 当前快捷键字符串
   */
  openClipboardHistoryHotkeyGet: (): Promise<string> => desktop.invoke('open-clipboard-history-hotkey:get'),
  /**
   * 设置打开剪贴板历史快捷键
   * @param accelerator - Electron accelerator 字符串
   * @returns 是否注册成功
   */
  openClipboardHistoryHotkeySet: (accelerator: string): Promise<boolean> => desktop.invoke('open-clipboard-history-hotkey:set', accelerator),
  /**
   * 获取当前切换鼠标穿透快捷键
   * @returns 当前快捷键字符串
   */
  togglePassthroughHotkeyGet: (): Promise<string> => desktop.invoke('toggle-passthrough-hotkey:get'),
  /**
   * 设置切换鼠标穿透快捷键
   * @param accelerator - Electron accelerator 字符串
   * @returns 是否注册成功
   */
  togglePassthroughHotkeySet: (accelerator: string): Promise<boolean> => desktop.invoke('toggle-passthrough-hotkey:set', accelerator),
  /**
   * 获取当前切换 UI 状态锁定快捷键
   * @returns 当前快捷键字符串
   */
  toggleUiLockHotkeyGet: (): Promise<string> => desktop.invoke('toggle-ui-lock-hotkey:get'),
  /**
   * 设置切换 UI 状态锁定快捷键
   * @param accelerator - Electron accelerator 字符串
   * @returns 是否注册成功
   */
  toggleUiLockHotkeySet: (accelerator: string): Promise<boolean> => desktop.invoke('toggle-ui-lock-hotkey:set', accelerator),
  /**
   * 获取当前切换形态模式快捷键
   * @returns 当前快捷键字符串
   */
  toggleShapeModeHotkeyGet: (): Promise<string> => desktop.invoke('toggle-shape-mode-hotkey:get'),
  /**
   * 设置切换形态模式快捷键
   * @param accelerator - Electron accelerator 字符串
   * @returns 是否注册成功
   */
  toggleShapeModeHotkeySet: (accelerator: string): Promise<boolean> => desktop.invoke('toggle-shape-mode-hotkey:set', accelerator),
  /**
   * 获取当前 Agent 语音输入快捷键
   * @returns 当前快捷键字符串
   */
  agentVoiceInputHotkeyGet: (): Promise<string> => desktop.invoke('agent-voice-input-hotkey:get'),
  /**
   * 设置 Agent 语音输入快捷键
   * @param accelerator - Electron accelerator 字符串
   * @returns 是否注册成功
   */
  agentVoiceInputHotkeySet: (accelerator: string): Promise<boolean> => desktop.invoke('agent-voice-input-hotkey:set', accelerator),
  /**
   * 监听 Agent 语音输入状态变化
   * @param callback - 回调函数，参数为是否激活
   * @returns 取消监听函数
   */
  onAgentVoiceInputState: (callback: (active: boolean) => void): (() => void) => {
    const handler = (active: boolean): void => {
      callback(active);
    };
    desktop.on('agent-voice-input:state', handler);
    return () => {
      desktop.off('agent-voice-input:state', handler);
    };
  },
  /** 显示 CLI 检测全屏边缘光效（常驻直到调用 cliGlowHide）
   * @returns 异步原生操作的boolean 结果。
   */
  cliGlowShow: (): Promise<boolean> => desktop.invoke('cli-glow:show'),
  /** 关闭 CLI 检测全屏边缘光效
   * @returns 异步原生操作的boolean 结果。
   */
  cliGlowHide: (): Promise<boolean> => desktop.invoke('cli-glow:hide'),
  /**
   * 监听鼠标穿透锁定状态变化
   * @param callback - 回调函数，参数为是否锁定
   * @returns 取消监听函数
   */
  onPassthroughLockChanged: (callback: (locked: boolean) => void): (() => void) => {
    const handler = (locked: boolean): void => {
      callback(locked);
    };
    desktop.on('window:passthrough-lock-changed', handler);
    return () => {
      desktop.off('window:passthrough-lock-changed', handler);
    };
  },
  /** ===== 日志文件 API ===== */
  /**
   * 写入日志到文件
   * @param level - 日志级别（info/warn/error）
   * @param message - 日志内容
   */
  logWrite: (level: string, message: string): void => {
    desktop.send('log:write', level, message);
  },
  /** ===== 歌曲设置 API ===== */
  /**
   * 获取播放器白名单
   * @returns 白名单数组
   */
  musicWhitelistGet: (): Promise<string[]> => desktop.invoke('music:whitelist:get'),
  /**
   * 设置播放器白名单
   * @param list - 新的白名单数组
   * @returns 是否保存成功
   */
  musicWhitelistSet: (list: string[]): Promise<boolean> => desktop.invoke('music:whitelist:set', list),
  /**
   * 获取音乐提供商登录状态
   * @param provider - 音乐提供商标识
   * @returns 当前登录状态
   */
  musicProviderAuthStatus: (provider: MusicProviderId): Promise<MusicProviderAuthStatus> => desktop.invoke('music-provider-auth:status', provider),
  /**
   * 创建音乐提供商登录二维码
   * @param provider - 音乐提供商标识
   * @returns 二维码内容与轮询 token
   */
  musicProviderAuthCreateQr: (provider: MusicProviderId): Promise<MusicProviderQrCodeResult> => desktop.invoke('music-provider-auth:create-qr', provider),
  /**
   * 检查音乐提供商二维码登录状态
   * @param provider - 音乐提供商标识
   * @param token - 二维码轮询 token
   * @returns 最新登录状态
   */
  musicProviderAuthCheckQr: (provider: MusicProviderId, token: string): Promise<MusicProviderAuthStatus> => desktop.invoke('music-provider-auth:check-qr', provider, token),
  /**
   * 清除音乐提供商登录会话
   * @param provider - 音乐提供商标识
   * @returns 清理后的登录状态
   */
  musicProviderAuthClear: (provider: MusicProviderId): Promise<MusicProviderAuthStatus> => desktop.invoke('music-provider-auth:clear', provider),
  /** 原生桌面操作 qishuiStatus（qishui:status）。
   * @returns 异步原生操作的QishuiBusinessStatus 结果。
   */
  qishuiStatus: (): Promise<QishuiBusinessStatus> => desktop.invoke('qishui:status'),
  /** 原生桌面操作 qishuiSearch（qishui:search）。
   * @param keyword - 用于匹配的关键词。
   * @param options - 本次操作的可选参数。
   * @returns 异步原生操作的QishuiSongsResult 结果。
   */
  qishuiSearch: (keyword: string, options?: QishuiBusinessRequestOptions): Promise<QishuiSongsResult> => desktop.invoke('qishui:search', keyword, options),
  /** 原生桌面操作 qishuiFeed（qishui:feed）。
   * @param limit - 返回记录数量上限。
   * @returns 异步原生操作的QishuiSongsResult 结果。
   */
  qishuiFeed: (limit?: number): Promise<QishuiSongsResult> => desktop.invoke('qishui:feed', limit),
  /** 原生桌面操作 qishuiPlaylists（qishui:playlists）。
   * @returns 异步原生操作的Record<string, unknown> 结果。
   */
  qishuiPlaylists: (): Promise<Record<string, unknown>> => desktop.invoke('qishui:playlists'),
  /** 原生桌面操作 qishuiPlaylistTracks（qishui:playlist-tracks）。
   * @param id - 目标业务记录或请求标识。
   * @param options - 本次操作的可选参数。
   * @returns 异步原生操作的Record<string, unknown> 结果。
   */
  qishuiPlaylistTracks: (id: string, options?: QishuiBusinessRequestOptions): Promise<Record<string, unknown>> => desktop.invoke('qishui:playlist-tracks', id, options),
  /** 原生桌面操作 qishuiLyrics（qishui:lyrics）。
   * @param id - 目标业务记录或请求标识。
   * @returns 异步原生操作的QishuiLyricsResult 结果。
   */
  qishuiLyrics: (id: string): Promise<QishuiLyricsResult> => desktop.invoke('qishui:lyrics', id),
  /** 原生桌面操作 qishuiSongUrl（qishui:song-url）。
   * @param id - 目标业务记录或请求标识。
   * @param quality - 期望的音频质量。
   * @returns 异步原生操作的QishuiSongUrlResult 结果。
   */
  qishuiSongUrl: (id: string, quality?: string): Promise<QishuiSongUrlResult> => desktop.invoke('qishui:song-url', id, quality),
  /** 原生桌面操作 qishuiComments（qishui:comments）。
   * @param id - 目标业务记录或请求标识。
   * @param options - 本次操作的可选参数。
   * @returns 异步原生操作的Record<string, unknown> 结果。
   */
  qishuiComments: (id: string, options?: QishuiBusinessRequestOptions): Promise<Record<string, unknown>> => desktop.invoke('qishui:comments', id, options),
  /** 原生桌面操作 qishuiCreateComment（qishui:create-comment）。
   * @param id - 目标业务记录或请求标识。
   * @param content - 需要提交的正文。
   * @returns 异步原生操作的Record<string, unknown> 结果。
   */
  qishuiCreateComment: (id: string, content: string): Promise<Record<string, unknown>> => desktop.invoke('qishui:create-comment', id, content),
  /** 原生桌面操作 qishuiCheckLiked（qishui:check-liked）。
   * @param ids - 目标业务标识列表。
   * @returns 异步原生操作的Record<string, unknown> 结果。
   */
  qishuiCheckLiked: (ids: string[]): Promise<Record<string, unknown>> => desktop.invoke('qishui:check-liked', ids),
  /** 原生桌面操作 qishuiLike（qishui:like）。
   * @param id - 目标业务记录或请求标识。
   * @param liked - 是否收藏歌曲。
   * @returns 异步原生操作的Record<string, unknown> 结果。
   */
  qishuiLike: (id: string, liked: boolean): Promise<Record<string, unknown>> => desktop.invoke('qishui:like', id, liked),
  /** 原生桌面操作 qishuiCollectPlaylist（qishui:collect-playlist）。
   * @param id - 目标业务记录或请求标识。
   * @param collected - 是否收藏目标资源。
   * @returns 异步原生操作的Record<string, unknown> 结果。
   */
  qishuiCollectPlaylist: (id: string, collected: boolean): Promise<Record<string, unknown>> => desktop.invoke('qishui:collect-playlist', id, collected),
  /** 原生桌面操作 qishuiCollectAlbum（qishui:collect-album）。
   * @param id - 目标业务记录或请求标识。
   * @param collected - 是否收藏目标资源。
   * @returns 异步原生操作的Record<string, unknown> 结果。
   */
  qishuiCollectAlbum: (id: string, collected: boolean): Promise<Record<string, unknown>> => desktop.invoke('qishui:collect-album', id, collected),
  /** 原生桌面操作 qishuiAddSong（qishui:add-song）。
   * @param playlistId - 歌单标识。
   * @param trackId - 歌曲标识。
   * @returns 异步原生操作的Record<string, unknown> 结果。
   */
  qishuiAddSong: (playlistId: string, trackId: string): Promise<Record<string, unknown>> => desktop.invoke('qishui:add-song', playlistId, trackId),
  /** 原生桌面操作 qishuiRecentPlay（qishui:recent-play）。
   * @param id - 目标业务记录或请求标识。
   * @returns 异步原生操作的Record<string, unknown> 结果。
   */
  qishuiRecentPlay: (id: string): Promise<Record<string, unknown>> => desktop.invoke('qishui:recent-play', id),
  /**
   * 获取歌词源配置
   * @returns 歌词源标识字符串
   */
  musicLyricsSourceGet: (): Promise<string> => desktop.invoke('music:lyrics-source:get'),
  /**
   * 设置歌词源
   * @param source - 歌词源标识
   * @returns 是否保存成功
   */
  musicLyricsSourceSet: (source: string): Promise<boolean> => desktop.invoke('music:lyrics-source:set', source),
  /** 原生桌面操作 musicProviderModeGet（music:provider-mode:get）。
   * @returns 异步原生操作的'guest' | 'logged-in' 结果。
   */
  musicProviderModeGet: (): Promise<'guest' | 'logged-in'> => desktop.invoke('music:provider-mode:get'),
  /** 原生桌面操作 musicProviderModeSet（music:provider-mode:set）。
   * @param mode - 新的功能模式。
   * @returns 异步原生操作的boolean 结果。
   */
  musicProviderModeSet: (mode: 'guest' | 'logged-in'): Promise<boolean> => desktop.invoke('music:provider-mode:set', mode),
  /**
   * 获取歌词功能开关
   * @returns 是否启用歌词功能
   */
  musicLyricsEnabledGet: (): Promise<boolean> => desktop.invoke('music:lyrics-enabled:get'),
  /**
   * 设置歌词功能开关
   * @param enabled - 是否启用
   * @returns 是否保存成功
   */
  musicLyricsEnabledSet: (enabled: boolean): Promise<boolean> => desktop.invoke('music:lyrics-enabled:set', enabled),
  /**
   * 获取翻译歌词显示开关
   * @returns 是否显示翻译歌词
   */
  musicLyricsTranslationEnabledGet: (): Promise<boolean> => desktop.invoke('music:lyrics-translation-enabled:get'),
  /**
   * 设置翻译歌词显示开关
   * @param enabled - 是否显示
   * @returns 是否保存成功
   */
  musicLyricsTranslationEnabledSet: (enabled: boolean): Promise<boolean> => desktop.invoke('music:lyrics-translation-enabled:set', enabled),
  /**
   * 获取逐字扫光开关
   * @returns 是否启用逐字扫光
   */
  musicLyricsKaraokeGet: (): Promise<boolean> => desktop.invoke('music:lyrics-karaoke:get'),
  /**
   * 设置逐字扫光开关
   * @param enabled - 是否启用
   * @returns 是否保存成功
   */
  musicLyricsKaraokeSet: (enabled: boolean): Promise<boolean> => desktop.invoke('music:lyrics-karaoke:set', enabled),
  /**
   * 获取歌词界面时钟开关
   * @returns 是否显示时钟
   */
  musicLyricsClockGet: (): Promise<boolean> => desktop.invoke('music:lyrics-clock:get'),
  /**
   * 设置歌词界面时钟开关
   * @param enabled - 是否显示
   * @returns 是否保存成功
   */
  musicLyricsClockSet: (enabled: boolean): Promise<boolean> => desktop.invoke('music:lyrics-clock:set', enabled),
  /**
   * 获取歌词校准开关
   * @returns 是否启用歌词校准
   */
  musicLyricsCalibrateEnabledGet: (): Promise<boolean> => desktop.invoke('music:lyrics-calibrate-enabled:get'),
  /**
   * 设置歌词校准开关
   * @param enabled - 是否启用
   * @returns 是否保存成功
   */
  musicLyricsCalibrateEnabledSet: (enabled: boolean): Promise<boolean> => desktop.invoke('music:lyrics-calibrate-enabled:set', enabled),
  /**
   * 获取歌词校准触发延迟（秒）
   * @returns 延迟秒数
   */
  musicLyricsCalibrateDelayGet: (): Promise<number> => desktop.invoke('music:lyrics-calibrate-delay:get'),
  /**
   * 设置歌词校准触发延迟（秒）
   * @param delaySec - 延迟秒数
   * @returns 是否保存成功
   */
  musicLyricsCalibrateDelaySet: (delaySec: number): Promise<boolean> => desktop.invoke('music:lyrics-calibrate-delay:set', delaySec),
  /**
   * 获取 SMTC 自动取消订阅时间（毫秒），0 表示永不取消
   * @returns 异步原生操作的number 结果。
   */
  musicSmtcUnsubscribeMsGet: (): Promise<number> => desktop.invoke('music:smtc-unsubscribe-ms:get'),
  /**
   * 设置 SMTC 自动取消订阅时间（毫秒），0 表示永不取消
   * @param valueMs - music:smtc-unsubscribe-ms:set 操作使用的 valueMs 参数。
   * @returns 异步原生操作的boolean 结果。
   */
  musicSmtcUnsubscribeMsSet: (valueMs: number): Promise<boolean> => desktop.invoke('music:smtc-unsubscribe-ms:set', valueMs),
  /**
   * 查询当前所有 SMTC 媒体会话播放源
   * @returns 检测到的播放源列表
   */
  musicDetectSourceAppId: (): Promise<DetectSourceAppIdResult> => desktop.invoke('music:detect-source-app-id'),
  /**
   * 轻量级获取当前 SMTC 播放时间戳（不含媒体元数据）
   * 用于歌词校准等仅需播放位置的场景
   * @returns 时间戳信息
   */
  smtcGetTimestamp: (): Promise<SmtcTimestampResult> => desktop.invoke('smtc:get-timestamp'),
  /** 获取当前运行中的非系统进程列表
   * @returns 异步原生操作的string[] 结果。
   */
  getRunningNonSystemProcesses: (): Promise<string[]> => desktop.invoke('system:running-processes:get'),
  /** 获取当前运行中的非系统进程列表（包含图标）
   * @returns 异步原生操作的RunningProcessInfo[] 结果。
   */
  getRunningNonSystemProcessesWithIcons: (): Promise<RunningProcessInfo[]> => desktop.invoke('system:running-processes:with-icons:get'),
  /** 获取当前打开窗口列表（包含图标）
   * @returns 异步原生操作的RunningWindowInfo[] 结果。
   */
  getOpenWindowsWithIcons: (): Promise<RunningWindowInfo[]> => desktop.invoke('system:open-windows:with-icons:get'),
  /** 获取当前焦点窗口
   * @returns 异步原生操作的RunningWindowInfo | null 结果。
   */
  getFocusedWindow: (): Promise<RunningWindowInfo | null> => desktop.invoke('system:focused-window:get'),
  /** 获取隐藏进程名单
   * @returns 异步原生操作的string[] 结果。
   */
  hideProcessListGet: (): Promise<string[]> => desktop.invoke('hide-process-list:get'),
  /** 设置隐藏进程名单
   * @param list - hide-process-list:set 操作使用的 list 参数。
   * @returns 异步原生操作的boolean 结果。
   */
  hideProcessListSet: (list: string[]): Promise<boolean> => desktop.invoke('hide-process-list:set', list),
  /** 获取全屏窗口自动隐藏开关
   * @returns 异步原生操作的boolean 结果。
   */
  autoHideFullscreenWindowsGet: (): Promise<boolean> => desktop.invoke('hide-process-list:auto-hide-fullscreen:get'),
  /** 设置全屏窗口自动隐藏开关
   * @param enabled - 是否启用对应功能。
   * @returns 异步原生操作的boolean 结果。
   */
  autoHideFullscreenWindowsSet: (enabled: boolean): Promise<boolean> => desktop.invoke('hide-process-list:auto-hide-fullscreen:set', enabled),
  /** 订阅播放源切换请求（主进程推送）
   * @param callback - 接收对应原生事件业务数据的回调。
   * @returns 本次操作的事件取消订阅函数。
   */
  onSourceSwitchRequest: (callback: (data: SourceSwitchRequestData) => void): (() => void) => {
    const handler = (data: SourceSwitchRequestData) => {
      callback(data);
    };
    desktop.on('media:source-switch-request', handler);
    return () => {
      desktop.off('media:source-switch-request', handler);
    };
  },
  /** 接受切换到新播放源
   * @returns 异步原生操作的void 结果。
   */
  mediaAcceptSourceSwitch: (): Promise<void> => desktop.invoke('media:accept-source-switch'),
  /** 拒绝切换播放源
   * @returns 异步原生操作的void 结果。
   */
  mediaRejectSourceSwitch: (): Promise<void> => desktop.invoke('media:reject-source-switch'),
  /**
   * 获取主题模式
   * @returns 'dark' | 'light' | 'system'
   */
  themeModeGet: (): Promise<string> => desktop.invoke('theme:mode:get'),
  /**
   * 设置主题模式
   * @param mode - 'dark' | 'light' | 'system'
   * @returns 是否保存成功
   */
  themeModeSet: (mode: string): Promise<boolean> => desktop.invoke('theme:mode:set', mode),
  /**
   * 实时预览广播（不持久化），用于拖动条等场景
   * @param channel - 设置频道标识
   * @param value - 预览值
   * @returns 异步原生操作的boolean 结果。
   */
  settingsPreview: (channel: string, value: unknown): Promise<boolean> => desktop.invoke('settings:preview', channel, value),
  onSettingsChanged: subscribeSettings,
  /**
   * 获取灵动岛透明度
   * @returns 透明度值 10-100
   */
  islandOpacityGet: (): Promise<number> => desktop.invoke('island:opacity:get'),
  /**
   * 设置灵动岛透明度
   * @param opacity - 透明度值 10-100
   * @returns 是否保存成功
   */
  islandOpacitySet: (opacity: number): Promise<boolean> => desktop.invoke('island:opacity:set', opacity),
  /**
   * 获取 expand 鼠标移开回 idle 开关
   * @returns 异步原生操作的boolean 结果。
   */
  expandMouseleaveIdleGet: (): Promise<boolean> => desktop.invoke('island:expand-mouseleave-idle:get'),
  /**
   * 设置 expand 鼠标移开回 idle 开关
   * @param enabled - 是否启用对应功能。
   * @returns 异步原生操作的boolean 结果。
   */
  expandMouseleaveIdleSet: (enabled: boolean): Promise<boolean> => desktop.invoke('island:expand-mouseleave-idle:set', enabled),
  /**
   * 获取 maxExpand 鼠标移开回 idle 开关
   * @returns 异步原生操作的boolean 结果。
   */
  maxexpandMouseleaveIdleGet: (): Promise<boolean> => desktop.invoke('island:maxexpand-mouseleave-idle:get'),
  /**
   * 设置 maxExpand 鼠标移开回 idle 开关
   * @param enabled - 是否启用对应功能。
   * @returns 异步原生操作的boolean 结果。
   */
  maxexpandMouseleaveIdleSet: (enabled: boolean): Promise<boolean> => desktop.invoke('island:maxexpand-mouseleave-idle:set', enabled),
  /**
   * 获取 idle 点击展开开关
   * @returns 异步原生操作的boolean 结果。
   */
  idleClickExpandGet: (): Promise<boolean> => desktop.invoke('island:idle-click-expand:get'),
  /**
   * 设置 idle 点击展开开关
   * @param enabled - 是否启用对应功能。
   * @returns 异步原生操作的boolean 结果。
   */
  idleClickExpandSet: (enabled: boolean): Promise<boolean> => desktop.invoke('island:idle-click-expand:set', enabled),
  /**
   * 获取是否启用弹性动画
   * @returns 异步原生操作的boolean 结果。
   */
  springAnimationGet: (): Promise<boolean> => desktop.invoke('island:spring-animation:get'),
  /**
   * 设置是否启用弹性动画
   * @param enabled - 是否启用对应功能。
   * @returns 异步原生操作的boolean 结果。
   */
  springAnimationSet: (enabled: boolean): Promise<boolean> => desktop.invoke('island:spring-animation:set', enabled),
  /**
   * 获取动画速度档位 (slow / medium / fast)
   * @returns 异步原生操作的string 结果。
   */
  animationSpeedGet: (): Promise<string> => desktop.invoke('island:animation-speed:get'),
  /**
   * 设置动画速度档位
   * @param speed - island:animation-speed:set 操作使用的 speed 参数。
   * @returns 异步原生操作的boolean 结果。
   */
  animationSpeedSet: (speed: string): Promise<boolean> => desktop.invoke('island:animation-speed:set', speed),
  /**
   * 获取灵动岛整体缩放百分比。
   * @returns 50–150 的缩放百分比。
   */
  islandScaleGet: (): Promise<number> => desktop.invoke('island:scale:get'),
  /**
   * 设置并保存灵动岛整体缩放。
   * @param scale - 50–150 的缩放百分比。
   * @returns 是否保存成功。
   */
  islandScaleSet: (scale: number): Promise<boolean> => desktop.invoke('island:scale:set', scale),
  /**
   * 获取灵动岛形态模式 (notch / pill)
   * @returns 异步原生操作的string 结果。
   */
  shapeModeGet: (): Promise<string> => desktop.invoke('island:shape-mode:get'),
  /**
   * 设置灵动岛形态模式
   * @param mode - 新的功能模式。
   * @returns 异步原生操作的boolean 结果。
   */
  shapeModeSet: (mode: string): Promise<boolean> => desktop.invoke('island:shape-mode:set', mode),
  /**
   * 监听形态模式变更通知（专用通道，由主进程主动推送）
   * @param callback - 接收对应原生事件业务数据的回调。
   * @returns 本次操作的事件取消订阅函数。
   */
  onShapeModeChanged: (callback: (mode: string, targetX: number, targetY: number) => void): (() => void) => {
    const handler = (mode: string, targetX: number, targetY: number): void => {
      callback(mode, targetX, targetY);
    };
    desktop.on('island:shape-mode:changed', handler);
    return () => {
      desktop.off('island:shape-mode:changed', handler);
    };
  },
  /**
   * 读取当前剪贴板文本
   * @returns 异步原生操作的string 结果。
   */
  clipboardReadText: (): Promise<string> => desktop.invoke('clipboard:read-text'),
  /**
   * 写入文本到剪贴板
   * @param text - 需要处理的文本。
   * @returns 异步原生操作的boolean 结果。
   */
  clipboardWriteText: (text: string): Promise<boolean> => desktop.invoke('clipboard:write-text', text),
  /**
   * 获取剪贴板 URL 监听开关
   * @returns 异步原生操作的boolean 结果。
   */
  clipboardUrlMonitorGet: (): Promise<boolean> => desktop.invoke('clipboard:url-monitor:get'),
  /**
   * 设置剪贴板 URL 监听开关
   * @param enabled - 是否启用对应功能。
   * @returns 异步原生操作的boolean 结果。
   */
  clipboardUrlMonitorSet: (enabled: boolean): Promise<boolean> => desktop.invoke('clipboard:url-monitor:set', enabled),
  /**
   * 获取剪贴板 URL 识别模式
   * @returns 异步原生操作的'https-only' | 'http-https' | 'domain-only' 结果。
   */
  clipboardUrlDetectModeGet: (): Promise<'https-only' | 'http-https' | 'domain-only'> => desktop.invoke('clipboard:url-detect-mode:get'),
  /**
   * 设置剪贴板 URL 识别模式
   * @param mode - 新的功能模式。
   * @returns 异步原生操作的boolean 结果。
   */
  clipboardUrlDetectModeSet: (mode: 'https-only' | 'http-https' | 'domain-only'): Promise<boolean> => desktop.invoke('clipboard:url-detect-mode:set', mode),
  /**
   * 获取剪贴板 URL 黑名单（域名）
   * @returns 异步原生操作的string[] 结果。
   */
  clipboardUrlBlacklistGet: (): Promise<string[]> => desktop.invoke('clipboard:url-blacklist:get'),
  /**
   * 设置剪贴板 URL 黑名单（域名）
   * @param list - clipboard:url-blacklist:set 操作使用的 list 参数。
   * @returns 异步原生操作的boolean 结果。
   */
  clipboardUrlBlacklistSet: (list: string[]): Promise<boolean> => desktop.invoke('clipboard:url-blacklist:set', list),
  /**
   * 追加单个域名到剪贴板 URL 黑名单
   * @param domain - clipboard:url-blacklist:add-domain 操作使用的 domain 参数。
   * @returns 异步原生操作的boolean 结果。
   */
  clipboardUrlBlacklistAddDomain: (domain: string): Promise<boolean> => desktop.invoke('clipboard:url-blacklist:add-domain', domain),
  /**
   * 获取开机自启模式
   * @returns 异步原生操作的string 结果。
   */
  autostartGet: (): Promise<string> => desktop.invoke('island:autostart:get'),
  /**
   * 设置开机自启模式
   * @param mode - 新的功能模式。
   * @returns 异步原生操作的boolean 结果。
   */
  autostartSet: (mode: string): Promise<boolean> => desktop.invoke('island:autostart:set', mode),
  /**
   * 获取快速导航卡片配置
   * @returns 异步原生操作的NavOrderPayload 结果。
   */
  navOrderGet: (): Promise<NavOrderPayload> => desktop.invoke('island:nav-order:get'),
  /**
   * 设置快速导航卡片配置
   * @param payload - 提交给 Rust 宿主的业务数据。
   * @returns 异步原生操作的boolean 结果。
   */
  navOrderSet: (payload: NavOrderPayload): Promise<boolean> => desktop.invoke('island:nav-order:set', payload),

  // ===== 下载工具 =====
  /** 原生桌面操作 downloadStart（download:start）。
   * @param payload - 提交给 Rust 宿主的业务数据。
   * @returns 异步原生操作的DownloadStartResult 结果。
   */
  downloadStart: (payload: DownloadStartPayload): Promise<DownloadStartResult> => desktop.invoke('download:start', payload),
  /** 原生桌面操作 downloadCancel（download:cancel）。
   * @param taskId - download:cancel 操作使用的 taskId 参数。
   * @returns 异步原生操作的boolean 结果。
   */
  downloadCancel: (taskId: string): Promise<boolean> => desktop.invoke('download:cancel', taskId),
  /** 原生桌面操作 downloadPause（download:pause）。
   * @param taskId - download:pause 操作使用的 taskId 参数。
   * @returns 异步原生操作的boolean 结果。
   */
  downloadPause: (taskId: string): Promise<boolean> => desktop.invoke('download:pause', taskId),
  /** 原生桌面操作 downloadResume（download:resume）。
   * @param taskId - download:resume 操作使用的 taskId 参数。
   * @returns 异步原生操作的DownloadStartResult 结果。
   */
  downloadResume: (taskId: string): Promise<DownloadStartResult> => desktop.invoke('download:resume', taskId),
  /** 原生桌面操作 downloadRemove（download:remove）。
   * @param taskId - download:remove 操作使用的 taskId 参数。
   * @returns 异步原生操作的boolean 结果。
   */
  downloadRemove: (taskId: string): Promise<boolean> => desktop.invoke('download:remove', taskId),
  /** 原生桌面操作 downloadList（download:list）。
   * @returns 异步原生操作的DownloadTask[] 结果。
   */
  downloadList: (): Promise<DownloadTask[]> => desktop.invoke('download:list'),
  /** 原生桌面操作 downloadPickSavePath（download:pick-save-path）。
   * @param suggestedName - download:pick-save-path 操作使用的 suggestedName 参数。
   * @returns 异步原生操作的string | null 结果。
   */
  downloadPickSavePath: (suggestedName?: string): Promise<string | null> => desktop.invoke('download:pick-save-path', suggestedName),
  /** 原生桌面操作 downloadGetDefaultDir（download:get-default-dir）。
   * @returns 异步原生操作的string 结果。
   */
  downloadGetDefaultDir: (): Promise<string> => desktop.invoke('download:get-default-dir'),
  /** 原生桌面操作 onDownloadTaskUpdated（download:task-updated）。
   * @param callback - 接收对应原生事件业务数据的回调。
   * @returns 本次操作的事件取消订阅函数。
   */
  onDownloadTaskUpdated: (callback: (task: DownloadTask) => void): (() => void) => {
    const handler = (task: DownloadTask): void => {
      callback(task);
    };
    desktop.on('download:task-updated', handler);
    return () => {
      desktop.off('download:task-updated', handler);
    };
  },

  // ===== 自动更新 =====

  /**
   * 检查更新
   * @returns 更新信息（是否有新版、版本号等）
   * @param source - updater:check 操作使用的 source 参数。
   * @param resolvedUrl - updater:check 操作使用的 resolvedUrl 参数。
   */
  updaterCheck: (source?: string, resolvedUrl?: string): Promise<UpdaterCheckResult> => desktop.invoke('updater:check', source, resolvedUrl),
  /**
   * 下载更新
   * @returns 是否成功开始下载
   * @param source - updater:download 操作使用的 source 参数。
   * @param resolvedUrl - updater:download 操作使用的 resolvedUrl 参数。
   */
  updaterDownload: (source?: string, resolvedUrl?: string): Promise<boolean> => desktop.invoke('updater:download', source, resolvedUrl),
  /**
   * 安装更新并重启
   * @returns 异步原生操作的boolean 结果。
   */
  updaterInstall: (): Promise<boolean> => desktop.invoke('updater:install'),
  /**
   * 获取当前版本号
   * @returns 异步原生操作的string 结果。
   */
  updaterVersion: (): Promise<string> => desktop.invoke('updater:version'),
  /**
   * 重置首次启动标记，下次启动时显示引导界面
   * @returns 异步原生操作的boolean 结果。
   */
  guideReset: (): Promise<boolean> => desktop.invoke('guide:reset'),
  /**
   * 订阅托盘菜单打开事件（仅托盘菜单窗口使用）
   * @param callback - 收到本次打开的菜单状态
   * @returns 取消订阅函数
   */
  onTrayMenuOpen: (callback: (state: TrayMenuState) => void): (() => void) => {
    const handler = (state: TrayMenuState): void => {
      callback(state);
    };
    desktop.on(TRAY_MENU_CHANNELS.open, handler);
    return () => {
      desktop.off(TRAY_MENU_CHANNELS.open, handler);
    };
  },
  /**
   * 通知主进程托盘菜单渲染层已订阅打开事件
   */
  trayMenuMounted: (): void => {
    desktop.send(TRAY_MENU_CHANNELS.mounted);
  },
  /**
   * 通知主进程托盘菜单已渲染完成，可按内容高度定位并显示
   * @param height - 菜单内容高度（CSS 像素）
   */
  trayMenuReady: (height: number): void => {
    desktop.send(TRAY_MENU_CHANNELS.ready, height);
  },
  /**
   * 执行托盘菜单动作，主进程会先收起菜单
   * @param action - 菜单动作
   */
  trayMenuAction: (action: TrayMenuAction): void => {
    desktop.send(TRAY_MENU_CHANNELS.action, action);
  },
  /**
   * 关闭托盘菜单
   */
  trayMenuClose: (): void => {
    desktop.send(TRAY_MENU_CHANNELS.close);
  },
  /**
   * 监听下载进度
   * @param callback - 下载进度回调
   * @returns 取消监听函数
   */
  onUpdaterProgress: (callback: (progress: UpdaterProgress) => void): (() => void) => {
    const handler = (data: UpdaterProgress): void => {
      callback(data);
    };
    desktop.on('updater:download-progress', handler);
    return () => {
      desktop.off('updater:download-progress', handler);
    };
  },
  /**
   * 监听更新下载完成事件
   * @param callback - 回调函数，接收版本号
   * @returns 取消监听函数
   */
  onUpdaterDownloaded: (callback: (data: UpdaterDownloadedData) => void): (() => void) => {
    const handler = (data: UpdaterDownloadedData): void => {
      callback(data);
    };
    desktop.on('updater:update-downloaded', handler);
    return () => {
      desktop.off('updater:update-downloaded', handler);
    };
  },
  /**
   * 监听有新版本可用事件
   * @param callback - 回调函数，接收版本号和更新说明
   * @returns 取消监听函数
   */
  onUpdaterAvailable: (callback: (data: UpdaterAvailableData) => void): (() => void) => {
    const handler = (data: UpdaterAvailableData): void => {
      callback(data);
    };
    desktop.on('updater:update-available', handler);
    return () => {
      desktop.off('updater:update-available', handler);
    };
  },
  /**
   * 监听无可用更新事件
   * @param callback - 回调函数，接收当前版本号
   * @returns 取消监听函数
   */
  onUpdaterNotAvailable: (callback: (data: UpdaterNotAvailableData) => void): (() => void) => {
    const handler = (data: UpdaterNotAvailableData): void => {
      callback(data);
    };
    desktop.on('updater:update-not-available', handler);
    return () => {
      desktop.off('updater:update-not-available', handler);
    };
  },
  /**
   * 监听启动自动检查更新请求事件
   * @param callback - 回调函数，接收请求时间戳
   * @returns 取消监听函数
   */
  onUpdaterStartupAutoCheckRequest: (callback: (data: UpdaterStartupAutoCheckRequestData) => void): (() => void) => {
    let active = true;
    let receivedAt: number | null = null;
    const accept = (data: UpdaterStartupAutoCheckRequestData): void => {
      if (!active || receivedAt === data.requestedAt) return;
      callback(data);
      receivedAt = data.requestedAt;
      desktop.send('updater:startup-auto-check-received', data.requestedAt);
    };
    const handler = (data: UpdaterStartupAutoCheckRequestData): void => {
      accept(data);
    };
    desktop.on('updater:startup-auto-check-request', handler);
    const replayPending = async (): Promise<void> => {
      try {
        const data = await desktop.invoke<UpdaterStartupAutoCheckRequestData | null>('updater:startup-auto-check-ready');
        if (data) accept(data);
      } catch (error) {
        console.warn('[Updater] startup request handshake failed:', error);
      }
    };
    // eslint-disable-next-line promise/prefer-await-to-then -- 订阅接口须同步返回取消函数，异步握手单独处理拒绝。
    replayPending().catch(console.error);
    return () => {
      active = false;
      desktop.off('updater:startup-auto-check-request', handler);
    };
  },
  /** ===== 剪贴板 URL 监听 API ===== */
  /**
   * 监听剪贴板中检测到的 URL
   * @param callback - 回调函数，接收 URL 数组
   * @returns 取消监听函数
   */
  onClipboardUrlsDetected: (callback: (data: ClipboardUrlsDetectedData) => void): (() => void) => {
    const handler = (data: ClipboardUrlsDetectedData): void => {
      callback(data);
    };
    desktop.on('clipboard:urls-detected', handler);
    return () => {
      desktop.off('clipboard:urls-detected', handler);
    };
  },
  /**
   * 用外部浏览器打开指定 URL
   * @param url - 要打开的 URL
   * @returns 是否成功
   */
  clipboardOpenUrl: (url: string): Promise<boolean> => desktop.invoke('clipboard:open-url', url),
  /**
   * 监听外部桌面 Agent 启动事件
   * @param callback - 收到事件时的回调，包含 agentNames 数组
   * @returns 取消订阅函数
   */
  onExternalAgentStarted: (callback: (data: ExternalAgentData) => void): (() => void) => {
    const handler = (data: ExternalAgentData): void => {
      callback(data);
    };
    desktop.on('external-agent:started', handler);
    return () => {
      desktop.off('external-agent:started', handler);
    };
  },
  /**
   * 监听外部桌面 Agent 关闭事件
   * @param callback - 收到事件时的回调，包含 agentNames 数组
   * @returns 取消订阅函数
   */
  onExternalAgentStopped: (callback: (data: ExternalAgentData) => void): (() => void) => {
    const handler = (data: ExternalAgentData): void => {
      callback(data);
    };
    desktop.on('external-agent:stopped', handler);
    return () => {
      desktop.off('external-agent:stopped', handler);
    };
  },
  /** 按需读取一页 CLI 详情，正文不会常驻状态快照。
   * @param id - 目标业务记录或请求标识。
   * @param offset - 分页或详情读取的起始偏移。
   * @returns 异步原生操作的CliDetailPage 结果。
   */
  claudeCodeEventDetail: (id: string, offset?: number): Promise<CliDetailPage> => desktop.invoke('claude-code:event:detail', id, offset),
  /** 原生桌面操作 claudeCodeStatusGet（claude-code:status:get）。
   * @returns 异步原生操作的ClaudeCodeStatusSnapshot 结果。
   */
  claudeCodeStatusGet: (): Promise<ClaudeCodeStatusSnapshot> => desktop.invoke('claude-code:status:get'),
  /** 原生桌面操作 claudeCodeHookInstall（claude-code:hook:install）。
   * @returns 异步原生操作的ClaudeCodeHookMutationResult 结果。
   */
  claudeCodeHookInstall: (): Promise<ClaudeCodeHookMutationResult> => desktop.invoke('claude-code:hook:install'),
  /** 原生桌面操作 claudeCodeHookUninstall（claude-code:hook:uninstall）。
   * @returns 异步原生操作的ClaudeCodeHookMutationResult 结果。
   */
  claudeCodeHookUninstall: (): Promise<ClaudeCodeHookMutationResult> => desktop.invoke('claude-code:hook:uninstall'),
  /** 原生桌面操作 claudeCodeEventsClear（claude-code:events:clear）。
   * @returns 异步原生操作的ClaudeCodeStatusSnapshot 结果。
   */
  claudeCodeEventsClear: (): Promise<ClaudeCodeStatusSnapshot> => desktop.invoke('claude-code:events:clear'),
  /** 原生桌面操作 claudeCodeSessionsDelete（claude-code:sessions:delete）。
   * @param sessionIds - 需要处理的会话标识列表。
   * @returns 异步原生操作的ClaudeCodeStatusSnapshot 结果。
   */
  claudeCodeSessionsDelete: (sessionIds: string[]): Promise<ClaudeCodeStatusSnapshot> => desktop.invoke('claude-code:sessions:delete', sessionIds),
  /** 原生桌面操作 claudeCodePermissionResolve（claude-code:permission:resolve）。
   * @param sessionId - 目标会话的唯一标识。
   * @param decision - 用户对本次请求的授权决定。
   * @returns 异步原生操作的ClaudeCodeStatusSnapshot 结果。
   */
  claudeCodePermissionResolve: (sessionId: string, decision: 'allow' | 'always' | 'deny'): Promise<ClaudeCodeStatusSnapshot> => desktop.invoke('claude-code:permission:resolve', sessionId, decision),
  /** 原生桌面操作 onClaudeCodeStatusUpdated。
   * @param callback - 接收对应原生事件业务数据的回调。
   * @returns 本次操作的事件取消订阅函数。
   */
  onClaudeCodeStatusUpdated: (callback: (snapshot: ClaudeCodeStatusSnapshot) => void): (() => void) => subscribeCliStatus('claude-code:status-updated', 'claude-code:status:get', callback),
  /** 按需读取一页 CLI 详情，正文不会常驻状态快照。
   * @param id - 目标业务记录或请求标识。
   * @param offset - 分页或详情读取的起始偏移。
   * @returns 异步原生操作的CliDetailPage 结果。
   */
  codexEventDetail: (id: string, offset?: number): Promise<CliDetailPage> => desktop.invoke('codex:event:detail', id, offset),
  /** 原生桌面操作 codexStatusGet（codex:status:get）。
   * @returns 异步原生操作的CodexStatusSnapshot 结果。
   */
  codexStatusGet: (): Promise<CodexStatusSnapshot> => desktop.invoke('codex:status:get'),
  /** 原生桌面操作 codexMonitorEnable（codex:monitor:enable）。
   * @returns 异步原生操作的CodexMonitorMutationResult 结果。
   */
  codexMonitorEnable: (): Promise<CodexMonitorMutationResult> => desktop.invoke('codex:monitor:enable'),
  /** 原生桌面操作 codexMonitorDisable（codex:monitor:disable）。
   * @returns 异步原生操作的CodexMonitorMutationResult 结果。
   */
  codexMonitorDisable: (): Promise<CodexMonitorMutationResult> => desktop.invoke('codex:monitor:disable'),
  /** 原生桌面操作 codexEventsClear（codex:events:clear）。
   * @returns 异步原生操作的CodexStatusSnapshot 结果。
   */
  codexEventsClear: (): Promise<CodexStatusSnapshot> => desktop.invoke('codex:events:clear'),
  /** 原生桌面操作 codexSessionsDelete（codex:sessions:delete）。
   * @param sessionIds - 需要处理的会话标识列表。
   * @returns 异步原生操作的CodexStatusSnapshot 结果。
   */
  codexSessionsDelete: (sessionIds: string[]): Promise<CodexStatusSnapshot> => desktop.invoke('codex:sessions:delete', sessionIds),
  /** 原生桌面操作 onCodexStatusUpdated。
   * @param callback - 接收对应原生事件业务数据的回调。
   * @returns 本次操作的事件取消订阅函数。
   */
  onCodexStatusUpdated: (callback: (snapshot: CodexStatusSnapshot) => void): (() => void) => subscribeCliStatus('codex:status-updated', 'codex:status:get', callback),
  /** 原生桌面操作 agentUsageSnapshotGet（agent-usage:snapshot:get）。
   * @returns 异步原生操作的AgentUsageSnapshot 结果。
   */
  agentUsageSnapshotGet: (): Promise<AgentUsageSnapshot> => desktop.invoke('agent-usage:snapshot:get')
};

export default api;
