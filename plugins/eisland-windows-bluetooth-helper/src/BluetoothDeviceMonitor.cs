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

using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using Windows.Devices.Bluetooth;
using Windows.Devices.Enumeration;
using Windows.Foundation;

namespace eIslandBluetoothHelper;

/// <summary>
/// 蓝牙设备监控引擎
/// DeviceWatcher 监听设备枚举 + BluetoothDevice.ConnectionStatusChanged 监听连接状态
/// 通过 Win32 事件通知 Node 侧轮询
/// </summary>
public static class BluetoothDeviceMonitor
{
    #region Win32 P/Invoke

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr CreateEventW(IntPtr lpEventAttributes, bool bManualReset, bool bInitialState, IntPtr lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetEvent(IntPtr hEvent);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool ResetEvent(IntPtr hEvent);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);

    [DllImport("ole32.dll")]
    private static extern int CoInitializeEx(IntPtr pvReserved, uint dwCoInit);

    [DllImport("ole32.dll")]
    private static extern void CoUninitialize();

    private const uint COINIT_APARTMENTTHREADED = 0x2;
    private const uint WAIT_OBJECT_0 = 0;
    private const uint WAIT_TIMEOUT = 258;
    private const uint INFINITE = 0xFFFFFFFF;

    #endregion

    /// <summary>经典蓝牙 DeviceWatcher</summary>
    private static DeviceWatcher? _classicWatcher;

    /// <summary>BLE DeviceWatcher</summary>
    private static DeviceWatcher? _bleWatcher;

    /// <summary>设备 JSON 缓存（deviceId → serialized JSON）</summary>
    private static readonly ConcurrentDictionary<string, string> _deviceJsonCache = new();

    /// <summary>BLE 设备对象缓存（用于订阅 ConnectionStatusChanged）</summary>
    private static readonly ConcurrentDictionary<string, BluetoothLEDevice> _bleDevices = new();

    /// <summary>经典蓝牙设备对象缓存</summary>
    private static readonly ConcurrentDictionary<string, BluetoothDevice> _classicDevices = new();

    /// <summary>每设备的取消订阅动作</summary>
    private static readonly ConcurrentDictionary<string, Action> _deviceUnsubscribers = new();

    /// <summary>变更计数器</summary>
    private static volatile int _changeCounter;

    /// <summary>有变更时置位</summary>
    private static IntPtr _changeEvent = IntPtr.Zero;

    /// <summary>停止信号</summary>
    private static IntPtr _stopEvent = IntPtr.Zero;

    private static volatile bool _monitoring;
    private static Thread? _monitorThread;
    private static bool _restartRequested;
    private static readonly object _lifecycleLock = new();
    private static readonly object _deviceLock = new();
    private static readonly List<Action> _watcherUnsubscribers = new();

    /// <summary>初始化 Win32 事件</summary>
    private static bool EnsureEvents()
    {
        if (_changeEvent == IntPtr.Zero)
        {
            _changeEvent = CreateEventW(IntPtr.Zero, true, false, IntPtr.Zero);
            if (_changeEvent == IntPtr.Zero) return false;
        }
        if (_stopEvent == IntPtr.Zero)
        {
            _stopEvent = CreateEventW(IntPtr.Zero, true, false, IntPtr.Zero);
            if (_stopEvent == IntPtr.Zero) return false;
        }
        return true;
    }

    /// <summary>
    /// 启动设备监控（幂等）
    /// </summary>
    /// <returns>0=成功, 1=失败</returns>
    public static int StartMonitoring()
    {
        lock (_lifecycleLock)
        {
            if (_monitorThread?.IsAlive == true)
            {
                // 清理中的旧线程仍持有设备和事件句柄；由它退出后串行重启。
                if (!_monitoring) _restartRequested = true;
                return 0;
            }
            if (!EnsureEvents())
            {
                Cleanup();
                return 1;
            }
            ResetEvent(_stopEvent);
            _restartRequested = false;
            _monitoring = true;

            _monitorThread = new Thread(MonitorLoop)
            {
                IsBackground = true,
                Name = "BT-Monitor"
            };
            _monitorThread.SetApartmentState(ApartmentState.STA);
            _monitorThread.Start();
            return 0;
        }
    }

