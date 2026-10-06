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
 * @file useAgentVoiceInputRuntime.test.ts
 * @description 真实语音输入采集、ASR事件、PCM帧、声音降级及清理边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import type { SetStateAction } from 'react';
import type { StartRealtimeSttRequest, RealtimeSttSession } from '../../../../../api/ai/tencentRealtimeStt';
const leaves = vi.hoisted(() => ({
  start: vi.fn<typeof import('../../../../../api/ai/tencentRealtimeStt').startTencentRealtimeStt>()
}));
vi.mock('../../../../../api/ai/tencentRealtimeStt', () => ({
  startTencentRealtimeStt: leaves.start
}));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const native = {
  play: vi.fn<() => Promise<void>>(),
  close: vi.fn<() => Promise<void>>(),
  getMedia: vi.fn<(constraints: MediaStreamConstraints) => Promise<MediaStream>>(),
  trackStop: vi.fn<() => void>(),
  storeRead: vi.fn<(key: string) => Promise<unknown>>(),
  audio: [] as NativeAudio[],
  contexts: [] as NativeContext[],
  constructorError: false
};
interface NativeAudio {
  volume: number;
  src: string;
  play: typeof native.play;
}
/** 创建可由 new 调用的浏览器 Audio 叶对象。
 * @param src - 原生资源地址
 * @returns 原生音频对象
 */
function createNativeAudio(src: string): NativeAudio {
  const audio = {
    src,
    volume: 1,
    play: native.play
  };
  native.audio.push(audio);
  return audio;
}
class NativeContext {
  destination = {};

  processor = {
    disconnect: vi.fn<() => void>(),
    connect: vi.fn<(target: unknown) => void>(),
    onaudioprocess: null as ((event: AudioProcessingEvent) => void) | null
  };

  source = {
    connect: vi.fn<(target: unknown) => void>(),
    disconnect: vi.fn<() => void>()
  };

  close = native.close;

  /** 记录原生音频采集上下文。
   * @param options - 原生参数
   */
  constructor(public options: AudioContextOptions) {
    if (native.constructorError) throw new Error('device');
    native.contexts.push(this);
  }

  createMediaStreamSource = vi.fn<(stream: MediaStream) => NativeContext['source']>(() => this.source);

  createScriptProcessor = vi.fn<(size: number, inputs: number, outputs: number) => NativeContext['processor']>(() => this.processor);
}
let module: typeof import('../useAgentVoiceInputRuntime');
let request: StartRealtimeSttRequest;
let session: RealtimeSttSession;
let windowBoundary: {
  AudioContext?: typeof NativeContext;
  webkitAudioContext?: typeof NativeContext;
  api: {
    storeRead: typeof native.storeRead;
  };
};
let options: {
  setStatusText: ReturnType<typeof vi.fn<(value: SetStateAction<string>) => void>>;
  setTranscript: ReturnType<typeof vi.fn<(value: SetStateAction<string>) => void>>;
  transcriptRef: {
    current: string;
  };
};
const setStt = vi.fn<(text: string) => void>();
vi.mock('../../../../../store/isLandStore', () => ({
  default: {
    getState: () => ({
      setStt
    })
  }
}));
/** 执行真实采集 Hook。
 */
function run(): void {
  renderHook(module.useAgentVoiceInputRuntime, options);
}
/** 完成一次真实挂载异步启动。
 */
async function mount(): Promise<void> {
  run();
  flushHookEffects();
  await settleHook();
}
/** 调用浏览器采集回调，保持原生浮点样本格式。
 * @param samples - 原生采集样本
 */
