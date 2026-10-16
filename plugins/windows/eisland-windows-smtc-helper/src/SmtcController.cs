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

using System.IO;
using System.Runtime.CompilerServices;
using Windows.Media;
using Windows.Graphics.Imaging;
using Windows.Media.Control;
using Windows.Storage.Streams;

namespace eIslandSmtcHelper;

public static class SmtcController
{
    internal static string CommandSourceAppId { get; set; } = "";
    private static GlobalSystemMediaTransportControlsSessionManager? _commandManager;
    private static readonly ConditionalWeakTable<GlobalSystemMediaTransportControlsSession, TimelineClock> TimelineClocks = new();

    /// <summary>播放器不随暂停或倍速变化更新原始时间线时，保留已观察到的状态分段。</summary>
    internal sealed class TimelineClock
    {
        private (double Position, double Start, double End, DateTimeOffset Updated)? _source;
        private double _position;
        private DateTimeOffset _sampledAt;
        private bool _playing;
        private double? _rate;

        /// <summary>新原始样本采用播放器时间；相同样本按上次状态推进后切换到本次状态。</summary>
        /// <param name="position">原始播放位置，单位为秒。</param>
        /// <param name="startTime">媒体起点，单位为秒。</param>
        /// <param name="endTime">媒体终点，未知时为零。</param>
        /// <param name="lastUpdatedTime">播放器发布时间。</param>
        /// <param name="isPlaying">本次播放状态。</param>
        /// <param name="playbackRate">本次播放速率。</param>
        /// <param name="now">本次采样的 UTC 时刻。</param>
        /// <returns>本次采样时刻的播放位置。</returns>
        internal double Sample(double position, double startTime, double endTime,
            DateTimeOffset lastUpdatedTime, bool isPlaying, double? playbackRate, DateTimeOffset now)
        {
            lock (this)
            {
                var source = (position, startTime, endTime, lastUpdatedTime);
                _position = _source == source
                    ? ProjectTimelinePosition(_position, startTime, endTime, _sampledAt, _playing, _rate, now)
                    : ProjectTimelinePosition(position, startTime, endTime, lastUpdatedTime, isPlaying, playbackRate, now);
                _source = source;
                _sampledAt = now;
                _playing = isPlaying;
                _rate = playbackRate;
                return _position;
            }
        }
    }

    private static async Task<GlobalSystemMediaTransportControlsSession?> GetCurrentSessionAsync()
    {
        _commandManager ??= await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
        return string.IsNullOrEmpty(CommandSourceAppId)
            ? _commandManager.GetCurrentSession()
            : _commandManager.GetSessions().FirstOrDefault(session => session.SourceAppUserModelId == CommandSourceAppId);
    }

    public static async Task<CommandResult> PlayAsync()
    {
        try
        {
            var session = await GetCurrentSessionAsync();
            if (session == null)
                return CommandResult.Fail("No active media session.");

            var success = await session.TryPlayAsync();
            return success ? CommandResult.Ok : CommandResult.Fail("Play command was rejected.");
        }
        catch (Exception ex)
        {
            return CommandResult.Fail(ex.Message);
        }
    }

    public static async Task<CommandResult> PauseAsync()
    {
        try
        {
            var session = await GetCurrentSessionAsync();
            if (session == null)
                return CommandResult.Fail("No active media session.");

            var success = await session.TryPauseAsync();
            return success ? CommandResult.Ok : CommandResult.Fail("Pause command was rejected.");
        }
        catch (Exception ex)
        {
            return CommandResult.Fail(ex.Message);
        }
    }

    public static async Task<CommandResult> NextAsync()
    {
        try
        {
            var session = await GetCurrentSessionAsync();
            if (session == null)
                return CommandResult.Fail("No active media session.");

            var success = await session.TrySkipNextAsync();
            return success ? CommandResult.Ok : CommandResult.Fail("Skip-next command was rejected.");
        }
        catch (Exception ex)
        {
            return CommandResult.Fail(ex.Message);
        }
    }

