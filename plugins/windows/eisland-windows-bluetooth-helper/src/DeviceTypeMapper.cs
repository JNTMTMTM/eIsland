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
/// 蓝牙设备类型推导；基于 BLE Appearance Category 和经典蓝牙 CoD（Major + Minor Class）
/// 参考：蓝牙 SIG Assigned Numbers — Device Class / Appearance Values
/// </summary>
public static class DeviceTypeMapper
{
    /// <summary>
    /// 推导可读设备类型；优先 BLE Appearance，回退到经典蓝牙 CoD（Major + Minor Class）
    /// </summary>
    /// <param name="cod">经典蓝牙 Class of Device（BluetoothClassOfDevice 原始值）</param>
    /// <param name="appearance">BLE Appearance（BluetoothLEAppearance 原始值）</param>
    public static string? DeriveDeviceType(int? cod, int? appearance)
    {
        // BLE 设备：从 Appearance 的 Category 字段（bits 6-15）推导
        string? bleType = DeriveBleType(appearance);
        if (bleType != null) return bleType;

        // 经典蓝牙：从 CoD 的 Major Device Class（bits 8-12）+ Minor Device Class（bits 2-7）推导
        return DeriveClassicType(cod);
    }

    /// <summary>
    /// BLE Appearance Category → 设备类型（bits 6-15）
    /// </summary>
    private static string? DeriveBleType(int? appearance)
    {
        if (appearance is not > 0) return null;
        int category = appearance.Value >> 6;
        return BleCategoryMap(category);
    }

    /// <summary>
    /// BLE Appearance Category switch（独立方法，便于测试和维护）
    /// </summary>
    internal static string? BleCategoryMap(int category) => category switch
    {
        0x01 => "Phone",
        0x02 => "Computer",
        0x03 => "Watch",
        0x04 => "Clock",
        0x05 => "Display",
        0x06 => "RemoteControl",
        0x07 => "Eyeglasses",
        0x08 => "Tag",
        0x09 => "Keyring",
        0x0A => "MediaPlayer",
        0x0B => "BarcodeScanner",
        0x0C => "Thermometer",
        0x0D => "HeartRate",
        0x0E => "BloodPressure",
        0x0F => "HID",
        0x10 => "Glucose",
        0x11 => "RunningWalking",
        0x12 => "Cycling",
        0x13 => "ControlDevice",
        0x14 => "Sensor",
        0x15 => "LightFixtures",
        0x16 => "Fan",
        0x17 => "HVAC",
        0x18 => "AirConditioning",
        0x19 => "Humidifier",
        0x1A => "Heating",
        0x1B => "AccessControl",
        0x1C => "MotorizedDevice",
        0x1D => "PowerTool",
        0x1E => "LightSource",
        0x1F => "WindowCovering",
        0x20 => "AudioSink",
        0x21 => "AudioSource",
        0x22 => "Robot",
        0x23 => "Display",
        0x30 => "Keyboard",
        0x31 => "Mouse",
        0x32 => "Joystick",
        0x33 => "Gamepad",
        0x40 => "RemoteControl",
        0x51 => "PulseOximeter",
        0x52 => "WeightScale",
        0x53 => "OutdoorSports",
        _ => null,
    };

    /// <summary>
    /// 经典蓝牙 CoD → 设备类型（Major Class bits 8-12 + Minor Class bits 2-7）
    /// </summary>
    private static string? DeriveClassicType(int? cod)
    {
        if (cod is not > 0) return null;
        int major = (cod.Value >> 8) & 0x1F;
        int minor = (cod.Value >> 2) & 0x3F;
        return CodMap(major, minor);
    }

    /// <summary>
    /// CoD Major + Minor switch（独立方法，便于测试和维护）
    /// </summary>
    internal static string? CodMap(int major, int minor) => major switch
    {
        0x00 => "Miscellaneous",
        0x01 => CodComputerMap(minor),
        0x02 => CodPhoneMap(minor),
        0x03 => "LAN",
        0x04 => CodAudioMap(minor),
        0x05 => CodPeripheralMap(minor),
        0x06 => CodImagingMap(minor),
        0x07 => CodWearableMap(minor),
        0x08 => CodToyMap(minor),
        0x09 => CodHealthMap(minor),
        _ => null,
    };

