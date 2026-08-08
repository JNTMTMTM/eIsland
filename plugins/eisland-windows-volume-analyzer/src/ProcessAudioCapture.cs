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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

using System.Runtime.InteropServices;
using System.Text.Json;

namespace eIslandVolumeAnalyzer;

/// <summary>
/// 进程音频捕获与分析引擎。
/// 通过 ActivateAudioInterfaceAsync 获取进程专属音频流，
/// 执行 FFT 频谱分析和节拍检测。
/// </summary>
internal sealed class ProcessAudioCapture : IDisposable
{
    #region 状态字段

    private volatile bool _running;
    private Thread? _captureThread;
    private uint _targetProcessId;
    private bool _includeProcessTree;

    // 分析组件
    private readonly FftProcessor _fft;

    // 音频参数
    private int _sampleRate = 48000;
    private int _channels = 2;

    // 频谱分析结果（线程安全）
    private readonly object _resultLock = new();
    private AudioAnalysisResult _result;

    // 采样缓冲区
    private float[]? _sampleBuffer;
    private int _bufferWritePos;

    #endregion

    #region Win32 事件

    private IntPtr _stopEvent = IntPtr.Zero;

    #endregion

    public ProcessAudioCapture(int fftSize = 2048)
    {
        _fft = new FftProcessor(fftSize);
        _result = AudioAnalysisResult.Empty;
    }

    /// <summary>当前分析结果（线程安全）</summary>
    public AudioAnalysisResult LatestResult
    {
        get
        {
            lock (_resultLock) return _result;
        }
    }

    /// <summary>是否正在运行</summary>
    public bool IsRunning => _running;

    /// <summary>
    /// 启动进程音频捕获
    /// </summary>
    /// <param name="processId">目标进程 ID</param>
    /// <param name="includeProcessTree">是否包含子进程音频</param>
    /// <returns>0=成功, 1=失败</returns>
    public int Start(uint processId, bool includeProcessTree = true)
    {
        if (_running) return 0;

        _targetProcessId = processId;
        _includeProcessTree = includeProcessTree;

        if (_stopEvent == IntPtr.Zero)
        {
            _stopEvent = Win32Audio.CreateEventW(IntPtr.Zero, true, false, IntPtr.Zero);
            if (_stopEvent == IntPtr.Zero) return 1;
        }
        Win32Audio.ResetEvent(_stopEvent);

        _running = true;
        _captureThread = new Thread(CaptureLoop)
        {
            IsBackground = true,
            Name = $"AudioAnalyzer-{processId}"
        };
        _captureThread.Start();

        return 0;
    }

    /// <summary>停止捕获</summary>
    public void Stop()
    {
        if (!_running) return;
        _running = false;
        if (_stopEvent != IntPtr.Zero)
            Win32Audio.SetEvent(_stopEvent);
        _captureThread?.Join(3000);
    }

    /// <summary>释放资源</summary>
    public void Dispose()
    {
        Stop();
        if (_stopEvent != IntPtr.Zero)
        {
            Win32Audio.CloseHandle(_stopEvent);
            _stopEvent = IntPtr.Zero;
        }
        ProcessAudioActivator.Cleanup();
    }

    #region 捕获主循环

