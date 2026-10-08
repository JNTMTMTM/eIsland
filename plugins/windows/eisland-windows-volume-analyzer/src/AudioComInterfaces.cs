using System.Runtime.InteropServices;

namespace eIslandVolumeAnalyzer;

/// <summary>COM 工厂</summary>
internal static class CoreAudioFactory
{
    private static readonly Guid DeviceEnumeratorClassId = new("BCDE0395-E52F-467C-8E3D-C4579291692E");

    public static IMMDeviceEnumerator CreateDeviceEnumerator()
    {
        var type = Type.GetTypeFromCLSID(DeviceEnumeratorClassId, throwOnError: true)!;
        return (IMMDeviceEnumerator)Activator.CreateInstance(type)!;
    }
}

/// <summary>IMMDeviceEnumerator: 枚举音频终端设备</summary>
[ComImport]
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IMMDeviceEnumerator
{
    void EnumAudioEndpoints(EDataFlow dataFlow, uint stateMask, out object devices);
    void GetDefaultAudioEndpoint(EDataFlow dataFlow, ERole role, out IMMDevice endpoint);
    void GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
    void RegisterEndpointNotificationCallback(IntPtr client);
    void UnregisterEndpointNotificationCallback(IntPtr client);
}

/// <summary>IMMDevice: 单个音频终端设备</summary>
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

/// <summary>IAudioClient: 管理音频流</summary>
[ComImport]
[Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioClient
{
    [PreserveSig]
    int Initialize(
        AUDCLNT_SHAREMODE shareMode,
        uint streamFlags,
        long bufferDurationHns,
        long periodicityHns,
        ref WAVEFORMATEX format,
        ref Guid audioSessionGuid);

    [PreserveSig]
    int GetBufferSize(out uint numBufferFrames);

    [PreserveSig]
    int GetStreamLatency(out long latencyHns);

    [PreserveSig]
    int GetCurrentPadding(out uint numPaddingFrames);

    [PreserveSig]
    int IsFormatSupported(
        AUDCLNT_SHAREMODE shareMode,
        ref WAVEFORMATEX format,
        IntPtr closestMatch);

    [PreserveSig]
    int GetMixFormat(out IntPtr ppFormat);

    [PreserveSig]
    int GetDevicePeriod(out long defaultDevicePeriodHns, out long minimumDevicePeriodHns);

    [PreserveSig]
    int Start();

    [PreserveSig]
    int Stop();

    [PreserveSig]
    int Reset();

    [PreserveSig]
    int SetEventHandle(IntPtr eventHandle);

    [PreserveSig]
    int GetService(ref Guid riid, [MarshalAs(UnmanagedType.IUnknown)] out object ppv);
}

/// <summary>IAudioCaptureClient: 从捕获流中读取音频数据</summary>
[ComImport]
[Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioCaptureClient
{
    [PreserveSig]
    int GetBuffer(
        out IntPtr ppData,
        out uint pNumFramesToRead,
        out uint pdwFlags,
        out ulong pu64DevicePosition,
        out ulong pu64QPCPosition);

    [PreserveSig]
    int ReleaseBuffer(uint numFramesRead);

    [PreserveSig]
    int GetNextPacketSize(out uint pNumFramesInNextPacket);
}

/// <summary>IActivateAudioInterfaceAsyncOperation: 异步激活操作对象</summary>
[ComImport]
[Guid("72A22D78-CDE4-431D-B8CC-843A71199B6D")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IActivateAudioInterfaceAsyncOperation
{
    [PreserveSig]
    int GetActivateResult(out int activateResult, out IntPtr activatedInterface);
}

/// <summary>IActivateAudioInterfaceCompletionHandler: 激活完成回调接口</summary>
[ComImport]
[Guid("41D2419B-8C55-4254-8F7C-23B2C7E1F5E4")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IActivateAudioInterfaceCompletionHandler
{
    void ActivateCompleted(IActivateAudioInterfaceAsyncOperation activateOperation);
}

/// <summary>IAudioSessionControl: 单个音频会话的控制接口</summary>
[ComImport]
[Guid("F4B1A599-7266-4319-A8C6-71C8D77C48FA")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioSessionControl
{
    [PreserveSig]
    int GetState(out AudioSessionState state);
    [PreserveSig]
    int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string displayName);
    [PreserveSig]
    int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string displayName, ref Guid eventContext);
    [PreserveSig]
    int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string iconPath);
    [PreserveSig]
    int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string iconPath, ref Guid eventContext);
    [PreserveSig]
    int GetGroupingParam(out Guid groupingParam);
    [PreserveSig]
    int SetGroupingParam(ref Guid groupingParam, ref Guid eventContext);
    [PreserveSig]
    int RegisterAudioSessionNotification(IntPtr notification);
    [PreserveSig]
    int UnregisterAudioSessionNotification(IntPtr notification);
}

/// <summary>IAudioSessionControl2: 扩展 IAudioSessionControl</summary>
[ComImport]
[Guid("2A0B7D39-1778-4F58-B17C-A13C7FF1D49A")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioSessionControl2
{
    // IAudioSessionControl
    [PreserveSig] int GetState(out AudioSessionState state);
    [PreserveSig] int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string displayName);
    [PreserveSig] int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string displayName, ref Guid eventContext);
    [PreserveSig] int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string iconPath);
    [PreserveSig] int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string iconPath, ref Guid eventContext);
    [PreserveSig] int GetGroupingParam(out Guid groupingParam);
    [PreserveSig] int SetGroupingParam(ref Guid groupingParam, ref Guid eventContext);
    [PreserveSig] int RegisterAudioSessionNotification(IntPtr notification);
    [PreserveSig] int UnregisterAudioSessionNotification(IntPtr notification);

    // IAudioSessionControl2
    [PreserveSig] int GetProcessID(out uint processId);
    [PreserveSig] int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string sessionIdentifier);
    [PreserveSig] int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string sessionInstanceIdentifier);
    [PreserveSig] int GetProcessIconPath([MarshalAs(UnmanagedType.LPWStr)] out string processIconPath);
    [PreserveSig] int IsSingleProcessSession(out int isSingleProcessSession);
}

