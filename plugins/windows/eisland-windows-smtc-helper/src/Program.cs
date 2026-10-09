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

using System.Text.Json;
using Windows.Media;
using eIslandSmtcHelper;

var command = args.Length > 0 ? args[0].ToLowerInvariant() : "status";

var options = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = false
};

try
{
    switch (command)
    {
        case "play":
        {
            var result = await SmtcController.PlayAsync();
            Console.WriteLine(JsonSerializer.Serialize(result, options));
            Environment.Exit(result.Success ? 0 : 1);
            break;
        }
        case "pause":
        {
            var result = await SmtcController.PauseAsync();
            Console.WriteLine(JsonSerializer.Serialize(result, options));
            Environment.Exit(result.Success ? 0 : 1);
            break;
        }
        case "next":
        {
            var result = await SmtcController.NextAsync();
            Console.WriteLine(JsonSerializer.Serialize(result, options));
            Environment.Exit(result.Success ? 0 : 1);
            break;
        }
        case "previous":
        {
            var result = await SmtcController.PreviousAsync();
            Console.WriteLine(JsonSerializer.Serialize(result, options));
            Environment.Exit(result.Success ? 0 : 1);
            break;
        }
        case "seek":
        {
            var pos = args.Length > 1 && double.TryParse(args[1], out var p) ? p : 0;
            var result = await SmtcController.SeekAsync(pos);
            Console.WriteLine(JsonSerializer.Serialize(result, options));
            Environment.Exit(result.Success ? 0 : 1);
            break;
        }
        case "stop":
        {
            var result = await SmtcController.StopAsync();
            Console.WriteLine(JsonSerializer.Serialize(result, options));
            Environment.Exit(result.Success ? 0 : 1);
            break;
        }
        case "set-shuffle":
        {
            var active = args.Length > 1 && args[1] == "1";
            var result = await SmtcController.SetShuffleAsync(active);
            Console.WriteLine(JsonSerializer.Serialize(result, options));
            Environment.Exit(result.Success ? 0 : 1);
            break;
        }
        case "set-repeat-mode":
        {
            var mode = args.Length > 1 && int.TryParse(args[1], out var m) ? m : 0;
            var autoRepeat = mode switch
            {
                1 => MediaPlaybackAutoRepeatMode.Track,
                2 => MediaPlaybackAutoRepeatMode.List,
                _ => MediaPlaybackAutoRepeatMode.None,
            };
            var result = await SmtcController.SetRepeatModeAsync(autoRepeat);
            Console.WriteLine(JsonSerializer.Serialize(result, options));
            Environment.Exit(result.Success ? 0 : 1);
            break;
        }
        case "set-playback-rate":
        {
            var rate = args.Length > 1 && double.TryParse(args[1], out var r) ? r : 1.0;
            var result = await SmtcController.SetPlaybackRateAsync(rate);
            Console.WriteLine(JsonSerializer.Serialize(result, options));
            Environment.Exit(result.Success ? 0 : 1);
            break;
        }
        case "status":
        default:
        {
            var status = await SmtcController.GetStatusAsync();
            Console.WriteLine(JsonSerializer.Serialize(status, options));
            break;
        }
    }
}
catch (Exception ex)
{
    var error = command == "status"
        ? JsonSerializer.Serialize(MediaStatus.Empty, options)
        : JsonSerializer.Serialize(CommandResult.Fail(ex.Message), options);
    Console.WriteLine(error);
    Environment.Exit(1);
}
