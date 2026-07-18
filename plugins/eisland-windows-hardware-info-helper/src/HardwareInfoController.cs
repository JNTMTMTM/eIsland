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

using System.Management;

namespace eIslandHardwareInfoHelper;

/// <summary>
/// 通过 WMI (System.Management) 查询本机硬件信息
/// </summary>
internal static class HardwareInfoController
{
    // ───────────────────────── CPU ─────────────────────────

    /// <summary>获取 CPU 信息</summary>
    internal static CpuInfo[] GetCpuInfo()
    {
        var list = new List<CpuInfo>();
        using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Processor");
        foreach (ManagementObject obj in searcher.Get())
        {
            list.Add(new CpuInfo
            {
                Name = GetString(obj, "Name"),
                Manufacturer = GetString(obj, "Manufacturer"),
                NumberOfCores = GetUInt32(obj, "NumberOfCores"),
                NumberOfLogicalProcessors = GetUInt32(obj, "NumberOfLogicalProcessors"),
                MaxClockSpeedMhz = GetUInt32(obj, "MaxClockSpeed"),
                CurrentClockSpeedMhz = GetUInt32(obj, "CurrentClockSpeed"),
                SocketDesignation = GetString(obj, "SocketDesignation"),
                Architecture = GetArchitectureName(GetUInt32(obj, "Architecture")),
                L2CacheSizeKb = GetUInt32(obj, "L2CacheSize"),
                L3CacheSizeKb = GetUInt32(obj, "L3CacheSize"),
            });
        }
        return list.ToArray();
    }

    // ───────────────────────── GPU ─────────────────────────

    /// <summary>获取 GPU 信息</summary>
    internal static GpuInfo[] GetGpuInfo()
    {
        var list = new List<GpuInfo>();
        using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_VideoController");
        foreach (ManagementObject obj in searcher.Get())
        {
            list.Add(new GpuInfo
            {
                Name = GetString(obj, "Name"),
                Manufacturer = GetString(obj, "AdapterCompatibility"),
                AdapterRamBytes = GetUInt64(obj, "AdapterRAM"),
                DriverVersion = GetString(obj, "DriverVersion"),
                DriverDate = GetWmiDate(obj, "DriverDate"),
                VideoProcessor = GetString(obj, "VideoProcessor"),
                CurrentHorizontalResolution = GetUInt32(obj, "CurrentHorizontalResolution"),
                CurrentVerticalResolution = GetUInt32(obj, "CurrentVerticalResolution"),
                CurrentRefreshRate = GetUInt32(obj, "CurrentRefreshRate"),
                Status = GetString(obj, "Status"),
            });
        }
        return list.ToArray();
    }

    // ───────────────────────── 内存 ─────────────────────────

    /// <summary>获取各内存插槽信息</summary>
    internal static MemorySlotInfo[] GetMemoryInfo()
    {
        var list = new List<MemorySlotInfo>();
        using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_PhysicalMemory");
        foreach (ManagementObject obj in searcher.Get())
        {
            list.Add(new MemorySlotInfo
            {
                DeviceLocator = GetString(obj, "DeviceLocator"),
                Manufacturer = GetString(obj, "Manufacturer"),
                CapacityBytes = GetUInt64(obj, "Capacity"),
                SpeedMhz = GetUInt32(obj, "Speed"),
                MemoryType = GetMemoryTypeName(GetUInt32(obj, "MemoryType")),
                FormFactor = GetFormFactorName(GetUInt32(obj, "FormFactor")),
                DataWidth = GetUInt32(obj, "DataWidth"),
                PartNumber = GetString(obj, "PartNumber"),
                SerialNumber = GetString(obj, "SerialNumber"),
            });
        }
        return list.ToArray();
    }

    // ───────────────────────── 硬盘 ─────────────────────────

