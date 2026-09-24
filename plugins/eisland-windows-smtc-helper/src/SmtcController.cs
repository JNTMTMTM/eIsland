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
using Windows.Media;
using Windows.Media.Control;
using Windows.Storage.Streams;

namespace eIslandSmtcHelper;

public static class SmtcController
{
    private static async Task<GlobalSystemMediaTransportControlsSession?> GetCurrentSessionAsync()
    {
        var manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
        return manager.GetCurrentSession();
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

            var bytes = new byte[checked((int)stream.Size)];
            using var input = stream.AsStreamForRead();
            input.ReadExactly(bytes);

            var base64 = Convert.ToBase64String(bytes);
            return $"data:image/jpeg;base64,{base64}";
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

            var playbackInfo = session.GetPlaybackInfo();
            var timeline = session.GetTimelineProperties();

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

            var timelineProperties = new TimelineProperties
            {
                StartTime = timeline.StartTime.TotalSeconds,
                EndTime = timeline.EndTime.TotalSeconds,
                Position = timeline.Position.TotalSeconds,
                MinSeekTime = timeline.MinSeekTime.TotalSeconds,
                MaxSeekTime = timeline.MaxSeekTime.TotalSeconds,
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
            var timeline = session.GetTimelineProperties();

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

            var timelineProperties = new TimelineProperties
            {
                StartTime = timeline.StartTime.TotalSeconds,
                EndTime = timeline.EndTime.TotalSeconds,
                Position = timeline.Position.TotalSeconds,
                MinSeekTime = timeline.MinSeekTime.TotalSeconds,
                MaxSeekTime = timeline.MaxSeekTime.TotalSeconds,
            };

            return new TimestampInfo
            {
                IsAvailable = true,
                PlaybackStatus = playbackStatus,
                Timeline = timelineProperties,
            };
        }
        catch
        {
            return TimestampInfo.Empty;
        }
    }
}
