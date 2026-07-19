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
using System.Text.Json;

var command = args.FirstOrDefault() ?? "";
var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);

try
{
    string json = command switch
    {
        "cpu"          => JsonSerializer.Serialize(HardwareInfoHelper.GetCpuInfo(), jsonOptions),
        "gpu"          => JsonSerializer.Serialize(HardwareInfoHelper.GetGpuInfo(), jsonOptions),
        "memory"       => JsonSerializer.Serialize(HardwareInfoHelper.GetMemoryInfo(), jsonOptions),
        "disk"         => JsonSerializer.Serialize(HardwareInfoHelper.GetDiskInfo(), jsonOptions),
        "network"      => JsonSerializer.Serialize(HardwareInfoHelper.GetNetworkAdapterInfo(), jsonOptions),
        "bluetooth"    => JsonSerializer.Serialize(HardwareInfoHelper.GetBluetoothDevices(), jsonOptions),
        "motherboard"  => JsonSerializer.Serialize(HardwareInfoHelper.GetMotherboardInfo(), jsonOptions),
        "monitor"      => JsonSerializer.Serialize(HardwareInfoHelper.GetMonitorInfo(), jsonOptions),
        _              => JsonSerializer.Serialize(new { error = $"Unknown command: {command}" }, jsonOptions)
    };
    Console.WriteLine(json);
}
catch (Exception ex)
{
    Console.WriteLine(JsonSerializer.Serialize(new { error = ex.Message }, jsonOptions));
}

static class HardwareInfoHelper
{
    // ───────────────────────── CPU ─────────────────────────

    public static object[] GetCpuInfo()
    {
        var list = new List<object>();
        using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Processor");
        using var collection = searcher.Get();
        foreach (ManagementObject obj in collection)
        {
            using (obj)
            {
                list.Add(new
                {
                    name                    = Str(obj, "Name"),
                    manufacturer            = Str(obj, "Manufacturer"),
                    numberOfCores           = Uint(obj, "NumberOfCores"),
                    numberOfLogicalProcessors = Uint(obj, "NumberOfLogicalProcessors"),
                    maxClockSpeedMhz        = Uint(obj, "MaxClockSpeed"),
                    currentClockSpeedMhz    = Uint(obj, "CurrentClockSpeed"),
                    socketDesignation       = Str(obj, "SocketDesignation"),
                    architecture            = ArchName(Uint(obj, "Architecture")),
                    l2CacheSizeKb           = Uint(obj, "L2CacheSize"),
                    l3CacheSizeKb           = Uint(obj, "L3CacheSize"),
                });
            }
        }
        return list.ToArray();
    }

    // ───────────────────────── GPU ─────────────────────────

    public static object[] GetGpuInfo()
    {
        var list = new List<object>();
        using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_VideoController");
        using var collection = searcher.Get();
        foreach (ManagementObject obj in collection)
        {
            using (obj)
            {
                list.Add(new
                {
                    name                        = Str(obj, "Name"),
                    manufacturer                = Str(obj, "AdapterCompatibility"),
                    adapterRamBytes             = Ulong(obj, "AdapterRAM"),
                    driverVersion               = Str(obj, "DriverVersion"),
                    driverDate                  = WmiDate(obj, "DriverDate"),
                    videoProcessor              = Str(obj, "VideoProcessor"),
                    currentHorizontalResolution = Uint(obj, "CurrentHorizontalResolution"),
                    currentVerticalResolution   = Uint(obj, "CurrentVerticalResolution"),
                    currentRefreshRate          = Uint(obj, "CurrentRefreshRate"),
                    status                      = Str(obj, "Status"),
                });
            }
        }
        return list.ToArray();
    }

    // ───────────────────────── 内存 ─────────────────────────

    public static object[] GetMemoryInfo()
    {
        var list = new List<object>();
        using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_PhysicalMemory");
        using var collection = searcher.Get();
        foreach (ManagementObject obj in collection)
        {
            using (obj)
            {
                list.Add(new
                {
                    deviceLocator   = Str(obj, "DeviceLocator"),
                    manufacturer    = Str(obj, "Manufacturer"),
                    capacityBytes   = Ulong(obj, "Capacity"),
                    speedMhz        = Uint(obj, "Speed"),
                    memoryType      = MemTypeName(Uint(obj, "MemoryType")),
                    formFactor      = FormFactorName(Uint(obj, "FormFactor")),
                    dataWidth       = Uint(obj, "DataWidth"),
                    partNumber      = Str(obj, "PartNumber"),
                    serialNumber    = Str(obj, "SerialNumber"),
                });
            }
        }
        return list.ToArray();
    }

    // ───────────────────────── 硬盘 ─────────────────────────

    public static object[] GetDiskInfo()
    {
        var list = new List<object>();
        using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_DiskDrive");
        using var collection = searcher.Get();
        foreach (ManagementObject obj in collection)
        {
            using (obj)
            {
                list.Add(new
                {
                    model           = Str(obj, "Model"),
                    manufacturer    = Str(obj, "Manufacturer"),
                    sizeBytes       = Ulong(obj, "Size"),
                    mediaType       = Str(obj, "MediaType"),
                    interfaceType   = Str(obj, "InterfaceType"),
                    partitions      = Uint(obj, "Partitions"),
                    serialNumber    = Str(obj, "SerialNumber"),
                    status          = Str(obj, "Status"),
                });
            }
        }
        return list.ToArray();
    }

    // ───────────────────────── 网卡 ─────────────────────────