    /// <summary>获取硬盘信息</summary>
    internal static DiskInfo[] GetDiskInfo()
    {
        var list = new List<DiskInfo>();
        using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_DiskDrive");
        foreach (ManagementObject obj in searcher.Get())
        {
            list.Add(new DiskInfo
            {
                Model = GetString(obj, "Model"),
                Manufacturer = GetString(obj, "Manufacturer"),
                SizeBytes = GetUInt64(obj, "Size"),
                MediaType = GetString(obj, "MediaType"),
                InterfaceType = GetString(obj, "InterfaceType"),
                Partitions = GetUInt32(obj, "Partitions"),
                SerialNumber = GetString(obj, "SerialNumber"),
                Status = GetString(obj, "Status"),
            });
        }
        return list.ToArray();
    }

    // ───────────────────────── 网卡 ─────────────────────────

    /// <summary>获取物理网卡信息</summary>
    internal static NetworkAdapterInfo[] GetNetworkAdapterInfo()
    {
        var list = new List<NetworkAdapterInfo>();
        using var searcher = new ManagementObjectSearcher(
            "SELECT * FROM Win32_NetworkAdapter WHERE PhysicalAdapter = TRUE");
        foreach (ManagementObject obj in searcher.Get())
        {
            list.Add(new NetworkAdapterInfo
            {
                Name = GetString(obj, "Name"),
                Manufacturer = GetString(obj, "Manufacturer"),
                MacAddress = GetString(obj, "MACAddress"),
                AdapterType = GetString(obj, "AdapterType"),
                SpeedBps = GetUInt32(obj, "Speed"),
                NetConnectionStatus = GetUInt16(obj, "NetConnectionStatus") == 2,
                PnpDeviceId = GetString(obj, "PNPDeviceID"),
                Status = GetString(obj, "Status"),
            });
        }
        return list.ToArray();
    }

    // ───────────────────────── 蓝牙 ─────────────────────────

    /// <summary>获取已配对的蓝牙设备</summary>
    internal static BluetoothDeviceInfo[] GetBluetoothDevices()
    {
        var list = new List<BluetoothDeviceInfo>();
        using var searcher = new ManagementObjectSearcher(
            "SELECT * FROM Win32_PnPEntity WHERE PNPClass = 'Bluetooth'");
        foreach (ManagementObject obj in searcher.Get())
        {
            list.Add(new BluetoothDeviceInfo
            {
                Name = GetString(obj, "Name"),
                DeviceId = GetString(obj, "DeviceID"),
                PnpDeviceId = GetString(obj, "PNPDeviceID"),
                Status = GetString(obj, "Status"),
            });
        }
        return list.ToArray();
    }

    // ───────────────────────── 主板 ─────────────────────────

    /// <summary>获取主板信息</summary>
    internal static MotherboardInfo[] GetMotherboardInfo()
    {
        var list = new List<MotherboardInfo>();
        using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_BaseBoard");
        foreach (ManagementObject obj in searcher.Get())
        {
            list.Add(new MotherboardInfo
            {
                Manufacturer = GetString(obj, "Manufacturer"),
                Product = GetString(obj, "Product"),
                SerialNumber = GetString(obj, "SerialNumber"),
                Version = GetString(obj, "Version"),
            });
        }
        return list.ToArray();
    }

    // ───────────────────────── 显示器 ─────────────────────────

