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
 * @file codex.ts
 * @description Codex CLI 状态桥接类型。
 * @author 鸡哥
 */

import type { ClaudeCodeHookMutationResult, ClaudeCodeStatusSnapshot } from './claudeCode';

export type CodexStatusSnapshot = ClaudeCodeStatusSnapshot;
export type CodexMonitorMutationResult = ClaudeCodeHookMutationResult;