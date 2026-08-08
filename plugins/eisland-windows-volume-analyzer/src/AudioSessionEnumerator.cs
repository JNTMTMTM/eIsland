using System.Diagnostics;
using System.Runtime.InteropServices;

namespace eIslandVolumeAnalyzer;

/// <summary>单个音频进程信息</summary>
internal record AudioProcessInfo
{
    public uint ProcessId { get; init; }
    public string? ProcessName { get; init; }
    public string State { get; init; } = "unknown";
    public string? DisplayName { get; init; }
}

/// <summary>
/// 音频会话枚举器：查询当前正在使用音频的进程。
/// 使用 CoCreateInstance + vtable 调用以确保兼容性。
/// </summary>
internal static class AudioSessionEnumerator
{
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int GetDefaultEndpointDelegate(IntPtr pThis, EDataFlow flow, ERole role, out IntPtr ppEndpoint);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int ActivateDelegate(IntPtr pThis, ref Guid iid, ClsContext ctx, IntPtr actParams, out IntPtr ppv);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int GetSessionEnumeratorDelegate(IntPtr pThis, out IntPtr enumerator);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int GetCountDelegate(IntPtr pThis, out int count);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int GetSessionDelegate(IntPtr pThis, int index, out IntPtr session);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int GetStateDelegate(IntPtr pThis, out AudioSessionState state);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int GetDisplayNameDelegate(IntPtr pThis, out IntPtr name);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int ReleaseDelegate(IntPtr pThis);