    /// <summary>获取显示器信息</summary>
    internal static MonitorInfo[] GetMonitorInfo()
    {
        var list = new List<MonitorInfo>();
        // DesktopMonitor 没有分辨率，需要结合 VideoController
        // 但 WMI 的 Win32_DesktopMonitor 已废弃，使用 WmiMonitorBasicDisplayParams 获取物理信息
        // 这里使用 Win32_DesktopMonitor + Win32_VideoController 的组合
        // 先尝试 WmiMonitorBasicDisplayParams（需要 root\wmi 命名空间）
        try
        {
            using var searcher = new ManagementObjectSearcher(
                @"root\wmi",
                "SELECT * FROM WmiMonitorBasicDisplayParams");
            uint index = 0;
            foreach (ManagementObject obj in searcher.Get())
            {
                index++;
                list.Add(new MonitorInfo
                {
                    Name = $"Monitor {index}",
                    Manufacturer = GetMonitorManufacturerName(GetUInt16(obj, "ManufacturerName")),
                    ScreenWidth = GetUInt32(obj, "MaxHorizontalImageSize"),
                    ScreenHeight = GetUInt32(obj, "MaxVerticalImageSize"),
                    PnpDeviceId = GetString(obj, "InstanceName"),
                });
            }
        }
        catch
        {
            // WmiMonitorBasicDisplayParams 可能不可用，静默回退
        }

        // 如果没有从 WMI 获取到，回退到 Win32_DesktopMonitor
        if (list.Count == 0)
        {
            using var fallback = new ManagementObjectSearcher(
                "SELECT * FROM Win32_DesktopMonitor");
            foreach (ManagementObject obj in fallback.Get())
            {
                list.Add(new MonitorInfo
                {
                    Name = GetString(obj, "Name"),
                    Manufacturer = GetString(obj, "MonitorManufacturer"),
                    ScreenWidth = GetUInt32(obj, "ScreenWidth"),
                    ScreenHeight = GetUInt32(obj, "ScreenHeight"),
                    PnpDeviceId = GetString(obj, "PNPDeviceID"),
                    Status = GetString(obj, "Status"),
                });
            }
        }

        return list.ToArray();
    }

    // ───────────────────────── 通用辅助方法 ─────────────────────────

    private static string? GetString(ManagementObject obj, string property)
    {
        try { return obj[property]?.ToString(); }
        catch { return null; }
    }

    private static uint? GetUInt32(ManagementObject obj, string property)
    {
        try { return obj[property] is uint v ? v : null; }
        catch { return null; }
    }

    private static ulong? GetUInt64(ManagementObject obj, string property)
    {
        try
        {
            var val = obj[property];
            return val switch
            {
                ulong u => u,
                uint u => u,
                _ => null
            };
        }
        catch { return null; }
    }

    private static ushort? GetUInt16(ManagementObject obj, string property)
    {
        try { return obj[property] is ushort v ? v : null; }
        catch { return null; }
    }

    private static string? GetWmiDate(ManagementObject obj, string property)
    {
        try
        {
            var raw = obj[property]?.ToString();
            if (string.IsNullOrEmpty(raw) || raw.Length < 8) return null;
            // WMI 日期格式: 20250101000000.000000+480
            return $"{raw[..4]}-{raw[4..6]}-{raw[6..8]}";
        }
        catch { return null; }
    }

    // ───────────────────────── 枚举映射 ─────────────────────────

    private static string? GetArchitectureName(uint? code) => code switch
    {
        0 => "x86",
        1 => "MIPS",
        2 => "Alpha",
        3 => "PowerPC",
        5 => "ARM",
        6 => "ia64",
        9 => "x64",
        12 => "ARM64",
        _ => null
    };

    private static string? GetMemoryTypeName(uint? code) => code switch
    {
        20 => "DDR",
        21 => "DDR2",
        24 => "DDR3",
        26 => "DDR4",
        30 => "DDR5",
        _ => code?.ToString()
    };

    private static string? GetFormFactorName(uint? code) => code switch
    {
        8 => "DIMM",
        12 => "SODIMM",
        _ => code?.ToString()
    };

    private static string? GetMonitorManufacturerName(ushort? code)
    {
        if (code == null) return null;
        // 标准显示器制造商代码表 (EDID)
        return code switch
        {
            0x22F0 => "Hewlett-Packard",
            0x22F5 => "Samsung",
            0x24D1 => "LG Philips",
            0x26CD => "Dell",
            0x38A3 => "Lenovo",
            0x4491 => "AU Optronics",
            0x4C2D => "Samsung",
            0x5A63 => "ViewSonic",
            _ => $"Unknown (0x{code:X4})"
        };
    }
}
