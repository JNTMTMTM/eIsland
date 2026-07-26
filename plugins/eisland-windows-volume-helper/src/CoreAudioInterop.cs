using System.Runtime.InteropServices;

internal enum EDataFlow
{
    Render,
    Capture,
    All
}

internal enum ERole
{
    Console,
    Multimedia,
    Communications
}

[Flags]
internal enum ClsContext : uint
{
    InprocServer = 0x1,
    InprocHandler = 0x2,
    LocalServer = 0x4,
    RemoteServer = 0x10,
    All = InprocServer | InprocHandler | LocalServer | RemoteServer
}

internal static class CoreAudioFactory
{
    private static readonly Guid DeviceEnumeratorClassId = new("BCDE0395-E52F-467C-8E3D-C4579291692E");

    public static IMMDeviceEnumerator CreateDeviceEnumerator()
    {
        var enumeratorType = Type.GetTypeFromCLSID(DeviceEnumeratorClassId, throwOnError: true)!;
        return (IMMDeviceEnumerator)Activator.CreateInstance(enumeratorType)!;
    }
}

[ComImport]
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMMDeviceEnumerator
{
    void EnumAudioEndpoints(EDataFlow dataFlow, uint stateMask, out object devices);
    void GetDefaultAudioEndpoint(EDataFlow dataFlow, ERole role, out IMMDevice endpoint);
    void GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
    void RegisterEndpointNotificationCallback(IMMNotificationClient client);
    void UnregisterEndpointNotificationCallback(IMMNotificationClient client);
}

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

[ComImport]
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioEndpointVolume
{
    void RegisterControlChangeNotify(IAudioEndpointVolumeCallback callback);
    void UnregisterControlChangeNotify(IAudioEndpointVolumeCallback callback);
    void GetChannelCount(out uint channelCount);
    void SetMasterVolumeLevel(float levelDb, ref Guid eventContext);
    void SetMasterVolumeLevelScalar(float level, ref Guid eventContext);
    void GetMasterVolumeLevel(out float levelDb);
    void GetMasterVolumeLevelScalar(out float level);
    void SetChannelVolumeLevel(uint channelNumber, float levelDb, ref Guid eventContext);
    void SetChannelVolumeLevelScalar(uint channelNumber, float level, ref Guid eventContext);
    void GetChannelVolumeLevel(uint channelNumber, out float levelDb);
    void GetChannelVolumeLevelScalar(uint channelNumber, out float level);
    void SetMute([MarshalAs(UnmanagedType.Bool)] bool muted, ref Guid eventContext);
    void GetMute([MarshalAs(UnmanagedType.Bool)] out bool muted);
    void GetVolumeStepInfo(out uint step, out uint stepCount);
    void VolumeStepUp(ref Guid eventContext);
    void VolumeStepDown(ref Guid eventContext);
    void QueryHardwareSupport(out uint hardwareSupportMask);
    void GetVolumeRange(out float minimumDb, out float maximumDb, out float incrementDb);
}

[Guid("657804FA-D6AD-4496-8A60-352752AF4F89")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioEndpointVolumeCallback
{
    [PreserveSig]
    int OnNotify(IntPtr notificationData);
}

[Guid("7991EEC9-7E89-4D85-8390-6C703CEC60C0")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMMNotificationClient
{
    [PreserveSig]
    int OnDeviceStateChanged([MarshalAs(UnmanagedType.LPWStr)] string deviceId, uint newState);

    [PreserveSig]
    int OnDeviceAdded([MarshalAs(UnmanagedType.LPWStr)] string deviceId);

    [PreserveSig]
    int OnDeviceRemoved([MarshalAs(UnmanagedType.LPWStr)] string deviceId);

    [PreserveSig]
    int OnDefaultDeviceChanged(
        EDataFlow flow,
        ERole role,
        [MarshalAs(UnmanagedType.LPWStr)] string? defaultDeviceId);

    [PreserveSig]
    int OnPropertyValueChanged([MarshalAs(UnmanagedType.LPWStr)] string deviceId, PropertyKey key);
}

[StructLayout(LayoutKind.Sequential)]
internal struct AudioVolumeNotificationData
{
    public Guid EventContext;

    [MarshalAs(UnmanagedType.Bool)]
    public bool Muted;

    public float MasterVolume;
    public uint ChannelCount;
}

[StructLayout(LayoutKind.Sequential)]
internal struct PropertyKey
{
    public Guid FormatId;
    public uint PropertyId;
}