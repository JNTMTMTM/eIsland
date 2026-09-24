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

using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using Windows.Foundation;
using Windows.Media;
using Windows.Media.Control;

namespace eIslandSmtcHelper;

/// <summary>
/// SMTC 会话监控引擎
/// 长驻 STA 线程监听 WinRT 事件，通过 Win32 事件通知 Node 侧轮询
/// </summary>
public static class SmtcSessionMonitor
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
    private const uint WAIT_FAILED = 0xFFFFFFFF;
    private const uint INFINITE = 0xFFFFFFFF;
    private const uint ERROR_SUCCESS = 0;

    #endregion

    /// <summary>所有活跃会话快照（线程安全）</summary>
    private static readonly ConcurrentDictionary<string, SessionInfo> _sessions = new();

    /// <summary>变更计数器，Node 侧通过原子读取判断是否有新变更</summary>
    private static volatile int _changeCounter;

    /// <summary>有变更时置位，Node 等待此事件</summary>
    private static IntPtr _changeEvent = IntPtr.Zero;

    /// <summary>停止信号，置位后监控线程退出</summary>
    private static IntPtr _stopEvent = IntPtr.Zero;

    private static volatile bool _monitoring;
    private static GlobalSystemMediaTransportControlsSessionManager? _manager;
    private static Thread? _monitorThread;
    private static readonly object _lifecycleLock = new();
    private static readonly object _sessionLock = new();
    private static readonly Dictionary<string, Action> _unsubscribeSessions = new();
    private static TypedEventHandler<GlobalSystemMediaTransportControlsSessionManager, SessionsChangedEventArgs>? _sessionsChangedHandler;

    /// <summary>Timeline 变更节流：每会话 200ms 最多触发一次</summary>
    private static readonly ConcurrentDictionary<string, long> _lastTimelineSignal = new();
    private const long TimelineThrottleMs = 200;

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
    /// 启动会话监控（幂等）
    /// </summary>
    /// <returns>0=成功, 1=失败</returns>
    public static int StartMonitoring()
    {
        lock (_lifecycleLock)
        {
            if (_monitorThread?.IsAlive == true) return _monitoring ? 0 : 1;
            if (!EnsureEvents()) return 1;
            ResetEvent(_stopEvent);
            _monitoring = true;

            _monitorThread = new Thread(MonitorLoop)
            {
                IsBackground = true,
                Name = "SMTC-Monitor"
            };
            _monitorThread.SetApartmentState(ApartmentState.STA);
            _monitorThread.Start();
            return 0;
        }
    }

    /// <summary>
    /// 停止会话监控（幂等）
    /// </summary>
    /// <returns>0=成功</returns>
    public static int StopMonitoring()
    {
        lock (_lifecycleLock)
        {
            _monitoring = false;
            if (_stopEvent != IntPtr.Zero)
                SetEvent(_stopEvent);
            // 初始化中的 WinRT 调用可能延迟返回；线程结束前禁止重启复用旧句柄。
            if (_monitorThread?.Join(5000) != false) _monitorThread = null;
            return 0;
        }
    }

    /// <summary>
    /// 阻塞等待会话变更
    /// </summary>
    /// <param name="timeoutMs">超时毫秒数，0=立即返回，-1=无限等待</param>
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
    /// 读取当前变更计数（原子操作）
    /// </summary>
    public static int GetChangeCounter() => _changeCounter;

    /// <summary>
    /// 获取所有会话快照的 JSON 字符串
    /// </summary>
    public static string? GetAllSessionsJson()
    {
        var list = _sessions.Values.ToArray();
        return System.Text.Json.JsonSerializer.Serialize(list, SmtcJsonContext.Default.SessionInfoArray);
    }

    /// <summary>
    /// 获取指定会话快照的 JSON 字符串
    /// </summary>
    public static string? GetSessionJson(string sourceAppId)
    {
        if (!_sessions.TryGetValue(sourceAppId, out var session)) return null;
        return System.Text.Json.JsonSerializer.Serialize(session, SmtcJsonContext.Default.SessionInfo);
    }

    /// <summary>通知 Node 侧有变更</summary>
    private static void SignalChange()
    {
        Interlocked.Increment(ref _changeCounter);
        if (_changeEvent != IntPtr.Zero)
            SetEvent(_changeEvent);
    }

    #region 监控线程主循环

    private static void MonitorLoop()
    {
        var comInitialized = false;
        try
        {
            comInitialized = CoInitializeEx(IntPtr.Zero, COINIT_APARTMENTTHREADED) >= 0;
            if (!InitSessionManager()) return;
            RegisterManagerCallbacks();
            InitExistingSessions();

            if (_monitoring) WaitForSingleObject(_stopEvent, INFINITE);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[SMTC-Monitor] Fatal: {ex}");
        }
        finally
        {
            _monitoring = false;
            Cleanup();
            if (comInitialized) CoUninitialize();
        }
    }

    private static bool InitSessionManager()
    {
        try
        {
            _manager = GlobalSystemMediaTransportControlsSessionManager.RequestAsync()
                .GetAwaiter().GetResult();
            return _manager != null;
        }
        catch
        {
            return false;
        }
    }

    private static void RegisterManagerCallbacks()
    {
        if (_manager == null) return;
        _sessionsChangedHandler = (_, _) =>
        {
            lock (_sessionLock)
            {
                if (!_monitoring) return;
                SyncSessions();
                SignalChange();
            }
        };
        _manager.SessionsChanged += _sessionsChangedHandler;
    }

    private static void InitExistingSessions()
    {
        lock (_sessionLock)
        {
            if (!_monitoring) return;
            SyncSessions();
            if (_sessions.Count > 0) SignalChange();
        }
    }

    #endregion

    #region 会话同步与回调

    /// <summary>
    /// 同步会话列表：添加新会话、移除已消失的会话
    /// </summary>
    private static void SyncSessions()
    {
        if (_manager == null) return;
        try
        {
            var currentSessions = _manager.GetSessions();
            var currentIds = new HashSet<string>();

            foreach (var session in currentSessions)
            {
                var id = session.SourceAppUserModelId;
                if (string.IsNullOrEmpty(id)) continue;
                currentIds.Add(id);

                if (!_sessions.ContainsKey(id))
                {
                    var info = BuildSessionInfo(session);
                    _sessions[id] = info;
                    RegisterSessionCallbacks(session, id);
                }
            }

            var removedIds = _sessions.Keys.Where(k => !currentIds.Contains(k)).ToArray();
            foreach (var id in removedIds)
            {
                if (_unsubscribeSessions.Remove(id, out var unsubscribe)) unsubscribe();
                _sessions.TryRemove(id, out _);
                _lastTimelineSignal.TryRemove(id, out _);
            }
        }
        catch { /* 忽略同步错误 */ }
    }

    private static void RegisterSessionCallbacks(
        GlobalSystemMediaTransportControlsSession session, string id)
    {
        Action? unsubscribe = null;
        TypedEventHandler<GlobalSystemMediaTransportControlsSession, MediaPropertiesChangedEventArgs> mediaChanged = (_, _) =>
        {
            lock (_sessionLock)
            {
                if (!_monitoring || !_unsubscribeSessions.TryGetValue(id, out var current)
                    || !ReferenceEquals(current, unsubscribe)) return;
                try
                {
                    var info = BuildSessionInfo(session);
                    _sessions[id] = info;
                    SignalChange();
                }
                catch { /* 忽略 */ }
            }
        };

        TypedEventHandler<GlobalSystemMediaTransportControlsSession, PlaybackInfoChangedEventArgs> playbackChanged = (_, _) =>
        {
            lock (_sessionLock)
            {
                if (!_monitoring || !_unsubscribeSessions.TryGetValue(id, out var current)
                    || !ReferenceEquals(current, unsubscribe)) return;
                try
                {
                    var info = BuildSessionInfo(session, refreshThumbnail: false);
                    _sessions[id] = info;
                    SignalChange();
                }
                catch { /* 忽略 */ }
            }
        };

        TypedEventHandler<GlobalSystemMediaTransportControlsSession, TimelinePropertiesChangedEventArgs> timelineChanged = (_, _) =>
        {
            lock (_sessionLock)
            {
                if (!_monitoring || !_unsubscribeSessions.TryGetValue(id, out var current)
                    || !ReferenceEquals(current, unsubscribe)) return;
                try
                {
                    var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                    var last = _lastTimelineSignal.GetOrAdd(id, 0);
                    if (now - last < TimelineThrottleMs) return;
                    _lastTimelineSignal[id] = now;

                    var info = BuildSessionInfo(session, refreshThumbnail: false);
                    _sessions[id] = info;
                    SignalChange();
                }
                catch { /* 忽略 */ }
            }
        };

        // 原委托同时标识订阅，防止同一应用重建会话后收到旧订阅排队中的事件。
        unsubscribe = () =>
        {
            try { session.MediaPropertiesChanged -= mediaChanged; } catch { }
            try { session.PlaybackInfoChanged -= playbackChanged; } catch { }
            try { session.TimelinePropertiesChanged -= timelineChanged; } catch { }
        };
        _unsubscribeSessions[id] = unsubscribe;
        session.MediaPropertiesChanged += mediaChanged;
        session.PlaybackInfoChanged += playbackChanged;
        session.TimelinePropertiesChanged += timelineChanged;
    }

    #endregion

    #region 数据构建

    private static SessionInfo BuildSessionInfo(
        GlobalSystemMediaTransportControlsSession session,
        bool refreshThumbnail = true)
    {
        var id = session.SourceAppUserModelId;
        _sessions.TryGetValue(id, out var cached);
        // 时间线和播放状态事件不改变媒体属性，避免每秒反复调用异步 WinRT 元数据接口。
        var media = !refreshThumbnail && cached != null
            ? cached.Media
            : BuildMediaMetadata(session, refreshThumbnail, cached?.Media?.Thumbnail);
        var playback = BuildPlaybackInfo(session);
        var timeline = BuildTimelineInfo(session);

        return new SessionInfo
        {
            SourceAppId = id,
            Media = media,
            Playback = playback,
            Timeline = timeline,
        };
    }

    private static MediaMetadata? BuildMediaMetadata(
        GlobalSystemMediaTransportControlsSession session,
        bool refreshThumbnail,
        string? cachedThumbnail)
    {
        try
        {
            var props = session.TryGetMediaPropertiesAsync().GetAwaiter().GetResult();
            string[]? genres = null;
            try
            {
                var genreList = new List<string>();
                foreach (var genre in props.Genres)
                    genreList.Add(genre);
                genres = genreList.Count > 0 ? genreList.ToArray() : null;
            }
            catch { /* 部分应用不支持 */ }

            string? thumbnail = cachedThumbnail;
            if (refreshThumbnail)
            {
                try
                {
                    thumbnail = SmtcController.ReadThumbnailAsBase64(props.Thumbnail);
                }
                catch { /* 忽略 */ }
            }

            return new MediaMetadata
            {
                Title = props.Title,
                Artist = props.Artist,
                AlbumTitle = props.AlbumTitle,
                AlbumArtist = props.AlbumArtist,
                TrackNumber = props.TrackNumber,
                Genres = genres,
                Thumbnail = thumbnail,
            };
        }
        catch
        {
            return null;
        }
    }

    private static PlaybackInfoSnapshot? BuildPlaybackInfo(GlobalSystemMediaTransportControlsSession session)
    {
        try
        {
            var info = session.GetPlaybackInfo();

            // 数值映射：与 SMTCMonitor (Rust) 对齐
            // SMTCMonitor 使用 GlobalSystemMediaTransportControlsSessionPlaybackStatus 枚举数值：
            // 0=Closed, 1=Opened, 2=Changing, 3=Stopped, 4=Playing, 5=Paused, 6=Unknown
            int status = info.PlaybackStatus switch
            {
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Closed => 0,
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Opened => 1,
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Changing => 2,
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Stopped => 3,
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing => 4,
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Paused => 5,
                _ => 6,
            };

            int playbackType = (int)(info.PlaybackType ?? Windows.Media.MediaPlaybackType.Unknown);

            PlaybackControls? controls = null;
            try
            {
                controls = new PlaybackControls
                {
                    IsPlayEnabled = info.Controls.IsPlayEnabled,
                    IsPauseEnabled = info.Controls.IsPauseEnabled,
                    IsNextEnabled = info.Controls.IsNextEnabled,
                    IsPreviousEnabled = info.Controls.IsPreviousEnabled,
                    IsStopEnabled = info.Controls.IsStopEnabled,
                    IsRecordEnabled = info.Controls.IsRecordEnabled,
                    IsFastForwardEnabled = info.Controls.IsFastForwardEnabled,
                    IsRewindEnabled = info.Controls.IsRewindEnabled,
                    IsChannelUpEnabled = info.Controls.IsChannelUpEnabled,
                    IsChannelDownEnabled = info.Controls.IsChannelDownEnabled,
                };
            }
            catch { /* 忽略 */ }

            return new PlaybackInfoSnapshot
            {
                PlaybackStatus = status,
                PlaybackType = playbackType,
                IsShuffleActive = info.IsShuffleActive,
                RepeatMode = (int?)info.AutoRepeatMode,
                PlaybackRate = info.PlaybackRate,
                Controls = controls,
            };
        }
        catch
        {
            return null;
        }
    }

    private static TimelineInfo? BuildTimelineInfo(GlobalSystemMediaTransportControlsSession session)
    {
        try
        {
            var t = session.GetTimelineProperties();
            return new TimelineInfo
            {
                Position = t.Position.TotalSeconds,
                Duration = t.EndTime.TotalSeconds - t.StartTime.TotalSeconds,
                StartTime = t.StartTime.TotalSeconds,
                EndTime = t.EndTime.TotalSeconds,
                MinSeekTime = t.MinSeekTime.TotalSeconds,
                MaxSeekTime = t.MaxSeekTime.TotalSeconds,
            };
        }
        catch
        {
            return null;
        }
    }

    #endregion

    #region 清理

    private static void Cleanup()
    {
        lock (_sessionLock)
        {
            if (_manager != null && _sessionsChangedHandler != null)
            {
                try { _manager.SessionsChanged -= _sessionsChangedHandler; } catch { }
            }
            _sessionsChangedHandler = null;
            foreach (var unsubscribe in _unsubscribeSessions.Values) unsubscribe();
            _unsubscribeSessions.Clear();
            _manager = null;
            _sessions.Clear();
            _lastTimelineSignal.Clear();
            _changeCounter = 0;
        }

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

    #endregion
}
