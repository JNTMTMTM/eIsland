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
 * @file hotkeyConfig.ts
 * @description 快捷键冲突检测使用的动作类型与绑定结构
 * @author 鸡哥
 */

/** 设置页现有快捷键动作标识。 */
export type HotkeyAction = 'hide' | 'quit' | 'screenshot' | 'next-song' | 'play-pause-song' | 'reset-position' | 'toggle-tray' | 'show-settings-window' | 'open-clipboard-history' | 'toggle-passthrough' | 'toggle-ui-lock' | 'agent-voice-input' | 'toggle-shape-mode';

/** 配置冲突检测所需的动作与 accelerator 绑定。 */
export interface HotkeyBinding {
  key: HotkeyAction;
  value: string;
}

export const IGNORED_HOTKEY_KEYS = ['Control', 'Alt', 'Shift', 'Meta'];

export const HOTKEY_KEY_MAP: Record<string, string> = {
  ' ': 'Space', ArrowUp: 'Up', ArrowDown: 'Down',
  ArrowLeft: 'Left', ArrowRight: 'Right',
  Escape: 'Escape', Enter: 'Return', Backspace: 'Backspace',
  Delete: 'Delete', Tab: 'Tab', Home: 'Home', End: 'End',
  PageUp: 'PageUp', PageDown: 'PageDown', Insert: 'Insert',
};
