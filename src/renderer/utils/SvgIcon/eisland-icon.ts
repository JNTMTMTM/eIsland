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
 * @file eisland-icon.ts
 * @description eIsland 内置 SVG 图标路径枚举
 * @author 鸡哥
 */

export const SvgIcon = {
  CONTINUE: './svg/CONTINUE.svg',
  PAUSE: './svg/PAUSE.svg',
  PREVIOUS_SONG: './svg/PREVIOUS_SONG.svg',
  NEXT_SONG: './svg/NEXT_SONG.svg',
  HIDE: './svg/HIDE.svg',
  POWER_OFF: './svg/POWER_OFF.svg',
  TIMER: './svg/TIMER.svg',
  REVERT: './svg/REVERT.svg',
  SCREENSHOT: './svg/SCREENSHOT.svg',
  TASK_MANAGER: './svg/TASK_MANAGER.svg',
  POMODORO: './svg/POMODORO.svg',
  MUSIC: './svg/MUSIC.svg',
  LAYOUT: './svg/LAYOUT.svg',
  NETWORK: './svg/NETWORK.svg',
  WEATHER: './svg/WEATHER.svg',
  LRC: './svg/LRC.svg',
  AI: './svg/AI.svg',
  SHORTCUT_KEY: './svg/SHORTCUT_KEY.svg',
  ABOUT: './svg/ABOUT.svg',
  MOVE: './svg/MOVE.svg',
  THEME: './svg/THEME.svg',
  SMTC: './svg/SMTC.svg',
  INTERACTION: './svg/INTERACTION.svg',
  UPDATE: './svg/UPDATE.svg',
  GUIDE: './svg/GUIDE.svg',
  LINK: './svg/LINK.svg',
  NEXT: './svg/NEXT.svg',
  PREVIOUS: './svg/PREVIOUS.svg',
  SETTING: './svg/SETTING.svg',
  LANGUAGE: './svg/LANGUAGE.svg',
  USER: './svg/USER.svg',
  STAR: './svg/STAR.svg',
  DOWNLOAD: './svg/DOWNLOAD.svg',
  COPY: './svg/COPY.svg',
  DIY: './svg/DIY.svg',
  UNKNOWN: './svg/UNKNOWN.svg',
  BOY: './svg/BOY.svg',
  GIRL: './svg/GIRL.svg',
  PRO: './svg/PRO.svg',
  VIP: './svg/PRO.svg',
  ALIPAY: './svg/ALIPAY.svg',
  WECHATPAY: './svg/WECHATPAY.svg',
  GITHUB: './svg/GITHUB.svg',
  CANCEL: './svg/CANCEL.svg',
  RETURN: './svg/RETURN.svg',
  MUTE: './svg/MUTE.svg',
  UNMUTE: './svg/UNMUTE.svg',
  VISIBLE: './svg/VISIBLE.svg',
  INVISIBLE: './svg/INVISIBLE.svg',
  PHOTO_ALBUM: './svg/PHOTO_ALBUM.svg',
  MOKUGYO: './svg/MOKUGYO.svg',
  DEEPSEEK: './svg/DEEPSEEK.svg',
  EXPAND: './svg/EXPAND.svg',
  COLLAPSE: './svg/COLLAPSE.svg',
  DELETE: './svg/DELETE.svg',
  ATTACHMENT: './svg/ATTACHMENT.svg',
  RECHARGE: './svg/RECHARGE.svg',
  LOVER: './svg/LOVER.svg',
  CODING: './svg/CODING.svg',
  VERIFIED: './svg/VERIFIED.svg',
} as const;

export type SvgIconKey = keyof typeof SvgIcon;
