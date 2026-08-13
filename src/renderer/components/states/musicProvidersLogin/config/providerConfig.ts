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
 */

/**
 * @file providerConfig.ts
 * @description 音乐提供商登录界面配置
 * @author 鸡哥
 */

import type { MusicProviderId } from '../../../../../shared/musicProviderAuth';
import { PlayerIcon } from '../../../../utils/SvgIcon/player-icon';

/** 音乐提供商登录界面静态配置 */
export interface MusicProviderLoginConfig {
  id: MusicProviderId;
  icon: string;
  nameKey: string;
  instructionKey: string;
}

/** 已接入扫码登录的音乐提供商配置 */
export const MUSIC_PROVIDER_LOGIN_CONFIGS: Record<MusicProviderId, MusicProviderLoginConfig> = {
  qishui: {
    id: 'qishui',
    icon: PlayerIcon.SODAMUSIC,
    nameKey: 'settings.musicProviderLogin.qishui.name',
    instructionKey: 'settings.musicProviderLogin.qishui.instruction',
  },
};