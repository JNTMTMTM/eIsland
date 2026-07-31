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
 * @file settingsConfig.ts
 * @description 设置页面公共配置常量与默认值
 * @author 鸡哥
 */

import type { OverviewLayoutConfig } from '../../../../expand/components/OverviewTab';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import type { WeatherProvider, WeatherLocationPriority } from '../../../../../../store/utils/storage';

export const LYRICS_SOURCE_OPTIONS = [
  { value: 'auto', label: '自动（跟随播放器）' },
  { value: 'netease-only', label: '仅网易云' },
  { value: 'qqmusic-only', label: '仅 QQ音乐' },
  { value: 'kugou-only', label: '仅酷狗' },
  { value: 'sodamusic-only', label: '仅汽水音乐' },
  { value: 'applemusic-only', label: '仅 Apple Music' },
  { value: 'spotify-only', label: '仅 Spotify' },
  { value: 'moekoe-only', label: '仅 MoeKoe' },
  { value: 'lrclib-only', label: '仅 LRCLIB' },
];

export const WEATHER_PROVIDER_OPTIONS: Array<{ value: WeatherProvider; label: string }> = [
  { value: 'open-meteo', label: 'Open-Meteo 优先' },
  { value: 'uapi', label: 'UAPI 优先' },
  { value: 'qweather-pro', label: '和风天气优先' },
];

export const WEATHER_LOCATION_PRIORITY_OPTIONS: Array<{ value: WeatherLocationPriority; label: string }> = [
  { value: 'ip', label: 'IP 定位优先' },
  { value: 'custom', label: '自定义位置优先' },
];

export const SETTINGS_TABS = ['index', 'app', 'network', 'mail', 'weather', 'music', 'ai', 'shortcut', 'user', 'update', 'pluginMarket', 'about'] as const;
export type SettingsSidebarTabKey = (typeof SETTINGS_TABS)[number];
export type AppSettingsPageKey = 'layout-preview' | 'expand-layout' | 'maxexpand-layout' | 'album' | 'hide-process-list' | 'position' | 'theme' | 'language' | 'behavior' | 'animation' | 'url-parser' | 'clipboard-history' | 'alarm' | 'break-reminder' | 'autostart' | 'sound' | 'notification' | 'performance' | 'performance-monitor' | 'screenshot-settings';
export type WeatherSettingsPageKey = 'location' | 'provider';
export type MailSettingsPageKey = 'account' | 'imap' | 'preferences';
export type AiSettingsPageKey = 'general' | 'r1pxc' | 'ollama';
export type MusicSettingsPageKey = 'whitelist' | 'lyrics' | 'smtc';
export type MusicNavCardKey = 'music-whitelist' | 'music-lyrics' | 'music-smtc';
export type NetworkSettingsPageKey = 'timeout' | 'data-center';
export type SettingsTabLabelKey = SettingsSidebarTabKey | AppSettingsPageKey | AiSettingsPageKey | MusicNavCardKey;

export const SETTINGS_TAB_LABELS: Record<SettingsTabLabelKey, string> = {
  index: '快速导航',
  app: '软件设置',
  'layout-preview': '布局预览',
  'expand-layout': '展开布局',
  'maxexpand-layout': '全展开布局',
  album: '相册配置',
  'hide-process-list': '隐藏窗口管理',
  position: '位置校准',
  theme: '主题外观',
  language: '语言切换',
  behavior: '交互行为',
  animation: '软件动画',
  'url-parser': 'URL解析',
  'clipboard-history': '剪贴板历史',
  alarm: '闹钟配置',
  'break-reminder': '休息提醒',
  autostart: '实用工具',
  sound: '声音设置',
  notification: '通知设置',
  performance: '性能设置',
  'performance-monitor': '性能监控',
  'screenshot-settings': '截图设置',
  network: '网络配置',
  mail: '邮箱配置',
  weather: '天气配置',
  music: '歌曲设置',
  'music-whitelist': '播放器白名单',
  'music-lyrics': '歌词源',
  'music-smtc': 'SMTC',
  ai: 'AI Agent',
  general: '通用配置',
  r1pxc: 'r1pxc Agent',
  ollama: 'Ollama 本地',
  shortcut: '快捷键',
  user: '用户中心',
  update: '更新设置',
  pluginMarket: '壁纸市场',
  about: '关于软件',
};

export const SETTINGS_TAB_DESCRIPTIONS: Record<Exclude<SettingsTabLabelKey, 'index'>, string> = {
  app: '布局预览与隐藏进程规则配置',
  'layout-preview': '进入布局预览并调整左右控件展示。',
  'expand-layout': '自定义展开界面页面顺序与可见性。',
  'maxexpand-layout': '自定义全展开界面各页面的显示顺序与可见性。',
  album: '相册轮播与相册入口相关配置。',
  'hide-process-list': '管理隐藏窗口名单与自动隐藏规则。',
  position: '动态调整灵动岛位置并保存',
  theme: '切换深色、浅色或跟随系统主题。',
  language: '切换应用显示语言并即时生效。',
  behavior: '配置鼠标移开后是否自动收回。',
  animation: '灵动岛弹性动画与动画速度配置。',
  'url-parser': '配置剪贴板 URL 识别模式与黑名单。',
  'clipboard-history': '配置剪贴板历史记录能力与条数。',
  alarm: '配置闹钟提醒音、贪睡与通知行为。',
  'break-reminder': '定时休息与喝水提醒。',
  autostart: '应用控制、日志与开机启动配置。',
  sound: '音效、通知声音与音频输出配置。',
  notification: '配置灵动岛通知提醒与展示行为。',
  performance: '性能相关配置。',
  'performance-monitor': '性能监控展示与硬件状态配置。',
  'screenshot-settings': '截图相关配置。',
  network: '请求超时与网络行为设置',
  mail: '配置 IMAP 收信参数',
  weather: '天气接口优先级设置',
  music: '播放器白名单与歌词来源',
  'music-whitelist': '配置允许接入灵动岛的播放器。',
  'music-lyrics': '选择歌词来源与显示模式。',
  'music-smtc': '系统媒体传输控制相关配置。',
  ai: 'AI 服务与 Prompt 配置',
  general: '模型凭据与工作区配置。',
  r1pxc: 'r1pxc Agent 头像与个性化配置。',
  ollama: '本地 Ollama 模型与连接配置。',
  shortcut: '隐藏、关闭、截图快捷键',
  user: '登录、资料、注销等账号操作',
  update: '检查与下载软件更新',
  pluginMarket: '壁纸市场入口与壁纸管理',
  about: '版本信息与项目链接',
};