    public static async Task<CommandResult> PreviousAsync()
    {
        try
        {
            var session = await GetCurrentSessionAsync();
            if (session == null)
                return CommandResult.Fail("No active media session.");

            var success = await session.TrySkipPreviousAsync();
            return success ? CommandResult.Ok : CommandResult.Fail("Skip-previous command was rejected.");
        }
        catch (Exception ex)
        {
            return CommandResult.Fail(ex.Message);
        }
    }

    public static async Task<CommandResult> SeekAsync(double positionSeconds)
    {
        try
        {
            var session = await GetCurrentSessionAsync();
            if (session == null)
                return CommandResult.Fail("No active media session.");

            var success = await session.TryChangePlaybackPositionAsync((long)(positionSeconds * TimeSpan.TicksPerSecond));
            return success ? CommandResult.Ok : CommandResult.Fail("Seek command was rejected.");
        }
        catch (Exception ex)
        {
            return CommandResult.Fail(ex.Message);
        }
    }

    public static async Task<CommandResult> StopAsync()
    {
        try
        {
            var session = await GetCurrentSessionAsync();
            if (session == null)
                return CommandResult.Fail("No active media session.");

            var success = await session.TryStopAsync();
            return success ? CommandResult.Ok : CommandResult.Fail("Stop command was rejected.");
        }
        catch (Exception ex)
        {
            return CommandResult.Fail(ex.Message);
        }
    }

    public static async Task<CommandResult> SetShuffleAsync(bool active)
    {
        try
        {
            var session = await GetCurrentSessionAsync();
            if (session == null)
                return CommandResult.Fail("No active media session.");

            var success = await session.TryChangeShuffleActiveAsync(active);
            return success ? CommandResult.Ok : CommandResult.Fail("Shuffle command was rejected.");
        }
        catch (Exception ex)
        {
            return CommandResult.Fail(ex.Message);
        }
    }

    public static async Task<CommandResult> SetRepeatModeAsync(MediaPlaybackAutoRepeatMode mode)
    {
        try
        {
            var session = await GetCurrentSessionAsync();
            if (session == null)
                return CommandResult.Fail("No active media session.");

            var success = await session.TryChangeAutoRepeatModeAsync(mode);
            return success ? CommandResult.Ok : CommandResult.Fail("Repeat mode command was rejected.");
        }
        catch (Exception ex)
        {
            return CommandResult.Fail(ex.Message);
        }
    }

    public static async Task<CommandResult> SetPlaybackRateAsync(double rate)
    {
        try
        {
            var session = await GetCurrentSessionAsync();
            if (session == null)
                return CommandResult.Fail("No active media session.");

            var success = await session.TryChangePlaybackRateAsync(rate);
            return success ? CommandResult.Ok : CommandResult.Fail("Playback rate command was rejected.");
        }
        catch (Exception ex)
        {
            return CommandResult.Fail(ex.Message);
        }
    }

