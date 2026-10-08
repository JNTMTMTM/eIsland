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

using Windows.System.Power;

namespace eIslandPowerHelper;

/// <summary>
/// 电源状态查询控制器
/// </summary>
public static class PowerController
{
    /// <summary>
    /// 获取当前电源状态快照
    /// </summary>
    public static PowerInfo GetPowerInfo()
    {
        return BuildPowerInfo();
    }

    /// <summary>
    /// 从 WinRT PowerManager 构建 PowerInfo
    /// </summary>
    public static PowerInfo BuildPowerInfo()
    {
        var batteryStatus = (int)PowerManager.BatteryStatus;
        var powerSupplyStatus = (int)PowerManager.PowerSupplyStatus;
        var remainingChargePercent = PowerManager.RemainingChargePercent;
        var energySaverStatus = (int)PowerManager.EnergySaverStatus;

        // BatteryStatus: 0=NotPresent, 1=Discharging, 2=Idle, 3=Charging
        var hasBattery = batteryStatus != 0;
        var isCharging = batteryStatus == 3;
        // BatteryStatus != Discharging 即视为已接通 AC 电源
        // （充电中/空闲/无电池 都表示外部供电）
        var isOnAcPower = batteryStatus != 1;

        return new PowerInfo
        {
            RemainingChargePercent = remainingChargePercent,
            BatteryStatus = batteryStatus,
            PowerSupplyStatus = powerSupplyStatus,
            EnergySaverStatus = energySaverStatus,
            HasBattery = hasBattery,
            IsCharging = isCharging,
            IsOnAcPower = isOnAcPower,
        };
    }
}