    /// <summary>Major 0x01 — Computer</summary>
    private static string CodComputerMap(int minor) => minor switch
    {
        0x01 => "Desktop",
        0x02 => "Server",
        0x03 => "Laptop",
        0x04 => "HandheldPC",
        0x05 => "PalmSizePC",
        0x06 => "WearableComputer",
        0x07 => "Tablet",
        _ => "Computer",
    };

    /// <summary>Major 0x02 — Phone</summary>
    private static string CodPhoneMap(int minor) => minor switch
    {
        0x01 => "Cellular",
        0x02 => "Cordless",
        0x03 => "Smartphone",
        0x04 => "WiredModem",
        0x05 => "ISDNAccess",
        _ => "Phone",
    };

    /// <summary>Major 0x04 — Audio/Video</summary>
    private static string CodAudioMap(int minor) => minor switch
    {
        0x01 => "Headset",
        0x02 => "Handsfree",
        0x04 => "Microphone",
        0x05 => "Speaker",
        0x06 => "Headphones",
        0x07 => "PortableAudio",
        0x08 => "CarAudio",
        0x09 => "SetTopBox",
        0x0A => "HiFiAudio",
        0x0B => "VCR",
        0x0C => "VideoCamera",
        0x0D => "Camcorder",
        0x0E => "VideoMonitor",
        0x0F => "VideoLoudspeaker",
        0x10 => "VideoConferencing",
        0x12 => "GamingToy",
        _ => "Audio",
    };

    /// <summary>Major 0x05 — Peripheral（minor 高 4 位 = 类型，低 2 位 = 子类型；Keyboard + Pointing = 0x0C 组合）</summary>
    private static string CodPeripheralMap(int minor) => minor switch
    {
        0x04 => "Joystick",
        0x08 => "Gamepad",
        0x0C => "RemoteControl",
        0x10 => "SensingDevice",
        0x14 => "DigitizerTablet",
        0x18 => "CardReader",
        0x1C => "DigitalPen",
        0x20 => "HandheldScanner",
        0x24 => "HandheldGesturalInput",
        _ => "Peripheral",
    };

    /// <summary>Major 0x06 — Imaging（bit flags: bit2=Display, bit3=Camera, bit4=Scanner, bit5=Printer；允许组合）</summary>
    private static string CodImagingMap(int minor)
    {
        if (minor == 0) return "Imaging";

        // 拆解位掩码
        bool display = (minor & 0x04) != 0;
        bool camera  = (minor & 0x08) != 0;
        bool scanner = (minor & 0x10) != 0;
        bool printer = (minor & 0x20) != 0;

        // 收集已设置的 flag 名称
        var parts = new List<string>(4);
        if (display) parts.Add("Display");
        if (camera)  parts.Add("Camera");
        if (scanner) parts.Add("Scanner");
        if (printer) parts.Add("Printer");

        // 单个 flag → 直接返回名称；多个 → 用 "+" 连接；无已知 flag → "Imaging"
        return parts.Count switch
        {
            1 => parts[0],
            > 1 => string.Join("+", parts),
            _ => "Imaging",
        };
    }

    /// <summary>Major 0x07 — Wearable</summary>
    private static string CodWearableMap(int minor) => minor switch
    {
        0x01 => "Wristwatch",
        0x02 => "Pager",
        0x03 => "Jacket",
        0x04 => "Helmet",
        0x05 => "Glasses",
        _ => "Wearable",
    };

    /// <summary>Major 0x08 — Toy</summary>
    private static string CodToyMap(int minor) => minor switch
    {
        0x01 => "Robot",
        0x02 => "Vehicle",
        0x03 => "Doll",
        0x04 => "ToyController",
        0x05 => "ToyGame",
        _ => "Toy",
    };

    /// <summary>Major 0x09 — Health</summary>
    private static string CodHealthMap(int minor) => minor switch
    {
        0x01 => "BloodPressureMonitor",
        0x02 => "HealthThermometer",
        0x03 => "WeighingScale",
        0x04 => "GlucoseMeter",
        0x05 => "PulseOximeter",
        0x06 => "HeartRateMonitor",
        0x07 => "HealthDataDisplay",
        0x08 => "StepCounter",
        0x09 => "BodyComposition",
        0x0A => "PeakFlowMonitor",
        0x0B => "MedicationMonitor",
        0x0C => "KneeProsthesis",
        0x0D => "AnkleProsthesis",
        0x0E => "GenericHealthManager",
        0x0F => "PersonalMobilityDevice",
        0x10 => "ContinuousGlucoseMonitor",
        _ => "Health",
    };
}