export const SETTINGS_TAB_ICONS: Partial<Record<SettingsTabLabelKey, string>> = {
  'layout-preview': SvgIcon.LAYOUT,
  'expand-layout': SvgIcon.LAYOUT,
  'maxexpand-layout': SvgIcon.LAYOUT,
  album: SvgIcon.PHOTO_ALBUM,
  'hide-process-list': SvgIcon.TASK_MANAGER,
  position: SvgIcon.MOVE,
  network: SvgIcon.NETWORK,
  mail: SvgIcon.MAIL,
  weather: SvgIcon.WEATHER,
  music: SvgIcon.LRC,
  'music-whitelist': SvgIcon.MUSIC,
  'music-lyrics': SvgIcon.LRC,
  'music-smtc': SvgIcon.SMTC,
  ai: SvgIcon.AI,
  shortcut: SvgIcon.SHORTCUT_KEY,
  update: SvgIcon.UPDATE_TIME,
  about: SvgIcon.ABOUT,
  user: SvgIcon.USER,
  theme: SvgIcon.THEME,
  language: SvgIcon.LANGUAGE,
  behavior: SvgIcon.INTERACTION,
  animation: SvgIcon.ANIMATION,
  'url-parser': SvgIcon.LINK,
  'clipboard-history': SvgIcon.COPY,
  alarm: SvgIcon.TIMER,
  'break-reminder': SvgIcon.BREAK,
  autostart: SvgIcon.CONTINUE,
  sound: SvgIcon.SOUND,
  notification: SvgIcon.NOTIFICATION,
  performance: SvgIcon.TASK_MANAGER,
  'performance-monitor': SvgIcon.TASK_MANAGER,
  'screenshot-settings': SvgIcon.SCREENSHOT,
  pluginMarket: SvgIcon.PLUGIN,
};

export const NETWORK_TIMEOUT_OPTIONS = [
  { label: '5 秒', value: 5000 },
  { label: '10 秒（默认）', value: 10000 },
  { label: '15 秒', value: 15000 },
  { label: '20 秒', value: 20000 },
  { label: '30 秒', value: 30000 },
];

export const LAYOUT_STORE_KEY = 'overview-layout';
export const DEFAULT_LAYOUT: OverviewLayoutConfig = {
  left: 'shortcuts',
  right: 'todo',
  clockStyle: 'classic',
  gradientColors: {
    start: '#7be4ff',
    middle: '#8da8ff',
    end: '#ffd28a',
  },
};

export const MAXEXPAND_NAV_LAYOUT_STORE_KEY = 'maxexpand-nav-layout';

export const EXPAND_NAV_LAYOUT_STORE_KEY = 'expand-nav-layout';

export interface ExpandNavItem {
  id: string;
  visible: boolean;
}

export type ExpandNavLayoutConfig = ExpandNavItem[];

export const EXPAND_CONFIGURABLE_TABS: string[] = ['overview', 'song', 'tools', 'translation', 'performanceMonitor'];

export const EXPAND_ALWAYS_VISIBLE_TABS: Set<string> = new Set<string>(['overview']);

export const EXPAND_TAB_LABELS: Record<string, string> = {
  overview: '总览',
  song: '歌曲',
  tools: '工具',
  translation: '翻译',
  performanceMonitor: '性能监控',
};

export const DEFAULT_EXPAND_NAV_LAYOUT: ExpandNavLayoutConfig = EXPAND_CONFIGURABLE_TABS.map((id) => ({ id, visible: true }));

/**
 * 标准化展开导航布局配置。
 * @param raw - 任意来源的原始配置。
 * @returns 合法且完整的展开导航布局配置。
 */
export function normalizeExpandNavLayoutConfig(raw: unknown): ExpandNavLayoutConfig {
  const defaults = DEFAULT_EXPAND_NAV_LAYOUT.map((item) => ({ ...item }));
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaults;
  }

  const known = new Set(EXPAND_CONFIGURABLE_TABS);
  const ordered: ExpandNavLayoutConfig = [];
  const seen = new Set<string>();

  raw.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const candidate = item as { id?: unknown; visible?: unknown };
    if (typeof candidate.id !== 'string' || !known.has(candidate.id)) return;
    if (seen.has(candidate.id)) return;
    seen.add(candidate.id);
    ordered.push({
      id: candidate.id,
      visible: EXPAND_ALWAYS_VISIBLE_TABS.has(candidate.id) || candidate.visible !== false,
    });
  });

  if (ordered.length === 0) {
    return defaults;
  }

  EXPAND_CONFIGURABLE_TABS.forEach((id) => {
    if (!seen.has(id)) {
      ordered.push({ id, visible: true });
    }
  });

  return ordered;
}

export interface MaxExpandNavItem {
  id: string;
  visible: boolean;
}

export type MaxExpandNavLayoutConfig = MaxExpandNavItem[];

export const MAXEXPAND_CONFIGURABLE_TABS: string[] = ['todo', 'urlFavorites', 'album', 'mail', 'localFileSearch', 'clipboardHistory', 'aiChat', 'memo', 'countdown', 'alarm', 'toolbox', 'miniGame', 'stock', 'cli'];

export const MAXEXPAND_ALWAYS_VISIBLE_TABS: Set<string> = new Set<string>();

export const MAXEXPAND_TAB_LABELS: Record<string, string> = {
  todo: '待办事项',
  urlFavorites: 'URL 收藏',
  album: '相册',
  mail: '邮箱',
  localFileSearch: '文件查找',
  clipboardHistory: '剪贴板',
  aiChat: 'AI 对话',
  memo: '备忘录',
  countdown: '倒数日',
  alarm: '闹钟',
  toolbox: '工具箱',
  miniGame: '小游戏',
  stock: '股票行情',
  cli: 'CLI 控制台',
};

export const DEFAULT_MAXEXPAND_NAV_LAYOUT: MaxExpandNavLayoutConfig = MAXEXPAND_CONFIGURABLE_TABS.map((id) => ({ id, visible: true }));

/**
 * 标准化最大展开导航布局配置。
 * @param raw - 任意来源的原始配置。
 * @returns 合法且完整的导航布局配置。
 */
export function normalizeMaxExpandNavLayoutConfig(raw: unknown): MaxExpandNavLayoutConfig {
  const defaults = DEFAULT_MAXEXPAND_NAV_LAYOUT.map((item) => ({ ...item }));
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaults;
  }

  const known = new Set(MAXEXPAND_CONFIGURABLE_TABS);
  const ordered: MaxExpandNavLayoutConfig = [];
  const seen = new Set<string>();

  raw.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const candidate = item as { id?: unknown; visible?: unknown };
    if (typeof candidate.id !== 'string' || !known.has(candidate.id)) return;
    if (seen.has(candidate.id)) return;
    seen.add(candidate.id);
    ordered.push({
      id: candidate.id,
      visible: candidate.visible !== false,
    });
  });

  if (ordered.length === 0) {
    return defaults;
  }

  MAXEXPAND_CONFIGURABLE_TABS.forEach((id) => {
    if (!seen.has(id)) {
      ordered.push({ id, visible: true });
    }
  });

  return ordered;
}

