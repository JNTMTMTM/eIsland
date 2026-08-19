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

import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { LiquidOrbCanvas } from '../../../components/DynamicIslandAgentInputBall';
import { applyOrbColorsToUniforms } from '../../../components/DynamicIslandAgentInputBall/utils/color';
import { LIQUID_ORB_UNIFORM_SEED } from '../../../components/DynamicIslandAgentInputBall/config/uniformDefaults';
import useIslandStore from '../../../../store/slices';

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
  const sttOrbEnabled = useIslandStore((s) => s.aiConfig.sttOrbEnabled);
  const orbColorA = useIslandStore((s) => s.aiConfig.orbColorA);
  const orbColorB = useIslandStore((s) => s.aiConfig.orbColorB);
  const [orbReady, setOrbReady] = useState(false);
  const [orbFailed, setOrbFailed] = useState(false);

  /** 若用户自定义了颜色，生成 uniformOverrides 覆盖默认种子值 */
  const uniformOverrides = useMemo(
    () => applyOrbColorsToUniforms(LIQUID_ORB_UNIFORM_SEED, orbColorA, orbColorB),
    [orbColorA, orbColorB],
  );

  return (
    <div className="agent-voice-input-content">
      <div className="agent-voice-input-status">
        <div className="agent-voice-input-indicator">
          {!sttOrbEnabled || !orbReady || orbFailed ? (
            <>
              <span className="agent-voice-input-dot" />
              <span className="agent-voice-input-dot" />
              <span className="agent-voice-input-dot" />
            </>
          ) : null}
          {sttOrbEnabled && !orbFailed ? (
            <div className={`agent-voice-input-orb${orbReady ? ' is-ready' : ''}`}>
              <LiquidOrbCanvas
                uniformOverrides={uniformOverrides}
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
