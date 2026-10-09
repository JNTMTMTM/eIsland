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

using Windows.Devices.Bluetooth;
using Windows.Devices.Bluetooth.GenericAttributeProfile;
using Windows.Devices.Enumeration;

namespace eIslandBluetoothHelper;

/// <summary>
/// 蓝牙设备查询控制器
/// </summary>
public static class BluetoothController
{
    /// <summary>
    /// 查询经典蓝牙 + BLE 设备，合并去重
    /// </summary>
    private static DeviceInformation[] FindAllBluetoothDevices(string? extraFilter = null)
    {
        var results = new Dictionary<string, DeviceInformation>();

        // 经典蓝牙
        try
        {
            var selector = BluetoothDevice.GetDeviceSelector();
            if (extraFilter != null) selector = $"({selector}) AND ({extraFilter})";
            var devices = DeviceInformation.FindAllAsync(selector).GetAwaiter().GetResult();
            foreach (var d in devices) results.TryAdd(d.Id, d);
        }
        catch { /* 忽略 */ }

        // BLE
        try
        {
            var selector = BluetoothLEDevice.GetDeviceSelector();
            if (extraFilter != null) selector = $"({selector}) AND ({extraFilter})";
            var devices = DeviceInformation.FindAllAsync(selector).GetAwaiter().GetResult();
            foreach (var d in devices) results.TryAdd(d.Id, d);
        }
        catch { /* 忽略 */ }

        return results.Values.ToArray();
    }

    /// <summary>
    /// 获取所有已配对的蓝牙设备
    /// </summary>
    public static BluetoothDeviceInfo[] GetPairedDevices()
    {
        try
        {
            return FindAllBluetoothDevices().Select(BuildDeviceInfo).ToArray();
        }
        catch
        {
            return [];
        }
    }

    /// <summary>
    /// 获取所有已连接的蓝牙设备
    /// </summary>
    public static BluetoothDeviceInfo[] GetConnectedDevices()
    {
        try
        {
            return FindAllBluetoothDevices("System.Devices.Aep.IsConnected:=System.StructuredQueryType.Boolean#True")
                .Select(BuildDeviceInfo).ToArray();
        }
        catch
        {
            return [];
        }
    }

    /// <summary>
    /// 获取所有可见蓝牙设备（已配对 + 附近 BLE 广播）
    /// </summary>
    public static BluetoothDeviceInfo[] GetAllDevices()
    {
        try
        {
            return FindAllBluetoothDevices().Select(BuildDeviceInfo).ToArray();
        }
        catch
        {
            return [];
        }
    }

