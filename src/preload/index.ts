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
   * 退出应用
   */
  quitApp: (): void => {
    ipcRenderer.send('app:quit');
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
