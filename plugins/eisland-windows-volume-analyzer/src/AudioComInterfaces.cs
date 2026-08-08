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

using System.Runtime.InteropServices;

namespace eIslandVolumeAnalyzer;

/// <summary>
/// IMMDeviceEnumerator: 枚举音频终端设备
/// </summary>
[ComImport]
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMMDeviceEnumerator
{
    void EnumAudioEndpoints(EDataFlow dataFlow, uint stateMask, [MarshalAs(UnmanagedType.IUnknown)] out object devices);
    void GetDefaultAudioEndpoint(EDataFlow dataFlow, ERole role, out IMMDevice endpoint);
    void GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
    void RegisterEndpointNotificationCallback(IntPtr client);
    void UnregisterEndpointNotificationCallback(IntPtr client);
}

/// <summary>
/// IMMDevice: 单个音频终端设备
/// </summary>
[ComImport]
[Guid("D666063F-1587-4E43-81F1-B948E807363F")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMMDevice
{
    void Activate(
        ref Guid interfaceId,
        ClsContext classContext,
        IntPtr activationParameters,
        [MarshalAs(UnmanagedType.IUnknown)] out object interfacePointer);

    void OpenPropertyStore(uint storageAccessMode, out object properties);
    void GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
    void GetState(out uint state);
}

/// <summary>
/// IAudioClient: 管理音频流
/// </summary>
[ComImport]
[Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioClient
{
    int Initialize(
        AUDCLNT_SHAREMODE shareMode,
        uint streamFlags,
        long bufferDurationHns,
        long periodicityHns,
        ref WAVEFORMATEX format,
        ref Guid audioSessionGuid);

    int GetBufferSize(out uint numBufferFrames);

    int GetStreamLatency(out long latencyHns);

    int GetCurrentPadding(out uint numPaddingFrames);

    int IsFormatSupported(
        AUDCLNT_SHAREMODE shareMode,
        ref WAVEFORMATEX format,
        out WAVEFORMATEX? closestMatch);

    int GetMixFormat(out WAVEFORMATEX deviceFormat);

    int GetDevicePeriod(out long defaultDevicePeriodHns, out long minimumDevicePeriodHns);

    int Start();

    int Stop();

    int Reset();

    int SetEventHandle(IntPtr eventHandle);

    int GetService(ref Guid riid, [MarshalAs(UnmanagedType.IUnknown)] out object ppv);
}

/// <summary>
/// IAudioCaptureClient: 从捕获流中读取音频数据
/// </summary>
[ComImport]
[Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioCaptureClient
{
    int GetBuffer(
        out IntPtr ppData,
        out uint pNumFramesToRead,
        out uint pdwFlags,
        out ulong pu64DevicePosition,
        out ulong pu64QPCPosition);

    int ReleaseBuffer(uint numFramesRead);

    int GetNextPacketSize(out uint pNumFramesInNextPacket);
}

/// <summary>
/// IActivateAudioInterfaceAsyncOperation:
/// ActivateAudioInterfaceAsync 返回的异步操作对象
/// </summary>
[ComImport]
[Guid("72A22D78-CDE4-431D-B8CC-843A71199B6D")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IActivateAudioInterfaceAsyncOperation
{
    void ActivateCompleted(IActivateAudioInterfaceCompletionHandler handler);
    void GetActivateResult(out int activateResult, [MarshalAs(UnmanagedType.IUnknown)] out object activatedInterface);
}

/// <summary>
/// IActivateAudioInterfaceCompletionHandler:
/// 激活完成回调接口
/// </summary>
[ComImport]
[Guid("41D2419B-8C55-4254-8F7C-23B2C7E1F5E4")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IActivateAudioInterfaceCompletionHandler
{
    void ActivateCompleted(IActivateAudioInterfaceAsyncOperation activateOperation);
}

/// <summary>
/// IAudioClient2: 扩展 IAudioClient，支持低延迟和进程专属音频
/// </summary>
[ComImport]
[Guid("7267A50D-4834-4630-A75B-27CE2A5A4231")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioClient2
{
    // IAudioClient 方法
    int Initialize(
        AUDCLNT_SHAREMODE shareMode,
        uint streamFlags,
        long bufferDurationHns,
        long periodicityHns,
        ref WAVEFORMATEX format,
        ref Guid audioSessionGuid);

    int GetBufferSize(out uint numBufferFrames);
    int GetStreamLatency(out long latencyHns);
    int GetCurrentPadding(out uint numPaddingFrames);

    int IsFormatSupported(
        AUDCLNT_SHAREMODE shareMode,
        ref WAVEFORMATEX format,
        out WAVEFORMATEX? closestMatch);

    int GetMixFormat(out WAVEFORMATEX deviceFormat);
    int GetDevicePeriod(out long defaultDevicePeriodHns, out long minimumDevicePeriodHns);
    int Start();
    int Stop();
    int Reset();
    int SetEventHandle(IntPtr eventHandle);
    int GetService(ref Guid riid, [MarshalAs(UnmanagedType.IUnknown)] out object ppv);

    // IAudioClient2 方法
    int IsOffloadCapable(int category, out bool isOffloadCapable);
    int SetClientProperties(IntPtr clientProperties);
    int GetBufferSizeLimits(ref WAVEFORMATEX format, bool eventDriven, out long minBufferDurationHns, out long maxBufferDurationHns);
}

/// <summary>
/// IAudioSessionControl: 单个音频会话的控制接口
/// </summary>
[ComImport]
[Guid("F4B1A599-7266-4319-A8C6-71C8D77C48FA")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioSessionControl
{
    int GetState(out AudioSessionState state);
    int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string displayName);
    int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string displayName, ref Guid eventContext);
    int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string iconPath);
    int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string iconPath, ref Guid eventContext);
    int GetGroupingParam(out Guid groupingParam);
    int SetGroupingParam(ref Guid groupingParam, ref Guid eventContext);
    int RegisterAudioSessionNotification(IntPtr notification);
    int UnregisterAudioSessionNotification(IntPtr notification);
}

/// <summary>
/// IAudioSessionControl2: 扩展 IAudioSessionControl，支持进程 ID 查询
/// </summary>
[ComImport]
[Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioSessionControl2
{
    // ── IAudioSessionControl ──
    int GetState(out AudioSessionState state);
    int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string displayName);
    int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string displayName, ref Guid eventContext);
    int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string iconPath);
    int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string iconPath, ref Guid eventContext);
    int GetGroupingParam(out Guid groupingParam);
    int SetGroupingParam(ref Guid groupingParam, ref Guid eventContext);
    int RegisterAudioSessionNotification(IntPtr notification);
    int UnregisterAudioSessionNotification(IntPtr notification);

    // ── IAudioSessionControl2 ──
    int GetProcessID(out uint processId);
    int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string sessionIdentifier);
    int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string sessionInstanceIdentifier);
    int GetProcessIconPath([MarshalAs(UnmanagedType.LPWStr)] out string processIconPath);
    int IsSingleProcessSession(out int isSingleProcessSession);
    int GetProcessIconPath2([MarshalAs(UnmanagedType.LPWStr)] out string processIconPath);
}

