using System.Runtime.InteropServices;

namespace eIslandVolumeAnalyzer;

/// <summary>
/// Creates the process-scoped WASAPI loopback client used by the analyzer.
/// </summary>
internal static class ProcessAudioActivator
{
    private const int S_OK = 0;
    private const ushort VT_BLOB = 65;
    private const string ProcessLoopbackDevice = @"VAD\Process_Loopback";

    /// <summary>
    /// Activates an IAudioClient for a single process using the Windows 10 process-loopback API.
    /// The activation payload must be wrapped in a VT_BLOB PROPVARIANT; passing the payload directly
    /// makes ActivateAudioInterfaceAsync interpret the first bytes as a PROPVARIANT header.
    /// </summary>
    internal static IAudioClient ActivateProcessLoopbackClient(uint processId, bool includeProcessTree)
    {
        var devicePath = ProcessLoopbackDevice;
        var activationParams = new AUDIOCLIENT_ACTIVATION_PARAMS
        {
            ActivationType = AUDIOCLIENT_ACTIVATION_TYPE.ProcessLoopback,
            ProcessLoopbackParams = new AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS
            {
                TargetProcessId = processId,
                ProcessLoopbackMode = includeProcessTree
                    ? PROCESS_LOOPBACK_MODE.IncludeTargetProcessTree
                    : PROCESS_LOOPBACK_MODE.ExcludeTargetProcessTree
            }
        };

        var payloadSize = Marshal.SizeOf<AUDIOCLIENT_ACTIVATION_PARAMS>();
        var payloadPtr = Marshal.AllocHGlobal(payloadSize);
        var propVariantPtr = Marshal.AllocHGlobal(Marshal.SizeOf<PROPVARIANT_BLOB>());
        IntPtr activationOperation = IntPtr.Zero;
        IntPtr activatedInterface = IntPtr.Zero;

        try
        {
            Marshal.StructureToPtr(activationParams, payloadPtr, fDeleteOld: false);
            Marshal.StructureToPtr(new PROPVARIANT_BLOB
            {
                VariantType = VT_BLOB,
                BlobSize = (uint)payloadSize,
                BlobData = payloadPtr
            }, propVariantPtr, fDeleteOld: false);

            using var callback = new ActivateCallback();
            var iid = AudioInterfaceGuids.IID_IAudioClient;
            var hr = Win32Audio.ActivateAudioInterfaceAsync(
                devicePath,
                ref iid,
                propVariantPtr,
                callback.ComPointer,
                out activationOperation);
            if (hr != S_OK)
                throw new InvalidOperationException($"ActivateAudioInterfaceAsync failed: 0x{hr:X8}");

            if (!callback.Wait(5000))
                throw new TimeoutException("Process loopback activation timed out.");
            if (callback.HResult != S_OK)
                throw new InvalidOperationException($"GetActivateResult failed: 0x{callback.HResult:X8}");
            if (callback.ResultHr != S_OK || callback.ActivatedInterface == IntPtr.Zero)
                throw new InvalidOperationException($"Process loopback activation failed: 0x{callback.ResultHr:X8}");

            activatedInterface = callback.ActivatedInterface;
            var audioClient = (IAudioClient)Marshal.GetObjectForIUnknown(activatedInterface);
            Marshal.Release(activatedInterface);
            activatedInterface = IntPtr.Zero;
            return audioClient;
        }
        finally
        {
            if (activatedInterface != IntPtr.Zero)
                Marshal.Release(activatedInterface);
            if (activationOperation != IntPtr.Zero)
                Marshal.Release(activationOperation);
            Marshal.DestroyStructure<PROPVARIANT_BLOB>(propVariantPtr);
            Marshal.FreeHGlobal(propVariantPtr);
            Marshal.FreeHGlobal(payloadPtr);
        }
    }

    /// <summary>Returns the master volume of a process audio session.</summary>
    internal static float GetProcessVolume(uint pid)
    {
        try
        {
            var enumerator = CoreAudioFactory.CreateDeviceEnumerator();
            enumerator.GetDefaultAudioEndpoint(EDataFlow.Render, ERole.Console, out var device);
            var iidMgr = AudioInterfaceGuids.IID_IAudioSessionManager2;
            device.Activate(ref iidMgr, ClsContext.All, IntPtr.Zero, out var mgrObj);
            var mgr = (IAudioSessionManager2)mgrObj;
            if (mgr.GetSessionEnumerator(out var sessionEnum) != S_OK) return -1f;
            if (sessionEnum.GetCount(out var count) != S_OK) return -1f;

            for (var i = 0; i < count; i++)
            {
                if (sessionEnum.GetSession(i, out var session) != S_OK) continue;
                var session2 = (IAudioSessionControl2)session;
                if (session2.GetProcessID(out var sessionPid) != S_OK || sessionPid != pid) continue;
                var sessionGuid = Guid.Empty;
                if (mgr.GetSimpleAudioVolume(ref sessionGuid, 0, out var volumeObj) != S_OK) return -1f;
                var volume = (ISimpleAudioVolume)volumeObj;
                return volume.GetMasterVolume(out var level) == S_OK ? level : -1f;
            }
        }
        catch
        {
            // A process can disappear between session enumeration and PID lookup.
        }

        return -1f;
    }
}

/// <summary>ISimpleAudioVolume: reads a session master volume.</summary>
[ComImport]
[Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface ISimpleAudioVolume
{
    [PreserveSig] int SetMasterVolume(float level, ref Guid eventContext);
    [PreserveSig] int GetMasterVolume(out float level);
    [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid eventContext);
    [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
}