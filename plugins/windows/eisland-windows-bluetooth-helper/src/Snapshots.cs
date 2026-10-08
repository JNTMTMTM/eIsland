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

namespace eIslandBluetoothHelper;

/// <summary>
/// 蓝牙设备信息快照
/// </summary>
public class BluetoothDeviceInfo
{
    /// <summary>设备 ID（Windows DeviceInformation ID）</summary>
    public required string DeviceId { get; init; }

    /// <summary>设备友好名称</summary>
    public string? Name { get; init; }

    /// <summary>蓝牙地址（MAC，十六进制字符串）</summary>
    public string? BluetoothAddress { get; init; }

    /// <summary>是否已连接</summary>
    public bool IsConnected { get; init; }

    /// <summary>是否已配对</summary>
    public bool IsPaired { get; init; }

    /// <summary>信号强度 (RSSI dBm)，不可用时为 null</summary>
    public int? SignalStrength { get; init; }

    /// <summary>设备类别（CoD）</summary>
    public int? DeviceClass { get; init; }

    /// <summary>外观类别（BLE Appearance）</summary>
    public int? Appearance { get; init; }

    /// <summary>设备支持的 GATT 服务 UUID 列表</summary>
    public string[] ServiceUuids { get; init; } = [];

    /// <summary>
    /// 设备类型：BLE 从 Appearance 推导（如 "HID"、"Watch"），经典蓝牙从 CoD 推导（如 "Headphones"、"Speaker"、"Printer"、"Phone"）
    /// </summary>
    public string? DeviceType { get; init; }

    /// <summary>电池电量百分比 (0–100)，仅 BLE 设备可用，不可用时为 null</summary>
    public int? BatteryLevel { get; init; }
}
