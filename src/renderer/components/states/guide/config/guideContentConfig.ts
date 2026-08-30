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
 * @file guideContentConfig.ts
 * @description 引导页配置、卡片数据与类型
 * @author 鸡哥
 */

import type { TFunction } from 'i18next';
import { SvgIcon } from '../../../../utils/SvgIcon';

export interface GuidePage {
  icon?: string;
  imageSrc?: string;
  interactive?: 'basic' | 'music' | 'tools' | 'settings';
  actionPrompt?: 'auth';
  title: string;
  desc: string;
  tips?: { text: string }[];
}

export type MiniIslandDemo = 'scroll' | 'hover' | 'click' | 'retract';

export interface InteractionCard {
  iconSrc: string;
  title: string;
  desc: string;
  demo: MiniIslandDemo;
}

export type MiniMusicDemo = 'smtc' | 'lyrics' | 'karaoke';

export interface MusicCard {
  iconSrc: string;
  title: string;
  desc: string;
  demo: MiniMusicDemo;
}

export type MiniToolDemo = 'todo' | 'ai' | 'timer' | 'pomodoro';

export interface ToolCard {
  iconSrc: string;
  title: string;
  desc: string;
  demo: MiniToolDemo;
}

export type MiniSettingDemo = 'theme' | 'opacity' | 'position' | 'autostart' | 'shortcut';

export interface SettingCard {
  iconSrc: string;
  title: string;
  desc: string;
  demo: MiniSettingDemo;
}

/**
 * 获取示例歌词内容。
 * @param t - 国际化函数。
 * @returns 示例歌词数组。
 */
export function getSampleLyrics(t: TFunction): string[] {
  return [
    t('guide.mini.music.sampleLyrics.0', { defaultValue: '这是一句歌词示例' }),
    t('guide.mini.music.sampleLyrics.1', { defaultValue: '音乐在空中飘荡' }),
    t('guide.mini.music.sampleLyrics.2', { defaultValue: '旋律轻轻回响' }),
  ];
}

/**
 * 获取设置功能卡片列表。
 * @param t - 国际化函数。
 * @returns 设置卡片数组。
 */
export function getSettingCards(t: TFunction): SettingCard[] {
  return [
    {
      iconSrc: SvgIcon.THEME,
      title: t('guide.settingCards.theme.title', { defaultValue: '主题切换' }),
      desc: t('guide.settingCards.theme.desc', { defaultValue: '在深色、浅色和跟随系统之间自由切换。' }),
      demo: 'theme',
    },
    {
      iconSrc: SvgIcon.LAYOUT,
      title: t('guide.settingCards.opacity.title', { defaultValue: '透明度调整' }),
      desc: t('guide.settingCards.opacity.desc', { defaultValue: '自定义灵动岛的背景透明度。' }),
      demo: 'opacity',
    },
    {
      iconSrc: SvgIcon.MOVE,
      title: t('guide.settingCards.position.title', { defaultValue: '位置微调' }),
      desc: t('guide.settingCards.position.desc', { defaultValue: '微调灵动岛在屏幕顶部的水平与垂直偏移。' }),
      demo: 'position',
    },
    {
      iconSrc: SvgIcon.SHORTCUT_KEY,
      title: t('guide.settingCards.autostart.title', { defaultValue: '开机自启' }),
      desc: t('guide.settingCards.autostart.desc', { defaultValue: '设置灵动岛是否随系统启动自动运行。' }),
      demo: 'autostart',
    },
    {
      iconSrc: SvgIcon.SHORTCUT_KEY,
      title: t('guide.settingCards.shortcut.title', { defaultValue: '快捷键' }),
      desc: t('guide.settingCards.shortcut.desc', { defaultValue: '通过全局快捷键快速控制灵动岛。' }),
      demo: 'shortcut',
    },
  ];
}

/**
 * 获取实用工具卡片列表。
 * @param t - 国际化函数。
 * @returns 工具卡片数组。
 */
export function getToolCards(t: TFunction): ToolCard[] {
  return [
    {
      iconSrc: SvgIcon.TASK_MANAGER,
      title: t('guide.toolCards.todo.title', { defaultValue: '待办事项' }),
      desc: t('guide.toolCards.todo.desc', { defaultValue: '在扩展面板中管理你的待办任务清单。' }),
      demo: 'todo',
    },
    {
      iconSrc: SvgIcon.AI,
      title: t('guide.toolCards.ai.title', { defaultValue: 'AI 对话助手' }),
      desc: t('guide.toolCards.ai.desc', { defaultValue: '内置 AI 对话，随时获取智能回答与建议。' }),
      demo: 'ai',
    },
    {
      iconSrc: SvgIcon.TIMER,
      title: t('guide.toolCards.timer.title', { defaultValue: '倒数日与计时器' }),
      desc: t('guide.toolCards.timer.desc', { defaultValue: '设置倒计时或倒数日，精准跟踪重要时刻。' }),
      demo: 'timer',
    },
    {
      iconSrc: SvgIcon.POMODORO,
      title: t('guide.toolCards.pomodoro.title', { defaultValue: '番茄钟专注' }),
      desc: t('guide.toolCards.pomodoro.desc', { defaultValue: '番茄工作法，帮助你保持高效专注。' }),
      demo: 'pomodoro',
    },
  ];
}