    private unsafe void CaptureLoop()
    {
        IAudioClient? audioClient = null;
        IAudioCaptureClient? captureClient = null;

        try
        {
            // 初始化 COM
            Win32Audio.CoInitializeEx(IntPtr.Zero, Win32Audio.COINIT_APARTMENTTHREADED);

            // 激活进程专属音频客户端
            audioClient = ProcessAudioActivator.ActivateForProcess(_targetProcessId, _includeProcessTree);
            if (audioClient == null)
            {
                System.Diagnostics.Debug.WriteLine("[VolumeAnalyzer] Failed to activate audio client");
                return;
            }

            // 获取设备混音格式
            if (audioClient.GetMixFormat(out var mixFormat) != 0)
            {
                System.Diagnostics.Debug.WriteLine("[VolumeAnalyzer] Failed to get mix format");
                return;
            }

            _sampleRate = (int)mixFormat.nSamplesPerSec;
            _channels = mixFormat.nChannels;

            // 构建请求格式：32-bit float 立体声
            var requestFormat = WaveFormat.CreateFloatStereo((uint)_sampleRate);

            // 初始化音频客户端：共享模式 + 回环
            var sessionGuid = Guid.Empty;
            int hr = audioClient.Initialize(
                AUDCLNT_SHAREMODE.SHARED,
                (uint)AUDCLNT_STREAMFLAGS.LOOPBACK,
                0, 0,
                ref requestFormat,
                ref sessionGuid);

            if (hr != 0)
            {
                // 回退到混音格式
                requestFormat = mixFormat;
                hr = audioClient.Initialize(
                    AUDCLNT_SHAREMODE.SHARED,
                    (uint)AUDCLNT_STREAMFLAGS.LOOPBACK,
                    0, 0,
                    ref requestFormat,
                    ref sessionGuid);

                if (hr != 0)
                {
                    System.Diagnostics.Debug.WriteLine($"[VolumeAnalyzer] Initialize failed: 0x{hr:X8}");
                    return;
                }
            }

            _channels = requestFormat.nChannels;
            _sampleRate = (int)requestFormat.nSamplesPerSec;

            // 用实际采样率重建节拍检测器
            var beatDetector = new BeatDetector(_sampleRate, _fft.Size);

            // 获取缓冲区大小
            audioClient.GetBufferSize(out var bufferFrameCount);

            // 准备采样缓冲区
            int fftSize = _fft.Size;
            _sampleBuffer = new float[fftSize];
            _bufferWritePos = 0;

            // 获取捕获客户端
            var captureGuid = AudioInterfaceGuids.IID_IAudioCaptureClient;
            audioClient.GetService(ref captureGuid, out var captureObj);
            captureClient = (IAudioCaptureClient)captureObj;

            // 启动捕获
            hr = audioClient.Start();
            if (hr != 0)
            {
                System.Diagnostics.Debug.WriteLine($"[VolumeAnalyzer] Start failed: 0x{hr:X8}");
                return;
            }

            // 主循环：读取音频数据并分析
            var magnitudes = new float[fftSize / 2];

            while (_running)
            {
                // 等待数据或停止信号
                var waitResult = Win32Audio.WaitForSingleObject(_stopEvent, 10);
                if (waitResult == Win32Audio.WAIT_OBJECT_0) break;

                // 读取所有可用的音频包
                captureClient.GetNextPacketSize(out var packetFrameCount);
                while (packetFrameCount > 0)
                {
                    hr = captureClient.GetBuffer(
                        out var dataPtr,
                        out var framesAvailable,
                        out var flags,
                        out var devicePos,
                        out var qpcPos);

                    if (hr != 0) break;

                    if ((flags & (uint)AUDCLNT_BUFFERFLAGS.SILENT) == 0 && dataPtr != IntPtr.Zero)
                    {
                        // 将原始数据转换为 float 采样（取左声道）
                        int floatCount = (int)framesAvailable * _channels;
                        var span = new ReadOnlySpan<float>(dataPtr.ToPointer(), floatCount);

                        // 混合为单声道并写入缓冲区
                        WriteToBuffer(span, _channels);
                    }

                    captureClient.ReleaseBuffer(framesAvailable);
                    captureClient.GetNextPacketSize(out packetFrameCount);
                }

                // 如果缓冲区满，执行 FFT 分析
                if (_bufferWritePos >= fftSize)
                {
                    AnalyzeBuffer(magnitudes, beatDetector);
                    _bufferWritePos = 0;
                }
            }

            // 停止捕获
            audioClient.Stop();
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[VolumeAnalyzer] Capture error: {ex}");
            lock (_resultLock)
            {
                _result = _result with { Error = ex.Message };
            }
        }
        finally
        {
            if (captureClient != null) Marshal.ReleaseComObject(captureClient);
            if (audioClient != null) Marshal.ReleaseComObject(audioClient);
            _running = false;
        }
    }

    /// <summary>
    /// 将多声道采样混合为单声道并写入分析缓冲区
    /// </summary>
    private void WriteToBuffer(ReadOnlySpan<float> interleaved, int channels)
    {
        if (_sampleBuffer == null) return;

        int sampleCount = interleaved.Length / channels;
        for (int i = 0; i < sampleCount && _bufferWritePos < _sampleBuffer.Length; i++)
        {
            float mixed = 0f;
            int baseIdx = i * channels;
            for (int ch = 0; ch < channels; ch++)
                mixed += interleaved[baseIdx + ch];
            _sampleBuffer[_bufferWritePos++] = mixed / channels;
        }
    }

