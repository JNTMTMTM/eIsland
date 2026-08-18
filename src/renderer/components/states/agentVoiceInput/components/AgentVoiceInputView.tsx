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
 * @file AgentVoiceInputView.tsx
 * @description Agent 语音输入状态展示组件。
 * @author 鸡哥
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { LiquidOrbCanvas } from '../../../components/DynamicIslandAgentInputBall';

interface AgentVoiceInputViewProps {
  statusText: string;
  transcript: string;
  textRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * @description 渲染语音输入状态与转写文本。
 * @param props - 视图渲染参数。
 * @returns Agent 语音输入视图节点。
 */
export function AgentVoiceInputView(props: AgentVoiceInputViewProps): ReactElement {
  const { statusText, transcript, textRef } = props;
  const [orbReady, setOrbReady] = useState(false);
  const [orbFailed, setOrbFailed] = useState(false);

  return (
    <div className="agent-voice-input-content">
      <div className="agent-voice-input-status">
        <div className="agent-voice-input-indicator">
          {!orbReady || orbFailed ? (
            <>
              <span className="agent-voice-input-dot" />
              <span className="agent-voice-input-dot" />
              <span className="agent-voice-input-dot" />
            </>
          ) : null}
          {!orbFailed ? (
            <div className={`agent-voice-input-orb${orbReady ? ' is-ready' : ''}`}>
              <LiquidOrbCanvas
                onReady={() => setOrbReady(true)}
                onError={() => setOrbFailed(true)}
              />
            </div>
          ) : null}
        </div>
        <span className="agent-voice-input-label">{statusText}</span>
      </div>
      <div className="agent-voice-input-text" ref={textRef}>
        <span className="agent-voice-input-transcript">{transcript || '...'}</span>
      </div>
    </div>
  );
}
