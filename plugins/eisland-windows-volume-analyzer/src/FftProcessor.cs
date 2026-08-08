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

namespace eIslandVolumeAnalyzer;

/// <summary>
/// FFT 频谱分析处理器。
/// 采用 Cooley-Tukey radix-2 算法，支持就地变换。
/// </summary>
internal sealed class FftProcessor
{
    private readonly int _fftSize;
    private readonly int _logSize;
    private readonly float[] _window;

    /// <summary>FFT 点数</summary>
    public int Size => _fftSize;

    public FftProcessor(int fftSize = 2048)
    {
        if (fftSize < 2 || (fftSize & (fftSize - 1)) != 0)
            throw new ArgumentException("FFT size must be a power of 2", nameof(fftSize));

        _fftSize = fftSize;
        _logSize = (int)Math.Log2(fftSize);
        _window = CreateHannWindow(fftSize);
    }

    /// <summary>
    /// 对实数输入执行 FFT，返回幅度谱（仅正频率部分）
    /// </summary>
    /// <param name="samples">输入采样（长度须 >= fftSize）</param>
    /// <param name="magnitudes">输出幅度（长度 = fftSize/2）</param>
    public void ComputeMagnitude(ReadOnlySpan<float> samples, Span<float> magnitudes)
    {
        var n = _fftSize;
        var halfN = n / 2;

        // 应用窗函数并准备复数输入
        Span<float> real = stackalloc float[n];
        Span<float> imag = stackalloc float[n];

        for (int i = 0; i < n; i++)
        {
            real[i] = samples[i] * _window[i];
            imag[i] = 0f;
        }

        // 位反转置换
        for (int i = 0; i < n; i++)
        {
            int j = BitReverse(i, _logSize);
            if (j > i)
            {
                (real[i], real[j]) = (real[j], real[i]);
                (imag[i], imag[j]) = (imag[j], imag[i]);
            }
        }

        // Cooley-Tukey 蝶形运算
        for (int stage = 1; stage <= _logSize; stage++)
        {
            int m = 1 << stage;
            int halfM = m >> 1;
            float angleStep = -MathF.PI / halfM;

            for (int k = 0; k < n; k += m)
            {
                float wRe = 1f, wIm = 0f;
                float cosStep = MathF.Cos(angleStep);
                float sinStep = MathF.Sin(angleStep);

                for (int j = 0; j < halfM; j++)
                {
                    int evenIdx = k + j;
                    int oddIdx = k + j + halfM;

                    float tRe = wRe * real[oddIdx] - wIm * imag[oddIdx];
                    float tIm = wRe * imag[oddIdx] + wIm * real[oddIdx];

                    real[oddIdx] = real[evenIdx] - tRe;
                    imag[oddIdx] = imag[evenIdx] - tIm;
                    real[evenIdx] += tRe;
                    imag[evenIdx] += tIm;

                    float newWRe = wRe * cosStep - wIm * sinStep;
                    float newWIm = wRe * sinStep + wIm * cosStep;
                    wRe = newWRe;
                    wIm = newWIm;
                }
            }
        }

        // 计算幅度谱（归一化）
        for (int i = 0; i < halfN && i < magnitudes.Length; i++)
        {
            magnitudes[i] = MathF.Sqrt(real[i] * real[i] + imag[i] * imag[i]) / n;
        }
    }

    /// <summary>位反转</summary>
    private static int BitReverse(int value, int bits)
    {
        int result = 0;
        for (int i = 0; i < bits; i++)
        {
            result = (result << 1) | (value & 1);
            value >>= 1;
        }
        return result;
    }

    /// <summary>Hann 窗函数</summary>
    private static float[] CreateHannWindow(int size)
    {
        var window = new float[size];
        for (int i = 0; i < size; i++)
        {
            window[i] = 0.5f * (1f - MathF.Cos(2f * MathF.PI * i / (size - 1)));
        }
        return window;
    }
}

/// <summary>
/// 节拍检测引擎。
/// 基于低频能量跟踪和自适应阈值。
/// </summary>
internal sealed class BeatDetector
{
    private readonly float[] _energyHistory;
    private int _historyIndex;
    private int _historyCount;
    private long _lastBeatSample;
    private long _totalSamples;
    private float _bpm;
    private bool _isBeat;
    private readonly int _sampleRate;
    private readonly int _fftSize;

