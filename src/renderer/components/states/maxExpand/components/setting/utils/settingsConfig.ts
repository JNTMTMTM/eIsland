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
export type AppSettingsPageKey = 'layout-preview' | 'album' | 'hide-process-list' | 'position' | 'theme' | 'language' | 'behavior' | 'animation' | 'url-parser' | 'clipboard-history' | 'autostart';
export type WeatherSettingsPageKey = 'location' | 'provider';
export type MailSettingsPageKey = 'account' | 'imap' | 'preferences';
export type AiSettingsPageKey = 'general' | 'r1pxc' | 'ollama';
export type MusicSettingsPageKey = 'whitelist' | 'lyrics' | 'smtc';
export type MusicNavCardKey = 'music-whitelist' | 'music-lyrics' | 'music-smtc';
export type SettingsTabLabelKey = SettingsSidebarTabKey | AppSettingsPageKey | AiSettingsPageKey | MusicNavCardKey;

export const SETTINGS_TAB_LABELS: Record<SettingsTabLabelKey, string> = {
  index: '快速导航',
  app: '软件设置',
  'layout-preview': '布局预览',
  album: '相册配置',
  'hide-process-list': '隐藏窗口管理',
  position: '位置校准',
  theme: '主题外观',
  language: '语言切换',
  behavior: '交互行为',
  animation: '软件动画',
  'url-parser': 'URL解析',
  'clipboard-history': '剪贴板历史',
  autostart: '实用工具',
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
  pluginMarket: '插件市场',
  about: '关于软件',
};

export const SETTINGS_TAB_DESCRIPTIONS: Record<Exclude<SettingsTabLabelKey, 'index'>, string> = {
  app: '布局预览与隐藏进程规则配置',
  'layout-preview': '进入布局预览并调整左右控件展示。',
  album: '相册轮播与相册入口相关配置。',
  'hide-process-list': '管理隐藏窗口名单与自动隐藏规则。',
  position: '动态调整灵动岛位置并保存',
  theme: '切换深色、浅色或跟随系统主题。',
  language: '切换应用显示语言并即时生效。',
  behavior: '配置鼠标移开后是否自动收回。',
  animation: '灵动岛弹性动画与动画速度配置。',
  'url-parser': '配置剪贴板 URL 识别模式与黑名单。',
  'clipboard-history': '配置剪贴板历史记录能力与条数。',
  autostart: '应用控制、日志与开机启动配置。',
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
  pluginMarket: '插件市场入口与安装管理（开发中）',
  about: '版本信息与项目链接',
};

export const SETTINGS_TAB_ICONS: Partial<Record<SettingsTabLabelKey, string>> = {
  'layout-preview': SvgIcon.LAYOUT,
  album: SvgIcon.PHOTO_ALBUM,
  'hide-process-list': SvgIcon.TASK_MANAGER,
  position: SvgIcon.MOVE,
  network: SvgIcon.NETWORK,
  mail: SvgIcon.MUSIC,
  weather: SvgIcon.WEATHER,
  music: SvgIcon.LRC,
  'music-whitelist': SvgIcon.MUSIC,
  'music-lyrics': SvgIcon.LRC,
  'music-smtc': SvgIcon.SMTC,
  ai: SvgIcon.AI,
  shortcut: SvgIcon.SHORTCUT_KEY,
  update: SvgIcon.REVERT,
  about: SvgIcon.ABOUT,
  user: SvgIcon.USER,
  theme: SvgIcon.THEME,
  language: SvgIcon.LANGUAGE,
  behavior: SvgIcon.INTERACTION,
  animation: SvgIcon.ANIMATION,
  'url-parser': SvgIcon.LINK,
  'clipboard-history': SvgIcon.COPY,
  autostart: SvgIcon.CONTINUE,
};

export const NETWORK_TIMEOUT_OPTIONS = [
  { label: '5 秒', value: 5000 },
  { label: '10 秒（默认）', value: 10000 },
  { label: '15 秒', value: 15000 },
  { label: '20 秒', value: 20000 },
  { label: '30 秒', value: 30000 },
];