export const APP_SETTINGS_PAGES: AppSettingsPageKey[] = ['layout-preview', 'expand-layout', 'maxexpand-layout', 'album', 'hide-process-list', 'position', 'theme', 'language', 'behavior', 'animation', 'url-parser', 'clipboard-history', 'alarm', 'break-reminder', 'autostart', 'sound', 'notification', 'performance', 'performance-monitor', 'screenshot-settings'];
export const WEATHER_SETTINGS_PAGES: WeatherSettingsPageKey[] = ['location', 'provider'];
export const WEATHER_SETTINGS_PAGE_LABELS: Record<WeatherSettingsPageKey, string> = {
  location: '定位配置',
  provider: '接口配置',
};
export const MAIL_SETTINGS_PAGES: MailSettingsPageKey[] = ['account', 'imap', 'preferences'];
export const MAIL_SETTINGS_PAGE_LABELS: Record<MailSettingsPageKey, string> = {
  account: '账户',
  imap: 'IMAP',
  preferences: '收信设置',
};
export const AI_SETTINGS_PAGES: AiSettingsPageKey[] = ['general', 'r1pxc', 'ollama'];
export const AI_SETTINGS_PAGE_LABELS: Record<AiSettingsPageKey, string> = {
  general: '通用配置',
  r1pxc: 'r1pxc Agent',
  ollama: 'Ollama 本地',
};
export const NETWORK_SETTINGS_PAGES: NetworkSettingsPageKey[] = ['timeout', 'data-center'];
export const NETWORK_SETTINGS_PAGE_LABELS: Record<NetworkSettingsPageKey, string> = {
  timeout: '请求超时',
  'data-center': '数据中心',
};
export const MUSIC_SETTINGS_PAGES: MusicSettingsPageKey[] = ['whitelist', 'lyrics', 'smtc'];
export const MUSIC_SETTINGS_PAGE_LABELS: Record<MusicSettingsPageKey, string> = {
  whitelist: '白名单',
  lyrics: '歌词源',
  smtc: 'SMTC',
};

export interface NavCardDef {
  id: string;
  label: string;
  desc: string;
  icon?: string;
  tab: SettingsSidebarTabKey;
  appPage?: AppSettingsPageKey;
  musicPage?: MusicSettingsPageKey;
  actionId?: string;
}

export const NAV_CARDS: NavCardDef[] = [
  { id: 'user-pro', label: 'PRO功能', desc: '查看 Free 与 Pro 计划权益及当前订阅价格', icon: SvgIcon.PRO, tab: 'user', actionId: 'user-pro' },
  { id: 'user-recharge', label: '余额充值', desc: '为 AI 助手对话余额充值', icon: SvgIcon.RECHARGE, tab: 'user', actionId: 'user-recharge' },
  { id: 'user', label: SETTINGS_TAB_LABELS.user, desc: SETTINGS_TAB_DESCRIPTIONS.user, icon: SETTINGS_TAB_ICONS.user, tab: 'user' },
  { id: 'layout-preview', label: SETTINGS_TAB_LABELS['layout-preview'], desc: SETTINGS_TAB_DESCRIPTIONS['layout-preview'], icon: SETTINGS_TAB_ICONS['layout-preview'], tab: 'app', appPage: 'layout-preview' },
  { id: 'expand-layout', label: SETTINGS_TAB_LABELS['expand-layout'], desc: SETTINGS_TAB_DESCRIPTIONS['expand-layout'], icon: SETTINGS_TAB_ICONS['expand-layout'], tab: 'app', appPage: 'expand-layout' },
  { id: 'maxexpand-layout', label: SETTINGS_TAB_LABELS['maxexpand-layout'], desc: SETTINGS_TAB_DESCRIPTIONS['maxexpand-layout'], icon: SETTINGS_TAB_ICONS['maxexpand-layout'], tab: 'app', appPage: 'maxexpand-layout' },
  { id: 'album', label: SETTINGS_TAB_LABELS.album, desc: SETTINGS_TAB_DESCRIPTIONS.album, icon: SETTINGS_TAB_ICONS.album, tab: 'app', appPage: 'album' },
  { id: 'hide-process-list', label: SETTINGS_TAB_LABELS['hide-process-list'], desc: SETTINGS_TAB_DESCRIPTIONS['hide-process-list'], icon: SETTINGS_TAB_ICONS['hide-process-list'], tab: 'app', appPage: 'hide-process-list' },
  { id: 'position', label: SETTINGS_TAB_LABELS.position, desc: SETTINGS_TAB_DESCRIPTIONS.position, icon: SETTINGS_TAB_ICONS.position, tab: 'app', appPage: 'position' },
  { id: 'theme', label: SETTINGS_TAB_LABELS.theme, desc: SETTINGS_TAB_DESCRIPTIONS.theme, icon: SETTINGS_TAB_ICONS.theme, tab: 'app', appPage: 'theme' },
  { id: 'language', label: SETTINGS_TAB_LABELS.language, desc: SETTINGS_TAB_DESCRIPTIONS.language, icon: SETTINGS_TAB_ICONS.language, tab: 'app', appPage: 'language' },
  { id: 'behavior', label: SETTINGS_TAB_LABELS.behavior, desc: SETTINGS_TAB_DESCRIPTIONS.behavior, icon: SETTINGS_TAB_ICONS.behavior, tab: 'app', appPage: 'behavior' },
  { id: 'animation', label: SETTINGS_TAB_LABELS.animation, desc: SETTINGS_TAB_DESCRIPTIONS.animation, icon: SETTINGS_TAB_ICONS.animation, tab: 'app', appPage: 'animation' },
  { id: 'url-parser', label: SETTINGS_TAB_LABELS['url-parser'], desc: SETTINGS_TAB_DESCRIPTIONS['url-parser'], icon: SETTINGS_TAB_ICONS['url-parser'], tab: 'app', appPage: 'url-parser' },
  { id: 'clipboard-history', label: SETTINGS_TAB_LABELS['clipboard-history'], desc: SETTINGS_TAB_DESCRIPTIONS['clipboard-history'], icon: SETTINGS_TAB_ICONS['clipboard-history'], tab: 'app', appPage: 'clipboard-history' },
  { id: 'alarm', label: SETTINGS_TAB_LABELS.alarm, desc: SETTINGS_TAB_DESCRIPTIONS.alarm, icon: SETTINGS_TAB_ICONS.alarm, tab: 'app', appPage: 'alarm' },
  { id: 'break-reminder', label: SETTINGS_TAB_LABELS['break-reminder'], desc: SETTINGS_TAB_DESCRIPTIONS['break-reminder'], icon: SETTINGS_TAB_ICONS['break-reminder'], tab: 'app', appPage: 'break-reminder' },
  { id: 'autostart', label: SETTINGS_TAB_LABELS.autostart, desc: SETTINGS_TAB_DESCRIPTIONS.autostart, icon: SETTINGS_TAB_ICONS.autostart, tab: 'app', appPage: 'autostart' },
  { id: 'sound', label: SETTINGS_TAB_LABELS.sound, desc: SETTINGS_TAB_DESCRIPTIONS.sound, icon: SETTINGS_TAB_ICONS.sound, tab: 'app', appPage: 'sound' },
  { id: 'notification', label: SETTINGS_TAB_LABELS.notification, desc: SETTINGS_TAB_DESCRIPTIONS.notification, icon: SETTINGS_TAB_ICONS.notification, tab: 'app', appPage: 'notification' },
  { id: 'performance', label: SETTINGS_TAB_LABELS.performance, desc: SETTINGS_TAB_DESCRIPTIONS.performance, icon: SETTINGS_TAB_ICONS.performance, tab: 'app', appPage: 'performance' },
  { id: 'performance-monitor', label: SETTINGS_TAB_LABELS['performance-monitor'], desc: SETTINGS_TAB_DESCRIPTIONS['performance-monitor'], icon: SETTINGS_TAB_ICONS['performance-monitor'], tab: 'app', appPage: 'performance-monitor' },
  { id: 'screenshot-settings', label: SETTINGS_TAB_LABELS['screenshot-settings'], desc: SETTINGS_TAB_DESCRIPTIONS['screenshot-settings'], icon: SETTINGS_TAB_ICONS['screenshot-settings'], tab: 'app', appPage: 'screenshot-settings' },
  { id: 'network', label: SETTINGS_TAB_LABELS.network, desc: SETTINGS_TAB_DESCRIPTIONS.network, icon: SETTINGS_TAB_ICONS.network, tab: 'network' },
  { id: 'mail', label: SETTINGS_TAB_LABELS.mail, desc: SETTINGS_TAB_DESCRIPTIONS.mail, icon: SETTINGS_TAB_ICONS.mail, tab: 'mail' },
  { id: 'weather', label: SETTINGS_TAB_LABELS.weather, desc: SETTINGS_TAB_DESCRIPTIONS.weather, icon: SETTINGS_TAB_ICONS.weather, tab: 'weather' },
  { id: 'ai', label: SETTINGS_TAB_LABELS.ai, desc: SETTINGS_TAB_DESCRIPTIONS.ai, icon: SETTINGS_TAB_ICONS.ai, tab: 'ai' },
  { id: 'shortcut', label: SETTINGS_TAB_LABELS.shortcut, desc: SETTINGS_TAB_DESCRIPTIONS.shortcut, icon: SETTINGS_TAB_ICONS.shortcut, tab: 'shortcut' },
  { id: 'update', label: SETTINGS_TAB_LABELS.update, desc: SETTINGS_TAB_DESCRIPTIONS.update, icon: SETTINGS_TAB_ICONS.update, tab: 'update' },
  { id: 'pluginMarket', label: SETTINGS_TAB_LABELS.pluginMarket, desc: SETTINGS_TAB_DESCRIPTIONS.pluginMarket, icon: SETTINGS_TAB_ICONS.pluginMarket, tab: 'pluginMarket' },
  { id: 'about', label: SETTINGS_TAB_LABELS.about, desc: SETTINGS_TAB_DESCRIPTIONS.about, icon: SETTINGS_TAB_ICONS.about, tab: 'about' },
  { id: 'music-whitelist', label: SETTINGS_TAB_LABELS['music-whitelist'], desc: SETTINGS_TAB_DESCRIPTIONS['music-whitelist'], icon: SETTINGS_TAB_ICONS['music-whitelist'], tab: 'music', musicPage: 'whitelist' },
  { id: 'music-lyrics', label: SETTINGS_TAB_LABELS['music-lyrics'], desc: SETTINGS_TAB_DESCRIPTIONS['music-lyrics'], icon: SETTINGS_TAB_ICONS['music-lyrics'], tab: 'music', musicPage: 'lyrics' },
  { id: 'music-smtc', label: SETTINGS_TAB_LABELS['music-smtc'], desc: SETTINGS_TAB_DESCRIPTIONS['music-smtc'], icon: SETTINGS_TAB_ICONS['music-smtc'], tab: 'music', musicPage: 'smtc' },
];

