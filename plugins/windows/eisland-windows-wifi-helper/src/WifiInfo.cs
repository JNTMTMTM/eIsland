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

namespace eIslandWifiHelper;

/// <summary>
/// WiFi 连接状态快照
/// </summary>
public class WifiInfo
{
    /// <summary>是否已连接 WiFi</summary>
    public bool IsConnected { get; init; }

    /// <summary>WiFi 网络名称 (SSID)，未连接时为 null</summary>
    public string? Ssid { get; init; }

    /// <summary>
    /// 信号强度 (0-5)，-1 表示不可用
    /// 通过 ConnectionProfile.GetSignalBars() 获取
    /// </summary>
    public int SignalBars { get; init; }

    /// <summary>
    /// 网络连接级别
    /// 0=None（无连接）, 1=LocalAccess（仅本地）, 2=ConstrainedInternetAccess（受限）, 3=InternetAccess（完全联网）
    /// </summary>
    public int ConnectivityLevel { get; init; }

    /// <summary>适配器名称，无 WiFi 适配器时为 null</summary>
    public string? AdapterName { get; init; }

    /// <summary>是否为 WiFi 适配器（IANA type 71）</summary>
    public bool IsWifiAdapter { get; init; }
}