/// <summary>IAudioSessionEnumerator: 枚举音频会话</summary>
[ComImport]
[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioSessionEnumerator
{
    [PreserveSig]
    int GetCount(out int sessionCount);
    [PreserveSig]
    int GetSession(int sessionNumber, out IAudioSessionControl session);
}

/// <summary>IAudioSessionManager2: 音频会话管理器</summary>
[ComImport]
[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
internal interface IAudioSessionManager2
{
    // IAudioSessionManager
    [PreserveSig] int GetSimpleAudioVolume(ref Guid audioSessionGuid, uint streamFlags, [MarshalAs(UnmanagedType.IUnknown)] out object audioVolume);
    [PreserveSig] int GetAudioSessionControl(ref Guid audioSessionGuid, uint streamFlags, out IAudioSessionControl sessionControl);

    // IAudioSessionManager2
    [PreserveSig] int GetSessionEnumerator(out IAudioSessionEnumerator sessionEnumerator);
    [PreserveSig] int RegisterSessionNotification(IntPtr notification);
    [PreserveSig] int UnregisterSessionNotification(IntPtr notification);
    [PreserveSig] int RegisterDuckNotification([MarshalAs(UnmanagedType.LPWStr)] string sessionInstanceId, IntPtr notification);
    [PreserveSig] int UnregisterDuckNotification(IntPtr notification);
}

/// <summary>音频会话状态</summary>
internal enum AudioSessionState
{
    Inactive = 0,
    Active = 1,
    Expired = 2
}

/// <summary>
/// 激活完成回调 —— 使用原始 COM vtable 实现。
/// 不依赖托管 COM 接口包装，避免 RCW/CCW 干扰。
/// </summary>
internal class ActivateCallback : IDisposable
{
    // COM vtable 委托
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int QueryInterfaceDelegate(IntPtr pThis, ref Guid riid, out IntPtr ppvObject);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate uint AddRefDelegate(IntPtr pThis);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate uint ReleaseDelegate(IntPtr pThis);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int ActivateCompletedDelegate(IntPtr pThis, IntPtr activateOperation);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int GetActivateResultDelegate(IntPtr pThis, out int activateResult, out IntPtr activatedInterface);

    private static readonly Guid IID_CompletionHandler = new("41D2419B-8C55-4254-8F7C-23B2C7E1F5E4");
    private static readonly Guid IID_IUnknown = new("00000000-0000-0000-C000-000000000046");
    private static readonly Guid IID_IAgileObject = new("94EA2B94-E9CC-49E0-C0FF-EE64CA8F5B90");

    private readonly QueryInterfaceDelegate _queryInterface;
    private readonly AddRefDelegate _addRef;
    private readonly ReleaseDelegate _release;
    private readonly ActivateCompletedDelegate _activateCompleted;
    private IntPtr _ccwPtr;
    private IntPtr _vtablePtr;
    private GCHandle _gcHandle;

    private readonly ManualResetEventSlim _event = new(false);
    private int _hr;
    private int _resultHr;
    private IntPtr _activatedInterface;

    public ManualResetEventSlim Event => _event;
    public int HResult => _hr;
    public int ResultHr => _resultHr;
    public IntPtr ActivatedInterface => _activatedInterface;

    /// <summary>获取用于传给 ActivateAudioInterfaceAsync 的 COM 接口指针</summary>
    public IntPtr ComPointer => _ccwPtr;

    public ActivateCallback()
    {
        _gcHandle = GCHandle.Alloc(this);
        _queryInterface = new QueryInterfaceDelegate(QueryInterface);
        _addRef = new AddRefDelegate(AddRef);
        _release = new ReleaseDelegate(Release);
        _activateCompleted = new ActivateCompletedDelegate(ActivateCompletedRaw);

        _vtablePtr = Marshal.AllocHGlobal(4 * IntPtr.Size);
        Marshal.WriteIntPtr(_vtablePtr, 0 * IntPtr.Size, Marshal.GetFunctionPointerForDelegate(_queryInterface));
        Marshal.WriteIntPtr(_vtablePtr, 1 * IntPtr.Size, Marshal.GetFunctionPointerForDelegate(_addRef));
        Marshal.WriteIntPtr(_vtablePtr, 2 * IntPtr.Size, Marshal.GetFunctionPointerForDelegate(_release));
        Marshal.WriteIntPtr(_vtablePtr, 3 * IntPtr.Size, Marshal.GetFunctionPointerForDelegate(_activateCompleted));

        // CCW 对象: vtable 指针 + GCHandle
        _ccwPtr = Marshal.AllocHGlobal(IntPtr.Size * 2);
        Marshal.WriteIntPtr(_ccwPtr, 0, _vtablePtr);
        Marshal.WriteIntPtr(_ccwPtr, IntPtr.Size, GCHandle.ToIntPtr(_gcHandle));
    }

    private int QueryInterface(IntPtr pThis, ref Guid riid, out IntPtr ppvObject)
    {
        if (riid == IID_CompletionHandler || riid == IID_IUnknown || riid == IID_IAgileObject)
        {
            ppvObject = pThis;
            return 0;
        }
        ppvObject = IntPtr.Zero;
        return unchecked((int)0x80004002); // E_NOINTERFACE
    }

    private uint AddRef(IntPtr pThis) => 1;
    private uint Release(IntPtr pThis) => 1;

    /// <summary>
    /// COM 回调入口 —— 原始 COM 调用。
    /// activateOperation 是 IActivateAudioInterfaceAsyncOperation* 原始指针。
    /// </summary>
    private int ActivateCompletedRaw(IntPtr pThis, IntPtr activateOperation)
    {
        try
        {
            // GetActivateResult follows the three IUnknown methods in the async-operation vtable.
            var vtable = Marshal.ReadIntPtr(activateOperation);
            var getActivateResultPtr = Marshal.ReadIntPtr(vtable, 3 * IntPtr.Size);
            var getActivateResult = Marshal.GetDelegateForFunctionPointer<GetActivateResultDelegate>(getActivateResultPtr);
            _hr = getActivateResult(activateOperation, out _resultHr, out _activatedInterface);
        }
        catch (Exception ex)
        {
            _hr = ex.HResult;
            _resultHr = _hr;
        }
        finally
        {
            _event.Set();
        }
        return 0; // S_OK
    }

    public bool Wait(int timeoutMs) => _event.Wait(timeoutMs);

    public void Dispose()
    {
        if (_ccwPtr != IntPtr.Zero)
        {
            Marshal.FreeHGlobal(_ccwPtr);
            _ccwPtr = IntPtr.Zero;
        }
        if (_vtablePtr != IntPtr.Zero)
        {
            Marshal.FreeHGlobal(_vtablePtr);
            _vtablePtr = IntPtr.Zero;
        }
        if (_gcHandle.IsAllocated)
            _gcHandle.Free();
    }
}

/// <summary>COM 接口 GUID 常量</summary>
internal static class AudioInterfaceGuids
{
    public static readonly Guid IID_IAudioClient = new("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2");
    public static readonly Guid IID_IAudioCaptureClient = new("C8ADBD64-E71E-48a0-A4DE-185C395CD317");
    public static readonly Guid IID_IAudioSessionManager2 = new("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F");
    public static readonly Guid IID_IAudioSessionControl2 = new("2A0B7D39-1778-4F58-B17C-A13C7FF1D49A");
    public static readonly Guid IID_IMMDeviceEnumerator = new("A95664D2-9614-4F35-A746-DE8DB63617E6");
    public static readonly Guid CLSID_MMDeviceEnumerator = new("BCDE0395-E52F-467C-8E3D-C4579291692E");
}
