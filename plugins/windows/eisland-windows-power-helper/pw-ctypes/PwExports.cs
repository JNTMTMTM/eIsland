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

namespace eIslandPowerHelper;

public static class PwExports
{
    private static string lastError = "";

    private static IntPtr StringToCoTaskMem(string str)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(str + '\0');
        var ptr = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, ptr, bytes.Length);
        return ptr;
    }

    [UnmanagedCallersOnly(EntryPoint = "pw_free_string")]
    public static void FreeString(IntPtr ptr)
    {
        if (ptr != IntPtr.Zero)
            Marshal.FreeCoTaskMem(ptr);
    }

    [UnmanagedCallersOnly(EntryPoint = "pw_get_last_error")]
    public static IntPtr GetLastError()
    {
        return StringToCoTaskMem(lastError);
    }

    // ── 电源查询 ──────────────────────────────────────────────────

    /// <summary>获取当前电源状态 JSON</summary>
    [UnmanagedCallersOnly(EntryPoint = "pw_get_power_info")]
    public static IntPtr GetPowerInfo()
    {
        try
        {
            var info = PowerController.GetPowerInfo();
            var json = System.Text.Json.JsonSerializer.Serialize(info, PwJsonContext.Default.PowerInfo);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }

    // ── 电源监控 ──────────────────────────────────────────────────

    /// <summary>启动电源监控（幂等）。0=成功, 1=失败</summary>
    [UnmanagedCallersOnly(EntryPoint = "pw_start_monitoring")]
    public static int StartMonitoring()
    {
        try { return PowerMonitor.StartMonitoring(); }
        catch { return 1; }
    }

    /// <summary>停止电源监控（幂等）。0=成功</summary>
    [UnmanagedCallersOnly(EntryPoint = "pw_stop_monitoring")]
    public static int StopMonitoring()
    {
        try { return PowerMonitor.StopMonitoring(); }
        catch { return 0; }
    }

    /// <summary>阻塞等待电源状态变更。0=有变更, 1=超时, -1=错误</summary>
    [UnmanagedCallersOnly(EntryPoint = "pw_wait_for_changes")]
    public static int WaitForChanges(int timeoutMs)
    {
        try { return PowerMonitor.WaitForChanges(timeoutMs); }
        catch { return -1; }
    }

    /// <summary>原子读取变更计数器</summary>
    [UnmanagedCallersOnly(EntryPoint = "pw_get_changes_count")]
    public static int GetChangesCount()
    {
        try { return PowerMonitor.GetChangeCounter(); }
        catch { return -1; }
    }

    /// <summary>获取最新电源状态 JSON（监控模式下）</summary>
    [UnmanagedCallersOnly(EntryPoint = "pw_get_monitored_power_info")]
    public static IntPtr GetMonitoredPowerInfo()
    {
        try
        {
            var json = PowerMonitor.GetPowerInfoJson();
            if (json == null) lastError = "GetPowerInfoJson returned null";
            return json != null ? StringToCoTaskMem(json) : IntPtr.Zero;
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }
}
