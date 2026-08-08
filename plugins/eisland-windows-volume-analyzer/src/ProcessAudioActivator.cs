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
/// 通过 ActivateAudioInterfaceAsync 激活进程专属音频捕获。
/// 使用 AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS 指定目标进程。
/// </summary>
internal static class ProcessAudioActivator
{
    #region WinRT 激活函数

    [DllImport("Mmdevapi.dll", ExactSpelling = true)]
    private static extern int ActivateAudioInterfaceAsync(
        [MarshalAs(UnmanagedType.LPWStr)] string deviceInterfacePath,
        ref Guid riid,
        IntPtr activationParams,
        IntPtr completionHandler,
        out IActivateAudioInterfaceAsyncOperation activationOperation);

    #endregion

    #region 回调 COM 接口手动实现

    // ── 回调委托类型 ──
    private delegate int QueryInterfaceDelegate(IntPtr pThis, ref Guid riid, out IntPtr ppvObject);
    private delegate uint AddRefDelegate(IntPtr pThis);
    private delegate uint ReleaseDelegate(IntPtr pThis);
    private delegate int ActivateCompletedDelegate(IntPtr pThis, IntPtr activateOperation);

    // ── 回调结构体（COM vtable 布局）──
    [StructLayout(LayoutKind.Sequential)]
    private struct CallbackVtbl
    {
        public IntPtr QueryInterface;
        public IntPtr AddRef;
        public IntPtr Release;
        public IntPtr ActivateCompleted;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct CallbackInstance
    {
        public IntPtr Vtbl;
    }

    // ── 托管回调实现 ──
    private static GCHandle _callbackHandle;
    private static IntPtr _callbackPtr;
    private static IntPtr _completionEvent;
    private static int _activationHResult;
    private static object? _activatedInterface;

    private static readonly QueryInterfaceDelegate _queryInterface = QueryInterfaceImpl;
    private static readonly AddRefDelegate _addRef = AddRefImpl;
    private static readonly ReleaseDelegate _release = ReleaseImpl;
    private static readonly ActivateCompletedDelegate _activateCompleted = ActivateCompletedImpl;

    private static CallbackVtbl _vtable;
    private static CallbackInstance _instance;

    private static int QueryInterfaceImpl(IntPtr pThis, ref Guid riid, out IntPtr ppvObject)
    {
        ppvObject = IntPtr.Zero;
        return -2147467262; // E_NOINTERFACE
    }

    private static uint AddRefImpl(IntPtr pThis) => 1;
    private static uint ReleaseImpl(IntPtr pThis) => 1;

    private static int ActivateCompletedImpl(IntPtr pThis, IntPtr activateOperationPtr)
    {
        try
        {
            // 获取激活操作对象的 vtable
            var opVtblPtr = Marshal.ReadIntPtr(activateOperationPtr);
            // GetActivateResult 在 vtable slot 4 (IUnknown 3 个 + ActivateCompleted 1 个)
            // 但 IActivateAudioInterfaceAsyncOperation 的 vtable 是:
            //   slot 0: QueryInterface
            //   slot 1: AddRef
            //   slot 2: Release
            //   slot 3: ActivateCompleted (我们刚调用的)
            //   slot 4: GetActivateResult
            var getActivateResultPtr = Marshal.ReadIntPtr(opVtblPtr, IntPtr.Size * 4);

            // 调用 GetActivateResult(out int result, out object interface)
            var getActivateResult = Marshal.GetDelegateForFunctionPointer<GetActivateResultDelegate>(getActivateResultPtr);
            int hr = getActivateResult(activateOperationPtr, out _activationHResult, out _activatedInterface);
        }
        catch (Exception ex)
        {
            _activationHResult = ex.HResult;
            _activatedInterface = null;
        }
        finally
        {
            if (_completionEvent != IntPtr.Zero)
                Win32Audio.SetEvent(_completionEvent);
        }
        return 0;
    }

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int GetActivateResultDelegate(
        IntPtr pThis,
        out int activateResult,
        [MarshalAs(UnmanagedType.IUnknown)] out object activatedInterface);

    #endregion