    /// <summary>限制封面输入大小，避免异常媒体会话让原生缓冲区和 JSON 无界膨胀。</summary>
    internal static string? ReadThumbnailAsBase64(IRandomAccessStreamReference? thumbnail)
    {
        if (thumbnail == null)
            return null;

        try
        {
            using var stream = thumbnail.OpenReadAsync().GetAwaiter().GetResult();
            if (stream == null || stream.Size == 0 || stream.Size > 8 * 1024 * 1024)
                return null;

            // 只保留实际显示所需的封面像素，避免每个会话长期持有原始大图。
            var decoder = BitmapDecoder.CreateAsync(stream).GetAwaiter().GetResult();
            var scale = Math.Min(1d, 256d / Math.Max(decoder.PixelWidth, decoder.PixelHeight));
            var width = Math.Max(1u, (uint)(decoder.PixelWidth * scale));
            var height = Math.Max(1u, (uint)(decoder.PixelHeight * scale));
            var pixels = decoder.GetPixelDataAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied,
                new BitmapTransform { ScaledWidth = width, ScaledHeight = height },
                ExifOrientationMode.IgnoreExifOrientation, ColorManagementMode.DoNotColorManage).GetAwaiter().GetResult();
            using var output = new InMemoryRandomAccessStream();
            var encoder = BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, output).GetAwaiter().GetResult();
            encoder.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, width, height, 96, 96, pixels.DetachPixelData());
            encoder.FlushAsync().GetAwaiter().GetResult();
            output.Seek(0);
            var bytes = new byte[checked((int)output.Size)];
            using var input = output.AsStreamForRead();
            input.ReadExactly(bytes);

            var base64 = Convert.ToBase64String(bytes);
            return $"data:image/png;base64,{base64}";
        }
        catch
        {
            return null;
        }
    }

    public static async Task<MediaStatus> GetStatusAsync()
    {
        try
        {
            var session = await GetCurrentSessionAsync();
            if (session == null)
                return MediaStatus.Empty;

            string? title = null;
            string? artist = null;
            string? albumTitle = null;
            string? albumArtist = null;
            int? trackNumber = null;
            string[]? genres = null;
            string? thumbnail = null;

            try
            {
                var mediaProperties = await session.TryGetMediaPropertiesAsync();
                title = mediaProperties.Title;
                artist = mediaProperties.Artist;
                albumTitle = mediaProperties.AlbumTitle;
                albumArtist = mediaProperties.AlbumArtist;
                trackNumber = mediaProperties.TrackNumber;

                try
                {
                    var genreList = new List<string>();
                    foreach (var genre in mediaProperties.Genres)
                        genreList.Add(genre);
                    genres = genreList.Count > 0 ? genreList.ToArray() : null;
                }
                catch { }

                thumbnail = ReadThumbnailAsBase64(mediaProperties.Thumbnail);
            }
            catch { }

            // 封面解码和媒体查询可能耗时；最后采样时间线，避免把旧位置标成当前值。
            var playbackInfo = session.GetPlaybackInfo();
            var timelineProperties = ReadTimeline(session, playbackInfo);
            var playbackStatus = playbackInfo.PlaybackStatus switch
            {
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing => "playing",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Paused => "paused",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Stopped => "stopped",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Closed => "closed",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Opened => "opened",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Changing => "changing",
                _ => "unknown"
            };

            var controls = new PlaybackControls
            {
                IsPlayEnabled = playbackInfo.Controls.IsPlayEnabled,
                IsPauseEnabled = playbackInfo.Controls.IsPauseEnabled,
                IsNextEnabled = playbackInfo.Controls.IsNextEnabled,
                IsPreviousEnabled = playbackInfo.Controls.IsPreviousEnabled,
                IsStopEnabled = playbackInfo.Controls.IsStopEnabled,
                IsRecordEnabled = playbackInfo.Controls.IsRecordEnabled,
                IsFastForwardEnabled = playbackInfo.Controls.IsFastForwardEnabled,
                IsRewindEnabled = playbackInfo.Controls.IsRewindEnabled,
                IsChannelUpEnabled = playbackInfo.Controls.IsChannelUpEnabled,
                IsChannelDownEnabled = playbackInfo.Controls.IsChannelDownEnabled,
            };

            return new MediaStatus
            {
                IsAvailable = true,
                Title = title,
                Artist = artist,
                AlbumTitle = albumTitle,
                AlbumArtist = albumArtist,
                TrackNumber = trackNumber,
                Genres = genres,
                PlaybackStatus = playbackStatus,
                IsShuffleActive = playbackInfo.IsShuffleActive,
                RepeatMode = (int?)playbackInfo.AutoRepeatMode,
                PlaybackRate = playbackInfo.PlaybackRate,
                SourceAppUserModelId = session.SourceAppUserModelId,
                Thumbnail = thumbnail,
                Timeline = timelineProperties,
                Controls = controls,
            };
        }
        catch
        {
            return MediaStatus.Empty;
        }
    }

    /// <summary>将播放器在 LastUpdatedTime 发布的位置推进到采样时刻；暂停与停止不外推。</summary>
    /// <param name="position">播放器发布的位置，单位为秒。</param>
    /// <param name="startTime">媒体起点，单位为秒。</param>
    /// <param name="endTime">媒体终点，未知时为零。</param>
    /// <param name="lastUpdatedTime">播放器更新时间；未提供或未来时间不补偿。</param>
    /// <param name="isPlaying">仅正在播放时推进时间。</param>
    /// <param name="playbackRate">播放速率；缺省或无效时按正常速度。</param>
    /// <param name="now">本次采样的 UTC 时刻。</param>
    /// <returns>限制在媒体范围内的当前位置。</returns>
    internal static double ProjectTimelinePosition(double position, double startTime, double endTime,
        DateTimeOffset lastUpdatedTime, bool isPlaying, double? playbackRate, DateTimeOffset now)
    {
        var rate = playbackRate is double value && double.IsFinite(value) && value >= 0 ? value : 1;
        var age = lastUpdatedTime > DateTimeOffset.UnixEpoch && lastUpdatedTime <= now
            ? (now - lastUpdatedTime).TotalSeconds : 0;
        var current = Math.Max(startTime, position + (isPlaying ? age * rate : 0));
        return endTime > startTime ? Math.Min(endTime, current) : current;
    }

    /// <summary>为命令查询和监控共用同一时间线算法，避免校准与播放显示采用不同的时间基准。</summary>
    /// <param name="session">本次查询的媒体会话。</param>
    /// <param name="playbackInfo">与时间线一同读取的播放状态。</param>
    /// <returns>带采样时刻的当前时间线。</returns>
    internal static TimelineProperties ReadTimeline(GlobalSystemMediaTransportControlsSession session,
        GlobalSystemMediaTransportControlsSessionPlaybackInfo playbackInfo)
    {
        var timeline = session.GetTimelineProperties();
        var now = DateTimeOffset.UtcNow;
        return new TimelineProperties
        {
            StartTime = timeline.StartTime.TotalSeconds,
            EndTime = timeline.EndTime.TotalSeconds,
            Position = TimelineClocks.GetValue(session, static _ => new TimelineClock()).Sample(timeline.Position.TotalSeconds, timeline.StartTime.TotalSeconds,
                timeline.EndTime.TotalSeconds, timeline.LastUpdatedTime,
                playbackInfo.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing,
                playbackInfo.PlaybackRate, now),
            SampledAtMs = now.ToUnixTimeMilliseconds(),
            MinSeekTime = timeline.MinSeekTime.TotalSeconds,
            MaxSeekTime = timeline.MaxSeekTime.TotalSeconds,
        };
    }

    /// <summary>
    /// 轻量级获取当前播放时间戳（不含媒体元数据），用于歌词校准等场景
    /// </summary>
    public static async Task<TimestampInfo> GetTimestampAsync()
    {
        try
        {
            var session = await GetCurrentSessionAsync();
            if (session == null)
                return TimestampInfo.Empty;

            var playbackInfo = session.GetPlaybackInfo();
            var timelineProperties = ReadTimeline(session, playbackInfo);

            var playbackStatus = playbackInfo.PlaybackStatus switch
            {
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing => "playing",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Paused => "paused",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Stopped => "stopped",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Closed => "closed",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Opened => "opened",
                GlobalSystemMediaTransportControlsSessionPlaybackStatus.Changing => "changing",
                _ => "unknown"
            };

            return new TimestampInfo
            {
                IsAvailable = true,
                PlaybackStatus = playbackStatus,
                PlaybackRate = playbackInfo.PlaybackRate,
                SourceAppUserModelId = session.SourceAppUserModelId,
                Timeline = timelineProperties,
            };
        }
        catch
        {
            return TimestampInfo.Empty;
        }
    }
}
