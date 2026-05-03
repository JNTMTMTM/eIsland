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

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { startTencentRealtimeStt } from '../../../api/ai/tencentRealtimeStt';
import { readLocalToken } from '../../../utils/userAccount';
import useIslandStore from '../../../store/isLandStore';
import '../../../styles/agentVoiceInput/agentVoiceInput.css';

/**
 * Agent 语音输入状态内容组件
 * @description 显示语音识别相关内容，与灵动岛歌词状态尺寸一致（500×42）
 */
export function AgentVoiceInputContent(): ReactElement {
  const [transcript, setTranscript] = useState('');
  const [statusText, setStatusText] = useState('正在聆听…');
  const textRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollLeft = textRef.current.scrollWidth;
    }
  }, [transcript]);

  useEffect(() => {
    let active = true;
    let mediaStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let processorNode: ScriptProcessorNode | null = null;
    let pending = new Float32Array(0);
    let sttSession: { pushAudioFrame: (pcm16: Int16Array) => void; stop: () => void } | null = null;
    let hasError = false;
    let autoCutoffTimer: ReturnType<typeof setTimeout> | null = null;

    const stopAll = (): void => {
      active = false;
      processorNode?.disconnect();
      sourceNode?.disconnect();
      if (audioContext) {
        void audioContext.close().catch(() => {});
        audioContext = null;
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
      }
      sttSession?.stop();
      sttSession = null;
    };

    const pushPcm = (input: Float32Array): void => {
      if (!sttSession || input.length === 0) return;
      const merged = new Float32Array(pending.length + input.length);
      merged.set(pending);
      merged.set(input, pending.length);

      const frameSize = 320;
      let offset = 0;
      while (offset + frameSize <= merged.length) {
        const frame = merged.subarray(offset, offset + frameSize);
        const pcm16 = new Int16Array(frame.length);
        for (let i = 0; i < frame.length; i += 1) {
          const s = Math.max(-1, Math.min(1, frame[i]));
          pcm16[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
        }
        sttSession.pushAudioFrame(pcm16);
        offset += frameSize;
      }
      pending = merged.slice(offset);
    };

    const start = async (): Promise<void> => {
      const token = readLocalToken();
      if (!token) {
        setStatusText('请先登录后使用语音识别');
        return;
      }

      try {
        sttSession = await startTencentRealtimeStt({
          token,
          language: 'zh-CN',
          onOpen: () => {
            if (!active) return;
            setStatusText('正在聆听…');
          },
          onClose: () => {
            if (!active) return;
            if (!hasError) {
              setStatusText('识别已结束');
            }
          },
          onEvent: (event) => {
            if (!active) return;
            if (event.type === 'error') {
              hasError = true;
              setStatusText(event.text || '实时识别失败');
              return;
            }
            if (event.type === 'partial') {
              setTranscript(event.text || '');
              transcriptRef.current = event.text || '';
              return;
            }
            if (event.type === 'final' && event.text) {
              setTranscript(event.text);
              transcriptRef.current = event.text;
            }
          },
        });
      } catch {
        setStatusText('无法连接语音识别服务');
        return;
      }

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        if (!active) return;

        const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
          setStatusText('当前环境不支持音频采集');
          return;
        }

        audioContext = new AudioContextCtor({ sampleRate: 16000 });
        sourceNode = audioContext.createMediaStreamSource(mediaStream);
        processorNode = audioContext.createScriptProcessor(1024, 1, 1);
        processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
          if (!active || !sttSession) return;
          const input = event.inputBuffer.getChannelData(0);
          if (!input || input.length === 0) return;
          const samples = new Float32Array(input.length);
          samples.set(input);
          pushPcm(samples);
        };

        sourceNode.connect(processorNode);
        processorNode.connect(audioContext.destination);

        autoCutoffTimer = setTimeout(() => {
          if (!active) return;
          setStatusText('已达最大录音时长（1分钟）');
          stopAll();
        }, 60_000);
      } catch {
        setStatusText('麦克风权限被拒绝或不可用');
      }
    };

    void start();

    return () => {
      if (autoCutoffTimer) clearTimeout(autoCutoffTimer);
      stopAll();
      if (transcriptRef.current) {
        useIslandStore.getState().setStt(transcriptRef.current);
      }
    };
  }, []);

  return (
    <div className="agent-voice-input-content">
      <div className="agent-voice-input-status">
        <div className="agent-voice-input-indicator">
          <span className="agent-voice-input-dot" />
          <span className="agent-voice-input-dot" />
          <span className="agent-voice-input-dot" />
        </div>
        <span className="agent-voice-input-label">{statusText}</span>
      </div>
      <div className="agent-voice-input-text" ref={textRef}>
        <span className="agent-voice-input-transcript">{transcript || '...'}</span>
      </div>
    </div>
  );
}
