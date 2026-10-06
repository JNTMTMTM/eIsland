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
 * @file chatRuntimeConstants.ts
 * @description AI 对话纯配置常量，不依赖运行时工具以避免初始化循环。
 * @author 鸡哥
 */

import { SvgIcon } from '../../../../../../utils/SvgIcon';
import type { AgentMode } from '../types/chatTypes';

export const CONTEXT_LIMIT_OPTIONS = [
  { value: 200_000 as const, label: '200K', proOnly: false },
  { value: 400_000 as const, label: '400K', proOnly: false },
  { value: 1_000_000 as const, label: '1M', proOnly: true },
] as const;

export const STREAM_UI_FLUSH_INTERVAL_MS = 90;
export const VISIBLE_CHAT_WINDOW_SIZE_DEFAULT = 4;
export const VISIBLE_CHAT_WINDOW_SIZE_R1PXC = 25;
export const VISIBLE_CHAT_WINDOW_STEP_DEFAULT = 4;
export const VISIBLE_CHAT_WINDOW_STEP_R1PXC = 25;

export const SETTINGS_OPEN_TAB_STORE_KEY = 'settings-open-tab';
export const SETTINGS_ABOUT_FEEDBACK_PREFILL_STORE_KEY = 'settings-about-feedback-prefill';
export const STANDALONE_WINDOW_MODE_STORE_KEY = 'standalone-window-mode';
export const LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY = 'countdown-window-mode';
export const STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY = 'standalone-window-active-tab';

export const ATTACHMENT_MAX_SIZE_BYTES = 102400;
export const ATTACHMENT_MAX_COUNT = 5;
export const ATTACHMENT_ACCEPT_EXTENSIONS = '.txt,.md,.json,.log,.csv,.xml,.yaml,.yml,.toml,.ini,.cfg,.conf,.env,.sh,.bat,.ps1,.py,.js,.ts,.jsx,.tsx,.html,.css,.scss,.less,.sql,.c,.cpp,.h,.hpp,.java,.kt,.swift,.go,.rs,.rb,.php,.lua,.diff,.patch';

export const EMPTY_GREETING_DEFAULTS = [
  '你好呀，今天想一起处理点什么？',
  '嗨，我在这儿，随时可以帮你。',
  '欢迎回来，先聊聊你现在最想解决的问题吧。',
  '今天也一起高效一点，你想从哪件事开始？',
] as const;

export type { AgentMode } from '../types/chatTypes';

export const AGENT_MODES: ReadonlyArray<{
  id: AgentMode;
  label: string;
  desc: string;
  icon: string;
  noFilter?: boolean;
  badgeIcon?: string;
}> = [
  { id: 'mihtnelis', label: 'mihtnelis', desc: '全能', icon: SvgIcon.AI },
  { id: 'r1pxc', label: 'r1pxc', desc: '女友', icon: SvgIcon.LOVER, noFilter: true, badgeIcon: SvgIcon.VERIFIED },
  { id: 'edoc', label: 'edoc', desc: 'coding', icon: SvgIcon.CODING },
] as const;
