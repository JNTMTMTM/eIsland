using System.Text.Json;
using System.Text.Json.Serialization;

namespace eIslandSmtcHelper;

[JsonSerializable(typeof(MediaStatus))]
[JsonSerializable(typeof(CommandResult))]
[JsonSerializable(typeof(TimelineProperties))]
[JsonSerializable(typeof(PlaybackControls))]
[JsonSerializable(typeof(SessionInfo))]
[JsonSerializable(typeof(SessionInfo[]))]
[JsonSerializable(typeof(MediaMetadata))]
[JsonSerializable(typeof(PlaybackInfoSnapshot))]
[JsonSerializable(typeof(TimelineInfo))]
[JsonSerializable(typeof(TimestampInfo))]
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
internal partial class SmtcJsonContext : JsonSerializerContext
{
}