/// <summary>
/// IAudioSessionEnumerator: 枚举音频会话
/// </summary>
[ComImport]
[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioSessionEnumerator
{
    int GetCount(out int sessionCount);
    int GetSession(int sessionNumber, out IAudioSessionControl session);
}

/// <summary>
/// IAudioSessionManager2: 音频会话管理器，支持会话枚举
/// </summary>
[ComImport]
[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioSessionManager2
{
    // ── IAudioSessionManager ──
    int GetSimpleAudioVolume(ref Guid audioSessionGuid, uint streamFlags, out object audioVolume);
    int GetAudioSessionControl(ref Guid audioSessionGuid, uint streamFlags, out IAudioSessionControl sessionControl);
    int GetSimpleAudioVolume2(ref Guid audioSessionGuid, uint streamFlags, IntPtr crossProcessSession, out object audioVolume);
    int GetAudioSessionControl2(ref Guid audioSessionGuid, uint streamFlags, IntPtr crossProcessSession, out IAudioSessionControl sessionControl);
    int GetSimpleAudioVolume3(ref Guid audioSessionGuid, uint streamFlags, IntPtr crossProcessSession, int processId, out object audioVolume);

    // ── IAudioSessionManager2 ──
    int GetSessionEnumerator(out IAudioSessionEnumerator sessionEnumerator);
    int RegisterSessionNotification(IntPtr notification);
    int UnregisterSessionNotification(IntPtr notification);
    int RegisterDuckNotification([MarshalAs(UnmanagedType.LPWStr)] string sessionInstanceId, IntPtr notification);
    int UnregisterDuckNotification(IntPtr notification);
}

/// <summary>音频会话状态</summary>
internal enum AudioSessionState
{
    Inactive = 0,
    Active = 1,
    Expired = 2
}

internal static class AudioInterfaceGuids
{
    public static readonly Guid IID_IAudioClient = new("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2");
    public static readonly Guid IID_IAudioCaptureClient = new("C8ADBD64-E71E-48a0-A4DE-185C395CD317");
    public static readonly Guid IID_IAudioClient2 = new("7267A50D-4834-4630-A75B-27CE2A5A4231");
    public static readonly Guid IID_IMMDeviceEnumerator = new("A95664D2-9614-4F35-A746-DE8DB63617E6");
    public static readonly Guid CLSID_MMDeviceEnumerator = new("BCDE0395-E52F-467C-8E3D-C4579291692E");
    public static readonly Guid IID_IAudioSessionManager2 = new("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F");
}
