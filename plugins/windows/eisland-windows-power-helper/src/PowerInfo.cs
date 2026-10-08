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

namespace eIslandPowerHelper;

/// <summary>
/// 电源状态快照
/// </summary>
public class PowerInfo
{
    /// <summary>电池电量百分比 (0-100)，台式机无电池时为 100</summary>
    public int RemainingChargePercent { get; init; }

    /// <summary>
    /// 电池状态
    /// 0=NotPresent（台式机/无电池）, 1=Discharging, 2=Idle（已满未拔电）, 3=Charging
    /// </summary>
    public int BatteryStatus { get; init; }

    /// <summary>
    /// 电源供应状态
    /// 0=NotPresent, 1=Adequate（供电充足）, 2=Inadequate（供电不足）, 3=Unknown
    /// </summary>
    public int PowerSupplyStatus { get; init; }

    /// <summary>省电模式状态。0=Disabled, 1=Off, 2=On</summary>
    public int EnergySaverStatus { get; init; }

    /// <summary>是否有电池</summary>
    public bool HasBattery { get; init; }

    /// <summary>是否正在充电</summary>
    public bool IsCharging { get; init; }

    /// <summary>是否已接通电源（AC 电源）。BatteryStatus != Discharging 即视为已接通</summary>
    public bool IsOnAcPower { get; init; }
}
