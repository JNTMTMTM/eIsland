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
using Windows.Media;

namespace eIslandSmtcHelper;

public static class SmtcExports
{
    [DllImport("ole32.dll")]
    private static extern int CoInitializeEx(IntPtr pvReserved, uint dwCoInit);

    [DllImport("ole32.dll")]
    private static extern void CoUninitialize();

    private const uint COINIT_APARTMENTTHREADED = 0x2;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        TypeInfoResolver = SmtcJsonContext.Default
    };

    private static IntPtr StringToCoTaskMem(string str)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(str + '\0');
        var ptr = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, ptr, bytes.Length);
        return ptr;
    }

    private static T RunOnSTAThread<T>(Func<Task<T>> asyncFunc)
    {
        T result = default!;
        Exception? ex = null;
        var thread = new Thread(() =>
        {
            var comInitialized = false;
            try
            {
                comInitialized = CoInitializeEx(IntPtr.Zero, COINIT_APARTMENTTHREADED) >= 0;
                result = asyncFunc().GetAwaiter().GetResult();
            }
            catch (Exception e)
            {
                ex = e;
            }
            finally
            {
                if (comInitialized) CoUninitialize();
            }
        });
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        thread.Join();
        if (ex != null) throw ex;
        return result;
    }

    [UnmanagedCallersOnly(EntryPoint = "smtc_free_string")]
    public static void FreeString(IntPtr ptr)
    {
        if (ptr != IntPtr.Zero)
            Marshal.FreeCoTaskMem(ptr);
    }

    [UnmanagedCallersOnly(EntryPoint = "smtc_play")]
    public static int Play()
    {
        try
        {
            var result = RunOnSTAThread(() => SmtcController.PlayAsync());
            return result.Success ? 0 : 1;
        }
        catch { return 1; }
    }

    [UnmanagedCallersOnly(EntryPoint = "smtc_pause")]
    public static int Pause()
    {
        try
        {
            var result = RunOnSTAThread(() => SmtcController.PauseAsync());
            return result.Success ? 0 : 1;
        }
        catch { return 1; }
    }

    [UnmanagedCallersOnly(EntryPoint = "smtc_next")]
    public static int Next()
    {
        try
        {
            var result = RunOnSTAThread(() => SmtcController.NextAsync());
            return result.Success ? 0 : 1;
        }
        catch { return 1; }
    }

    [UnmanagedCallersOnly(EntryPoint = "smtc_previous")]
    public static int Previous()
    {
        try
        {
            var result = RunOnSTAThread(() => SmtcController.PreviousAsync());
            return result.Success ? 0 : 1;
        }
        catch { return 1; }
    }

    /// <summary>
    /// Get full media status as JSON. Returns NULL on failure.
    /// Use smtc_get_last_error() to get error details on failure.
    /// </summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_get_status")]
    public static IntPtr GetStatus()
    {
        try
        {
            var status = RunOnSTAThread(() => SmtcController.GetStatusAsync());
            var json = JsonSerializer.Serialize(status, SmtcJsonContext.Default.MediaStatus);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }

    private static string lastError = "";

    /// <summary>
    /// Get last error message. Returns empty string if no error.
    /// </summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_get_last_error")]
    public static IntPtr GetLastError()
    {
        return StringToCoTaskMem(lastError);
    }

    // ── 会话监控 ──────────────────────────────────────────────────

    /// <summary>启动会话监控（幂等）。0=成功, 1=失败</summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_start_monitoring")]
    public static int StartMonitoring()
    {
        try { return SmtcSessionMonitor.StartMonitoring(); }
        catch { return 1; }
    }

    /// <summary>停止会话监控（幂等）。0=成功</summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_stop_monitoring")]
    public static int StopMonitoring()
    {
        try { return SmtcSessionMonitor.StopMonitoring(); }
        catch { return 0; }
    }

    /// <summary>阻塞等待会话变更。0=有变更, 1=超时, -1=错误</summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_wait_for_changes")]
    public static int WaitForChanges(int timeoutMs)
    {
        try { return SmtcSessionMonitor.WaitForChanges(timeoutMs); }
        catch { return -1; }
    }

    /// <summary>原子读取变更计数器</summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_get_sessions_changed")]
    public static int GetSessionsChanged()
    {
        try { return SmtcSessionMonitor.GetChangeCounter(); }
        catch { return -1; }
    }

    /// <summary>获取所有会话 JSON（SessionInfo[]）。返回 CoTaskMem 分配的 UTF-8 字符串，需 smtc_free_string 释放</summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_get_all_sessions")]
    public static IntPtr GetAllSessions()
    {
        try
        {
            var json = SmtcSessionMonitor.GetAllSessionsJson();
            if (json == null) lastError = "GetAllSessionsJson returned null";
            return json != null ? StringToCoTaskMem(json) : IntPtr.Zero;
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }

    /// <summary>
    /// 获取轻量级时间戳信息 JSON（不含媒体元数据）。
    /// 用于歌词校准等仅需播放位置的场景。
    /// </summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_get_timestamp")]
    public static IntPtr GetTimestamp()
    {
        try
        {
            var info = RunOnSTAThread(() => SmtcController.GetTimestampAsync());
            var json = JsonSerializer.Serialize(info, SmtcJsonContext.Default.TimestampInfo);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }

    /// <summary>获取指定会话 JSON。sourceAppId 为 UTF-8 C 字符串</summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_get_session")]
    public static IntPtr GetSession(IntPtr sourceAppIdPtr)
    {
        try
        {
            var sourceAppId = Marshal.PtrToStringUTF8(sourceAppIdPtr) ?? "";
            var json = SmtcSessionMonitor.GetSessionJson(sourceAppId);
            return json != null ? StringToCoTaskMem(json) : IntPtr.Zero;
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }

    // ── 扩展控制命令 ──────────────────────────────────────────────

    /// <summary>Seek 到指定位置（秒）。0=成功, 1=失败</summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_seek")]
    public static int Seek(double positionSeconds)
    {
        try
        {
            var result = RunOnSTAThread(() => SmtcController.SeekAsync(positionSeconds));
            return result.Success ? 0 : 1;
        }
        catch { return 1; }
    }

    /// <summary>停止播放。0=成功, 1=失败</summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_stop")]
    public static int Stop()
    {
        try
        {
            var result = RunOnSTAThread(() => SmtcController.StopAsync());
            return result.Success ? 0 : 1;
        }
        catch { return 1; }
    }

    /// <summary>设置随机播放。0=关闭, 1=开启。返回 0=成功, 1=失败</summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_set_shuffle")]
    public static int SetShuffle(int active)
    {
        try
        {
            var result = RunOnSTAThread(() => SmtcController.SetShuffleAsync(active != 0));
            return result.Success ? 0 : 1;
        }
        catch { return 1; }
    }

    /// <summary>设置循环模式。0=None, 1=Track, 2=List。返回 0=成功, 1=失败</summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_set_repeat_mode")]
    public static int SetRepeatMode(int mode)
    {
        try
        {
            var autoRepeat = mode switch
            {
                1 => MediaPlaybackAutoRepeatMode.Track,
                2 => MediaPlaybackAutoRepeatMode.List,
                _ => MediaPlaybackAutoRepeatMode.None,
            };
            var result = RunOnSTAThread(() => SmtcController.SetRepeatModeAsync(autoRepeat));
            return result.Success ? 0 : 1;
        }
        catch { return 1; }
    }

    /// <summary>设置播放速率。返回 0=成功, 1=失败</summary>
    [UnmanagedCallersOnly(EntryPoint = "smtc_set_playback_rate")]
    public static int SetPlaybackRate(double rate)
    {
        try
        {
            var result = RunOnSTAThread(() => SmtcController.SetPlaybackRateAsync(rate));
            return result.Success ? 0 : 1;
        }
        catch { return 1; }
    }
}
