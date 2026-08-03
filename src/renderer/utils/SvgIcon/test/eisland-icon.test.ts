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
 * @file eisland-icon.test.ts
 * @description unit test
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { SvgIcon } from '../eisland-icon';

describe('SvgIcon', () => {
  it('should contain expected keys', () => {
    expect(SvgIcon).toHaveProperty('CONTINUE');
    expect(SvgIcon).toHaveProperty('PAUSE');
    expect(SvgIcon).toHaveProperty('PREVIOUS_SONG');
    expect(SvgIcon).toHaveProperty('NEXT_SONG');
    expect(SvgIcon).toHaveProperty('HIDE');
    expect(SvgIcon).toHaveProperty('POWER_OFF');
    expect(SvgIcon).toHaveProperty('TIMER');
    expect(SvgIcon).toHaveProperty('REVERT');
    expect(SvgIcon).toHaveProperty('SCREENSHOT');
    expect(SvgIcon).toHaveProperty('TASK_MANAGER');
    expect(SvgIcon).toHaveProperty('POMODORO');
    expect(SvgIcon).toHaveProperty('MUSIC');
    expect(SvgIcon).toHaveProperty('LAYOUT');
    expect(SvgIcon).toHaveProperty('NETWORK');
    expect(SvgIcon).toHaveProperty('WEATHER');
    expect(SvgIcon).toHaveProperty('LRC');
    expect(SvgIcon).toHaveProperty('LYRIC');
    expect(SvgIcon).toHaveProperty('AI');
    expect(SvgIcon).toHaveProperty('SHORTCUT_KEY');
    expect(SvgIcon).toHaveProperty('ABOUT');
    expect(SvgIcon).toHaveProperty('MOVE');
    expect(SvgIcon).toHaveProperty('THEME');
    expect(SvgIcon).toHaveProperty('THEME_DARK');
    expect(SvgIcon).toHaveProperty('THEME_FOLLOW_SYSTEM');
    expect(SvgIcon).toHaveProperty('THEME_LIGHT');
    expect(SvgIcon).toHaveProperty('SMTC');
    expect(SvgIcon).toHaveProperty('INTERACTION');
    expect(SvgIcon).toHaveProperty('UPDATE');
    expect(SvgIcon).toHaveProperty('GUIDE');
    expect(SvgIcon).toHaveProperty('LINK');
    expect(SvgIcon).toHaveProperty('NEXT');
    expect(SvgIcon).toHaveProperty('PREVIOUS');
    expect(SvgIcon).toHaveProperty('SETTING');
    expect(SvgIcon).toHaveProperty('LANGUAGE');
    expect(SvgIcon).toHaveProperty('USER');
    expect(SvgIcon).toHaveProperty('STAR');
    expect(SvgIcon).toHaveProperty('DOWNLOAD');
    expect(SvgIcon).toHaveProperty('COPY');
    expect(SvgIcon).toHaveProperty('DIY');
    expect(SvgIcon).toHaveProperty('UNKNOWN');
    expect(SvgIcon).toHaveProperty('BOY');
    expect(SvgIcon).toHaveProperty('GIRL');
    expect(SvgIcon).toHaveProperty('PRO');
    expect(SvgIcon).toHaveProperty('VIP');
    expect(SvgIcon).toHaveProperty('ALIPAY');
    expect(SvgIcon).toHaveProperty('WECHATPAY');
    expect(SvgIcon).toHaveProperty('GITHUB');
    expect(SvgIcon).toHaveProperty('CANCEL');
    expect(SvgIcon).toHaveProperty('RETURN');
    expect(SvgIcon).toHaveProperty('MUTE');
    expect(SvgIcon).toHaveProperty('UNMUTE');
    expect(SvgIcon).toHaveProperty('VISIBLE');
    expect(SvgIcon).toHaveProperty('INVISIBLE');
    expect(SvgIcon).toHaveProperty('PHOTO_ALBUM');
    expect(SvgIcon).toHaveProperty('MOKUGYO');
    expect(SvgIcon).toHaveProperty('DEEPSEEK');
    expect(SvgIcon).toHaveProperty('EXPAND');
    expect(SvgIcon).toHaveProperty('COLLAPSE');
    expect(SvgIcon).toHaveProperty('DELETE');
    expect(SvgIcon).toHaveProperty('ATTACHMENT');
    expect(SvgIcon).toHaveProperty('RECHARGE');
    expect(SvgIcon).toHaveProperty('LOVER');
    expect(SvgIcon).toHaveProperty('CODING');
    expect(SvgIcon).toHaveProperty('VERIFIED');
    expect(SvgIcon).toHaveProperty('VOLUME');
    expect(SvgIcon).toHaveProperty('MIMO');
    expect(SvgIcon).toHaveProperty('OLLAMA');
    expect(SvgIcon).toHaveProperty('PIN_ON_TOP');
    expect(SvgIcon).toHaveProperty('BOOKMARK');
    expect(SvgIcon).toHaveProperty('BOOKMARK_ON');
    expect(SvgIcon).toHaveProperty('ANIMATION');
    expect(SvgIcon).toHaveProperty('BRIGHTNESS');
    expect(SvgIcon).toHaveProperty('DRAG');
    expect(SvgIcon).toHaveProperty('MOVE_UP');
    expect(SvgIcon).toHaveProperty('MOVE_DOWN');
    expect(SvgIcon).toHaveProperty('PLUS');
    expect(SvgIcon).toHaveProperty('MAIL');
    expect(SvgIcon).toHaveProperty('UPDATE_TIME');
    expect(SvgIcon).toHaveProperty('PLUGIN');
    expect(SvgIcon).toHaveProperty('MINIMAX');
    expect(SvgIcon).toHaveProperty('BREAK');
    expect(SvgIcon).toHaveProperty('PROLONGED_SITTING');
    expect(SvgIcon).toHaveProperty('DRINKING_WATER');
    expect(SvgIcon).toHaveProperty('SWITCHING');
    expect(SvgIcon).toHaveProperty('SOUND');
    expect(SvgIcon).toHaveProperty('NOTIFICATION');
    expect(SvgIcon).toHaveProperty('CHECKED');
    expect(SvgIcon).toHaveProperty('FILTER');
    expect(SvgIcon).toHaveProperty('FIRE');
    expect(SvgIcon).toHaveProperty('STOCK_CHOOSE');
    expect(SvgIcon).toHaveProperty('SEARCH');
    expect(SvgIcon).toHaveProperty('WEBSITE');
    expect(SvgIcon).toHaveProperty('DOCS');
    expect(SvgIcon).toHaveProperty('DEVELOPER');
    expect(SvgIcon).toHaveProperty('MICROSOFT');
    expect(SvgIcon).toHaveProperty('GITEE');
    expect(SvgIcon).toHaveProperty('WECHAT');
    expect(SvgIcon).toHaveProperty('QQ');
    expect(SvgIcon).toHaveProperty('INFORMATION');
    expect(SvgIcon).toHaveProperty('KOOK');
    expect(SvgIcon).toHaveProperty('MEMO');
    expect(SvgIcon).toHaveProperty('VIDEO');
    expect(SvgIcon).toHaveProperty('BILIBILI');
  });

  it('all values should be strings starting with ./svg/ and ending with .svg', () => {
    Object.entries(SvgIcon).forEach(([, value]) => {
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^\.\/svg\/.+\.svg$/);
    });
  });

  it('VIP and PRO should point to the same SVG path', () => {
    expect(SvgIcon.VIP).toBe(SvgIcon.PRO);
    expect(SvgIcon.VIP).toBe('./svg/PRO.svg');
  });

  it('should not contain any undefined icon paths', () => {
    Object.entries(SvgIcon).forEach(([key, value]) => {
      expect(value).toBeDefined();
    });
  });
});
