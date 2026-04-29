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
 * @description 全局 SVG 图标路径枚举
 * @author 鸡哥
 */

export const SvgIcon = {
  /** 播放 */
  CONTINUE: './svg/CONTINUE.svg',
  /** 暂停 */
  PAUSE: './svg/PAUSE.svg',
  /** 上一曲 */
  PREVIOUS_SONG: './svg/PREVIOUS_SONG.svg',
  /** 下一曲 */
  NEXT_SONG: './svg/NEXT_SONG.svg',
  /** 隐藏 */
  HIDE: './svg/HIDE.svg',
  /** 退出 */
  POWER_OFF: './svg/POWER_OFF.svg',
  /** 计时器 */
  TIMER: './svg/TIMER.svg',
  /** 重置 */
  REVERT: './svg/REVERT.svg',
  /** 截图 */
  SCREENSHOT: './svg/SCREENSHOT.svg',
  /** 任务管理器 */
  TASK_MANAGER: './svg/TASK_MANAGER.svg',
  /** 番茄钟 */
  POMODORO: './svg/POMODORO.svg',
  /** 音符 */
  MUSIC: './svg/MUSIC.svg',
  /** 布局预览 */
  LAYOUT: './svg/LAYOUT.svg',
  /** 网络 */
  NETWORK: './svg/NETWORK.svg',
  /** 天气 */
  WEATHER: './svg/WEATHER.svg',
  /** 歌词 */
  LRC: './svg/LRC.svg',
  /** AI */
  AI: './svg/AI.svg',
  /** 快捷键 */
  SHORTCUT_KEY: './svg/SHORTCUT_KEY.svg',
  /** 关于 */
  ABOUT: './svg/ABOUT.svg',
  /** 移动 */
  MOVE: './svg/MOVE.svg',
  /** 主题 */
  THEME: './svg/THEME.svg',
  /** SMTC */
  SMTC: './svg/SMTC.svg',
  /** 交互 */
  INTERACTION: './svg/INTERACTION.svg',
  /** 更新 */
  UPDATE: './svg/UPDATE.svg',
  /** 教程 */
  GUIDE: './svg/GUIDE.svg',
  /** 链接 */
  LINK: './svg/LINK.svg',
  /** 下一个 */
  NEXT: './svg/NEXT.svg',
  /** 上一个 */
  PREVIOUS: './svg/PREVIOUS.svg',
  /** 设置 */
  SETTING: './svg/SETTING.svg',
  /** 语言 */
  LANGUAGE: './svg/LANGUAGE.svg',
  /** 用户 */
  USER: './svg/USER.svg',
  /** 星星 */
  STAR: './svg/STAR.svg',
  /** 下载 */
  DOWNLOAD: './svg/DOWNLOAD.svg',
  /** 复制 */
  COPY: './svg/COPY.svg',
  /** 自定义 */
  DIY: './svg/DIY.svg',
  /** 未知 */
  UNKNOWN: './svg/UNKNOWN.svg',
  /** 男 */
  BOY: './svg/BOY.svg',
  /** 女 */
  GIRL: './svg/GIRL.svg',
  /** PRO */
  PRO: './svg/PRO.svg',
  /** VIP（别名，复用 PRO 图标） */
  VIP: './svg/PRO.svg',
  /** ALIPAY */
  ALIPAY: './svg/ALIPAY.svg',
  /** WECHATPAY */
  WECHATPAY: './svg/WECHATPAY.svg',
  /** GITHUB */
  GITHUB: './svg/GITHUB.svg',
  /** 取消 */
  CANCEL: './svg/CANCEL.svg',
  /** 返回 */
  RETURN: './svg/RETURN.svg',
  /** 静音 */
  MUTE: './svg/MUTE.svg',
  /** 取消静音 */
  UNMUTE: './svg/UNMUTE.svg',
  /** 可见 */
  VISIBLE: './svg/VISIBLE.svg',
  /** 不可见 */
  INVISIBLE: './svg/INVISIBLE.svg',
  /** 相册 */
  PHOTO_ALBUM: './svg/PHOTO_ALBUM.svg',
  /** 木鱼 */
  MOKUGYO: './svg/MOKUGYO.svg',
  /** DEEPSEEK */
  DEEPSEEK: './svg/DEEPSEEK.svg',
  /** 展开 */
  EXPAND: './svg/EXPAND.svg',
  /** 收起 */
  COLLASPE: './svg/COLLAPSE.svg',

} as const;

export type SvgIconKey = keyof typeof SvgIcon;