    /// <summary>
    /// 停止设备监控（幂等）
    /// </summary>
    /// <returns>0=成功</returns>
    public static int StopMonitoring()
    {
        lock (_lifecycleLock)
        {
            _restartRequested = false;
            _monitoring = false;
            if (_stopEvent != IntPtr.Zero)
                SetEvent(_stopEvent);
            return 0;
        }
    }

    /// <summary>
    /// 阻塞等待设备变更
    /// </summary>
    /// <param name="timeoutMs">超时毫秒数</param>
    /// <returns>0=有变更, 1=超时, -1=错误/未启动</returns>
    public static int WaitForChanges(int timeoutMs)
    {
        if (!_monitoring || _changeEvent == IntPtr.Zero) return -1;
        ResetEvent(_changeEvent);
        var ms = timeoutMs < 0 ? INFINITE : (uint)timeoutMs;
        var result = WaitForSingleObject(_changeEvent, ms);
        return result switch
        {
            WAIT_OBJECT_0 => 0,
            WAIT_TIMEOUT => 1,
            _ => -1
        };
    }

    /// <summary>
    /// 读取当前变更计数；停止或等待重启时返回 -1，区分前后两轮相同计数。
    /// </summary>
    public static int GetChangeCounter() => _monitoring ? _changeCounter : -1;

    /// <summary>
    /// 获取所有设备快照 JSON
    /// </summary>
    public static string? GetAllDevicesJson()
    {
        if (!_monitoring) return "[]";
        var jsonList = _deviceJsonCache.Values.ToArray();
        return "[" + string.Join(",", jsonList) + "]";
    }

    /// <summary>
    /// 获取指定设备快照 JSON
    /// </summary>
    public static string? GetDeviceJson(string deviceId)
    {
        if (!_monitoring) return null;
        return _deviceJsonCache.TryGetValue(deviceId, out var json) ? json : null;
    }

    /// <summary>通知 Node 侧有变更</summary>
    private static void SignalChange()
    {
        Interlocked.Increment(ref _changeCounter);
        if (_changeEvent != IntPtr.Zero)
            SetEvent(_changeEvent);
    }

    #region 监控线程主循环

    /// <summary>在同一线程内配对初始化 COM、等待停止并释放监控资源</summary>
    private static void MonitorLoop()
    {
        var comInitialized = false;
        try
        {
            comInitialized = CoInitializeEx(IntPtr.Zero, COINIT_APARTMENTTHREADED) >= 0;
            StartWatcher();
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[BT-Monitor] Fatal: {ex}");
        }
        finally
        {
            _monitoring = false;
            Cleanup();
            if (comInitialized) CoUninitialize();
            lock (_lifecycleLock)
            {
                _monitorThread = null;
                if (_restartRequested) StartMonitoring();
            }
        }
    }

