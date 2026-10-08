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

namespace eIslandBluetoothHelper;

public static class BtExports
{
    [DllImport("ole32.dll")]
    private static extern int CoInitializeEx(IntPtr pvReserved, uint dwCoInit);

    private const uint COINIT_APARTMENTTHREADED = 0x2;

    private static string lastError = "";

    private static IntPtr StringToCoTaskMem(string str)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(str + '\0');
        var ptr = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, ptr, bytes.Length);
        return ptr;
    }

    private static T RunOnSTAThread<T>(Func<T> func)
    {
        T result = default!;
        Exception? ex = null;
        var thread = new Thread(() =>
        {
            try
            {
                CoInitializeEx(IntPtr.Zero, COINIT_APARTMENTTHREADED);
                result = func();
            }
            catch (Exception e)
            {
                ex = e;
            }
        });
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        thread.Join();
        if (ex != null) throw ex;
        return result;
    }

    [UnmanagedCallersOnly(EntryPoint = "bt_free_string")]
    public static void FreeString(IntPtr ptr)
    {
        if (ptr != IntPtr.Zero)
            Marshal.FreeCoTaskMem(ptr);
    }

    [UnmanagedCallersOnly(EntryPoint = "bt_get_last_error")]
    public static IntPtr GetLastError()
    {
        return StringToCoTaskMem(lastError);
    }

    // ── 设备查询 ──────────────────────────────────────────────────

    /// <summary>获取所有已配对蓝牙设备 JSON 数组</summary>
    [UnmanagedCallersOnly(EntryPoint = "bt_get_paired_devices")]
    public static IntPtr GetPairedDevices()
    {
        try
        {
            var devices = RunOnSTAThread(() => BluetoothController.GetPairedDevices());
            var json = System.Text.Json.JsonSerializer.Serialize(devices, BtJsonContext.Default.BluetoothDeviceInfoArray);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return StringToCoTaskMem("[]");
        }
    }

    /// <summary>获取所有已连接蓝牙设备 JSON 数组</summary>
    [UnmanagedCallersOnly(EntryPoint = "bt_get_connected_devices")]
    public static IntPtr GetConnectedDevices()
    {
        try
        {
            var devices = RunOnSTAThread(() => BluetoothController.GetConnectedDevices());
            var json = System.Text.Json.JsonSerializer.Serialize(devices, BtJsonContext.Default.BluetoothDeviceInfoArray);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return StringToCoTaskMem("[]");
        }
    }

    /// <summary>获取所有可见蓝牙设备 JSON 数组（已配对 + 附近 BLE）</summary>
    [UnmanagedCallersOnly(EntryPoint = "bt_get_all_devices")]
    public static IntPtr GetAllDevices()
    {
        try
        {
            var devices = RunOnSTAThread(() => BluetoothController.GetAllDevices());
            var json = System.Text.Json.JsonSerializer.Serialize(devices, BtJsonContext.Default.BluetoothDeviceInfoArray);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return StringToCoTaskMem("[]");
        }
    }

    /// <summary>获取单个设备快照 JSON，deviceId 为 UTF-8 C 字符串。返回 null 表示未找到</summary>
    [UnmanagedCallersOnly(EntryPoint = "bt_get_device")]
    public static IntPtr GetDevice(IntPtr deviceIdPtr)
    {
        try
        {
            var deviceId = Marshal.PtrToStringUTF8(deviceIdPtr) ?? "";
            var device = RunOnSTAThread(() => BluetoothController.GetDevice(deviceId));
            if (device == null) return IntPtr.Zero;
            var json = System.Text.Json.JsonSerializer.Serialize(device, BtJsonContext.Default.BluetoothDeviceInfo);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }

    // ── 设备监控 ──────────────────────────────────────────────────

    /// <summary>启动设备监控（幂等）。0=成功, 1=失败</summary>
    [UnmanagedCallersOnly(EntryPoint = "bt_start_monitoring")]
    public static int StartMonitoring()
    {
        try { return BluetoothDeviceMonitor.StartMonitoring(); }
        catch { return 1; }
    }

    /// <summary>停止设备监控（幂等）。0=成功</summary>
    [UnmanagedCallersOnly(EntryPoint = "bt_stop_monitoring")]
    public static int StopMonitoring()
    {
        try { return BluetoothDeviceMonitor.StopMonitoring(); }
        catch { return 0; }
    }

    /// <summary>阻塞等待设备变更。0=有变更, 1=超时, -1=错误</summary>
    [UnmanagedCallersOnly(EntryPoint = "bt_wait_for_changes")]
    public static int WaitForChanges(int timeoutMs)
    {
        try { return BluetoothDeviceMonitor.WaitForChanges(timeoutMs); }
        catch { return -1; }
    }

    /// <summary>原子读取变更计数器</summary>
    [UnmanagedCallersOnly(EntryPoint = "bt_get_changes_count")]
    public static int GetChangesCount()
    {
        try { return BluetoothDeviceMonitor.GetChangeCounter(); }
        catch { return -1; }
    }

    /// <summary>获取监控器中所有设备快照 JSON</summary>
    [UnmanagedCallersOnly(EntryPoint = "bt_get_monitored_devices")]
    public static IntPtr GetMonitoredDevices()
    {
        try
        {
            var json = BluetoothDeviceMonitor.GetAllDevicesJson();
            if (json == null) lastError = "GetAllDevicesJson returned null";
            return json != null ? StringToCoTaskMem(json) : IntPtr.Zero;
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }

    /// <summary>获取监控器中指定设备快照 JSON</summary>
    [UnmanagedCallersOnly(EntryPoint = "bt_get_monitored_device")]
    public static IntPtr GetMonitoredDevice(IntPtr deviceIdPtr)
    {
        try
        {
            var deviceId = Marshal.PtrToStringUTF8(deviceIdPtr) ?? "";
            var json = BluetoothDeviceMonitor.GetDeviceJson(deviceId);
            return json != null ? StringToCoTaskMem(json) : IntPtr.Zero;
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return IntPtr.Zero;
        }
    }
}
