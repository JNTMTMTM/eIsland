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
/// Native AOT DLL 导出函数。
/// 通过 koffi 从 Node.js 调用。
/// </summary>
public static class AudioAnalyzerExports
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        TypeInfoResolver = AudioAnalyzerJsonContext.Default
    };

    private static ProcessAudioCapture? _capture;
    private static string _lastError = "";

    private static IntPtr StringToCoTaskMem(string str)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(str + '\0');
        var ptr = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, ptr, bytes.Length);
        return ptr;
    }

    /// <summary>释放 CoTaskMem 分配的字符串</summary>
    [UnmanagedCallersOnly(EntryPoint = "audio_analyzer_free_string")]
    public static void FreeString(IntPtr ptr)
    {
        if (ptr != IntPtr.Zero)
            Marshal.FreeCoTaskMem(ptr);
    }

    /// <summary>
    /// 启动进程音频分析
    /// </summary>
    /// <param name="processId">目标进程 ID</param>
    /// <returns>0=成功, 1=失败</returns>
    [UnmanagedCallersOnly(EntryPoint = "audio_analyzer_start")]
    public static int Start(uint processId)
    {
        try
        {
            if (_capture != null && _capture.IsRunning)
                _capture.Stop();

            _capture ??= new ProcessAudioCapture(2048);
            return _capture.Start(processId, true);
        }
        catch (Exception ex)
        {
            _lastError = ex.Message;
            return 1;
        }
    }

    /// <summary>
    /// 启动进程音频分析（可选择是否包含子进程）
    /// </summary>
    /// <param name="processId">目标进程 ID</param>
    /// <param name="includeProcessTree">是否包含子进程</param>
    /// <returns>0=成功, 1=失败</returns>
    [UnmanagedCallersOnly(EntryPoint = "audio_analyzer_start_ex")]
    public static int StartEx(uint processId, int includeProcessTree)
    {
        try
        {
            if (_capture != null && _capture.IsRunning)
                _capture.Stop();

            _capture ??= new ProcessAudioCapture(2048);
            return _capture.Start(processId, includeProcessTree != 0);
        }
        catch (Exception ex)
        {
            _lastError = ex.Message;
            return 1;
        }
    }

    /// <summary>
    /// 停止音频分析（幂等）
    /// </summary>
    /// <returns>0=成功</returns>
    [UnmanagedCallersOnly(EntryPoint = "audio_analyzer_stop")]
    public static int Stop()
    {
        try
        {
            _capture?.Stop();
            return 0;
        }
        catch (Exception ex)
        {
            _lastError = ex.Message;
            return 1;
        }
    }

    /// <summary>
    /// 获取当前分析结果 JSON。
    /// 返回 CoTaskMem 分配的 UTF-8 字符串，需 audio_analyzer_free_string 释放。
    /// koffi 的 'str' 返回类型会自动释放。
    /// </summary>
    [UnmanagedCallersOnly(EntryPoint = "audio_analyzer_get_result")]
    public static IntPtr GetResult()
    {
        try
        {
            if (_capture == null)
            {
                return StringToCoTaskMem(JsonSerializer.Serialize(
                    AudioAnalysisResult.Empty, AudioAnalyzerJsonContext.Default.AudioAnalysisResult));
            }

            var result = _capture.LatestResult;
            var json = JsonSerializer.Serialize(result, AudioAnalyzerJsonContext.Default.AudioAnalysisResult);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            _lastError = ex.Message;
            return IntPtr.Zero;
        }
    }

    /// <summary>
    /// 获取分析状态 JSON
    /// </summary>
    [UnmanagedCallersOnly(EntryPoint = "audio_analyzer_get_status")]
    public static IntPtr GetStatus()
    {
        try
        {
            var status = new StatusInfo
            {
                IsRunning = _capture?.IsRunning ?? false,
                Error = string.IsNullOrEmpty(_lastError) ? null : _lastError
            };
            var json = JsonSerializer.Serialize(status, AudioAnalyzerJsonContext.Default.StatusInfo);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            _lastError = ex.Message;
            return IntPtr.Zero;
        }
    }

    /// <summary>获取最后一次错误信息</summary>
    [UnmanagedCallersOnly(EntryPoint = "audio_analyzer_get_last_error")]
    public static IntPtr GetLastError()
    {
        return StringToCoTaskMem(_lastError);
    }

    /// <summary>
    /// 获取当前正在播放音频的进程列表 JSON。
    /// 返回 CoTaskMem 分配的 UTF-8 字符串，koffi 'str' 会自动释放。
    /// </summary>
    /// <param name="activeOnly">1=仅活跃会话, 0=全部</param>
    [UnmanagedCallersOnly(EntryPoint = "audio_analyzer_get_playing_processes")]
    public static IntPtr GetPlayingProcesses(int activeOnly)
    {
        try
        {
            var processes = AudioSessionEnumerator.GetPlayingProcesses(activeOnly != 0);
            var json = JsonSerializer.Serialize(processes, AudioAnalyzerJsonContext.Default.AudioProcessInfoArray);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            _lastError = ex.Message;
            return StringToCoTaskMem("[]");
        }
    }
}

/// <summary>状态信息</summary>
internal record StatusInfo
{
    public bool IsRunning { get; init; }
    public string? Error { get; init; }
}