    /// <summary>
    /// 获取单个设备快照
    /// </summary>
    /// <param name="deviceId">Windows DeviceInformation ID</param>
    public static BluetoothDeviceInfo? GetDevice(string deviceId)
    {
        try
        {
            var device = DeviceInformation.CreateFromIdAsync(deviceId).GetAwaiter().GetResult();
            return device != null ? BuildDeviceInfo(device) : null;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// 获取经典蓝牙设备的 AQS 选择器（用于 DeviceWatcher）
    /// </summary>
    public static string GetClassicSelector() => BluetoothDevice.GetDeviceSelector();

    /// <summary>
    /// 获取 BLE 设备的 AQS 选择器（用于 DeviceWatcher）
    /// </summary>
    public static string GetBleSelector() => BluetoothLEDevice.GetDeviceSelector();

    /// <summary>
    /// 从 DeviceInformation 构建 BluetoothDeviceInfo
    /// </summary>
    public static BluetoothDeviceInfo BuildDeviceInfo(DeviceInformation device)
    {
        // 基础属性（FindAllAsync 默认返回）
        string? address = null;
        int? rssi = null;
        int? deviceClass = null;
        int? appearance = null;
        string[] serviceUuids = [];
        bool isConnected = false;
        bool isPaired = false;
        int? batteryLevel = null;

        // 尝试从 Properties 读取（需要 ExtraProperties 才有值）
        try { if (device.Properties["System.Devices.Aep.DeviceAddress"] is string addr && !string.IsNullOrEmpty(addr)) address = addr; } catch { }
        try { if (device.Properties["System.Devices.Aep.SignalStrength"] is int signal) rssi = signal; } catch { }
        try { if (device.Properties["System.Devices.Aep.IsConnected"] is bool conn) isConnected = conn; } catch { }
        try { if (device.Properties["System.Devices.Aep.IsPaired"] is bool paired) isPaired = paired; } catch { }

        // CoD、Appearance、ServiceGuids 不支持 FindAllAsync 的规范名，通过 EnrichFromBluetoothDevice 补充
        EnrichFromBluetoothDevice(device.Id, ref isConnected, ref isPaired, ref address, ref rssi,
            ref deviceClass, ref appearance, ref serviceUuids, ref batteryLevel);

        return new BluetoothDeviceInfo
        {
            DeviceId = device.Id,
            Name = device.Name,
            BluetoothAddress = address,
            IsConnected = isConnected,
            IsPaired = isPaired,
            SignalStrength = rssi,
            DeviceClass = deviceClass,
            Appearance = appearance,
            ServiceUuids = serviceUuids,
            DeviceType = DeviceTypeMapper.DeriveDeviceType(deviceClass, appearance),
            BatteryLevel = batteryLevel,
        };
    }

    /// <summary>
    /// 通过 BluetoothDevice / BluetoothLEDevice 对象补充属性；BLE 设备同时读取电量
    /// </summary>
    private static void EnrichFromBluetoothDevice(
        string deviceId,
        ref bool isConnected,
        ref bool isPaired,
        ref string? address,
        ref int? rssi,
        ref int? deviceClass,
        ref int? appearance,
        ref string[] serviceUuids,
        ref int? batteryLevel)
    {
        // 尝试 BLE（优先，可获取电量、Appearance、ServiceUuids）
        try
        {
            using var ble = BluetoothLEDevice.FromIdAsync(deviceId).GetAwaiter().GetResult();
            if (ble != null)
            {
                isConnected = ble.ConnectionStatus == BluetoothConnectionStatus.Connected;
                isPaired = true;
                address = ble.BluetoothAddress.ToString("X12");

                // BLE Appearance（BluetoothLEAppearance）
                try { if (ble.Appearance != null) appearance = ble.Appearance.RawValue; } catch { }

                // 同一次枚举同时读取服务 UUID 和电量，并释放所有原生服务句柄。
                try
                {
                    var svcResult = ble.GetGattServicesAsync(BluetoothCacheMode.Cached).GetAwaiter().GetResult();
                    try
                    {
                        if (svcResult.Status == GattCommunicationStatus.Success)
                        {
                            serviceUuids = svcResult.Services.Select(s => s.Uuid.ToString()).ToArray();
                            var batteryService = svcResult.Services.FirstOrDefault(s => s.Uuid == GattServiceUuids.Battery);
                            if (batteryService != null) batteryLevel = ReadBleBatteryLevel(batteryService);
                        }
                    }
                    finally
                    {
                        foreach (var service in svcResult.Services)
                        {
                            try { service.Dispose(); } catch { }
                        }
                    }
                }
                catch { }

                return;
            }
        }
        catch { /* 非 BLE 设备，忽略 */ }

        // 尝试经典蓝牙
        try
        {
            using var bt = BluetoothDevice.FromIdAsync(deviceId).GetAwaiter().GetResult();
            if (bt != null)
            {
                isConnected = bt.ConnectionStatus == BluetoothConnectionStatus.Connected;
                isPaired = true;
                address = bt.BluetoothAddress.ToString("X12");

                // 经典蓝牙 Class of Device
                try { if (bt.ClassOfDevice != null) deviceClass = (int)bt.ClassOfDevice.RawValue; } catch { }

                return;
            }
        }
        catch { /* 忽略 */ }
    }

    /// <summary>
    /// 通过 GATT Battery Service (0x180F) 读取 BLE 设备电量百分比
    /// </summary>
    /// <param name="service">调用方持有并负责释放的 Battery Service</param>
    private static int? ReadBleBatteryLevel(GattDeviceService service)
    {
        try
        {
            var characteristics = service.GetCharacteristicsAsync(BluetoothCacheMode.Cached).GetAwaiter().GetResult();
            if (characteristics.Status != GattCommunicationStatus.Success) return null;

            // Battery Level characteristic (UUID 0x2A19)
            var batteryChar = characteristics.Characteristics.FirstOrDefault(c =>
                c.Uuid == GattCharacteristicUuids.BatteryLevel);
            if (batteryChar == null) return null;

            if (!batteryChar.CharacteristicProperties.HasFlag(GattCharacteristicProperties.Read))
                return null;

            var valueResult = batteryChar.ReadValueAsync().GetAwaiter().GetResult();
            if (valueResult.Status != GattCommunicationStatus.Success) return null;

            using var reader = Windows.Storage.Streams.DataReader.FromBuffer(valueResult.Value);
            return reader.ReadByte(); // 0–100
        }
        catch
        {
            return null;
        }
    }
}