    // 节拍检测参数
    private const int EnergyHistorySize = 43; // ~1 秒的历史窗口（约 43 帧 @ 23ms/帧）
    private const float ThresholdMultiplier = 1.4f; // 能量阈值倍数
    private const float MinBeatIntervalSec = 0.2f; // 最小节拍间隔（300 BPM）
    private const float MaxBeatIntervalSec = 2.0f; // 最大节拍间隔（30 BPM）
    private const int MinBpmHistorySize = 8; // BPM 计算最少节拍数

    private readonly List<float> _beatIntervals = new();

    /// <summary>当前 BPM</summary>
    public float Bpm => _bpm;

    /// <summary>当前帧是否有节拍</summary>
    public bool IsBeat => _isBeat;

    /// <summary>节拍强度 (0.0 ~ 1.0)</summary>
    public float BeatIntensity { get; private set; }

    public BeatDetector(int sampleRate = 48000, int fftSize = 2048)
    {
        _sampleRate = sampleRate;
        _fftSize = fftSize;
        _energyHistory = new float[EnergyHistorySize];
    }

    /// <summary>
    /// 分析一帧频谱数据，检测节拍
    /// </summary>
    /// <param name="magnitudes">FFT 幅度谱</param>
    /// <param name="lowBin">低频起始 bin</param>
    /// <param name="highBin">低频结束 bin</param>
    public void Analyze(ReadOnlySpan<float> magnitudes, int lowBin = 2, int highBin = 10)
    {
        // 计算低频能量（用于节拍检测，关注 kick/bass）
        float energy = 0f;
        int count = 0;
        for (int i = lowBin; i < highBin && i < magnitudes.Length; i++)
        {
            energy += magnitudes[i] * magnitudes[i];
            count++;
        }
        if (count > 0) energy /= count;

        // 更新能量历史
        _energyHistory[_historyIndex] = energy;
        _historyIndex = (_historyIndex + 1) % EnergyHistorySize;
        if (_historyCount < EnergyHistorySize) _historyCount++;

        // 计算历史平均能量
        float avgEnergy = 0f;
        for (int i = 0; i < _historyCount; i++)
            avgEnergy += _energyHistory[i];
        avgEnergy /= _historyCount;

        // 自适应阈值检测
        _isBeat = false;
        float threshold = avgEnergy * ThresholdMultiplier;

        if (energy > threshold && energy > 0.0001f && _historyCount >= 4)
        {
            float frameInterval = _totalSamples - _lastBeatSample;
            float secSinceLastBeat = frameInterval / _sampleRate;

            if (secSinceLastBeat >= MinBeatIntervalSec)
            {
                _isBeat = true;
                BeatIntensity = MathF.Min(1f, energy / (avgEnergy + 0.0001f) - 1f);

                if (_lastBeatSample > 0)
                {
                    _beatIntervals.Add(secSinceLastBeat);
                    if (_beatIntervals.Count > 20)
                        _beatIntervals.RemoveAt(0);

                    // 从节拍间隔推算 BPM
                    if (_beatIntervals.Count >= MinBpmHistorySize)
                    {
                        var sorted = _beatIntervals.OrderBy(x => x).ToArray();
                        // 取中位数附近的值
                        int start = sorted.Length / 4;
                        int end = sorted.Length * 3 / 4;
                        float medianInterval = 0f;
                        for (int i = start; i < end; i++)
                            medianInterval += sorted[i];
                        medianInterval /= (end - start);

                        if (medianInterval > MaxBeatIntervalSec)
                            medianInterval = MaxBeatIntervalSec;
                        if (medianInterval < MinBeatIntervalSec)
                            medianInterval = MinBeatIntervalSec;

                        _bpm = 60f / medianInterval;
                    }
                }

                _lastBeatSample = _totalSamples;
            }
        }

        _totalSamples += _fftSize;
    }

    /// <summary>重置状态</summary>
    public void Reset()
    {
        _historyIndex = 0;
        _historyCount = 0;
        _lastBeatSample = 0;
        _totalSamples = 0;
        _bpm = 0;
        _isBeat = false;
        BeatIntensity = 0;
        _beatIntervals.Clear();
        Array.Clear(_energyHistory);
    }
}