    /// <summary>注册两个 watcher，并保留退订闭包直到监控停止</summary>
    private static void StartWatcher()
    {
        // 共享回调：经典蓝牙和 BLE 各一个 watcher，回调逻辑相同
        TypedEventHandler<DeviceWatcher, DeviceInformation> onAdded = (sender, deviceInfo) =>
        {
            lock (_deviceLock)
            {
                if (!IsCurrentWatcher(sender)) return;
                try
                {
                    var info = BluetoothController.BuildDeviceInfo(deviceInfo);
                    var json = SerializeDevice(info);
                    _deviceJsonCache[info.DeviceId] = json;
                    SubscribeConnectionStatus(info.DeviceId, deviceInfo);
                    SignalChange();
                }
                catch { /* 忽略 */ }
            }
        };

        TypedEventHandler<DeviceWatcher, DeviceInformationUpdate> onUpdated = (sender, update) =>
        {
            lock (_deviceLock)
            {
                if (!IsCurrentWatcher(sender)) return;
                try
                {
                    var deviceInfo = DeviceInformation.CreateFromIdAsync(update.Id).GetAwaiter().GetResult();
                    if (deviceInfo == null) return;
                    var info = BluetoothController.BuildDeviceInfo(deviceInfo);
                    var json = SerializeDevice(info);
                    _deviceJsonCache[info.DeviceId] = json;
                    SignalChange();
                }
                catch { /* 忽略 */ }
            }
        };

        TypedEventHandler<DeviceWatcher, DeviceInformationUpdate> onRemoved = (sender, update) =>
        {
            lock (_deviceLock)
            {
                if (!IsCurrentWatcher(sender)) return;
                try
                {
                    UnsubscribeConnectionStatus(update.Id);
                    _deviceJsonCache.TryRemove(update.Id, out string? removed);
                    SignalChange();
                }
                catch { /* 忽略 */ }
            }
        };

        TypedEventHandler<DeviceWatcher, object> onEnumerationCompleted = (sender, _) =>
        {
            lock (_deviceLock)
            {
                if (IsCurrentWatcher(sender)) SignalChange();
            }
        };

        // 创建经典蓝牙 watcher
        _classicWatcher = DeviceInformation.CreateWatcher(BluetoothController.GetClassicSelector());
        var classicWatcher = _classicWatcher;
        _watcherUnsubscribers.Add(() =>
        {
            classicWatcher.Added -= onAdded;
            classicWatcher.Updated -= onUpdated;
            classicWatcher.Removed -= onRemoved;
            classicWatcher.EnumerationCompleted -= onEnumerationCompleted;
        });
        _classicWatcher.Added += onAdded;
        _classicWatcher.Updated += onUpdated;
        _classicWatcher.Removed += onRemoved;
        _classicWatcher.EnumerationCompleted += onEnumerationCompleted;

        // 创建 BLE watcher
        _bleWatcher = DeviceInformation.CreateWatcher(BluetoothController.GetBleSelector());
        var bleWatcher = _bleWatcher;
        _watcherUnsubscribers.Add(() =>
        {
            bleWatcher.Added -= onAdded;
            bleWatcher.Updated -= onUpdated;
            bleWatcher.Removed -= onRemoved;
            bleWatcher.EnumerationCompleted -= onEnumerationCompleted;
        });
        _bleWatcher.Added += onAdded;
        _bleWatcher.Updated += onUpdated;
        _bleWatcher.Removed += onRemoved;
        _bleWatcher.EnumerationCompleted += onEnumerationCompleted;

        _classicWatcher.Start();
        _bleWatcher.Start();

        // 等待停止信号
        if (_monitoring) WaitForSingleObject(_stopEvent, INFINITE);
    }

    /// <summary>拒绝停止后排队到达的旧 watcher 回调</summary>
    /// <param name="watcher">触发回调的 watcher 实例</param>
    private static bool IsCurrentWatcher(DeviceWatcher watcher) => _monitoring &&
        (ReferenceEquals(watcher, _classicWatcher) || ReferenceEquals(watcher, _bleWatcher));

    #endregion

    #region ConnectionStatusChanged 订阅

    /// <summary>
    /// 尝试打开 BLE 或经典蓝牙设备并订阅 ConnectionStatusChanged
    /// </summary>
    private static void SubscribeConnectionStatus(string deviceId, DeviceInformation deviceInfo)
    {
        // 重复 Added 不能覆盖旧退订闭包，否则原生事件会持续持有设备对象。
        if (!_monitoring || _deviceUnsubscribers.ContainsKey(deviceId)) return;
        var actions = new List<Action>();

        // 尝试 BLE
        try
        {
            var ble = BluetoothLEDevice.FromIdAsync(deviceId).GetAwaiter().GetResult();
            if (ble != null)
            {
                _bleDevices[deviceId] = ble;
                TypedEventHandler<BluetoothLEDevice, object> handler = (_, _) =>
                {
                    lock (_deviceLock)
                    {
                        if (!_monitoring || !_bleDevices.TryGetValue(deviceId, out var current) ||
                            !ReferenceEquals(current, ble)) return;
                        try
                        {
                            RefreshDeviceJson(deviceId, deviceInfo);
                            SignalChange();
                        }
                        catch { /* 忽略 */ }
                    }
                };
                actions.Add(() =>
                {
                    try { ble.ConnectionStatusChanged -= handler; } catch { }
                    ble.Dispose();
                });
                ble.ConnectionStatusChanged += handler;
            }
        }
        catch { /* 非 BLE 设备，忽略 */ }

        // 尝试经典蓝牙
        try
        {
            var classic = BluetoothDevice.FromIdAsync(deviceId).GetAwaiter().GetResult();
            if (classic != null)
            {
                _classicDevices[deviceId] = classic;
                TypedEventHandler<BluetoothDevice, object> handler = (_, _) =>
                {
                    lock (_deviceLock)
                    {
                        if (!_monitoring || !_classicDevices.TryGetValue(deviceId, out var current) ||
                            !ReferenceEquals(current, classic)) return;
                        try
                        {
                            RefreshDeviceJson(deviceId, deviceInfo);
                            SignalChange();
                        }
                        catch { /* 忽略 */ }
                    }
                };
                actions.Add(() =>
                {
                    try { classic.ConnectionStatusChanged -= handler; } catch { }
                    classic.Dispose();
                });
                classic.ConnectionStatusChanged += handler;
            }
        }
        catch { /* 非经典蓝牙设备，忽略 */ }

        if (actions.Count > 0)
        {
            _deviceUnsubscribers[deviceId] = () =>
            {
                foreach (var unsub in actions)
                {
                    try { unsub(); } catch { }
                }
            };
        }
    }