    /// <summary>
    /// 对缓冲区数据执行 FFT 分析和节拍检测
    /// </summary>
    private void AnalyzeBuffer(float[] magnitudes, BeatDetector beatDetector)
    {
        if (_sampleBuffer == null) return;

        // 计算 FFT 幅度谱
        _fft.ComputeMagnitude(_sampleBuffer, magnitudes);

        // 计算 RMS 和峰值
        float rms = 0f, peak = 0f;
        for (int i = 0; i < _sampleBuffer.Length; i++)
        {
            float abs = MathF.Abs(_sampleBuffer[i]);
            rms += _sampleBuffer[i] * _sampleBuffer[i];
            if (abs > peak) peak = abs;
        }
        rms = MathF.Sqrt(rms / _sampleBuffer.Length);

        // 找出主要频率 bin（幅度最高的 N 个）
        var topBins = FindTopFrequencyBins(magnitudes, 8);

        // 节拍检测（关注低频：约 40-200 Hz）
        int lowBin = Math.Max(2, (int)(40f * _fft.Size / _sampleRate));
        int highBin = Math.Min(magnitudes.Length, (int)(200f * _fft.Size / _sampleRate));
        beatDetector.Analyze(magnitudes, lowBin, highBin);

        // 更新结果
        float[] spectrum;
        if (magnitudes.Length <= 512)
        {
            spectrum = magnitudes.ToArray();
        }
        else
        {
            // 降采样到 512 bins
            spectrum = DownsampleSpectrum(magnitudes, 512);
        }

        lock (_resultLock)
        {
            _result = new AudioAnalysisResult
            {
                Error = null,
                Frequency = new FrequencyData
                {
                    Spectrum = spectrum,
                    DominantHz = topBins.Length > 0 ? BinToHz(topBins[0].Bin) : 0f,
                    TopFrequencies = topBins.Select(b => new FrequencyPeak
                    {
                        Hz = BinToHz(b.Bin),
                        Magnitude = b.Magnitude
                    }).ToArray()
                },
                Amplitude = new AmplitudeData
                {
                    Rms = rms,
                    Peak = peak
                },
                Beat = new BeatData
                {
                    IsBeat = beatDetector.IsBeat,
                    Bpm = beatDetector.Bpm,
                    Intensity = beatDetector.BeatIntensity
                }
            };
        }
    }

    /// <summary>频率 bin 转 Hz</summary>
    private float BinToHz(int bin) => bin * (float)_sampleRate / _fft.Size;

    /// <summary>找出幅度最高的 N 个频率 bin</summary>
    private static (int Bin, float Magnitude)[] FindTopFrequencyBins(ReadOnlySpan<float> magnitudes, int count)
    {
        // 跳过前 2 个 bin（直流分量和极低频）
        var bins = new List<(int Bin, float Magnitude)>();
        for (int i = 2; i < magnitudes.Length; i++)
        {
            bins.Add((i, magnitudes[i]));
        }
        return bins.OrderByDescending(b => b.Magnitude).Take(count).ToArray();
    }

    /// <summary>频谱降采样</summary>
    private static float[] DownsampleSpectrum(ReadOnlySpan<float> source, int targetSize)
    {
        var result = new float[targetSize];
        float ratio = (float)source.Length / targetSize;
        for (int i = 0; i < targetSize; i++)
        {
            int start = (int)(i * ratio);
            int end = (int)((i + 1) * ratio);
            if (end <= start) end = start + 1;
            if (end > source.Length) end = source.Length;

            float max = 0f;
            for (int j = start; j < end; j++)
            {
                if (source[j] > max) max = source[j];
            }
            result[i] = max;
        }
        return result;
    }

    #endregion
}

/// <summary>频率峰值</summary>
internal record struct FrequencyPeak
{
    public float Hz { get; init; }
    public float Magnitude { get; init; }
}

/// <summary>频率分析数据</summary>
internal record struct FrequencyData
{
    /// <summary>频谱幅度数组（降采样到 512 bins）</summary>
    public float[] Spectrum { get; init; }

    /// <summary>主频率 (Hz)</summary>
    public float DominantHz { get; init; }

    /// <summary>幅度最高的频率峰值列表</summary>
    public FrequencyPeak[] TopFrequencies { get; init; }
}

/// <summary>振幅分析数据</summary>
internal record struct AmplitudeData
{
    /// <summary>均方根振幅</summary>
    public float Rms { get; init; }

    /// <summary>峰值振幅</summary>
    public float Peak { get; init; }
}

/// <summary>节拍检测数据</summary>
internal record struct BeatData
{
    /// <summary>当前帧是否有节拍</summary>
    public bool IsBeat { get; init; }

    /// <summary>检测到的 BPM</summary>
    public float Bpm { get; init; }

    /// <summary>节拍强度 (0.0 ~ 1.0)</summary>
    public float Intensity { get; init; }
}

/// <summary>完整音频分析结果</summary>
internal record AudioAnalysisResult
{
    public string? Error { get; init; }
    public FrequencyData Frequency { get; init; }
    public AmplitudeData Amplitude { get; init; }
    public BeatData Beat { get; init; }

    public static AudioAnalysisResult Empty => new()
    {
        Frequency = new FrequencyData { Spectrum = Array.Empty<float>(), TopFrequencies = Array.Empty<FrequencyPeak>() },
        Amplitude = default,
        Beat = default
    };
}