    /// <summary>获取当前正在使用音频的进程列表</summary>
    public static AudioProcessInfo[] GetPlayingProcesses(bool activeOnly = true)
    {
        // 确保 COM 初始化
        Win32Audio.CoInitializeEx(IntPtr.Zero, Win32Audio.COINIT_APARTMENTTHREADED);

        IntPtr enumPtr = IntPtr.Zero;
        IntPtr devPtr = IntPtr.Zero;
        IntPtr mgrPtr = IntPtr.Zero;
        IntPtr sessEnumPtr = IntPtr.Zero;

        try
        {
            // 1. CoCreateInstance → IMMDeviceEnumerator
            var clsid = AudioInterfaceGuids.CLSID_MMDeviceEnumerator;
            var iidEnum = AudioInterfaceGuids.IID_IMMDeviceEnumerator;
            int hr = Win32Audio.CoCreateInstance(ref clsid, IntPtr.Zero, (uint)ClsContext.All, ref iidEnum, out enumPtr);
            if (hr != 0 || enumPtr == IntPtr.Zero) return Array.Empty<AudioProcessInfo>();

            // 2. GetDefaultAudioEndpoint (slot 4)
            var vt = Marshal.ReadIntPtr(enumPtr);
            var fnPtr = Marshal.ReadIntPtr(vt, IntPtr.Size * 4);
            var getEndpoint = Marshal.GetDelegateForFunctionPointer<GetDefaultEndpointDelegate>(fnPtr);
            hr = getEndpoint(enumPtr, EDataFlow.Render, ERole.Console, out devPtr);
            if (hr != 0 || devPtr == IntPtr.Zero) return Array.Empty<AudioProcessInfo>();

            // 3. Activate IAudioSessionManager2 (slot 3)
            var devVt = Marshal.ReadIntPtr(devPtr);
            var activatePtr = Marshal.ReadIntPtr(devVt, IntPtr.Size * 3);
            var activate = Marshal.GetDelegateForFunctionPointer<ActivateDelegate>(activatePtr);
            var iidMgr = AudioInterfaceGuids.IID_IAudioSessionManager2;
            hr = activate(devPtr, ref iidMgr, ClsContext.All, IntPtr.Zero, out mgrPtr);
            if (hr != 0 || mgrPtr == IntPtr.Zero) return Array.Empty<AudioProcessInfo>();

            // 4. GetSessionEnumerator (slot 5)
            var mgrVt = Marshal.ReadIntPtr(mgrPtr);
            var getSEPtr = Marshal.ReadIntPtr(mgrVt, IntPtr.Size * 5);
            var getSE = Marshal.GetDelegateForFunctionPointer<GetSessionEnumeratorDelegate>(getSEPtr);
            hr = getSE(mgrPtr, out sessEnumPtr);
            if (hr != 0 || sessEnumPtr == IntPtr.Zero) return Array.Empty<AudioProcessInfo>();

            // 5. GetCount (slot 3)
            var seVt = Marshal.ReadIntPtr(sessEnumPtr);
            var getCountPtr = Marshal.ReadIntPtr(seVt, IntPtr.Size * 3);
            var getCount = Marshal.GetDelegateForFunctionPointer<GetCountDelegate>(getCountPtr);
            hr = getCount(sessEnumPtr, out var count);
            if (hr != 0) return Array.Empty<AudioProcessInfo>();

            var results = new List<AudioProcessInfo>();

            // 6. 遍历会话
            var getSessionPtr = Marshal.ReadIntPtr(seVt, IntPtr.Size * 4);
            var getSession = Marshal.GetDelegateForFunctionPointer<GetSessionDelegate>(getSessionPtr);

            for (int i = 0; i < count; i++)
            {
                IntPtr ctrlPtr = IntPtr.Zero;
                try
                {
                    hr = getSession(sessEnumPtr, i, out ctrlPtr);
                    if (hr != 0 || ctrlPtr == IntPtr.Zero) continue;

                    // GetState (slot 3)
                    var ctrlVt = Marshal.ReadIntPtr(ctrlPtr);
                    var getStatePtr = Marshal.ReadIntPtr(ctrlVt, IntPtr.Size * 3);
                    var getState = Marshal.GetDelegateForFunctionPointer<GetStateDelegate>(getStatePtr);
                    hr = getState(ctrlPtr, out var state);
                    if (hr != 0) continue;

                    if (activeOnly && state != AudioSessionState.Active) continue;

                    uint pid = 0;
                    string? processName = null;
                    string? displayName = null;

                    // GetDisplayName (slot 4)
                    try
                    {
                        var getDispPtr = Marshal.ReadIntPtr(ctrlVt, IntPtr.Size * 4);
                        var getDisp = Marshal.GetDelegateForFunctionPointer<GetDisplayNameDelegate>(getDispPtr);
                        hr = getDisp(ctrlPtr, out var namePtr);
                        if (hr == 0 && namePtr != IntPtr.Zero)
                        {
                            displayName = Marshal.PtrToStringUni(namePtr);
                            Marshal.FreeCoTaskMem(namePtr);
                        }
                    }
                    catch { }

                    // GetSessionIdentifier (slot 13) → 解析 PID
                    try
                    {
                        var getSidPtr = Marshal.ReadIntPtr(ctrlVt, IntPtr.Size * 13);
                        var getSid = Marshal.GetDelegateForFunctionPointer<GetDisplayNameDelegate>(getSidPtr);
                        hr = getSid(ctrlPtr, out var sidPtr);
                        if (hr == 0 && sidPtr != IntPtr.Zero)
                        {
                            var sid = Marshal.PtrToStringUni(sidPtr);
                            Marshal.FreeCoTaskMem(sidPtr);
                            if (!string.IsNullOrEmpty(sid))
                            {
                                var lastBar = sid.LastIndexOf('|');
                                if (lastBar >= 0)
                                {
                                    var afterBar = sid.Substring(lastBar + 1);
                                    var pctB = afterBar.IndexOf("%b");
                                    if (pctB >= 0 && uint.TryParse(afterBar.AsSpan(pctB + 2), out var parsedPid))
                                        pid = parsedPid;
                                }
                            }
                        }
                    }
                    catch { }

                    if (pid == 0) continue;

                    try
                    {
                        using var proc = Process.GetProcessById((int)pid);
                        processName = proc.ProcessName;
                    }
                    catch { }

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
                catch { }
                finally
                {
                    if (ctrlPtr != IntPtr.Zero) Release(ctrlPtr);
                }
            }

            return results.ToArray();
        }
        finally
        {
            if (sessEnumPtr != IntPtr.Zero) Release(sessEnumPtr);
            if (mgrPtr != IntPtr.Zero) Release(mgrPtr);
            if (devPtr != IntPtr.Zero) Release(devPtr);
            if (enumPtr != IntPtr.Zero) Release(enumPtr);
        }
    }

    private static void Release(IntPtr ptr)
    {
        if (ptr == IntPtr.Zero) return;
        var vt = Marshal.ReadIntPtr(ptr);
        var fnPtr = Marshal.ReadIntPtr(vt, IntPtr.Size * 2);
        var release = Marshal.GetDelegateForFunctionPointer<ReleaseDelegate>(fnPtr);
        release(ptr);
    }
}
