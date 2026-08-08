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

using System.Diagnostics;
using System.Runtime.InteropServices;

namespace eIslandVolumeAnalyzer;

/// <summary>单个音频进程信息</summary>
internal record AudioProcessInfo
{
    /// <summary>进程 ID</summary>
    public uint ProcessId { get; init; }

    /// <summary>进程名称（不含 .exe）</summary>
    public string? ProcessName { get; init; }

    /// <summary>会话状态：active / inactive / expired</summary>
    public string State { get; init; } = "unknown";

    /// <summary>会话显示名称</summary>
    public string? DisplayName { get; init; }
}

/// <summary>
/// 音频会话枚举器：查询当前正在使用音频的进程。
/// 通过 IAudioSessionManager2 → IAudioSessionEnumerator 遍历所有音频会话，
/// 再用 IAudioSessionControl2 获取进程 ID 和状态。
/// </summary>
internal static class AudioSessionEnumerator
{
    /// <summary>
    /// 获取当前正在使用音频的进程列表。
    /// 通过 COM 枚举默认渲染设备上的所有音频会话。
    /// </summary>
    /// <param name="activeOnly">
    /// true = 仅返回正在播放的进程 (AudioSessionState.Active)；
    /// false = 返回所有有音频会话的进程（含暂停/静默）
    /// </param>
    public static AudioProcessInfo[] GetPlayingProcesses(bool activeOnly = true)
    {
        IMMDeviceEnumerator? enumerator = null;
        IMMDevice? endpoint = null;
        IAudioSessionManager2? manager = null;
        IAudioSessionEnumerator? sessionEnumerator = null;

        try
        {
            // 1. 获取默认渲染设备
            var enumeratorType = Type.GetTypeFromCLSID(AudioInterfaceGuids.CLSID_MMDeviceEnumerator, true)!;
            enumerator = (IMMDeviceEnumerator)Activator.CreateInstance(enumeratorType)!;
            enumerator.GetDefaultAudioEndpoint(EDataFlow.Render, ERole.Multimedia, out endpoint);

            // 2. 激活 IAudioSessionManager2
            var managerIid = AudioInterfaceGuids.IID_IAudioSessionManager2;
            endpoint.Activate(ref managerIid, ClsContext.All, IntPtr.Zero, out var managerObj);
            manager = (IAudioSessionManager2)managerObj;

            // 3. 获取会话枚举器
            manager.GetSessionEnumerator(out sessionEnumerator);
            sessionEnumerator.GetCount(out var count);

            var results = new List<AudioProcessInfo>();

            // 4. 遍历所有会话
            for (int i = 0; i < count; i++)
            {
                IAudioSessionControl? control = null;
                IAudioSessionControl2? control2 = null;

                try
                {
                    sessionEnumerator.GetSession(i, out control);
                    control2 = control as IAudioSessionControl2;
                    if (control2 == null) continue;

                    // 获取会话状态
                    control2.GetState(out var state);
                    if (activeOnly && state != AudioSessionState.Active) continue;

                    // 获取进程 ID
                    control2.GetProcessID(out var pid);
                    if (pid == 0) continue;

                    // 获取进程名称
                    string? processName = null;
                    try
                    {
                        var proc = Process.GetProcessById((int)pid);
                        processName = proc.ProcessName;
                    }
                    catch { /* 进程可能已退出 */ }

                    // 获取显示名称
                    string? displayName = null;
                    try { control2.GetDisplayName(out displayName); } catch { }

                    results.Add(new AudioProcessInfo
                    {
                        ProcessId = pid,
                        ProcessName = processName,
                        State = state switch
                        {
                            AudioSessionState.Active => "active",
                            AudioSessionState.Inactive => "inactive",
                            AudioSessionState.Expired => "expired",
                            _ => "unknown"
                        },
                        DisplayName = displayName
                    });
                }
                catch
                {
                    /* 跳过无法访问的会话 */
                }
                finally
                {
                    if (control2 != null && control2 != control)
                        Marshal.ReleaseComObject(control2);
                    if (control != null)
                        Marshal.ReleaseComObject(control);
                }
            }

            return results.ToArray();
        }
        finally
        {
            if (sessionEnumerator != null) Marshal.ReleaseComObject(sessionEnumerator);
            if (manager != null) Marshal.ReleaseComObject(manager);
            if (endpoint != null) Marshal.ReleaseComObject(endpoint);
            if (enumerator != null) Marshal.ReleaseComObject(enumerator);
        }
    }
}