export const LAYOUT_STORE_KEY = 'overview-layout';
export const DEFAULT_LAYOUT: OverviewLayoutConfig = { left: 'shortcuts', right: 'todo' };
export const APP_SETTINGS_PAGES: AppSettingsPageKey[] = ['layout-preview', 'album', 'hide-process-list', 'position', 'theme', 'language', 'behavior', 'animation', 'url-parser', 'clipboard-history', 'autostart'];
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
  { id: 'guide', label: '使用教程', desc: '查看灵动岛功能引导与操作说明。', icon: SvgIcon.GUIDE, tab: 'index', actionId: 'guide' },
  { id: 'layout-preview', label: SETTINGS_TAB_LABELS['layout-preview'], desc: SETTINGS_TAB_DESCRIPTIONS['layout-preview'], icon: SETTINGS_TAB_ICONS['layout-preview'], tab: 'app', appPage: 'layout-preview' },
  { id: 'album', label: SETTINGS_TAB_LABELS.album, desc: SETTINGS_TAB_DESCRIPTIONS.album, icon: SETTINGS_TAB_ICONS.album, tab: 'app', appPage: 'album' },
  { id: 'hide-process-list', label: SETTINGS_TAB_LABELS['hide-process-list'], desc: SETTINGS_TAB_DESCRIPTIONS['hide-process-list'], icon: SETTINGS_TAB_ICONS['hide-process-list'], tab: 'app', appPage: 'hide-process-list' },
  { id: 'position', label: SETTINGS_TAB_LABELS.position, desc: SETTINGS_TAB_DESCRIPTIONS.position, icon: SETTINGS_TAB_ICONS.position, tab: 'app', appPage: 'position' },
  { id: 'theme', label: SETTINGS_TAB_LABELS.theme, desc: SETTINGS_TAB_DESCRIPTIONS.theme, icon: SETTINGS_TAB_ICONS.theme, tab: 'app', appPage: 'theme' },
  { id: 'language', label: SETTINGS_TAB_LABELS.language, desc: SETTINGS_TAB_DESCRIPTIONS.language, icon: SETTINGS_TAB_ICONS.language, tab: 'app', appPage: 'language' },
  { id: 'behavior', label: SETTINGS_TAB_LABELS.behavior, desc: SETTINGS_TAB_DESCRIPTIONS.behavior, icon: SETTINGS_TAB_ICONS.behavior, tab: 'app', appPage: 'behavior' },
  { id: 'animation', label: SETTINGS_TAB_LABELS.animation, desc: SETTINGS_TAB_DESCRIPTIONS.animation, icon: SETTINGS_TAB_ICONS.animation, tab: 'app', appPage: 'animation' },
  { id: 'url-parser', label: SETTINGS_TAB_LABELS['url-parser'], desc: SETTINGS_TAB_DESCRIPTIONS['url-parser'], icon: SETTINGS_TAB_ICONS['url-parser'], tab: 'app', appPage: 'url-parser' },
  { id: 'clipboard-history', label: SETTINGS_TAB_LABELS['clipboard-history'], desc: SETTINGS_TAB_DESCRIPTIONS['clipboard-history'], icon: SETTINGS_TAB_ICONS['clipboard-history'], tab: 'app', appPage: 'clipboard-history' },
  { id: 'autostart', label: SETTINGS_TAB_LABELS.autostart, desc: SETTINGS_TAB_DESCRIPTIONS.autostart, icon: SETTINGS_TAB_ICONS.autostart, tab: 'app', appPage: 'autostart' },
  { id: 'network', label: SETTINGS_TAB_LABELS.network, desc: SETTINGS_TAB_DESCRIPTIONS.network, icon: SETTINGS_TAB_ICONS.network, tab: 'network' },
  { id: 'mail', label: SETTINGS_TAB_LABELS.mail, desc: SETTINGS_TAB_DESCRIPTIONS.mail, icon: SETTINGS_TAB_ICONS.mail, tab: 'mail' },
  { id: 'weather', label: SETTINGS_TAB_LABELS.weather, desc: SETTINGS_TAB_DESCRIPTIONS.weather, icon: SETTINGS_TAB_ICONS.weather, tab: 'weather' },
  { id: 'ai', label: SETTINGS_TAB_LABELS.ai, desc: SETTINGS_TAB_DESCRIPTIONS.ai, icon: SETTINGS_TAB_ICONS.ai, tab: 'ai' },
  { id: 'shortcut', label: SETTINGS_TAB_LABELS.shortcut, desc: SETTINGS_TAB_DESCRIPTIONS.shortcut, icon: SETTINGS_TAB_ICONS.shortcut, tab: 'shortcut' },
  { id: 'user', label: SETTINGS_TAB_LABELS.user, desc: SETTINGS_TAB_DESCRIPTIONS.user, icon: SETTINGS_TAB_ICONS.user, tab: 'user' },
  { id: 'about', label: SETTINGS_TAB_LABELS.about, desc: SETTINGS_TAB_DESCRIPTIONS.about, icon: SETTINGS_TAB_ICONS.about, tab: 'about' },
  { id: 'music-whitelist', label: SETTINGS_TAB_LABELS['music-whitelist'], desc: SETTINGS_TAB_DESCRIPTIONS['music-whitelist'], icon: SETTINGS_TAB_ICONS['music-whitelist'], tab: 'music', musicPage: 'whitelist' },
  { id: 'music-lyrics', label: SETTINGS_TAB_LABELS['music-lyrics'], desc: SETTINGS_TAB_DESCRIPTIONS['music-lyrics'], icon: SETTINGS_TAB_ICONS['music-lyrics'], tab: 'music', musicPage: 'lyrics' },
  { id: 'music-smtc', label: SETTINGS_TAB_LABELS['music-smtc'], desc: SETTINGS_TAB_DESCRIPTIONS['music-smtc'], icon: SETTINGS_TAB_ICONS['music-smtc'], tab: 'music', musicPage: 'smtc' },
];

export const DEFAULT_NAV_ORDER: string[] = NAV_CARDS.map((c) => c.id);
export const NAV_CARDS_MAP = new Map(NAV_CARDS.map((c) => [c.id, c]));