/**
 * 获取音乐能力卡片列表。
 * @param t - 国际化函数。
 * @returns 音乐卡片数组。
 */
export function getMusicCards(t: TFunction): MusicCard[] {
  return [
    {
      iconSrc: SvgIcon.SMTC,
      title: t('guide.musicCards.smtc.title', { defaultValue: 'SMTC 自动检测' }),
      desc: t('guide.musicCards.smtc.desc', { defaultValue: '自动识别正在播放的音乐源，实时同步播放信息。' }),
      demo: 'smtc',
    },
    {
      iconSrc: SvgIcon.LRC,
      title: t('guide.musicCards.lyrics.title', { defaultValue: '歌词匹配与同步' }),
      desc: t('guide.musicCards.lyrics.desc', { defaultValue: '多源歌词自动匹配，实时滚动显示当前歌词。' }),
      demo: 'lyrics',
    },
    {
      iconSrc: SvgIcon.MUSIC,
      title: t('guide.musicCards.karaoke.title', { defaultValue: '逐字扫光模式' }),
      desc: t('guide.musicCards.karaoke.desc', { defaultValue: '支持逐字高亮的卡拉 OK 歌词显示模式。' }),
      demo: 'karaoke',
    },
  ];
}

/**
 * 获取交互演示卡片列表。
 * @param t - 国际化函数。
 * @returns 交互卡片数组。
 */
export function getInteractionCards(t: TFunction): InteractionCard[] {
  return [
    {
      iconSrc: SvgIcon.INTERACTION,
      title: t('guide.interactionCards.scroll.title', { defaultValue: '基本交互' }),
      desc: t('guide.interactionCards.scroll.desc', { defaultValue: '在灵动岛顶部滚动鼠标滚轮，切换灵动岛状态。' }),
      demo: 'scroll',
    },
    {
      iconSrc: SvgIcon.LAYOUT,
      title: t('guide.interactionCards.hover.title', { defaultValue: '悬停展开' }),
      desc: t('guide.interactionCards.hover.desc', { defaultValue: '将鼠标悬停在灵动岛上方，即可展开预览面板。' }),
      demo: 'hover',
    },
    {
      iconSrc: SvgIcon.SCREENSHOT,
      title: t('guide.interactionCards.click.title', { defaultValue: '单击操作' }),
      desc: t('guide.interactionCards.click.desc', { defaultValue: '单击灵动岛，打开完整的操作面板。' }),
      demo: 'click',
    },
    {
      iconSrc: SvgIcon.HIDE,
      title: t('guide.interactionCards.retract.title', { defaultValue: '自动收回' }),
      desc: t('guide.interactionCards.retract.desc', { defaultValue: '将鼠标移开灵动岛，自动收回至待机状态。' }),
      demo: 'retract',
    },
  ];
}

/**
 * 获取引导页内容配置。
 * @param t - 国际化函数。
 * @param showAuthPrompt - 是否展示账号引导页。
 * @returns 引导页数组。
 */
export function getGuidePages(t: TFunction, showAuthPrompt: boolean): GuidePage[] {
  const pages: GuidePage[] = [
    {
      imageSrc: './svg/eisland.svg',
      title: t('guide.welcome.title', { defaultValue: '欢迎使用 eIsland' }),
      desc: t('guide.welcome.desc', {
        defaultValue: '一款灵感来自 Apple 灵动岛的 Windows 桌面浮窗小组件，\n让你的桌面更加灵动、高效。',
      }),
    },
    {
      interactive: 'basic',
      title: t('guide.sections.basic.title', { defaultValue: '基本交互' }),
      desc: t('guide.sections.basic.desc', { defaultValue: '通过鼠标与灵动岛进行交互，解锁不同状态。' }),
    },
    {
      interactive: 'music',
      title: t('guide.sections.music.title', { defaultValue: '音乐与歌词' }),
      desc: t('guide.sections.music.desc', { defaultValue: '自动识别正在播放的音乐，实时显示同步歌词。' }),
    },
    {
      interactive: 'tools',
      title: t('guide.sections.tools.title', { defaultValue: '实用工具' }),
      desc: t('guide.sections.tools.desc', { defaultValue: '扩展面板中集成了多种实用功能。' }),
    },
    {
      interactive: 'settings',
      title: t('guide.sections.settings.title', { defaultValue: '个性化设置' }),
      desc: t('guide.sections.settings.desc', { defaultValue: '在扩展面板的设置中自定义你的灵动岛体验。' }),
    },
    {
      actionPrompt: 'auth',
      icon: SvgIcon.USER,
      title: t('guide.sections.auth.title', { defaultValue: '账号服务' }),
      desc: t('guide.sections.auth.desc', { defaultValue: '现在就登录或注册，开启跨设备同步与账号管理。' }),
      tips: [
        { text: t('guide.sections.auth.tipSync', { defaultValue: '登录后可同步账号资料。' }) },
        { text: t('guide.sections.auth.tipMode', { defaultValue: '可使用综合市场功能。' }) },
      ],
    },
  ];
  if (!showAuthPrompt) {
    return pages.filter((page) => page.actionPrompt !== 'auth');
  }
  return pages;
}
