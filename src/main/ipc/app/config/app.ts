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
 * @file app.ts
 * @description app 模块常量配置
 * @author 鸡哥
 */

/** 本地文件读取上限（字节） */
export const MAX_LOCAL_FILE_READ_BYTES = 1024 * 1024;

/** 本地命令输出上限（字节） */
export const MAX_LOCAL_CMD_OUTPUT_BYTES = 1024 * 1024;

/** Bing 搜索 URL 模板 */
export const BING_SEARCH_URL_TEMPLATE = 'https://www.bing.com/search?q=%s&form=QBLH&setmkt=zh-CN';

/** Bing 搜索备用 URL 模板 */
export const BING_SEARCH_FALLBACK_URL_TEMPLATE = 'https://cn.bing.com/search?q=%s&form=QBLH';

/** Bing 搜索结果块正则 */
export const BING_RESULT_BLOCK_PATTERN = /<li[^>]*class="[^"]*b_algo[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;

/** Bing 标题链接正则 */
export const BING_TITLE_LINK_PATTERN = /<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i;

/** Bing 摘要正则 */
export const BING_SNIPPET_PATTERN = /<(?:p|div)[^>]*class="[^"]*(?:b_lineclamp\d|b_paractl|b_algoSlug|b_caption)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/i;

/** Bing 请求 User-Agent */
export const BING_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** 灵动岛设置项注册表 */
export const ISLAND_SETTINGS_REGISTRY: Array<{ key: string; description: string; type: string }> = [
  { key: 'theme-mode', description: '主题模式 (dark/light/system)', type: 'string' },
  { key: 'island-opacity', description: '灵动岛透明度 (10-100)', type: 'number' },
  { key: 'expand-mouseleave-idle', description: 'Expand 鼠标移开自动回 idle', type: 'boolean' },
  { key: 'maxexpand-mouseleave-idle', description: 'MaxExpand 鼠标移开自动回 idle', type: 'boolean' },
  { key: 'spring-animation', description: '弹性动画开关', type: 'boolean' },
  { key: 'animation-speed', description: '动画速度 (slow/medium/fast)', type: 'string' },
  { key: 'clipboard-url-monitor-enabled', description: '剪贴板 URL 监听开关', type: 'boolean' },
  { key: 'clipboard-url-detect-mode', description: '剪贴板 URL 识别模式 (auto/strict)', type: 'string' },
  { key: 'clipboard-url-blacklist', description: '剪贴板 URL 域名黑名单', type: 'array' },
  { key: 'clipboard-url-suppress-in-url-favorites', description: '已收藏 URL 不再弹出通知', type: 'boolean' },
  { key: 'autostart-mode', description: '开机自启模式 (disabled/enabled/high-priority)', type: 'string' },
  { key: 'update-auto-prompt-enabled', description: '自动提示版本更新', type: 'boolean' },
  { key: 'update-source', description: '更新源 (cloudflare-r2/github/tencent-cos/aliyun-oss)', type: 'string' },
  { key: 'weather-alert-enabled', description: '天气预警通知', type: 'boolean' },
  { key: 'island-position-offset', description: '灵动岛位置偏移 {x, y}', type: 'object' },
  { key: 'island-position-locked', description: 'pill 模式下锁定灵动岛位置', type: 'boolean' },
  { key: 'island-display-id', description: '灵动岛显示器选择 (primary 或显示器 id)', type: 'string' },
  { key: 'island-bg-opacity', description: '背景图片透明度 (0-100)', type: 'number' },
  { key: 'island-bg-blur', description: '背景模糊度 (0-50)', type: 'number' },
  { key: 'island-bg-video-fit', description: '背景视频适配模式 (cover/contain)', type: 'string' },
  { key: 'island-bg-video-muted', description: '背景视频静音', type: 'boolean' },
  { key: 'island-bg-video-loop', description: '背景视频循环', type: 'boolean' },
  { key: 'island-bg-video-volume', description: '背景视频音量 (0-1)', type: 'number' },
  { key: 'island-bg-video-rate', description: '背景视频播放速率 (0.25-2)', type: 'number' },
  { key: 'island-bg-video-hw-decode', description: '背景视频硬件解码', type: 'boolean' },
  { key: 'island-bg-sync-system-wallpaper', description: '同步系统桌面壁纸', type: 'boolean' },
  { key: 'nav-order', description: '导航卡片顺序 {visibleOrder, hiddenOrder}', type: 'object' },
  { key: 'hide-hotkey', description: '隐藏快捷键', type: 'string' },
  { key: 'quit-hotkey', description: '退出快捷键', type: 'string' },
  { key: 'screenshot-hotkey', description: '截图快捷键', type: 'string' },
  { key: 'next-song-hotkey', description: '切歌快捷键', type: 'string' },
  { key: 'play-pause-song-hotkey', description: '暂停/播放快捷键', type: 'string' },
  { key: 'reset-position-hotkey', description: '还原位置快捷键', type: 'string' },
  { key: 'toggle-tray-hotkey', description: '切换托盘图标快捷键', type: 'string' },
  { key: 'show-settings-window-hotkey', description: '显示配置窗口快捷键', type: 'string' },
  { key: 'open-clipboard-history-hotkey', description: '打开剪贴板历史快捷键', type: 'string' },
  { key: 'toggle-passthrough-hotkey', description: '切换鼠标穿透快捷键', type: 'string' },
  { key: 'toggle-ui-lock-hotkey', description: '切换 UI 锁定快捷键', type: 'string' },
  { key: 'hide-process-list', description: '隐藏进程名单', type: 'array' },
  { key: 'lyrics-clock', description: '歌词界面时钟开关', type: 'boolean' },
  { key: 'mail-fetch-limit', description: '邮件获取数量限制', type: 'number' },
  { key: 'standalone-window-mac-controls', description: '独立窗口 Mac 风格控制按钮', type: 'boolean' },
];

/** 设置项变更广播通道映射 */
export const ISLAND_SETTING_BROADCAST_CHANNELS: Record<string, string> = {
  'theme-mode': 'theme:mode',
  'island-opacity': 'island:opacity',
  'expand-mouseleave-idle': 'island:expand-mouseleave-idle',
  'maxexpand-mouseleave-idle': 'island:maxexpand-mouseleave-idle',
  'spring-animation': 'island:spring-animation',
  'animation-speed': 'island:animation-speed',
};
