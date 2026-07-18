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

namespace eIslandHardwareInfoHelper;

/// <summary>
/// Native AOT DLL 导出函数，供 Node.js 通过 koffi FFI 调用
/// </summary>
public static class HiExports
{
    private static string lastError = "";

    private static IntPtr StringToCoTaskMem(string str)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(str + '\0');
        var ptr = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, ptr, bytes.Length);
        return ptr;
    }

    // ───────────────────────── 通用导出 ─────────────────────────

    [UnmanagedCallersOnly(EntryPoint = "hi_free_string")]
    public static void FreeString(IntPtr ptr)
    {
        if (ptr != IntPtr.Zero)
            Marshal.FreeCoTaskMem(ptr);
    }

    [UnmanagedCallersOnly(EntryPoint = "hi_get_last_error")]
    public static IntPtr GetLastError()
    {
        return StringToCoTaskMem(lastError);
    }

    // ───────────────────────── 查询导出 ─────────────────────────

    [UnmanagedCallersOnly(EntryPoint = "hi_get_cpu_info")]
    public static IntPtr GetCpuInfo()
    {
        try
        {
            var data = HardwareInfoController.GetCpuInfo();
            var json = System.Text.Json.JsonSerializer.Serialize(data, HiJsonContext.Default.CpuInfoArray);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return StringToCoTaskMem("[]");
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "hi_get_gpu_info")]
    public static IntPtr GetGpuInfo()
    {
        try
        {
            var data = HardwareInfoController.GetGpuInfo();
            var json = System.Text.Json.JsonSerializer.Serialize(data, HiJsonContext.Default.GpuInfoArray);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return StringToCoTaskMem("[]");
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "hi_get_memory_info")]
    public static IntPtr GetMemoryInfo()
    {
        try
        {
            var data = HardwareInfoController.GetMemoryInfo();
            var json = System.Text.Json.JsonSerializer.Serialize(data, HiJsonContext.Default.MemorySlotInfoArray);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return StringToCoTaskMem("[]");
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "hi_get_disk_info")]
    public static IntPtr GetDiskInfo()
    {
        try
        {
            var data = HardwareInfoController.GetDiskInfo();
            var json = System.Text.Json.JsonSerializer.Serialize(data, HiJsonContext.Default.DiskInfoArray);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return StringToCoTaskMem("[]");
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "hi_get_network_adapter_info")]
    public static IntPtr GetNetworkAdapterInfo()
    {
        try
        {
            var data = HardwareInfoController.GetNetworkAdapterInfo();
            var json = System.Text.Json.JsonSerializer.Serialize(data, HiJsonContext.Default.NetworkAdapterInfoArray);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return StringToCoTaskMem("[]");
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "hi_get_bluetooth_devices")]
    public static IntPtr GetBluetoothDevices()
    {
        try
        {
            var data = HardwareInfoController.GetBluetoothDevices();
            var json = System.Text.Json.JsonSerializer.Serialize(data, HiJsonContext.Default.BluetoothDeviceInfoArray);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return StringToCoTaskMem("[]");
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "hi_get_motherboard_info")]
    public static IntPtr GetMotherboardInfo()
    {
        try
        {
            var data = HardwareInfoController.GetMotherboardInfo();
            var json = System.Text.Json.JsonSerializer.Serialize(data, HiJsonContext.Default.MotherboardInfoArray);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return StringToCoTaskMem("[]");
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "hi_get_monitor_info")]
    public static IntPtr GetMonitorInfo()
    {
        try
        {
            var data = HardwareInfoController.GetMonitorInfo();
            var json = System.Text.Json.JsonSerializer.Serialize(data, HiJsonContext.Default.MonitorInfoArray);
            return StringToCoTaskMem(json);
        }
        catch (Exception ex)
        {
            lastError = ex.ToString();
            return StringToCoTaskMem("[]");
        }
    }
}