function process(samples: Float32Array): void {
  native.contexts.at(-1)?.processor.onaudioprocess?.({
    inputBuffer: {
      getChannelData: () => samples
    }
  } as unknown as AudioProcessingEvent);
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  native.audio = [];
  native.contexts = [];
  native.constructorError = false;
  native.play.mockResolvedValue(undefined);
  native.close.mockResolvedValue(undefined);
  native.getMedia.mockResolvedValue({
    getTracks: () => [{
      stop: native.trackStop
    }]
  } as unknown as MediaStream);
  native.storeRead.mockResolvedValue(0.5);
  session = {
    pushAudioFrame: vi.fn<(frame: Int16Array) => void>(),
    stop: vi.fn<() => void>()
  };
  leaves.start.mockImplementation((value) => {
    request = value;
    return Promise.resolve(session);
  });
  options = {
    setStatusText: vi.fn(),
    setTranscript: vi.fn(),
    transcriptRef: {
      current: ''
    }
  };
  windowBoundary = {
    AudioContext: NativeContext,
    api: {
      storeRead: native.storeRead
    }
  };
  vi.stubGlobal('window', windowBoundary);
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: native.getMedia
    }
  });
  vi.stubGlobal('Audio', vi.fn(createNativeAudio));
  vi.stubGlobal('localStorage', {
    getItem: () => 'token'
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16));
  module = await import('../useAgentVoiceInputRuntime');
});
afterEach(() => {
  unmountHook();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('useAgentVoiceInputRuntime true microphone lifecycle', () => {
  it('uses actual volume, native audio constraints and frame conversion, then releases all resources', async () => {
    await mount();
    expect(native.audio[0]).toMatchObject({
      src: '../audio/AGENT.wav',
      volume: 0.25
    });
    expect(request).toMatchObject({
      token: 'token',
      language: 'zh-CN'
    });
    expect(native.getMedia).toHaveBeenCalledWith(expect.objectContaining({
      video: false,
      audio: expect.objectContaining({
        sampleRate: 16000,
        channelCount: 1
      }) as unknown
    }));
    expect(native.contexts[0]?.options).toEqual({
      sampleRate: 16000
    });
    process(new Float32Array());
    process(new Float32Array(100).fill(-1));
    process(new Float32Array(220).fill(1));
    expect(session.pushAudioFrame).toHaveBeenCalledWith(expect.any(Int16Array));
    const frame = vi.mocked(session.pushAudioFrame).mock.calls[0]?.[0];
    expect(frame?.length).toBe(320);
    expect(frame?.[0]).toBe(-32768);
    expect(frame?.[319]).toBe(32767);
    const processor = native.contexts[0]?.processor;
    unmountHook();
    expect(processor?.disconnect).toHaveBeenCalledOnce();
    expect(native.contexts[0]?.source.disconnect).toHaveBeenCalledOnce();
    expect(native.close).toHaveBeenCalledOnce();
    expect(native.trackStop).toHaveBeenCalledOnce();
    expect(session.stop).toHaveBeenCalledOnce();
    processor?.onaudioprocess?.({} as AudioProcessingEvent);
    expect(session.pushAudioFrame).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('ready/partial/final/error/close callbacks preserve transcript and ignore callbacks after cleanup', async () => {
    await mount();
    request.onOpen?.();
    request.onEvent({
      type: 'ready',
      text: ''
    });
    expect(options.setStatusText).toHaveBeenLastCalledWith('正在聆听…');
    request.onEvent({
      type: 'partial',
      text: 'live'
    });
    expect(options.transcriptRef.current).toBe('live');
    request.onEvent({
      type: 'partial',
      text: ''
    });
    expect(options.transcriptRef.current).toBe('');
    request.onEvent({
      type: 'final',
      text: ''
    });
    request.onEvent({
      type: 'final',
      text: ' final text '
    });
    expect(options.setTranscript).toHaveBeenLastCalledWith(' final text ');
    request.onClose?.();
    expect(options.setStatusText).toHaveBeenLastCalledWith('识别已结束');
    request.onEvent({
      type: 'error',
      text: ''
    });
    expect(options.setStatusText).toHaveBeenLastCalledWith('实时识别失败');
    request.onEvent({
      type: 'error',
      text: 'native error'
    });
    request.onClose?.();
    expect(options.setStatusText).toHaveBeenLastCalledWith('native error');
    const count = options.setStatusText.mock.calls.length;
    unmountHook();
    request.onEvent({
      type: 'ready',
      text: ''
    });
    request.onClose?.();
    expect(options.setStatusText).toHaveBeenCalledTimes(count);
    await vi.advanceTimersByTimeAsync(16);
    expect(setStt).toHaveBeenCalledWith('final text');
  });
  it('trigger audio first and fallback rejections are handled and volume IPC synchronous failure uses one', async () => {
    native.storeRead.mockImplementation(() => {
      throw new Error('bridge');
    });
    native.play.mockRejectedValue(new Error('sound'));
    await mount();
    expect(native.play).toHaveBeenCalledTimes(2);
    expect(native.audio[0]).toMatchObject({
      src: './public/audio/AGENT.wav',
      volume: 1
    });
  });
  it('anonymous session gives login status and never connects ASR or microphone', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null
    });
    await mount();
    expect(options.setStatusText).toHaveBeenCalledWith('请先登录后使用语音识别');
    expect(leaves.start).not.toHaveBeenCalled();
    expect(native.getMedia).not.toHaveBeenCalled();
  });
  it('ASR startup rejection reports connection error without microphone acquisition', async () => {
    leaves.start.mockRejectedValue(new Error('network'));
    await mount();
    expect(options.setStatusText).toHaveBeenCalledWith('无法连接语音识别服务');
    expect(native.getMedia).not.toHaveBeenCalled();
  });
  it('ASR resolves after unmount and its returned session is stopped without microphone startup', async () => {
    const pending = deferred<RealtimeSttSession>();
    leaves.start.mockReturnValue(pending.promise);
    await mount();
    unmountHook();
    pending.resolve(session);
    await settleHook();
    expect(session.stop).toHaveBeenCalledOnce();
    expect(native.getMedia).not.toHaveBeenCalled();
  });
  it('late microphone acquisition after unmount stops every returned track without restarting audio', async () => {
    const pending = deferred<MediaStream>();
    const secondStop = vi.fn<() => void>();
    native.getMedia.mockReturnValue(pending.promise);
    await mount();
    expect(native.getMedia).toHaveBeenCalledOnce();
    unmountHook();
    pending.resolve({
      getTracks: () => [{
        stop: native.trackStop
      }, {
        stop: secondStop
      }]
    } as unknown as MediaStream);
    await settleHook();
    expect(native.trackStop).toHaveBeenCalledOnce();
    expect(secondStop).toHaveBeenCalledOnce();
    expect(session.stop).toHaveBeenCalledOnce();
    expect(native.contexts).toHaveLength(0);
    expect(options.setStatusText).not.toHaveBeenCalled();
  });
  it.each(['standard', 'webkit', 'missing'] as const)('native %s AudioContext constructor boundary', async (kind) => {
    if (kind !== 'standard') delete windowBoundary.AudioContext;
    if (kind === 'webkit') windowBoundary.webkitAudioContext = NativeContext;
    await mount();
    if (kind === 'missing') expect(options.setStatusText).toHaveBeenCalledWith('当前环境不支持音频采集');else expect(native.contexts).toHaveLength(1);
  });
  it.each(['media', 'context'] as const)('native %s failure reports permission/unavailable state and cleans any acquired stream', async (kind) => {
    if (kind === 'media') native.getMedia.mockRejectedValue(new Error('denied'));else native.constructorError = true;
    await mount();
    expect(options.setStatusText).toHaveBeenCalledWith('麦克风权限被拒绝或不可用');
    unmountHook();
    expect(session.stop).toHaveBeenCalledOnce();
    expect(native.trackStop).toHaveBeenCalledTimes(kind === 'media' ? 0 : 1);
  });
  it('native AudioContext close rejection is consumed without rejected cleanup', async () => {
    native.close.mockRejectedValue(new Error('close'));
    await mount();
    unmountHook();
    await settleHook();
    expect(native.close).toHaveBeenCalledOnce();
  });
  it('one minute cutoff stops captures and later unmount submits nonempty transcript once', async () => {
    await mount();
    request.onEvent({
      type: 'final',
      text: ' answer '
    });
    await vi.advanceTimersByTimeAsync(60000);
    expect(options.setStatusText).toHaveBeenLastCalledWith('已达最大录音时长（1分钟）');
    expect(native.trackStop).toHaveBeenCalledOnce();
    expect(session.stop).toHaveBeenCalledOnce();
    unmountHook();
    await vi.advanceTimersByTimeAsync(16);
    expect(setStt).toHaveBeenCalledWith('answer');
    expect(setStt).toHaveBeenCalledOnce();
  });
  it('a concurrent second mounted voice hook stops the module-owned first session and its old timer cannot emit', async () => {
    await mount();
    const firstSession = session;
    const firstProcessor = native.contexts[0]?.processor;
    resetHook();
    session = {
      pushAudioFrame: vi.fn(),
      stop: vi.fn()
    };
    options = {
      setStatusText: vi.fn(),
      setTranscript: vi.fn(),
      transcriptRef: {
        current: ''
      }
    };
    await mount();
    expect(firstSession.stop).toHaveBeenCalledOnce();
    expect(firstProcessor?.disconnect).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(60000);
    expect(options.setStatusText).toHaveBeenCalledOnce();
    expect(session.stop).toHaveBeenCalledOnce();
  });
});
