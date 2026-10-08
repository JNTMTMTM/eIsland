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

/**
 * @file Program.cs
 * @description 使用实际监控实现和阻塞的回调锁验证异步停止、串行重启及取消重启。
 * @author 鸡哥
 */

using System.Diagnostics;
using System.Reflection;
using eIslandBluetoothHelper;

const BindingFlags flags = BindingFlags.NonPublic | BindingFlags.Static;
var monitorType = typeof(BluetoothDeviceMonitor);
var deviceLock = monitorType.GetField("_deviceLock", flags)!.GetValue(null)!;
var threadField = monitorType.GetField("_monitorThread", flags)!;
var restartField = monitorType.GetField("_restartRequested", flags)!;
var lifecycleLock = monitorType.GetField("_lifecycleLock", flags)!.GetValue(null)!;
var longestStopMs = 0L;

for (var cancelRestart = 0; cancelRestart < 2; cancelRestart++)
{
    Thread? oldThread;
    lock (deviceLock)
    {
        if (BluetoothDeviceMonitor.StartMonitoring() != 0) throw new Exception("Initial start failed");
        oldThread = (Thread?)threadField.GetValue(null);
        var timer = Stopwatch.StartNew();
        BluetoothDeviceMonitor.StopMonitoring();
        timer.Stop();
        if (BluetoothDeviceMonitor.GetChangeCounter() != -1) throw new Exception("Stopped monitor exposed the previous counter");
        longestStopMs = Math.Max(longestStopMs, timer.ElapsedMilliseconds);
        if (timer.ElapsedMilliseconds > 500) throw new Exception("Stop waited for a blocked device callback");
        if (BluetoothDeviceMonitor.StartMonitoring() != 0) throw new Exception("Restart rejected during cleanup");
        lock (lifecycleLock)
        {
            if (!(bool)restartField.GetValue(null)!) throw new Exception("Restart was not queued");
            if (!ReferenceEquals(oldThread, threadField.GetValue(null))) throw new Exception("Overlapping monitor threads");
        }
        if (cancelRestart != 0) BluetoothDeviceMonitor.StopMonitoring();
    }

    if (oldThread?.Join(5000) == false) throw new Exception("Old monitor did not finish cleanup");
    lock (lifecycleLock)
    {
        var currentThread = (Thread?)threadField.GetValue(null);
        if (cancelRestart == 0 && (currentThread == null || ReferenceEquals(currentThread, oldThread)))
            throw new Exception("Pending restart did not start automatically");
        if (cancelRestart != 0 && currentThread != null)
            throw new Exception("Cancelled restart started anyway");
    }
    BluetoothDeviceMonitor.StopMonitoring();
    Thread? remaining;
    lock (lifecycleLock) remaining = (Thread?)threadField.GetValue(null);
    if (remaining?.Join(5000) == false) throw new Exception("Monitor cleanup timed out");
}

Console.WriteLine($"Passed delayed callback restart/cancellation; longest StopMonitoring: {longestStopMs} ms");
