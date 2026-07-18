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

namespace eIslandHardwareInfoHelper;

/// <summary>CPU 信息</summary>
public sealed class CpuInfo
{
    public string? Name { get; init; }
    public string? Manufacturer { get; init; }
    public uint? NumberOfCores { get; init; }
    public uint? NumberOfLogicalProcessors { get; init; }
    public uint? MaxClockSpeedMhz { get; init; }
    public uint? CurrentClockSpeedMhz { get; init; }
    public string? SocketDesignation { get; init; }
    public string? Architecture { get; init; }
    public uint? L2CacheSizeKb { get; init; }
    public uint? L3CacheSizeKb { get; init; }
}

/// <summary>GPU 信息</summary>
public sealed class GpuInfo
{
    public string? Name { get; init; }
    public string? Manufacturer { get; init; }
    public ulong? AdapterRamBytes { get; init; }
    public string? DriverVersion { get; init; }
    public string? DriverDate { get; init; }
    public string? VideoProcessor { get; init; }
    public uint? CurrentHorizontalResolution { get; init; }
    public uint? CurrentVerticalResolution { get; init; }
    public uint? CurrentRefreshRate { get; init; }
    public string? Status { get; init; }
}

/// <summary>内存条信息</summary>
public sealed class MemorySlotInfo
{
    public string? DeviceLocator { get; init; }
    public string? Manufacturer { get; init; }
    public ulong? CapacityBytes { get; init; }
    public uint? SpeedMhz { get; init; }
    public string? MemoryType { get; init; }
    public string? FormFactor { get; init; }
    public uint? DataWidth { get; init; }
    public string? PartNumber { get; init; }
    public string? SerialNumber { get; init; }
}

/// <summary>硬盘信息</summary>
public sealed class DiskInfo
{
    public string? Model { get; init; }
    public string? Manufacturer { get; init; }
    public ulong? SizeBytes { get; init; }
    public string? MediaType { get; init; }
    public string? InterfaceType { get; init; }
    public uint? Partitions { get; init; }
    public string? SerialNumber { get; init; }
    public string? Status { get; init; }
}

/// <summary>网卡信息</summary>
public sealed class NetworkAdapterInfo
{
    public string? Name { get; init; }
    public string? Manufacturer { get; init; }
    public string? MacAddress { get; init; }
    public string? AdapterType { get; init; }
    public uint? SpeedBps { get; init; }
    public bool? NetConnectionStatus { get; init; }
    public string? PnpDeviceId { get; init; }
    public string? Status { get; init; }
}

/// <summary>蓝牙设备信息（已配对）</summary>
public sealed class BluetoothDeviceInfo
{
    public string? Name { get; init; }
    public string? DeviceId { get; init; }
    public string? PnpDeviceId { get; init; }
    public string? Status { get; init; }
}

/// <summary>主板信息</summary>
public sealed class MotherboardInfo
{
    public string? Manufacturer { get; init; }
    public string? Product { get; init; }
    public string? SerialNumber { get; init; }
    public string? Version { get; init; }
}

/// <summary>显示器信息</summary>
public sealed class MonitorInfo
{
    public string? Name { get; init; }
    public string? Manufacturer { get; init; }
    public uint? ScreenWidth { get; init; }
    public uint? ScreenHeight { get; init; }
    public uint? RefreshRate { get; init; }
    public string? PnpDeviceId { get; init; }
    public string? Status { get; init; }
}
