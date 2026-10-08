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
 * @file commonToolboxConfig.ts
 * @description 工具箱公共配置常量与类型
 * @author 鸡哥
 */

import { SvgIcon } from '../../../../../../utils/SvgIcon';

export const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';
export const TOOLBOX_NAV_ORDER_STORE_KEY = 'toolbox-nav-order';
export const TOOLBOX_HIDDEN_NAV_ORDER_STORE_KEY = 'toolbox-hidden-nav-order';
export const TOOLBOX_NAV_CONFIG_STORE_KEY = 'toolbox-nav-config';

export const TOOLBOX_SIDEBAR_KEYS = ['index', 'download', 'software', 'translate', 'fileService', 'encodingService', 'networkService', 'fileCompression', 'formatFactory'] as const;
export type ToolboxSidebarKey = (typeof TOOLBOX_SIDEBAR_KEYS)[number];

export type ToolboxIndexCardId =
  | 'download-create'
  | 'download-history'
  | 'software'
  | 'translate'
  | 'fileService-hash'
  | 'encodingService-json'
  | 'encodingService-base64'
  | 'networkService'
  | 'fileCompression-imageCompression'
  | 'fileCompression-history'
  | 'formatFactory-image'
  | 'formatFactory-video';

export interface ToolboxNavCardDef {
  id: ToolboxIndexCardId;
  labelKey: string;
  descKey: string;
  icon?: string;
  sidebar: Exclude<ToolboxSidebarKey, 'index'>;
  downloadPage?: 'create' | 'history';
  fileCompressionPage?: 'imageCompression' | 'history';
  formatFactoryPage?: 'image' | 'video';
}

export const TOOLBOX_NAV_CARDS: ToolboxNavCardDef[] = [
  {
    id: 'download-create',
    labelKey: 'maxExpand.toolbox.nav.download-create.label',
    descKey: 'maxExpand.toolbox.nav.download-create.desc',
    icon: SvgIcon.DOWNLOAD,
    sidebar: 'download',
    downloadPage: 'create',
  },
  {
    id: 'download-history',
    labelKey: 'maxExpand.toolbox.nav.download-history.label',
    descKey: 'maxExpand.toolbox.nav.download-history.desc',
    icon: SvgIcon.DOWNLOAD,
    sidebar: 'download',
    downloadPage: 'history',
  },
  {
    id: 'software',
    labelKey: 'maxExpand.toolbox.nav.software.label',
    descKey: 'maxExpand.toolbox.nav.software.desc',
    icon: SvgIcon.STAR,
    sidebar: 'software',
  },
  {
    id: 'translate',
    labelKey: 'maxExpand.toolbox.nav.translate.label',
    descKey: 'maxExpand.toolbox.nav.translate.desc',
    icon: SvgIcon.LANGUAGE,
    sidebar: 'translate',
  },
  {
    id: 'fileService-hash',
    labelKey: 'maxExpand.toolbox.nav.fileService-hash.label',
    descKey: 'maxExpand.toolbox.nav.fileService-hash.desc',
    icon: SvgIcon.TASK_MANAGER,
    sidebar: 'fileService',
  },
  {
    id: 'encodingService-json',
    labelKey: 'maxExpand.toolbox.nav.encodingService-json.label',
    descKey: 'maxExpand.toolbox.nav.encodingService-json.desc',
    icon: SvgIcon.CODING,
    sidebar: 'encodingService',
  },
  {
    id: 'encodingService-base64',
    labelKey: 'maxExpand.toolbox.nav.encodingService-base64.label',
    descKey: 'maxExpand.toolbox.nav.encodingService-base64.desc',
    icon: SvgIcon.CODING,
    sidebar: 'encodingService',
  },
  {
    id: 'networkService',
    labelKey: 'maxExpand.toolbox.nav.networkService.label',
    descKey: 'maxExpand.toolbox.nav.networkService.desc',
    icon: SvgIcon.NETWORK,
    sidebar: 'networkService',
  },
  {
    id: 'fileCompression-imageCompression',
    labelKey: 'maxExpand.toolbox.nav.fileCompression-imageCompression.label',
    descKey: 'maxExpand.toolbox.nav.fileCompression-imageCompression.desc',
    icon: SvgIcon.PLUGIN,
    sidebar: 'fileCompression',
    fileCompressionPage: 'imageCompression',
  },
  {
    id: 'fileCompression-history',
    labelKey: 'maxExpand.toolbox.nav.fileCompression-history.label',
    descKey: 'maxExpand.toolbox.nav.fileCompression-history.desc',
    icon: SvgIcon.PLUGIN,
    sidebar: 'fileCompression',
    fileCompressionPage: 'history',
  },
  {
    id: 'formatFactory-image',
    labelKey: 'maxExpand.toolbox.nav.formatFactory-image.label',
    descKey: 'maxExpand.toolbox.nav.formatFactory-image.desc',
    icon: SvgIcon.DIY,
    sidebar: 'formatFactory',
    formatFactoryPage: 'image',
  },
  {
    id: 'formatFactory-video',
    labelKey: 'maxExpand.toolbox.nav.formatFactory-video.label',
    descKey: 'maxExpand.toolbox.nav.formatFactory-video.desc',
    icon: SvgIcon.DIY,
    sidebar: 'formatFactory',
    formatFactoryPage: 'video',
  },
];

export const DEFAULT_TOOLBOX_NAV_ORDER: ToolboxIndexCardId[] = TOOLBOX_NAV_CARDS.map((card) => card.id);
export const TOOLBOX_NAV_CARD_MAP = new Map(TOOLBOX_NAV_CARDS.map((card) => [card.id, card]));
