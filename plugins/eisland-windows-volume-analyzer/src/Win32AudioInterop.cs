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

#region 枚举与常量

/// <summary>音频流方向</summary>
internal enum EDataFlow { Render = 0, Capture = 1, All = 2 }

/// <summary>音频终端角色</summary>
internal enum ERole { Console = 0, Multimedia = 1, Communications = 2 }

/// <summary>COM 类上下文</summary>
[Flags]
internal enum ClsContext : uint
{
    InprocServer = 0x1,
    InprocHandler = 0x2,
    LocalServer = 0x4,
    RemoteServer = 0x10,
    All = InprocServer | InprocHandler | LocalServer | RemoteServer
}

/// <summary>AUDCLNT 共享模式</summary>
internal enum AUDCLNT_SHAREMODE
{
    SHARED = 0,
    EXCLUSIVE = 1
}

/// <summary>AUDCLNT 流标志</summary>
[Flags]
internal enum AUDCLNT_STREAMFLAGS : uint
{
    LOOPBACK = 0x00020000,
    EVENT_CALLBACK = 0x00040000,
    NOPERSIST = 0x00080000,
    RATEADJUST = 0x00100000,
    SRC_DEFAULT_QUALITY = 0x08000000,
    AUTOCONVERTPCM = 0x80000000,
    SRC_DEFAULT_QUALITY_AUTOCONVERT = AUTOCONVERT | SRC_DEFAULT_QUALITY,
    AUTOCONVERT = AUTOCONVERTPCM
}

/// <summary>AUDCLNT 缓冲区标志</summary>
[Flags]
internal enum AUDCLNT_BUFFERFLAGS
{
    NONE = 0,
    DATA_DISCONTINUITY = 0x1,
    SILENT = 0x2,
    TIMESTAMP_ERROR = 0x4
}

/// <summary>音频客户端激活句柄</summary>
internal static class AudioClientConstants
{
    public const uint AUDCLNT_E_BUFFER_ERROR = 0x88890018;
    public const uint AUDCLNT_E_BUFFER_SIZE_ERROR = 0x88890019;
    public const uint AUDCLNT_E_BUFFER_TOO_LARGE = 0x8889001A;
    public const uint AUDCLNT_E_OUT_OF_ORDER = 0x8889001B;
    public const uint AUDCLNT_E_DEVICE_INVALIDATED = 0x88890004;
    public const uint AUDCLNT_E_NOT_STOPPED = 0x88890014;

    /// <summary>设备接口 ID：音频渲染</summary>
    public const string DEVINTERFACE_AUDIO_RENDER = "e6327cad-dcec-4949-ae8a-991e976a79d2";

    /// <summary>设备接口 ID：音频捕获</summary>
    public const string DEVINTERFACE_AUDIO_CAPTURE = "2eef81be-33fa-4800-9670-1cd474972c3f";
}

#endregion

#region WAVEFORMATEX

[StructLayout(LayoutKind.Sequential)]
internal struct WAVEFORMATEX
{
    public ushort wFormatTag;
    public ushort nChannels;
    public uint nSamplesPerSec;
    public uint nAvgBytesPerSec;
    public ushort nBlockAlign;
    public ushort wBitsPerSample;
    public ushort cbSize;
}

internal static class WaveFormat
{
    public const ushort WAVE_FORMAT_PCM = 1;
    public const ushort WAVE_FORMAT_IEEE_FLOAT = 3;
    public const ushort WAVE_FORMAT_EXTENSIBLE = 0xFFFE;

    /// <summary>构建 32-bit float 立体声格式</summary>
    public static WAVEFORMATEX CreateFloatStereo(uint sampleRate = 48000)
    {
        const ushort bitsPerSample = 32;
        const ushort channels = 2;
        return new WAVEFORMATEX
        {
            wFormatTag = WAVE_FORMAT_IEEE_FLOAT,
            nChannels = channels,
            nSamplesPerSec = sampleRate,
            nAvgBytesPerSec = sampleRate * channels * (bitsPerSample / 8),
            nBlockAlign = (ushort)(channels * (bitsPerSample / 8)),
            wBitsPerSample = bitsPerSample,
            cbSize = 0
        };
    }
}

#endregion

#region AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS

/// <summary>
/// 用于 ActivateAudioInterfaceAsync 的进程回环参数。
/// 仅 Windows 10 20H1 (build 19041) 及以上版本支持。
/// </summary>
[StructLayout(LayoutKind.Sequential)]
internal struct AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS
{
    /// <summary>目标进程 ID。设为 0 则捕获所有进程。</summary>
    public uint TargetProcessId;

    /// <summary>
    /// 包含进程树标志。
    /// true: 捕获目标进程及其所有子进程。
    /// false: 仅捕获目标进程。
    /// </summary>
    [MarshalAs(UnmanagedType.Bool)]
    public bool IncludeProcessTree;
}

#endregion

#region Win32 P/Invoke

internal static class Win32Audio
{
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr CreateEventW(
        IntPtr lpEventAttributes, bool bManualReset, bool bInitialState, IntPtr lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetEvent(IntPtr hEvent);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool ResetEvent(IntPtr hEvent);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);

    [DllImport("ole32.dll")]
    public static extern int CoInitializeEx(IntPtr pvReserved, uint dwCoInit);

    [DllImport("ole32.dll")]
    public static extern void CoUninitialize();

    public const uint COINIT_APARTMENTTHREADED = 0x2;
    public const uint COINIT_MULTITHREADED = 0x0;
    public const uint WAIT_OBJECT_0 = 0;
    public const uint WAIT_TIMEOUT = 258;
    public const uint WAIT_FAILED = 0xFFFFFFFF;
    public const uint INFINITE = 0xFFFFFFFF;
}

#endregion