    /// <summary>
    /// 取消指定设备的 ConnectionStatusChanged 订阅
    /// </summary>
    private static void UnsubscribeConnectionStatus(string deviceId)
    {
        if (_deviceUnsubscribers.TryRemove(deviceId, out var unsub))
        {
            try { unsub(); } catch { }
        }
        _bleDevices.TryRemove(deviceId, out _);
        _classicDevices.TryRemove(deviceId, out _);
    }

    /// <summary>
    /// 连接状态变化后刷新设备 JSON 缓存
    /// </summary>
    private static void RefreshDeviceJson(string deviceId, DeviceInformation deviceInfo)
    {
        try
        {
            // 重新查询设备信息以获取最新状态
            var freshInfo = DeviceInformation.CreateFromIdAsync(deviceId).GetAwaiter().GetResult();
            if (freshInfo == null) return;
            var info = BluetoothController.BuildDeviceInfo(freshInfo);
            var json = SerializeDevice(info);
            _deviceJsonCache[deviceId] = json;
        }
        catch
        {
            // 回退：使用原始 deviceInfo 构建
            try
            {
                var info = BluetoothController.BuildDeviceInfo(deviceInfo);
                var json = SerializeDevice(info);
                _deviceJsonCache[deviceId] = json;
            }
            catch { /* 忽略 */ }
        }
    }

    #endregion

    #region JSON 序列化

    private static string SerializeDevice(BluetoothDeviceInfo device)
    {
        return System.Text.Json.JsonSerializer.Serialize(device, BtJsonContext.Default.BluetoothDeviceInfo);
    }

    #endregion

    #region 清理

    /// <summary>等待当前设备回调结束后，释放事件订阅、缓存和系统句柄</summary>
    private static void Cleanup()
    {
        lock (_deviceLock)
        {
            foreach (var unsubscribe in _watcherUnsubscribers)
            {
                try { unsubscribe(); } catch { }
            }
            _watcherUnsubscribers.Clear();

            // 取消所有设备的 ConnectionStatusChanged 订阅
            foreach (var kvp in _deviceUnsubscribers)
            {
                try { kvp.Value(); } catch { }
            }
            _deviceUnsubscribers.Clear();
            _bleDevices.Clear();
            _classicDevices.Clear();

            if (_classicWatcher != null)
            {
                try
                {
                    if (_classicWatcher.Status is DeviceWatcherStatus.Started or DeviceWatcherStatus.EnumerationCompleted)
                        _classicWatcher.Stop();
                }
                catch { /* 忽略 */ }
                _classicWatcher = null;
            }

            if (_bleWatcher != null)
            {
                try
                {
                    if (_bleWatcher.Status is DeviceWatcherStatus.Started or DeviceWatcherStatus.EnumerationCompleted)
                        _bleWatcher.Stop();
                }
                catch { /* 忽略 */ }
                _bleWatcher = null;
            }

            _deviceJsonCache.Clear();
            _changeCounter = 0;

            if (_changeEvent != IntPtr.Zero)
            {
                CloseHandle(_changeEvent);
                _changeEvent = IntPtr.Zero;
            }
            if (_stopEvent != IntPtr.Zero)
            {
                CloseHandle(_stopEvent);
                _stopEvent = IntPtr.Zero;
            }
        }
    }

    #endregion
}
