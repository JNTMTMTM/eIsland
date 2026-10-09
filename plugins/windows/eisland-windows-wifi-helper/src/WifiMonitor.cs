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

using System.Runtime.InteropServices;
using Windows.Networking.Connectivity;

namespace eIslandWifiHelper;

/// <summary>
/// WiFi 连接状态监控引擎
/// 订阅 WinRT NetworkInformation.NetworkStatusChanged 事件
/// 通过 Win32 事件通知 Node 侧轮询
/// </summary>
public static class WifiMonitor
{
    #region Win32 P/Invoke

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr CreateEventW(IntPtr lpEventAttributes, bool bManualReset, bool bInitialState, IntPtr lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetEvent(IntPtr hEvent);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool ResetEvent(IntPtr hEvent);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);

    private const uint WAIT_OBJECT_0 = 0;
    private const uint WAIT_TIMEOUT = 258;
    private const uint INFINITE = 0xFFFFFFFF;

    #endregion

    /// <summary>最新的 WiFi 状态 JSON 缓存</summary>
    private static string? _wifiInfoJson;

    /// <summary>变更计数器</summary>
    private static volatile int _changeCounter;

    /// <summary>有变更时置位</summary>
    private static IntPtr _changeEvent = IntPtr.Zero;

    /// <summary>停止信号</summary>
    private static IntPtr _stopEvent = IntPtr.Zero;

    private static volatile bool _monitoring;

    /// <summary>事件处理器引用（防止 GC 回收）</summary>
    private static NetworkStatusChangedEventHandler? _statusChangedHandler;

    /// <summary>初始化 Win32 事件</summary>
    private static bool EnsureEvents()
    {
        if (_changeEvent == IntPtr.Zero)
        {
            _changeEvent = CreateEventW(IntPtr.Zero, true, false, IntPtr.Zero);
            if (_changeEvent == IntPtr.Zero) return false;
        }
        if (_stopEvent == IntPtr.Zero)
        {
            _stopEvent = CreateEventW(IntPtr.Zero, true, false, IntPtr.Zero);
            if (_stopEvent == IntPtr.Zero) return false;
        }
        return true;
    }

    /// <summary>
    /// 启动 WiFi 监控（幂等）
    /// </summary>
    /// <returns>0=成功, 1=失败</returns>
    public static int StartMonitoring()
    {
        if (_monitoring) return 0;
        if (!EnsureEvents()) return 1;
        ResetEvent(_stopEvent);
        _monitoring = true;

        // 初始化当前状态
        RefreshWifiInfo();

        // 订阅 NetworkStatusChanged 事件
        SubscribeEvents();

        return 0;
    }

    /// <summary>
    /// 停止 WiFi 监控（幂等）
    /// </summary>
    /// <returns>0=成功</returns>
    public static int StopMonitoring()
    {
        if (!_monitoring) return 0;
        _monitoring = false;
        UnsubscribeEvents();
        if (_stopEvent != IntPtr.Zero)
            SetEvent(_stopEvent);
        return 0;
    }

    /// <summary>
    /// 阻塞等待 WiFi 状态变更
    /// </summary>
    /// <param name="timeoutMs">超时毫秒数</param>
    /// <returns>0=有变更, 1=超时, -1=错误/未启动</returns>
    public static int WaitForChanges(int timeoutMs)
    {
        if (!_monitoring || _changeEvent == IntPtr.Zero) return -1;
        ResetEvent(_changeEvent);
        var ms = timeoutMs < 0 ? INFINITE : (uint)timeoutMs;
        var result = WaitForSingleObject(_changeEvent, ms);
        return result switch
        {
            WAIT_OBJECT_0 => 0,
            WAIT_TIMEOUT => 1,
            _ => -1
        };
    }

    /// <summary>
    /// 读取当前变更计数
    /// </summary>
    public static int GetChangeCounter() => _changeCounter;

    /// <summary>
    /// 获取最新 WiFi 状态 JSON
    /// </summary>
    public static string? GetWifiInfoJson()
    {
        RefreshWifiInfo();
        return _wifiInfoJson;
    }

    /// <summary>通知 Node 侧有变更</summary>
    private static void SignalChange()
    {
        RefreshWifiInfo();
        Interlocked.Increment(ref _changeCounter);
        if (_changeEvent != IntPtr.Zero)
            SetEvent(_changeEvent);
    }

    /// <summary>刷新 WiFi 状态 JSON 缓存</summary>
    private static void RefreshWifiInfo()
    {
        try
        {
            var info = WifiController.BuildWifiInfo();
            _wifiInfoJson = SerializeWifiInfo(info);
        }
        catch
        {
            // 保持旧缓存
        }
    }

    #region 事件订阅

    private static void SubscribeEvents()
    {
        _statusChangedHandler = (sender) =>
        {
            try { if (_monitoring) SignalChange(); } catch { }
        };
        NetworkInformation.NetworkStatusChanged += _statusChangedHandler;
    }

    private static void UnsubscribeEvents()
    {
        if (_statusChangedHandler != null)
            NetworkInformation.NetworkStatusChanged -= _statusChangedHandler;
        _statusChangedHandler = null;
    }

    #endregion

    #region JSON 序列化

    private static string SerializeWifiInfo(WifiInfo info)
    {
        return System.Text.Json.JsonSerializer.Serialize(info, WfJsonContext.Default.WifiInfo);
    }

    #endregion

    #region 清理

    /// <summary>
    /// 清理所有资源（用于进程退出时）
    /// </summary>
    public static void Cleanup()
    {
        UnsubscribeEvents();
        _wifiInfoJson = null;
        _changeCounter = 0;

        if (_changeEvent != IntPtr.Zero)
        {
            CloseHandle(_changeEvent);
            _changeEvent = IntPtr.Zero;
        }
        if (_stopEvent != IntPtr.Zero)
        {
            CloseHandle(_stopEvent);
            _stopEvent = IntPtr.Zero;
        }
    }

    #endregion
}
