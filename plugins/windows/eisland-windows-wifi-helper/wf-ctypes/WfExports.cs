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

namespace eIslandWifiHelper;

public static class WfExports
{
    private static string lastError = "";

    private static IntPtr StringToCoTaskMem(string str)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(str + '\0');
        var ptr = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, ptr, bytes.Length);
        return ptr;
    }

    [UnmanagedCallersOnly(EntryPoint = "wf_free_string")]
    public static void FreeString(IntPtr ptr)
    {
        if (ptr != IntPtr.Zero)
            Marshal.FreeCoTaskMem(ptr);
    }

    [UnmanagedCallersOnly(EntryPoint = "wf_get_last_error")]
    public static IntPtr GetLastError()
    {
        return StringToCoTaskMem(lastError);
    }

    // ── WiFi 查询 ──────────────────────────────────────────────────

    /// <summary>获取当前 WiFi 连接状态 JSON</summary>
    [UnmanagedCallersOnly(EntryPoint = "wf_get_wifi_info")]
    public static IntPtr GetWifiInfo()
    {
        try
        {
            var info = WifiController.GetWifiInfo();
            var json = System.Text.Json.JsonSerializer.Serialize(info, WfJsonContext.Default.WifiInfo);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }

    // ── WiFi 监控 ──────────────────────────────────────────────────

    /// <summary>启动 WiFi 监控（幂等）。0=成功, 1=失败</summary>
    [UnmanagedCallersOnly(EntryPoint = "wf_start_monitoring")]
    public static int StartMonitoring()
    {
        try { return WifiMonitor.StartMonitoring(); }
        catch { return 1; }
    }

    /// <summary>停止 WiFi 监控（幂等）。0=成功</summary>
    [UnmanagedCallersOnly(EntryPoint = "wf_stop_monitoring")]
    public static int StopMonitoring()
    {
        try { return WifiMonitor.StopMonitoring(); }
        catch { return 0; }
    }

    /// <summary>阻塞等待 WiFi 状态变更。0=有变更, 1=超时, -1=错误</summary>
    [UnmanagedCallersOnly(EntryPoint = "wf_wait_for_changes")]
    public static int WaitForChanges(int timeoutMs)
    {
        try { return WifiMonitor.WaitForChanges(timeoutMs); }
        catch { return -1; }
    }

    /// <summary>原子读取变更计数器</summary>
    [UnmanagedCallersOnly(EntryPoint = "wf_get_changes_count")]
    public static int GetChangesCount()
    {
        try { return WifiMonitor.GetChangeCounter(); }
        catch { return -1; }
    }

    /// <summary>获取最新 WiFi 状态 JSON（监控模式下）</summary>
    [UnmanagedCallersOnly(EntryPoint = "wf_get_monitored_wifi_info")]
    public static IntPtr GetMonitoredWifiInfo()
    {
        try
        {
            var json = WifiMonitor.GetWifiInfoJson();
            if (json == null) lastError = "GetWifiInfoJson returned null";
            return json != null ? StringToCoTaskMem(json) : IntPtr.Zero;
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }
}