    public static object[] GetNetworkAdapterInfo()
    {
        var list = new List<object>();
        using var searcher = new ManagementObjectSearcher(
            "SELECT * FROM Win32_NetworkAdapter WHERE PhysicalAdapter = TRUE");
        using var collection = searcher.Get();
        foreach (ManagementObject obj in collection)
        {
            using (obj)
            {
                list.Add(new
                {
                    name                = Str(obj, "Name"),
                    manufacturer        = Str(obj, "Manufacturer"),
                    macAddress          = Str(obj, "MACAddress"),
                    adapterType         = Str(obj, "AdapterType"),
                    speedBps            = Ulong(obj, "Speed"),
                    netConnectionStatus = Ushort(obj, "NetConnectionStatus") == 2,
                    pnpDeviceId         = Str(obj, "PNPDeviceID"),
                    status              = Str(obj, "Status"),
                });
            }
        }
        return list.ToArray();
    }

    // ───────────────────────── 蓝牙 ─────────────────────────

    public static object[] GetBluetoothDevices()
    {
        var list = new List<object>();
        using var searcher = new ManagementObjectSearcher(
            "SELECT * FROM Win32_PnPEntity WHERE PNPClass = 'Bluetooth'");
        using var collection = searcher.Get();
        foreach (ManagementObject obj in collection)
        {
            using (obj)
            {
                list.Add(new
                {
                    name        = Str(obj, "Name"),
                    deviceId    = Str(obj, "DeviceID"),
                    pnpDeviceId = Str(obj, "PNPDeviceID"),
                    status      = Str(obj, "Status"),
                });
            }
        }
        return list.ToArray();
    }

    // ───────────────────────── 主板 ─────────────────────────

    public static object[] GetMotherboardInfo()
    {
        var list = new List<object>();
        using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_BaseBoard");
        using var collection = searcher.Get();
        foreach (ManagementObject obj in collection)
        {
            using (obj)
            {
                list.Add(new
                {
                    manufacturer = Str(obj, "Manufacturer"),
                    product      = Str(obj, "Product"),
                    serialNumber = Str(obj, "SerialNumber"),
                    version      = Str(obj, "Version"),
                });
            }
        }
        return list.ToArray();
    }

    // ───────────────────────── 显示器 ─────────────────────────

    public static object[] GetMonitorInfo()
    {
        var list = new List<object>();

        try
        {
            using var searcher = new ManagementObjectSearcher(
                @"root\wmi", "SELECT * FROM WmiMonitorBasicDisplayParams");
            using var collection = searcher.Get();
            uint index = 0;
            foreach (ManagementObject obj in collection)
            {
                using (obj)
                {
                    index++;
                    list.Add(new
                    {
                        name         = $"Monitor {index}",
                        manufacturer = MfgName(Ushort(obj, "ManufacturerName")),
                        screenWidth  = Uint(obj, "MaxHorizontalImageSize"),
                        screenHeight = Uint(obj, "MaxVerticalImageSize"),
                        pnpDeviceId  = Str(obj, "InstanceName"),
                    });
                }
            }
        }
        catch { /* WmiMonitorBasicDisplayParams 可能不可用 */ }

        if (list.Count == 0)
        {
            using var fallback = new ManagementObjectSearcher(
                "SELECT * FROM Win32_DesktopMonitor");
            using var collection = fallback.Get();
            foreach (ManagementObject obj in collection)
            {
                using (obj)
                {
                    list.Add(new
                    {
                        name         = Str(obj, "Name"),
                        manufacturer = Str(obj, "MonitorManufacturer"),
                        screenWidth  = Uint(obj, "ScreenWidth"),
                        screenHeight = Uint(obj, "ScreenHeight"),
                        pnpDeviceId  = Str(obj, "PNPDeviceID"),
                        status       = Str(obj, "Status"),
                    });
                }
            }
        }

        return list.ToArray();
    }

    // ───────────────────────── WMI 属性读取辅助 ─────────────────────────

    static string? Str(ManagementObject o, string p)
    { try { return o[p]?.ToString(); } catch { return null; } }

    static uint? Uint(ManagementObject o, string p)
    { try { return o[p] is uint v ? v : null; } catch { return null; } }

    static ulong? Ulong(ManagementObject o, string p)
    { try { var v = o[p]; return v switch { ulong u => u, uint u2 => u2, _ => null }; } catch { return null; } }

    static ushort? Ushort(ManagementObject o, string p)
    { try { return o[p] is ushort v ? v : null; } catch { return null; } }

    static string? WmiDate(ManagementObject o, string p)
    {
        try
        {
            var r = o[p]?.ToString();
            if (string.IsNullOrEmpty(r) || r.Length < 8) return null;
            return $"{r[..4]}-{r[4..6]}-{r[6..8]}";
        }
        catch { return null; }
    }

    // ───────────────────────── 枚举名称映射 ─────────────────────────

    static string? ArchName(uint? c) => c switch
    {
        0 => "x86", 1 => "MIPS", 2 => "Alpha", 3 => "PowerPC",
        5 => "ARM", 6 => "ia64", 9 => "x64", 12 => "ARM64",
        _ => null
    };

    static string? MemTypeName(uint? c) => c switch
    {
        20 => "DDR", 21 => "DDR2", 24 => "DDR3", 26 => "DDR4", 30 => "DDR5",
        _ => c?.ToString()
    };

    static string? FormFactorName(uint? c) => c switch
    {
        8 => "DIMM", 12 => "SODIMM",
        _ => c?.ToString()
    };

    static string? MfgName(ushort? c) => c switch
    {
        0x22F0 => "Hewlett-Packard", 0x22F5 => "Samsung", 0x24D1 => "LG Philips",
        0x26CD => "Dell", 0x38A3 => "Lenovo", 0x4491 => "AU Optronics",
        0x4C2D => "Samsung", 0x5A63 => "ViewSonic",
        _ => c.HasValue ? $"Unknown (0x{c.Value:X4})" : null
    };
}
