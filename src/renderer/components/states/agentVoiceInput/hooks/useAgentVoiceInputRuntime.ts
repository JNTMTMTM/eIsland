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
 * @file useAgentVoiceInputRuntime.ts
 * @description Agent 语音输入运行时控制 Hook。
 * @author 鸡哥
 */

import { useEffect } from 'react';
import { startTencentRealtimeStt } from '../../../../api/ai/tencentRealtimeStt';
import { readLocalToken } from '../../../../utils/userAccount';
import useIslandStore from '../../../../store/isLandStore';
import {
  AGENT_VOICE_AUDIO_CONSTRAINTS,
  AGENT_VOICE_FRAME_SIZE,
  AGENT_VOICE_MAX_RECORDING_MS,
  AGENT_VOICE_STT_LANGUAGE,
} from '../config/agentVoiceInputConfig';
import { getAudioContextCtor } from '../utils/agentVoiceInputAudio';
import { pushFloat32Frames } from '../utils/agentVoiceInputPcm';
import { readEffectiveAudioVolume } from '../../../../utils/audio/volume';

interface UseAgentVoiceInputRuntimeOptions {
  setStatusText: React.Dispatch<React.SetStateAction<string>>;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
  transcriptRef: React.MutableRefObject<string>;
}

let moduleSttCleanup: (() => void) | null = null;

/**
 * @description 管理语音输入采集、ASR 会话与清理流程。
 * @param options - 语音输入运行时控制配置。
 */
export function useAgentVoiceInputRuntime(options: UseAgentVoiceInputRuntimeOptions): void {
  const { setStatusText, setTranscript, transcriptRef } = options;

  useEffect(() => {
    let active = true;
    let mediaStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let processorNode: ScriptProcessorNode | null = null;
    let pending = new Float32Array(0) as Float32Array<ArrayBufferLike>;
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
      if (moduleSttCleanup === stopAll) moduleSttCleanup = null;
    };

    if (moduleSttCleanup) {
      moduleSttCleanup();
      moduleSttCleanup = null;
    }
    moduleSttCleanup = stopAll;

    const start = async (): Promise<void> => {
      const targetVolume = await readEffectiveAudioVolume('effect').catch(() => 1);
      const triggerSound = new Audio('../audio/AGENT.wav');
      triggerSound.volume = targetVolume;
      void triggerSound.play().catch(() => {
        triggerSound.src = './public/audio/AGENT.wav';
        triggerSound.volume = targetVolume;
        void triggerSound.play().catch(() => {});
      });

      const token = readLocalToken();
      if (!token) {
        setStatusText('请先登录后使用语音识别');
        return;
      }

      try {
        sttSession = await startTencentRealtimeStt({
          token,
          language: AGENT_VOICE_STT_LANGUAGE,
          onOpen: () => {
            // WebSocket to server opened; ASR not ready yet
          },
          onClose: () => {
            if (!active) return;
            if (!hasError) {
              setStatusText('识别已结束');
            }
          },
          onEvent: (event) => {
            if (!active) return;
            if (event.type === 'ready') {
              setStatusText('正在聆听…');
              return;
            }
            if (event.type === 'error') {
              hasError = true;
              setStatusText(event.text || '实时识别失败');
              return;
            }
            if (event.type === 'partial') {
              const text = event.text || '';
              setTranscript(text);
              transcriptRef.current = text;
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

      if (!active) {
        sttSession?.stop();
        sttSession = null;
        return;
      }

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: AGENT_VOICE_AUDIO_CONSTRAINTS,
          video: false,
        });

        if (!active) return;

        const AudioContextCtor = getAudioContextCtor();
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
          const samples = new Float32Array(input.length) as Float32Array<ArrayBufferLike>;
          samples.set(input);
          pending = pushFloat32Frames({
            input: samples,
            pending,
            frameSize: AGENT_VOICE_FRAME_SIZE,
            onFrame: (pcm16) => sttSession?.pushAudioFrame(pcm16),
          });
        };

        sourceNode.connect(processorNode);
        processorNode.connect(audioContext.destination);

        autoCutoffTimer = setTimeout(() => {
          if (!active) return;
          setStatusText('已达最大录音时长（1分钟）');
          stopAll();
        }, AGENT_VOICE_MAX_RECORDING_MS);
      } catch {
        setStatusText('麦克风权限被拒绝或不可用');
      }
    };

    void start();

    return () => {
      if (autoCutoffTimer) clearTimeout(autoCutoffTimer);
      stopAll();
      const finalText = transcriptRef.current?.trim();
      if (finalText) {
        requestAnimationFrame(() => {
          useIslandStore.getState().setStt(finalText);
        });
      }
    };
  }, [setStatusText, setTranscript, transcriptRef]);
}
