using System.Text.Json.Serialization;

namespace eIslandPowerHelper;

[JsonSerializable(typeof(PowerInfo))]
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
internal partial class PwJsonContext : JsonSerializerContext
{
}