    /// <summary>
    /// 初始化回调 COM 对象（仅需调用一次）
    /// </summary>
    private static void EnsureCallback()
    {
        if (_callbackPtr != IntPtr.Zero) return;

        // 将委托固定，防止 GC 回收
        _callbackPtr = Marshal.GetFunctionPointerForDelegate(_activateCompleted);

        // 构建 vtable
        _vtable = new CallbackVtbl
        {
            QueryInterface = Marshal.GetFunctionPointerForDelegate(_queryInterface),
            AddRef = Marshal.GetFunctionPointerForDelegate(_addRef),
            Release = Marshal.GetFunctionPointerForDelegate(_release),
            ActivateCompleted = _callbackPtr
        };

        // 将 vtable 复制到非托管内存
        var vtablePtr = Marshal.AllocHGlobal(Marshal.SizeOf<CallbackVtbl>());
        Marshal.StructureToPtr(_vtable, vtablePtr, false);

        // 创建实例
        _instance = new CallbackInstance { Vtbl = vtablePtr };
        var instancePtr = Marshal.AllocHGlobal(Marshal.SizeOf<CallbackInstance>());
        Marshal.StructureToPtr(_instance, instancePtr, false);

        _callbackHandle = GCHandle.Alloc(instancePtr, GCHandleType.Normal);
        _callbackPtr = instancePtr;
    }

    /// <summary>
    /// 激活进程专属音频捕获客户端
    /// </summary>
    /// <param name="processId">目标进程 ID</param>
    /// <param name="includeProcessTree">是否包含子进程</param>
    /// <returns>IAudioClient 实例，失败返回 null</returns>
    public static IAudioClient? ActivateForProcess(uint processId, bool includeProcessTree = true)
    {
        EnsureCallback();

        if (_completionEvent == IntPtr.Zero)
        {
            _completionEvent = Win32Audio.CreateEventW(IntPtr.Zero, true, false, IntPtr.Zero);
            if (_completionEvent == IntPtr.Zero) return null;
        }

        Win32Audio.ResetEvent(_completionEvent);
        _activationHResult = 0;
        _activatedInterface = null;

        // 构造进程回环参数
        var loopbackParams = new AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS
        {
            TargetProcessId = processId,
            IncludeProcessTree = includeProcessTree
        };

        var paramPtr = Marshal.AllocHGlobal(Marshal.SizeOf<AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS>());
        try
        {
            Marshal.StructureToPtr(loopbackParams, paramPtr, false);

            var iid = AudioInterfaceGuids.IID_IAudioClient;

            // 使用渲染设备接口路径激活（进程回环从渲染端捕获）
            int hr = ActivateAudioInterfaceAsync(
                AudioClientConstants.DEVINTERFACE_AUDIO_RENDER,
                ref iid,
                paramPtr,
                _callbackPtr,
                out var operation);

            if (hr != 0)
            {
                System.Diagnostics.Debug.WriteLine($"[VolumeAnalyzer] ActivateAudioInterfaceAsync failed: 0x{hr:X8}");
                return null;
            }

            // 等待异步激活完成（最多 5 秒）
            var waitResult = Win32Audio.WaitForSingleObject(_completionEvent, 5000);
            if (waitResult != Win32Audio.WAIT_OBJECT_0)
            {
                System.Diagnostics.Debug.WriteLine("[VolumeAnalyzer] Activation timed out");
                return null;
            }

            if (_activationHResult != 0)
            {
                System.Diagnostics.Debug.WriteLine($"[VolumeAnalyzer] Activation result error: 0x{_activationHResult:X8}");
                return null;
            }

            if (_activatedInterface == null)
            {
                System.Diagnostics.Debug.WriteLine("[VolumeAnalyzer] Activated interface is null");
                return null;
            }

            // 尝试 QueryInterface 获取 IAudioClient
            var client = _activatedInterface as IAudioClient;
            if (client == null)
            {
                System.Diagnostics.Debug.WriteLine("[VolumeAnalyzer] Failed to cast to IAudioClient");
                Marshal.ReleaseComObject(_activatedInterface);
                return null;
            }

            return client;
        }
        finally
        {
            Marshal.FreeHGlobal(paramPtr);
        }
    }

    /// <summary>清理非托管资源</summary>
    public static void Cleanup()
    {
        if (_completionEvent != IntPtr.Zero)
        {
            Win32Audio.CloseHandle(_completionEvent);
            _completionEvent = IntPtr.Zero;
        }

        if (_callbackHandle.IsAllocated)
        {
            _callbackHandle.Free();
        }
    }
}