export const DEFAULT_NAV_ORDER: string[] = NAV_CARDS.map((c) => c.id);
export const NAV_CARDS_MAP = new Map(NAV_CARDS.map((c) => [c.id, c]));

export interface SearchableSettingItem {
  label: string;
  desc: string;
  labelKey?: string;
  descKey?: string;
  tab: SettingsSidebarTabKey;
  appPage?: AppSettingsPageKey;
  musicPage?: MusicSettingsPageKey;
  aiPage?: AiSettingsPageKey;
  networkPage?: NetworkSettingsPageKey;
}

export const SEARCHABLE_SETTINGS: SearchableSettingItem[] = [
  // ── 软件设置 > 布局预览 ──
  { label: '总览布局预览', desc: '实时显示左右控件组合后的 Expand 态灵动岛样式，切换下方控件可即时预览。', labelKey: 'settings.app.layout.previewTitle', descKey: 'settings.app.layout.previewHint', tab: 'app', appPage: 'layout-preview' },
  { label: '控件组合', desc: '分别选择左右两侧展示的控件，切换后自动保存。', labelKey: 'settings.app.layout.widgetPickerTitle', descKey: 'settings.app.layout.widgetPickerHint', tab: 'app', appPage: 'layout-preview' },
  { label: '中间时钟样式', desc: '选择总览中间时钟区域样式，切换后自动保存。', labelKey: 'settings.app.layout.clockStyleTitle', descKey: 'settings.app.layout.clockStyleHint', tab: 'app', appPage: 'layout-preview' },
  { label: '渐变颜色编辑', desc: '选择一个基准色，自动生成渐变时钟字体。', labelKey: 'settings.app.layout.gradientEditorTitle', descKey: 'settings.app.layout.gradientEditorHint', tab: 'app', appPage: 'layout-preview' },
  { label: 'Hover 音乐背景样式', desc: '预览并选择 Hover 态歌曲界面的背景波浪效果样式。', labelKey: 'settings.app.layout.musicBgTitle', descKey: 'settings.app.layout.musicBgHint', tab: 'app', appPage: 'layout-preview' },
  // ── 软件设置 > 展开布局 ──
  { label: '展开导航预览', desc: '预览展开态底部导航点顺序，灰色表示已隐藏页面。', labelKey: 'settings.app.expandLayout.previewTitle', descKey: 'settings.app.expandLayout.previewHint', tab: 'app', appPage: 'expand-layout' },
  { label: '页面排序与可见性（展开）', desc: '拖拽调整展开态页面顺序，点击开关切换是否显示。', labelKey: 'settings.app.expandLayout.orderTitle', descKey: 'settings.app.expandLayout.orderHintStatic', tab: 'app', appPage: 'expand-layout' },
  // ── 软件设置 > 全展开布局 ──
  { label: '全展开导航预览', desc: '预览底部导航点的排列顺序，灰色表示已隐藏的页面。', labelKey: 'settings.app.maxExpandLayout.previewTitle', descKey: 'settings.app.maxExpandLayout.previewHint', tab: 'app', appPage: 'maxexpand-layout' },
  { label: '页面排序与可见性', desc: '拖拽调整页面顺序，点击开关控制页面显示或隐藏。', labelKey: 'settings.app.maxExpandLayout.orderTitle', descKey: 'settings.app.maxExpandLayout.orderHintStatic', tab: 'app', appPage: 'maxexpand-layout' },
  // ── 软件设置 > 相册 ──
  { label: '相册轮播方式', desc: '配置总览相册卡片的轮播顺序、频率、展示内容与点击行为', labelKey: 'settings.app.album.carouselTitle', descKey: 'settings.app.album.carouselHint', tab: 'app', appPage: 'album' },
  { label: '展示资源', desc: '选择总览相册卡片参与轮播的资源类型', labelKey: 'settings.app.album.filterLabel', descKey: 'settings.app.album.filterHint', tab: 'app', appPage: 'album' },
  { label: '点击卡片行为', desc: '配置点击总览相册卡片后的行为', labelKey: 'settings.app.album.clickBehaviorLabel', descKey: 'settings.app.album.clickBehaviorHint', tab: 'app', appPage: 'album' },
  { label: '自动播放与视频行为', desc: '仅影响总览相册轮播卡片，不影响相册主页面。', labelKey: 'settings.app.album.playbackTitle', descKey: 'settings.app.album.playbackHint', tab: 'app', appPage: 'album' },
  // ── 软件设置 > 隐藏窗口管理 ──
  { label: '全屏时自动隐藏', desc: '检测到任意窗口进入全屏后自动隐藏灵动岛，退出全屏后自动显示。', labelKey: 'settings.app.hideProcess.fullscreenTitle', descKey: 'settings.app.hideProcess.fullscreenHint', tab: 'app', appPage: 'hide-process-list' },
  { label: '隐藏窗口管理', desc: '当黑名单进程对应窗口处于焦点状态时，将立即隐藏灵动岛；失去焦点后自动显示。', labelKey: 'settings.app.hideProcess.title', descKey: 'settings.app.hideProcess.hint', tab: 'app', appPage: 'hide-process-list' },
  { label: '当前运行的窗口', desc: '在列表中点击可将窗口加入 / 移出黑名单，支持按进程名搜索。', labelKey: 'settings.app.hideProcess.runningTitle', descKey: 'settings.app.hideProcess.runningHint', tab: 'app', appPage: 'hide-process-list' },
  // ── 软件设置 > 位置校准 ──
  { label: '显示器选择', desc: '多显示器环境可指定灵动岛显示器。', labelKey: 'settings.app.position.displayTitle', descKey: 'settings.app.position.displayHint', tab: 'app', appPage: 'position' },
  { label: '快速微调', desc: '每次按钮点击以 10px 步进移动灵动岛位置，并自动保存。', labelKey: 'settings.app.position.quickAdjustTitle', descKey: 'settings.app.position.quickAdjustHint', tab: 'app', appPage: 'position' },
  { label: '精确偏移', desc: '手动输入水平 / 垂直偏移量（单位 px），回车或点击"应用"后生效。', labelKey: 'settings.app.position.preciseTitle', descKey: 'settings.app.position.preciseHint', tab: 'app', appPage: 'position' },
  // ── 软件设置 > 主题外观 ──
  { label: '主题模式', desc: '选择深色、浅色或跟随系统主题', labelKey: 'settings.app.theme.title', descKey: 'settings.app.theme.hint', tab: 'app', appPage: 'theme' },
  { label: '独立窗口控制按钮样式', desc: '启用后，独立窗口右上角将显示 macOS 风格三色圆点控制按钮', labelKey: 'settings.app.theme.windowControlsTitle', descKey: 'settings.app.theme.windowControlsHint', tab: 'app', appPage: 'theme' },
  { label: '壁纸背景', desc: '选择内置壁纸，或从本地导入图片 / 视频作为灵动岛背景', labelKey: 'settings.app.theme.bgCardTitle', descKey: 'settings.app.theme.bgCardSubtitle', tab: 'app', appPage: 'theme' },
  { label: '背景显示效果', desc: '调整背景的透明度与模糊度', labelKey: 'settings.app.theme.effectCardTitle', descKey: 'settings.app.theme.effectCardSubtitle', tab: 'app', appPage: 'theme' },
  { label: '视频播放', desc: '背景视频的填充、声音与播放控制', labelKey: 'settings.app.theme.videoCardTitle', descKey: 'settings.app.theme.videoCardSubtitle', tab: 'app', appPage: 'theme' },
  { label: '灵动岛透明度', desc: '数值越低越透明（10% - 100%）', labelKey: 'settings.app.theme.islandOpacityTitle', descKey: 'settings.app.theme.islandOpacityHint', tab: 'app', appPage: 'theme' },
  { label: '音乐外光圈特效', desc: '控制歌曲播放时专辑封面外圈的跑马灯/光晕动态效果。', labelKey: 'settings.app.theme.musicOuterGlowTitle', descKey: 'settings.app.theme.musicOuterGlowHint', tab: 'app', appPage: 'theme' },
  { label: '界面字体', desc: '选择灵动岛界面使用的字体', labelKey: 'settings.app.theme.uiFontTitle', descKey: 'settings.app.theme.uiFontHint', tab: 'app', appPage: 'theme' },
  { label: '歌词字体', desc: '选择歌词显示使用的字体', labelKey: 'settings.app.theme.lyricsFontTitle', descKey: 'settings.app.theme.lyricsFontHint', tab: 'app', appPage: 'theme' },
  // ── 软件设置 > 语言 ──
  { label: '显示语言', desc: '切换后将立即应用到支持多语言的界面文案', labelKey: 'settings.language.title', descKey: 'settings.language.hint', tab: 'app', appPage: 'language' },
  // ── 软件设置 > 交互行为 ──
  { label: '岛屿形态', desc: '切换灵动岛的外观形态，刘海屏贴于屏幕顶部，灵动岛为胶囊形状', labelKey: 'settings.app.behavior.shapeModeTitle', descKey: 'settings.app.behavior.shapeModeHint', tab: 'app', appPage: 'behavior' },
  { label: '鼠标移开自动收回', desc: '启用后，鼠标离开灵动岛时将自动回到空闲状态（若正在播放音乐则切到歌词态）', labelKey: 'settings.app.behavior.mouseLeaveTitle', descKey: 'settings.app.behavior.mouseLeaveHint', tab: 'app', appPage: 'behavior' },
  { label: '空闲态点击展开', desc: '启用后，鼠标悬停在灵动岛上不会自动展开，需要点击才能展开，后续交互不受影响', labelKey: 'settings.app.behavior.idleClickExpandTitle', descKey: 'settings.app.behavior.idleClickExpandHint', tab: 'app', appPage: 'behavior' },
  { label: '是否显示启动动画', desc: '开启后每次启动显示启动动画，关闭后不显示', labelKey: 'settings.app.animation.startupAnimationTitle', descKey: 'settings.app.animation.startupAnimationHint', tab: 'app', appPage: 'animation' },
  { label: '独立窗口模式', desc: '启用后，待办事项、倒数日、设置将在独立窗口中打开，而非灵动岛内', labelKey: 'settings.app.behavior.windowModeTitle', descKey: 'settings.app.behavior.windowModeHint', tab: 'app', appPage: 'behavior' },
  { label: '悬停界面截图按钮模式', desc: '配置 hover 界面的截图按钮触发选区截图或显示器截图', labelKey: 'settings.app.behavior.hoverScreenshotModeTitle', descKey: 'settings.app.behavior.hoverScreenshotModeHint', tab: 'app', appPage: 'behavior' },
  // ── 软件设置 > 动画 ──
  { label: '灵动岛弹性动画', desc: '关闭后，展开和收起动画将变得更加平滑内敛，消除弹跳感', labelKey: 'settings.app.animation.springTitle', descKey: 'settings.app.animation.springHint', tab: 'app', appPage: 'animation' },
  { label: '灵动岛动画速度', desc: '控制灵动岛状态切换时的过渡动画快慢', labelKey: 'settings.app.animation.animSpeedTitle', descKey: 'settings.app.animation.animSpeedHint', tab: 'app', appPage: 'animation' },
  { label: 'Expand 切换动画', desc: '启用后，展开态切换页面时将播放左右滑动过渡动画', labelKey: 'settings.app.animation.expandTabSwitchTitle', descKey: 'settings.app.animation.expandTabSwitchHint', tab: 'app', appPage: 'animation' },
  { label: 'MaxExpand 切换动画', desc: '启用后，最大展开态切换页面时将播放左右滑动过渡动画', labelKey: 'settings.app.animation.maxExpandTabSwitchTitle', descKey: 'settings.app.animation.maxExpandTabSwitchHint', tab: 'app', appPage: 'animation' },
  { label: '启动画面背景颜色', desc: '自定义启动画面的背景颜色', labelKey: 'settings.app.animation.splashBgColorTitle', descKey: 'settings.app.animation.splashBgColorHint', tab: 'app', appPage: 'animation' },
  // ── 软件设置 > URL 解析 ──
  { label: '剪贴板 URL 监听', desc: '启用后，检测到剪贴板含链接时会弹出询问通知', labelKey: 'settings.app.urlParser.title', descKey: 'settings.app.urlParser.hint', tab: 'app', appPage: 'url-parser' },
  { label: '识别项目', desc: '选择剪贴板中被识别为 URL 的匹配范围，并可在收藏界面临时静音通知。', labelKey: 'settings.app.urlParser.detectModes', descKey: 'settings.app.urlParser.detectModesHint', tab: 'app', appPage: 'url-parser' },
  { label: 'URL 黑名单（按域名）', desc: '命中黑名单域名时：单个链接不弹窗，多链接自动剔除', labelKey: 'settings.app.urlParser.blacklistTitle', descKey: 'settings.app.urlParser.blacklistHint', tab: 'app', appPage: 'url-parser' },
  // ── 软件设置 > 剪贴板历史 ──
  { label: '历史记录开关', desc: '关闭后不再追加新的剪贴板记录，已有记录会保留。', labelKey: 'settings.clipboardHistory.enabled.title', descKey: 'settings.clipboardHistory.enabled.hint', tab: 'app', appPage: 'clipboard-history' },
  { label: '最大保留条数', desc: '新记录会在前端按该条数滚动保存。', labelKey: 'settings.clipboardHistory.limit.title', descKey: 'settings.clipboardHistory.limit.hint', tab: 'app', appPage: 'clipboard-history' },
  { label: '复制后自动退出', desc: '复制历史项后自动退出最大展开；有歌曲时回到歌曲态，无歌曲时回到 idle。', labelKey: 'settings.clipboardHistory.exitMaxExpandOnCopy.title', descKey: 'settings.clipboardHistory.exitMaxExpandOnCopy.hint', tab: 'app', appPage: 'clipboard-history' },
  { label: '数据管理', desc: '可一键清空已保存的剪贴板历史记录。', labelKey: 'settings.clipboardHistory.actions.title', descKey: 'settings.clipboardHistory.actions.hint', tab: 'app', appPage: 'clipboard-history' },
  // ── 软件设置 > 闹钟 ──
  { label: '提醒音', desc: '闹钟到点时播放提示音效。', labelKey: 'settings.alarm.sound.title', descKey: 'settings.alarm.sound.hint', tab: 'app', appPage: 'alarm' },
  { label: '系统通知', desc: '闹钟触发时发送系统通知提醒。', labelKey: 'settings.alarm.notification.title', descKey: 'settings.alarm.notification.hint', tab: 'app', appPage: 'alarm' },
  { label: '贪睡时长', desc: '点击贪睡后延迟再次提醒的分钟数。', labelKey: 'settings.alarm.snooze.title', descKey: 'settings.alarm.snooze.hint', tab: 'app', appPage: 'alarm' },
  { label: '自动关闭', desc: '闹钟响铃后自动关闭的分钟数，设为"不自动关闭"则需手动操作。', labelKey: 'settings.alarm.autoDismiss.title', descKey: 'settings.alarm.autoDismiss.hint', tab: 'app', appPage: 'alarm' },
  // ── 软件设置 > 休息提醒 ──
  { label: '提醒事项', desc: '开启后，到达设定的间隔时间将弹出休息提醒通知。', labelKey: 'settings.breakReminder.listTitle', descKey: 'settings.breakReminder.listHint', tab: 'app', appPage: 'break-reminder' },
  // ── 软件设置 > 实用工具 ──
  { label: '实用工具', desc: '常用应用操作与日志工具', labelKey: 'settings.labels.autostart', descKey: 'settings.app.autostart.toolsHint', tab: 'app', appPage: 'autostart' },
  { label: '开机自启', desc: '设置系统启动时是否自动运行灵动岛', labelKey: 'settings.app.autostart.title', descKey: 'settings.app.autostart.hint', tab: 'app', appPage: 'autostart' },
  // ── 软件设置 > 声音设置 ──
  { label: '全局音量', desc: '影响闹钟与音效的整体输出音量。', labelKey: 'settings.sound.global.title', descKey: 'settings.sound.global.hint', tab: 'app', appPage: 'sound' },
  { label: '闹钟音量', desc: '仅影响闹钟响铃与试听音量。', labelKey: 'settings.sound.alarmVolume.title', descKey: 'settings.sound.alarmVolume.hint', tab: 'app', appPage: 'sound' },
  { label: '音效音量', desc: '影响 STT 触发音与木鱼敲击音。', labelKey: 'settings.sound.effectVolume.title', descKey: 'settings.sound.effectVolume.hint', tab: 'app', appPage: 'sound' },
  // ── 软件设置 > 通知设置 ──
  { label: '通知设置', desc: '配置灵动岛通知提醒与展示行为。', labelKey: 'settings.notification.pageTitle', descKey: 'settings.notification.pageHint', tab: 'app', appPage: 'notification' },
  { label: '通知音效', desc: '通知触发时播放一次提示音。', labelKey: 'settings.notification.sound.title', descKey: 'settings.notification.sound.hint', tab: 'app', appPage: 'notification' },
  { label: 'Agent 启动通知', desc: '检测到桌面 Agent 启动或关闭时弹出灵动岛通知。', labelKey: 'settings.notification.agentNotification.title', descKey: 'settings.notification.agentNotification.hint', tab: 'app', appPage: 'notification' },
  // ── 软件设置 > 截图设置 ──
  { label: '截图翻译语言', desc: '配置截图翻译的源语言和目标语言。', labelKey: 'settings.app.screenshotSettings.translateTitle', descKey: 'settings.app.screenshotSettings.translateHint', tab: 'app', appPage: 'screenshot-settings' },
  { label: '性能设置', desc: '性能相关配置。', labelKey: 'settings.app.performance.title', descKey: 'settings.app.performance.hint', tab: 'app', appPage: 'performance' },
  { label: '启用性能模式', desc: '启用后 MaxExpand 首次进入将延迟加载各页面，降低首次切换卡顿；关闭后使用旧版一次性加载方式。', labelKey: 'settings.app.performance.modeTitle', descKey: 'settings.app.performance.modeHint', tab: 'app', appPage: 'performance' },
  { label: '解除帧率限制', desc: '启用后将解除 Chromium 帧率上限，适用于高刷新率显示器。更改后需重启应用生效。', labelKey: 'settings.app.performance.frameRateLimitTitle', descKey: 'settings.app.performance.frameRateLimitHint', tab: 'app', appPage: 'performance' },
  // ── 软件设置 > 性能监控 ──
  { label: '性能监控', desc: '性能监控展示与硬件状态配置。', labelKey: 'settings.app.performanceMonitor.title', descKey: 'settings.app.performanceMonitor.hint', tab: 'app', appPage: 'performance-monitor' },
  { label: '监控硬件', desc: '选择性能监控图表读取的 CPU、GPU 和磁盘目标。', labelKey: 'settings.app.performanceMonitor.hardwareTitle', descKey: 'settings.app.performanceMonitor.hardwareHint', tab: 'app', appPage: 'performance-monitor' },
  { label: '图表颜色', desc: '调整 Expand 性能监控中 CPU、GPU、内存和磁盘图表颜色。', labelKey: 'settings.app.performanceMonitor.colorsTitle', descKey: 'settings.app.performanceMonitor.colorsHint', tab: 'app', appPage: 'performance-monitor' },
  // ── 网络配置 > 请求超时 ──
  { label: '请求超时时间', desc: '设置网络请求的最长等待时间，网络较差时可适当增大', labelKey: 'settings.network.timeout.title', descKey: 'settings.network.timeout.hint', tab: 'network', networkPage: 'timeout' },
  // ── 网络配置 > 数据中心 ──
  { label: '静态资源节点', desc: '所有用户默认使用 R2，PRO 用户可选择 R2/COS/OSS。', labelKey: 'settings.network.staticAssetNode.title', descKey: 'settings.network.staticAssetNode.hint', tab: 'network', networkPage: 'data-center' },
  // ── 邮箱配置 ──
  { label: '账户信息', desc: '邮箱地址用于展示与默认发件人信息。', labelKey: 'settings.mail.account.title', descKey: 'settings.mail.account.hint', tab: 'mail' },
  { label: 'IMAP', desc: '用于收信、同步收件箱和文件夹状态。', labelKey: 'settings.mail.imap.title', descKey: 'settings.mail.imap.hint', tab: 'mail' },
  { label: '收信设置', desc: '控制每次获取邮件的数量和其他收信行为。', labelKey: 'settings.mail.preferences.title', descKey: 'settings.mail.preferences.hint', tab: 'mail' },
  // ── 天气配置 ──
  { label: '定位来源优先级', desc: '选择天气定位优先使用 IP 自动定位或自定义位置', labelKey: 'settings.weather.locationPriority.title', descKey: 'settings.weather.locationPriority.hint', tab: 'weather' },
  { label: '自定义城市', desc: '仅在"自定义位置优先"生效，可先测试再保存；支持中文 / 拼音 / 英文。', labelKey: 'settings.weather.customCityTitle', descKey: 'settings.weather.customCityHint', tab: 'weather' },
  { label: '天气接口优先级', desc: '可选择优先使用 Open-Meteo 或 UAPI，失败时自动切换到另一源', labelKey: 'settings.weather.providerPriority.title', descKey: 'settings.weather.providerPriority.hint', tab: 'weather' },
  { label: '启动天气预警提醒', desc: '应用启动自动检查更新前，先请求和风天气预警并提示；确认关闭后再继续检查更新。', labelKey: 'settings.weather.alert.title', descKey: 'settings.weather.alert.hint', tab: 'weather' },
  // ── 歌曲设置 > 白名单 ──
  { label: '播放器白名单', desc: '只有白名单内的播放器才会触发歌曲信息获取', labelKey: 'settings.music.whitelist.title', descKey: 'settings.music.whitelist.hint', tab: 'music', musicPage: 'whitelist' },
  { label: '添加播放器', desc: '手动输入播放器进程名，或自动从当前 SMTC 会话中检测', labelKey: 'settings.music.whitelist.addTitle', descKey: 'settings.music.whitelist.addHint', tab: 'music', musicPage: 'whitelist' },
  // ── 歌曲设置 > 歌词源 ──
  { label: '歌词功能', desc: '关闭后不再发送歌词相关网络请求，不显示歌词，不切换到歌词状态', labelKey: 'settings.music.lyrics.enabledTitle', descKey: 'settings.music.lyrics.enabledHint', tab: 'music', musicPage: 'lyrics' },
  { label: '翻译歌词', desc: '关闭后不显示翻译歌词，不切换到翻译歌词状态', labelKey: 'settings.music.lyrics.translationTitle', descKey: 'settings.music.lyrics.translationHint', tab: 'music', musicPage: 'lyrics' },
  { label: '歌词源', desc: '自动模式根据 SMTC 检测到的播放器进程选择对应源，失败后依次尝试其他源，最后使用 LRCLIB 兜底', labelKey: 'settings.music.lyrics.title', descKey: 'settings.music.lyrics.hint', tab: 'music', musicPage: 'lyrics' },
  { label: '歌词显示', desc: '控制歌词界面的展示效果', labelKey: 'settings.music.lyrics.displayTitle', descKey: 'settings.music.lyrics.displayHint', tab: 'music', musicPage: 'lyrics' },
  { label: '歌词校准', desc: '歌词获取后延迟读取 SMTC 时间戳，修正歌词时间偏移', labelKey: 'settings.music.lyrics.calibrateTitle', descKey: 'settings.music.lyrics.calibrateHint', tab: 'music', musicPage: 'lyrics' },
  // ── 歌曲设置 > SMTC ──
  { label: 'SMTC 自动取消订阅', desc: '用于清理长时间无更新的播放会话，默认永不取消订阅', labelKey: 'settings.music.smtc.title', descKey: 'settings.music.smtc.hint', tab: 'music', musicPage: 'smtc' },
  // ── AI Agent ──
  { label: '模型凭据', desc: '用于 Agent 中转调用的自定义 API 凭据（可选）', labelKey: 'settings.ai.credentialsTitle', descKey: 'settings.ai.credentialsHint', tab: 'ai', aiPage: 'general' },
  { label: 'Agent 工作区', desc: '配置 Agent 可操作的文件目录,所有文件读写、搜索、命令执行仅限于工作区内', labelKey: 'settings.ai.workspaceTitle', descKey: 'settings.ai.workspaceHint', tab: 'ai', aiPage: 'general' },
  { label: 'r1pxc Agent 头像配置', desc: '支持拖入图片或从文件资源管理器选择，不支持 URL', labelKey: 'settings.ai.r1pxcConfigTitle', descKey: 'settings.ai.r1pxcConfigHint', tab: 'ai', aiPage: 'r1pxc' },
  { label: 'Ollama 本地模型', desc: '配置本地 Ollama 服务地址与默认模型，在模型下拉中选择 ollama 即可使用', labelKey: 'settings.ai.ollamaTitle', descKey: 'settings.ai.ollamaHint', tab: 'ai', aiPage: 'ollama' },
  // ── 快捷键 > 窗口操作 ──
  { label: '隐藏/显示快捷键', desc: '点击"修改"后按下组合键（如 Alt+X、Ctrl+Shift+H）', labelKey: 'settings.shortcut.window.toggleIsland.title', descKey: 'settings.shortcut.window.toggleIsland.hint', tab: 'shortcut' },
  { label: '关闭灵动岛快捷键', desc: '按下此快捷键将立即关闭灵动岛应用（如 Alt+Q、Ctrl+Shift+Q）', labelKey: 'settings.shortcut.window.quitApp.title', descKey: 'settings.shortcut.window.quitApp.hint', tab: 'shortcut' },
  { label: '还原默认位置快捷键', desc: '按下此快捷键将把灵动岛恢复到默认顶部居中位置', labelKey: 'settings.shortcut.window.resetPosition.title', descKey: 'settings.shortcut.window.resetPosition.hint', tab: 'shortcut' },
  { label: '隐藏/显示托盘图标快捷键', desc: '按下此快捷键将隐藏或显示系统托盘中的灵动岛图标', labelKey: 'settings.shortcut.window.toggleTray.title', descKey: 'settings.shortcut.window.toggleTray.hint', tab: 'shortcut' },
  { label: '显示配置窗口快捷键', desc: '仅在独立窗口模式下生效：按下后将打开独立配置窗口并切换到设置页', labelKey: 'settings.shortcut.window.showConfig.title', descKey: 'settings.shortcut.window.showConfig.hint', tab: 'shortcut' },
  { label: '打开剪贴板历史快捷键', desc: '按下后将打开灵动岛并直接切换到剪贴板历史界面', labelKey: 'settings.shortcut.window.openClipboardHistory.title', descKey: 'settings.shortcut.window.openClipboardHistory.hint', tab: 'shortcut' },
  { label: '切换鼠标穿透快捷键', desc: '按下此快捷键将锁定或解锁鼠标穿透状态，锁定后灵动岛不会拦截鼠标事件', labelKey: 'settings.shortcut.window.togglePassthrough.title', descKey: 'settings.shortcut.window.togglePassthrough.hint', tab: 'shortcut' },
  { label: '切换 UI 状态锁定快捷键', desc: '按下后锁定当前 UI 状态，锁定期间不会因鼠标进入/移出或自动逻辑切换状态，再次按下解锁', labelKey: 'settings.shortcut.window.toggleUiLock.title', descKey: 'settings.shortcut.window.toggleUiLock.hint', tab: 'shortcut' },
  { label: '切换形态模式快捷键', desc: '按下此快捷键将在刘海屏与灵动岛形态之间快速切换', labelKey: 'settings.shortcut.window.toggleShapeMode.title', descKey: 'settings.shortcut.window.toggleShapeMode.hint', tab: 'shortcut' },
  // ── 快捷键 > AI ──
  { label: 'Agent 语音输入快捷键', desc: '长按此快捷键将触发 Agent 语音输入，释放后自动关闭', labelKey: 'settings.shortcut.window.agentVoiceInput.title', descKey: 'settings.shortcut.window.agentVoiceInput.hint', tab: 'shortcut' },
  // ── 快捷键 > 截图 ──
  { label: '选区截图快捷键', desc: '按下此快捷键将触发截图选区流程（如 Alt+A、Ctrl+Shift+A）', labelKey: 'settings.shortcut.capture.screenshot.title', descKey: 'settings.shortcut.capture.screenshot.hint', tab: 'shortcut' },
  // ── 快捷键 > 媒体 ──
  { label: '快速切换歌曲快捷键', desc: '按下后触发系统下一曲媒体按键（仅白名单播放器生效）', labelKey: 'settings.shortcut.media.nextSong.title', descKey: 'settings.shortcut.media.nextSong.hint', tab: 'shortcut' },
  { label: '暂停/播放歌曲快捷键', desc: '按下后触发系统播放/暂停媒体按键（仅白名单播放器生效）', labelKey: 'settings.shortcut.media.playPause.title', descKey: 'settings.shortcut.media.playPause.hint', tab: 'shortcut' },
  // ── 更新设置 ──
  { label: '版本信息', desc: '查看当前版本并选择更新源,应用所有补丁包均通过该更新源下载', labelKey: 'settings.update.versionCardTitle', descKey: 'settings.update.versionCardHint', tab: 'update' },
  { label: '检查与安装', desc: '手动触发检查,有新版本时可下载安装;下载完成后点击"安装并重启"应用更新', labelKey: 'settings.update.actionCardTitle', descKey: 'settings.update.actionCardHint', tab: 'update' },
  { label: '更新提示', desc: '控制是否自动提示版本更新和公告展示策略', labelKey: 'settings.update.autoPromptTitle', descKey: 'settings.update.autoPromptHintStatic', tab: 'update' },
  { label: '引导界面', desc: '重新显示首次启动引导界面', labelKey: 'settings.update.guideCardTitle', descKey: 'settings.update.guideCardHint', tab: 'update' },
  // ── 插件市场 ──
  { label: '壁纸市场', desc: '浏览并应用社区分享的壁纸资源，支持图片和视频壁纸', labelKey: 'settings.pluginMarket.search.wallpaperTitle', descKey: 'settings.pluginMarket.search.wallpaperHint', tab: 'pluginMarket' },
  { label: '壁纸贡献', desc: '上传你的壁纸作品，分享给社区用户', labelKey: 'settings.pluginMarket.search.contributionTitle', descKey: 'settings.pluginMarket.search.contributionHint', tab: 'pluginMarket' },
  { label: '壁纸管理', desc: '查看和编辑你已贡献的壁纸作品，管理审核状态', labelKey: 'settings.pluginMarket.search.editTitle', descKey: 'settings.pluginMarket.search.editHint', tab: 'pluginMarket' },
];
