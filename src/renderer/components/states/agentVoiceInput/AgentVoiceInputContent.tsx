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
 * @file AgentVoiceInputContent.tsx
 * @description Agent 语音输入状态内容组件 — 用于识别用户语音
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import '../../../styles/agentVoiceInput/agentVoiceInput.css';

/**
 * Agent 语音输入状态内容组件
 * @description 显示语音识别相关内容，与灵动岛歌词状态尺寸一致（500×42）
 */
export function AgentVoiceInputContent(): ReactElement {
  return (
    <div className="agent-voice-input-content">
      <div className="agent-voice-input-indicator">
        <span className="agent-voice-input-dot" />
        <span className="agent-voice-input-dot" />
        <span className="agent-voice-input-dot" />
      </div>
      <div className="agent-voice-input-text">
        <span className="agent-voice-input-label">正在聆听…</span>
      </div>
    </div>
  );
}
