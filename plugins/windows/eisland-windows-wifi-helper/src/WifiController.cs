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

using Windows.Networking.Connectivity;

namespace eIslandWifiHelper;

/// <summary>
/// WiFi 状态查询控制器
/// </summary>
public static class WifiController
{
    /// <summary>WiFi 适配器 IANA 接口类型</summary>
    private const int WIFI_IANA_TYPE = 71;

    /// <summary>
    /// 获取当前 WiFi 连接状态快照
    /// </summary>
    public static WifiInfo GetWifiInfo()
    {
        return BuildWifiInfo();
    }

    /// <summary>
    /// 从 WinRT NetworkInformation 构建 WifiInfo
    /// </summary>
    public static WifiInfo BuildWifiInfo()
    {
        try
        {
            var profile = NetworkInformation.GetInternetConnectionProfile();
            if (profile == null)
            {
                return new WifiInfo
                {
                    IsConnected = false,
                    Ssid = null,
                    SignalBars = -1,
                    ConnectivityLevel = 0,
                    AdapterName = null,
                    IsWifiAdapter = false,
                };
            }

            var adapter = profile.NetworkAdapter;
            var isWifi = adapter?.IanaInterfaceType == WIFI_IANA_TYPE;
            var connectivityLevel = (int)profile.GetNetworkConnectivityLevel();
            var ssid = GetSsid(profile);
            var signalBars = -1;

            try
            {
                var bars = profile.GetSignalBars();
                if (bars.HasValue) signalBars = (int)bars.Value;
            }
            catch
            {
                // GetSignalBars 可能在某些配置下不可用
            }

            return new WifiInfo
            {
                IsConnected = connectivityLevel > 0,
                Ssid = ssid,
                SignalBars = signalBars,
                ConnectivityLevel = connectivityLevel,
                AdapterName = adapter?.NetworkAdapterId.ToString(),
                IsWifiAdapter = isWifi,
            };
        }
        catch
        {
            return new WifiInfo
            {
                IsConnected = false,
                Ssid = null,
                SignalBars = -1,
                ConnectivityLevel = 0,
                AdapterName = null,
                IsWifiAdapter = false,
            };
        }
    }

    /// <summary>
    /// 从 ConnectionProfile 提取 SSID
    /// </summary>
    private static string? GetSsid(ConnectionProfile profile)
    {
        try
        {
            var ssid = profile.WlanConnectionProfileDetails?.GetConnectedSsid();
            return string.IsNullOrEmpty(ssid) ? null : ssid;
        }
        catch
        {
            return null;
        }
    }
}
